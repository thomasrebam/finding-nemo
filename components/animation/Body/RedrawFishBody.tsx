import { NemoColors } from "@/constants/Colors";
import { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import {
  RedrawCanvas,
  RedrawProvider,
  RenderCallback,
} from "react-native-redraw";
import { Circle, Paint, parseSVG } from "redraw";
import { AnimalNode } from "../animation";
import { PositionService } from "./PositionService";
import { SpineGradient } from "./SpineGradient";
import { buildFishPathString, computeEyePositions } from "./drawSvg";

// Registers the custom SpineGradient shader with the canvas's Library.
// Module-level so it stays referentially stable across renders.
const REDRAW_LIBRARY = { functions: [SpineGradient.fn] };

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

  // SpineGradient shades each fragment by the palette stop nearest its
  // closest point on the spine polyline (updated live every frame), so
  // stripes follow the spine's actual curvature instead of a fixed axis.
  const bodyGradient = useRef(
    new SpineGradient([
      NemoColors.orange,
      NemoColors.white,
      NemoColors.orange,
      NemoColors.white,
      NemoColors.orange,
    ])
  ).current;
  const bodyPaint = useRef(new Paint().addShader(bodyGradient)).current;
  const eyePaint = useRef(new Paint().setColor("rgba(0, 0, 0, 0.5)")).current;

  const render: RenderCallback = useCallback(
    (canvas) => {
      const spineNodes = spinePositionsRef.current;
      if (spineNodes.length < 2) return;

      bodyGradient.setSpine(spineNodes);

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
          library={REDRAW_LIBRARY}
        />
      </RedrawProvider>
    </View>
  );
};

// Question Zyad : Skia est déjà censé être très low level -> en effet ça tape déjà sur le GPU
// Quel est le vrai intérêt de redraw dans tout ça ?
// Idem entre redraw et typeGpu, quel intérêt de redraw
