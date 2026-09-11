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

          // Distances to the three closest cell centers: the border between
          // two cells is where the closest and second-closest distances are
          // (almost) equal, and a point where three cells meet is where the
          // closest, second- and third-closest are all (almost) equal.
          let minDist1 = d.f32(999999);
          let minDist2 = d.f32(999999);
          let minDist3 = d.f32(999999);
          let col = d.vec3f(0, 0, 0);
          const borderWidth = 0.02;

          for (let i = 0; i < CELL_COUNT; i++) {
            const seeded = d.f32(i + seedOffset);
            const n = n22(d.vec2f(seeded, seeded));
            // Each cell drifts smoothly in [-1, 1] over time - n picks a
            // different phase/frequency per cell so they don't move in sync.
            let point = std.sin(n.mul(t / 2000 + 10));
            point = d.vec2f(point.x * aspectRatio, point.y);

            const dist = std.length(point.sub(warpedP));

            if (dist < minDist1) {
              minDist3 = minDist2;
              minDist2 = minDist1;
              minDist1 = dist;

              col = d.vec3f(0.50390625, 0.859375, 0.87890625);
            } else if (dist < minDist2) {
              minDist3 = minDist2;
              minDist2 = dist;
            } else if (dist < minDist3) {
              minDist3 = dist;
            }
          }

          // Draw a black border wherever the two closest cells are near
          // equidistant, anti-aliased over a small transition band instead
          // of a hard on/off cutoff so it doesn't look jagged.
          const edgeDist =
            (minDist2 - minDist1) /
            std.sqrt(std.pow(minDist2, 2) + std.pow(minDist1, 2));

          // Widen the border near triple junctions: when the third-closest
          // cell is nearly as close as the second-closest, all three cells
          // are meeting right around here.
          const vertexRange = 0.1;
          const vertexBoost =
            1 - std.smoothstep(0, vertexRange, minDist3 - minDist2);
          const extraWidth = 0.03;
          const localBorderWidth = borderWidth + extraWidth * vertexBoost;

          const aaWidth = 0.004;
          const borderMask =
            1 -
            std.smoothstep(
              localBorderWidth - aaWidth,
              localBorderWidth + aaWidth,
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
