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

const CELL_COUNT = 10;

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

export const TypeGpuStepByStepVoronoi = () => (
  <Root disableWorklets>
    <VoronoiCanvas />
  </Root>
);

const VoronoiCanvas = () => {
  const { width, height } = useWindowDimensions();

  const iResolution = useUniform(d.vec3f, {
    initial: d.vec3f(width, height, 1),
  });

  const root = useRoot();
  const renderPipeline = useMemo(
    () =>
      root.createRenderPipeline({
        vertex: common.fullScreenTriangle,
        fragment: ({ uv }) => {
          "use gpu";
          const resolution = iResolution.$;
          const aspectRatio = resolution.x / resolution.y;
          // Center uv at (0,0) and scale to [-1, 1] on the shorter axis,
          // so screen space and cell-point space line up 1:1.
          const centered = uv.sub(d.vec2f(0.5, 0.5)).mul(2);
          const p = d.vec2f(centered.x * aspectRatio, centered.y);

          // Distances to the closest and second-closest cell centers: the
          // border between two cells is where these two distances are
          // (almost) equal, i.e. where their difference is near zero.
          let minDist1 = d.f32(999999);
          let minDist2 = d.f32(999999);
          let col = d.vec3f(0, 0, 0);
          let onCenter = false;
          const centerRadius = 0.02;
          const borderWidth = 0.02;

          for (let i = 0; i < CELL_COUNT; i++) {
            const n = n22(d.vec2f(d.f32(i), d.f32(i)));
            // Fixed pseudo-random point in [-1, 1], not driven by time.
            let point = n.sub(d.vec2f(0.5, 0.5)).mul(2);
            point = d.vec2f(point.x * aspectRatio, point.y);

            const dist = std.length(point.sub(p));
            if (dist < centerRadius) onCenter = true;

            if (dist < minDist1) {
              minDist2 = minDist1;
              minDist1 = dist;

              if (i === 0) col = d.vec3f(0.9, 0.2, 0.2);
              else if (i === 1) col = d.vec3f(0.2, 0.7, 0.9);
              else if (i === 2) col = d.vec3f(0.2, 0.9, 0.3);
              else if (i === 3) col = d.vec3f(0.9, 0.8, 0.2);
              else if (i === 4) col = d.vec3f(0.7, 0.2, 0.9);
              else if (i === 5) col = d.vec3f(0.9, 0.5, 0.2);
              else if (i === 6) col = d.vec3f(0.2, 0.9, 0.8);
              else if (i === 7) col = d.vec3f(0.9, 0.2, 0.6);
              else if (i === 8) col = d.vec3f(0.5, 0.9, 0.2);
              else col = d.vec3f(0.4, 0.4, 0.9);
            } else if (dist < minDist2) {
              minDist2 = dist;
            }
          }

          // Draw a black border wherever the two closest cells are near
          // equidistant, anti-aliased over a small transition band instead
          // of a hard on/off cutoff so it doesn't look jagged.
          const edgeDist =
            (minDist2 - minDist1) /
            std.sqrt(std.pow(minDist2, 2) + std.pow(minDist1, 2));
          const aaWidth = 0.004;
          const borderMask =
            1 -
            std.smoothstep(
              borderWidth - aaWidth,
              borderWidth + aaWidth,
              edgeDist
            );
          col = std.mix(col, d.vec3f(0, 0, 0), borderMask);

          // Then the center dots on top.
          if (onCenter) col = d.vec3f(0, 0, 0);

          return d.vec4f(col.x, col.y, col.z, 1);
        },
      }),
    [root, iResolution]
  );

  const { ref, ctxRef } = useConfigureContext();

  useFrame(() => {
    if (!ctxRef.current) return;

    iResolution.write(d.vec3f(width, height, 1));

    renderPipeline.withColorAttachment({ view: ctxRef.current }).draw(3);
    ctxRef.current.present?.();
  });

  return <Canvas ref={ref} style={StyleSheet.absoluteFill} />;
};
