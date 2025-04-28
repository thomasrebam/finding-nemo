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
};

const DISTANCE_BETWEEN_NODES = Math.sqrt(50 ** 2 + 50 ** 2);

export const Body = ({ nodes }: Props) => {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const firstNodeX = useSharedValue(0);
  const firstNodeY = useSharedValue(0);
  const sharedNodes = useSharedValue<Node[]>(nodes);

  const canvasGesture = Gesture.Pan()
    .onStart(() => {
      offsetX.value = firstNodeX.value;
      offsetY.value = firstNodeY.value;
    })
    .onUpdate((e) => {
      "worklet";
      firstNodeX.value = e.translationX + offsetX.value;
      firstNodeY.value = e.translationY + offsetY.value;
      sharedNodes.value = sharedNodes.value.map((node) => ({
        x: node.x + e.translationX,
        y: node.y + e.translationY,
      }));
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: firstNodeX.value },
      { translateY: firstNodeY.value },
    ],
  }));

  return (
    <View>
      <GestureDetector gesture={canvasGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <RNSVGNode />
        </Animated.View>
      </GestureDetector>
      {nodes.map((node, index) => (
        <AnimatedNode
          key={`${node.x}-${node.y}`}
          node={sharedNodes.value[index]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
  },
});

const AnimatedNode = ({ node }: { node: Node }) => {
  const animatedNode = useAnimatedStyle(() => ({
    position: "absolute",
    transform: [{ translateX: node.x }, { translateY: node.y }],
  }));

  return (
    <Animated.View style={animatedNode}>
      <RNSVGNode />
    </Animated.View>
  );
};

// Idée : chaque node gère son propre animated style, et le node suivant.
// Le node passe sa sharedValue au node suivant.
// Le node suivant met à jour sa position avec la sharedValue du node précédent.
// Et ainsi de suite.
