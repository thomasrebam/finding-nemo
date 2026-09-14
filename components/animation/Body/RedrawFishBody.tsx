import { NemoColors } from "@/constants/Colors";
import { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import {
  RedrawCanvas,
  RedrawProvider,
  RenderCallback,
} from "react-native-redraw";
import { Circle, Feather, Paint, parseSVG } from "redraw";
import { AnimalNode } from "../animation";
import { PositionService } from "./PositionService";
import { SpineGradient } from "./SpineGradient";
import { buildFishPathString, computeEyePositions } from "./drawSvg";

// Registers the custom SpineGradient shader with the canvas's Library.
// Module-level so it stays referentially stable across renders.
const REDRAW_LIBRARY = { functions: [SpineGradient.fn] };

// Trailing motion blur: sigma grows with the head's per-frame speed (px of
// travel per frame), capped so a fast flick doesn't dissolve the body.
const MOTION_BLUR_SIGMA_PER_PX = 0.1;
const MOTION_BLUR_MAX_SIGMA = 0.5;
// Weight kept from the previous frame's velocity, so the trail direction
// doesn't flicker on small frame-to-frame jitter in the spine follow.
const MOTION_BLUR_VELOCITY_SMOOTHING = 0.1;

export const RedrawFishBody = () => {
  const spinePositionsRef = useRef<AnimalNode[]>([]);
  const prevHeadRef = useRef<{ x: number; y: number } | null>(null);
  const headVelocityRef = useRef({ x: 0, y: 0 });

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
    new SpineGradient(
      [
        NemoColors.orange,
        NemoColors.black,
        NemoColors.white,
        NemoColors.black,
        NemoColors.orange,
        NemoColors.black,
        NemoColors.white,
        NemoColors.black,
        NemoColors.orange,
      ],
      [0, 0.08, 0.1, 0.22, 0.24, 0.5, 0.52, 0.56, 0.58]
    )
  ).current;
  const bodyPaint = useRef(new Paint().addShader(bodyGradient)).current;
  const eyePaint = useRef(new Paint().setColor("rgba(0, 0, 0, 0.5)")).current;

  const render: RenderCallback = useCallback(
    (canvas) => {
      const spineNodes = spinePositionsRef.current;
      if (spineNodes.length < 2) return;

      bodyGradient.setSpine(spineNodes);

      // Trailing blur: a Feather.sweep whose direction points back along the
      // head's smoothed velocity, so the edge blurs where the fish is
      // coming from and stays crisp where it's heading.
      const head = spineNodes[0];
      const prevHead = prevHeadRef.current;
      if (prevHead) {
        headVelocityRef.current = {
          x:
            headVelocityRef.current.x * MOTION_BLUR_VELOCITY_SMOOTHING +
            (head.x - prevHead.x) * (1 - MOTION_BLUR_VELOCITY_SMOOTHING),
          y:
            headVelocityRef.current.y * MOTION_BLUR_VELOCITY_SMOOTHING +
            (head.y - prevHead.y) * (1 - MOTION_BLUR_VELOCITY_SMOOTHING),
        };
      }
      prevHeadRef.current = head;

      const { x: vx, y: vy } = headVelocityRef.current;
      const speed = Math.hypot(vx, vy);
      const sigma = Math.max(
        Math.min(speed * MOTION_BLUR_SIGMA_PER_PX, MOTION_BLUR_MAX_SIGMA),
        0.05
      );
      const trailDirection: [number, number] =
        speed > 0.01 ? [-vx / speed, -vy / speed] : [1, 0];
      bodyPaint.setFeather(Feather.sweep(sigma, trailDirection));

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
