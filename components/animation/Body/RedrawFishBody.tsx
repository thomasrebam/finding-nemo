import { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import {
  RedrawCanvas,
  RedrawProvider,
  RenderCallback,
} from "react-native-redraw";
import { Circle, LinearGradient, Paint, parseSVG } from "redraw";
import { AnimalNode } from "../animation";
import { PositionService } from "./PositionService";
import { buildFishPathString, computeEyePositions } from "./drawSvg";

export const RedrawFishBody = () => {
  const spinePositionsRef = useRef<AnimalNode[]>([]);

  // Subscribe to position service. The listener fires on the JS thread, same
  // as RedrawCanvas's render loop, so a plain ref (read every frame below) is
  // enough - no need for a cross-thread Reanimated shared value here.
  useEffect(() => {
    const removeListener = PositionService.subscribe((positions) => {
      spinePositionsRef.current = positions;
    });
    return () => removeListener();
  }, []);

  // GradientAlongPath shades by ctx.t, which only exists on stroked paths
  // (a fill reports ctx.t = 0, i.e. a flat color) - LinearGradient shades by
  // position instead, so it actually paints on the filled body. Pointing its
  // live from/to at the head and tail every frame keeps the axis following
  // the spine instead of a fixed screen direction.
  const bodyGradient = useRef(
    new LinearGradient([
      "#ed5c26",
      "#ffffff",
      "#ed5c26",
      "#ffffff",
      "#ed5c26",
      "#ffffff",
    ])
  ).current;
  const bodyPaint = useRef(new Paint().addShader(bodyGradient)).current;
  const eyePaint = useRef(new Paint().setColor("rgba(0, 0, 0, 0.5)")).current;

  const render: RenderCallback = useCallback(
    (canvas) => {
      const spineNodes = spinePositionsRef.current;
      if (spineNodes.length < 2) return;

      const head = spineNodes[0];
      const tail = spineNodes[spineNodes.length - 1];
      bodyGradient.from = [head.x, head.y];
      bodyGradient.to = [tail.x, tail.y];

      const fishPath = parseSVG(buildFishPathString(spineNodes));
      canvas.drawPath(fishPath, bodyPaint);

      const { topEyeX, topEyeY, bottomEyeX, bottomEyeY } =
        computeEyePositions(spineNodes);
      canvas.draw(new Circle([topEyeX, topEyeY], 3), eyePaint);
      canvas.draw(new Circle([bottomEyeX, bottomEyeY], 3), eyePaint);
    },
    [bodyGradient, bodyPaint, eyePaint]
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <RedrawProvider>
        <RedrawCanvas
          style={{ width: "100%", height: "100%" }}
          render={render}
        />
      </RedrawProvider>
    </View>
  );
};


