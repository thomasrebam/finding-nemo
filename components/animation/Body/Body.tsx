import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { RNSVGNode } from "./RNSVGNode";

type Node = {
  x: number;
  y: number;
};

type Props = {
  nodes: Node[];
  size?: { width: number; height: number };
};

export const Body = ({ nodes, size = { width: 200, height: 200 } }: Props) => {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const canvasX = useSharedValue(0);
  const canvasY = useSharedValue(0);

  const canvasGesture = Gesture.Pan()
    .onStart(() => {
      offsetX.value = canvasX.value;
      offsetY.value = canvasY.value;
    })
    .onUpdate((e) => {
      "worklet";
      canvasX.value = e.translationX + offsetX.value;
      canvasY.value = e.translationY + offsetY.value;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: canvasX.value }, { translateY: canvasY.value }],
  }));

  return (
    <View>
      <GestureDetector gesture={canvasGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <RNSVGNode />
        </Animated.View>
      </GestureDetector>
      {nodes.map((node) => (
        <View
          key={`${node.x}-${node.y}`}
          style={{
            position: "absolute",
            transform: [{ translateX: node.x }, { translateY: node.y }],
          }}
        >
          <RNSVGNode />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
  },
});
