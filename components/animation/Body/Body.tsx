import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";

import { Fragment, useRef } from "react";
import { Animal } from "../animation";
import { PositionService } from "./PositionService";
import { RedrawFishBody } from "./RedrawFishBody";

type Props = {
  animal: Animal;
};

export const Body = ({ animal }: Props) => {
  const pointerX = useSharedValue(0);
  const pointerY = useSharedValue(0);

  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const animalRef = useRef<Animal>(animal);

  const gesture = Gesture.Pan()
    .onStart(() => {
      offsetX.value = pointerX.value;
      offsetY.value = pointerY.value;
    })
    .onUpdate((e) => {
      "worklet";
      pointerX.value = e.translationX + offsetX.value;
      pointerY.value = e.translationY + offsetY.value;
    })
    .hitSlop(48);

  const pointerAnimatedStyles = useAnimatedStyle(() => ({
    position: "absolute",
    transform: [{ translateX: pointerX.value }, { translateY: pointerY.value }],
    backgroundColor: "blue",
    opacity: 0.2,
    width: 48,
    height: 48,
    borderRadius: 48,
    zIndex: 1000,
  }));

  const updatePositionService = (x: number, y: number) => {
    const newAnimal = PositionService.setPositions({
      animal: animalRef.current,
      goTo: { x, y },
    });

    animalRef.current = newAnimal;
  };

  useDerivedValue(() => {
    runOnJS(updatePositionService)(pointerX.value, pointerY.value);
  });

  return (
    <Fragment>
      <RedrawFishBody />
      <GestureDetector gesture={gesture}>
        <Animated.View style={pointerAnimatedStyles} />
      </GestureDetector>
    </Fragment>
  );
};
