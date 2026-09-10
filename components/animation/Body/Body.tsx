import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { Fragment } from "react";
import { runOnJS } from "react-native-worklets";
import { Animal, computeNextSpine } from "../animation";
import { PositionService } from "./PositionService";
import { SkiaFishBody } from "./SkiaFishBody";

type Props = {
  animal: Animal;
};

export const Body = ({ animal }: Props) => {
  const pointerX = useSharedValue(200);
  const pointerY = useSharedValue(200);

  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const spine = useSharedValue(animal.spine);

  const gesture = Gesture.Pan()
    .onStart(() => {
      offsetX.value = pointerX.value;
      offsetY.value = pointerY.value;
    })
    .onUpdate((e) => {
      "worklet";
      pointerX.value = e.translationX + offsetX.value;
      pointerY.value = e.translationY + offsetY.value;

      spine.value = computeNextSpine({
        animal: { spine: spine.value },
        x: pointerX.value,
        y: pointerY.value,
      }).spine;
    })
    .hitSlop(48);

  const pointerAnimatedStyles = useAnimatedStyle(() => ({
    position: "absolute",
    transform: [
      { translateX: pointerX.value - 24 },
      { translateY: pointerY.value - 24 },
    ],
    backgroundColor: "blue",
    opacity: 0.2,
    width: 48,
    height: 48,
    borderRadius: 48,
    zIndex: 1000,
  }));

  const publishSpine = (positions: Animal["spine"]) => {
    PositionService.publish(positions);
  };

  // Forwards the UI-thread-computed spine to JS-thread-only consumers, e.g.
  // RedrawFishBody's canvas render loop, which can't read shared values directly.
  useAnimatedReaction(
    () => spine.value,
    (current) => {
      runOnJS(publishSpine)(current);
    }
  );

  return (
    <Fragment>
      <SkiaFishBody spine={spine} />
      <GestureDetector gesture={gesture}>
        <Animated.View style={pointerAnimatedStyles} />
      </GestureDetector>
    </Fragment>
  );
};
