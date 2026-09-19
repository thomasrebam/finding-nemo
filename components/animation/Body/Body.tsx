import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { Fragment } from "react";
import { Animal, computeNextSpine } from "../animation";
import { RedrawFishBody } from "./RedrawFishBody";

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

  return (
    <Fragment>
      <RedrawFishBody spine={spine} />
      <GestureDetector gesture={gesture}>
        <Animated.View style={pointerAnimatedStyles} />
      </GestureDetector>
    </Fragment>
  );
};
