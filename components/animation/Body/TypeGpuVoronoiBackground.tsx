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

export const TypeGpuVoronoiBackground = () => (
  <Root disableWorklets>
    <VoronoiCanvas />
  </Root>
);

const VoronoiCanvas = () => {
  const { width, height } = useWindowDimensions();

  const iTime = useUniform(d.f32);
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
          const fragCoord = uv.mul(resolution.xy);
          const p = fragCoord
            .mul(aspectRatio)
            .sub(resolution.xy)
            .div(resolution.y);
          const t = iTime.$;

          let m = d.f32(0);
          let minDist = d.f32(999999);

          for (let i = 0; i < 20; i++) {
            const n = n22(d.vec2f(d.f32(i), d.f32(i)));
            let point = std.sin(n.mul(t / 1000 + 10));
            point = d.vec2f(point.x * aspectRatio, point.y);

            const dist = std.length(point.sub(p));
            if (dist < minDist) {
              minDist = dist;
              m = dist;
            }
          }

          const threshold = 0.3;
          const edgeWidth = 0.02;
          const blend = std.smoothstep(
            threshold - edgeWidth,
            threshold + edgeWidth,
            m
          );
          const col = std.mix(
            d.vec3f(0.01, 0.53, 0.87),
            d.vec3f(1, 1, 1),
            blend
          );
          return d.vec4f(col.x, col.y, col.z, 1);
        },
      }),
    [root, iTime, iResolution]
  );

  const { ref, ctxRef } = useConfigureContext();

  useFrame(({ elapsedSeconds }) => {
    if (!ctxRef.current) return;

    iTime.write(elapsedSeconds * 1000);
    iResolution.write(d.vec3f(width, height, 1));

    renderPipeline.withColorAttachment({ view: ctxRef.current }).draw(3);
    ctxRef.current.present?.();
  });

  return (
    <Canvas ref={ref} style={{ ...StyleSheet.absoluteFill, opacity: 0.5 }} />
  );
};
