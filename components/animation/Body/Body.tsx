import { Dimensions, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useEffect, useRef } from "react";
import { Animal } from "../animation";
import { PositionService } from "./PositionService";
import { RNSVGNode } from "./RNSVGNode";
import { SkiaFishBody } from "./SkiaFishBody";

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
    backgroundColor: "red",
    opacity: 0.5,
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
    <View style={styles.container}>
      <SkiaFishBody
        width={Dimensions.get("window").width}
        height={Dimensions.get("window").height}
      />
      <GestureDetector gesture={gesture}>
        <Animated.View style={pointerAnimatedStyles} />
      </GestureDetector>
      {/* {animal.spine.map((node, index) => {
        return <AnimatedNode key={index} index={index} size={node.size} />;
      })} */}
    </View>
  );
};

const AnimatedNode = ({ index, size }: { index: number; size?: number }) => {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    const removeListener = PositionService.subscribe((positions) => {
      if (positions[index]) {
        x.value = withSpring(positions[index].x, { duration: 100 });
        y.value = withSpring(positions[index].y, { duration: 100 });
      }
    });
    return () => removeListener();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <RNSVGNode size={size} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
