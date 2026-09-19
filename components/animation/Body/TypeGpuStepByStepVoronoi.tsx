import {
  Root,
  useConfigureContext,
  useFrame,
  useRoot,
  useUniform,
} from "@typegpu/react";
import { useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Canvas } from "react-native-webgpu";
import tgpu, { common, d, std } from "typegpu";

// Hash function turning an integer index into a pseudo-random 2D point.
const n22 = tgpu.fn(
  [d.vec2f],
  d.vec2f
)((p) => {
  "use gpu";
  let a = std.fract(p.xyx.mul(d.vec3f(452.6, 725.34, 921.2)));
  a = a.add(std.dot(a, a.add(16.2)));
  return std.fract(d.vec2f(a.x * a.y, a.y * a.z));
});

// Polynomial smooth minimum (Inigo Quilez) - like std.min, but rounds off
// the joint between the two distance fields instead of meeting at a sharp
// crease. Used to round the corners where several straight border segments
// meet at a Voronoi vertex.
const smoothMin = tgpu.fn(
  [d.f32, d.f32, d.f32],
  d.f32
)((a, b, radius) => {
  "use gpu";
  const h = std.clamp(0.5 + (0.5 * (b - a)) / radius, 0, 1);
  return std.mix(b, a, h) - radius * h * (1 - h);
});

// Cells drift on a torus that's a bit bigger than the visible viewport, so
// a cell that exits one edge re-enters from the opposite one - a "conveyor
// belt" instead of a sine-wave that has to reverse direction and pendulum
// back and forth. Every cell shares the same speed (only its starting phase
// differs, from the hash), so neighbors never move at different speeds
// relative to each other - that's what kept the Voronoi borders glitching
// before. Because the domain is padded past the viewport, the wrap-around
// teleport always happens at the domain edge, which is off-screen.
const DOMAIN_PADDING = 1;
const DRIFT_SPEED_X = 1 / 40000;
const DRIFT_SPEED_Y = 1 / 55000;

const cellPoint = tgpu.fn(
  [d.f32, d.f32, d.f32, d.f32],
  d.vec2f
)((index, seedOffset, time, aspectRatio) => {
  "use gpu";
  const n = n22(d.vec2f(index + seedOffset, index + seedOffset));

  const wrappedX = std.fract(n.x + time * DRIFT_SPEED_X);
  const wrappedY = std.fract(n.y + time * DRIFT_SPEED_Y);

  const domainHalfWidth = (1 + DOMAIN_PADDING) * aspectRatio;
  const domainHalfHeight = 1 + DOMAIN_PADDING;

  return d.vec2f(
    (wrappedX * 2 - 1) * domainHalfWidth,
    (wrappedY * 2 - 1) * domainHalfHeight
  );
});

type VoronoiProps = {
  CELL_COUNT: number;
  borderColor?: [number, number, number];
  // Opacity of the cell fill only - the border is always fully opaque.
  fillOpacity?: number;
  // Shifts the hash input used to seed each cell's point, so two instances
  // with the same CELL_COUNT don't land on the exact same cell centers.
  seedOffset?: number;
};

export const TypeGpuStepByStepVoronoi = ({
  CELL_COUNT,
  borderColor = [1, 1, 1],
  fillOpacity = 1,
  seedOffset = 0,
}: VoronoiProps) => (
  <Root disableWorklets>
    <VoronoiCanvas
      CELL_COUNT={CELL_COUNT}
      borderColor={borderColor}
      fillOpacity={fillOpacity}
      seedOffset={seedOffset}
    />
  </Root>
);

const VoronoiCanvas = ({
  CELL_COUNT,
  borderColor,
  fillOpacity,
  seedOffset,
}: Required<VoronoiProps>) => {
  const { width, height } = useWindowDimensions();

  const iResolution = useUniform(d.vec3f, {
    initial: d.vec3f(width, height, 1),
  });
  const iTime = useUniform(d.f32);

  const root = useRoot();
  const renderPipeline = useMemo(
    () =>
      root.createRenderPipeline({
        vertex: common.fullScreenTriangle,
        fragment: ({ uv }) => {
          "use gpu";
          const resolution = iResolution.$;
          const t = iTime.$;
          const aspectRatio = resolution.x / resolution.y;
          // Center uv at (0,0) and scale to [-1, 1] on the shorter axis,
          // so screen space and cell-point space line up 1:1.
          const centered = uv.sub(d.vec2f(0.5, 0.5)).mul(2);
          const p = d.vec2f(centered.x * aspectRatio, centered.y);

          // Warp the sampling position itself with a couple of mismatched
          // sine waves, so the whole cell boundary bends organically instead
          // of the fill and the border being computed from a straight grid.
          const warpAmplitude = 0.03;
          const warp = d
            .vec2f(std.sin(p.y * 12 + 1.7), std.sin(p.x * 12 - 3.1))
            .mul(warpAmplitude);
          const warpedP = p.add(warp);

          const borderWidth = 0.01;

          // Pass 1: find the nearest cell center - this decides which cell
          // the sample point belongs to.
          let minDist1 = d.f32(999999);
          let nearestIndex = 0;
          let point1 = d.vec2f(0, 0);
          let col = d.vec3f(0, 0, 0);

          for (let i = 0; i < CELL_COUNT; i++) {
            const point = cellPoint(d.f32(i), seedOffset, t, aspectRatio);

            const dist = std.length(point.sub(warpedP));

            if (dist < minDist1) {
              minDist1 = dist;
              nearestIndex = i;
              point1 = d.vec2f(point);

              col = d.vec3f(0.50390625, 0.859375, 0.87890625);
            }
          }

          // Pass 2: the distance to the cell border is the minimum, over
          // every other cell, of the perpendicular distance to the bisector
          // line between it and the nearest cell. Taking a minimum of
          // distances-to-a-line (rather than picking a single "2nd nearest"
          // point by identity, like a naive implementation would) keeps this
          // value continuous as cells move: which point happens to be
          // runner-up can flip at any time, but the minimum itself never
          // jumps, so edges don't glitch/snap when that happens. It's also
          // exact regardless of cell size, unlike a distance-ratio
          // approximation, which degenerates for tiny cells and can swallow
          // them whole in border color.
          //
          // A plain min() makes the border segments meet at sharp, angular
          // creases wherever three or more cells join - smoothMin rounds
          // those joints instead, like a metaball union.
          const cornerRadius = 0.06;
          let edgeDist = d.f32(999999);

          for (let j = 0; j < CELL_COUNT; j++) {
            if (j !== nearestIndex) {
              const point = cellPoint(d.f32(j), seedOffset, t, aspectRatio);

              const midpoint = point1.add(point).mul(0.5);
              const direction = std.normalize(point.sub(point1));
              const distToEdge = std.abs(
                std.dot(warpedP.sub(midpoint), direction)
              );

              edgeDist = smoothMin(edgeDist, distToEdge, cornerRadius);
            }
          }

          const aaWidth = 0.004;
          const borderMask =
            1 -
            std.smoothstep(
              borderWidth - aaWidth,
              borderWidth + aaWidth,
              edgeDist
            );
          col = std.mix(
            col,
            d.vec3f(borderColor[0], borderColor[1], borderColor[2]),
            borderMask
          );

          // The border is always fully opaque; only the fill fades with
          // fillOpacity, using the same anti-aliased mask as the color mix.
          const alpha = std.mix(fillOpacity, 1, borderMask);

          // The canvas is configured for premultiplied alpha compositing
          // (see useConfigureContext below), so the color channels must be
          // pre-multiplied by alpha here, not left "straight".
          return d.vec4f(col.x * alpha, col.y * alpha, col.z * alpha, alpha);
        },
      }),
    [root, iResolution, iTime]
  );

  const { ref, ctxRef } = useConfigureContext({ alphaMode: "premultiplied" });

  useFrame(({ elapsedSeconds }) => {
    if (!ctxRef.current) return;

    iTime.write(elapsedSeconds * 1000);
    iResolution.write(d.vec3f(width, height, 1));

    renderPipeline.withColorAttachment({ view: ctxRef.current }).draw(3);
    ctxRef.current.present?.();
  });

  return <Canvas ref={ref} style={StyleSheet.absoluteFill} />;
};
