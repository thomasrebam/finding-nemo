import { Canvas, Path } from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Node } from "./Node";

type Node = {
  x: number;
  y: number;
};

type Props = {
  nodes: Node[];
  size?: { width: number; height: number };
};

const NODE_HIT_AREA = 30; // Size of the touchable area for the first node

export const Body = ({ nodes, size = { width: 200, height: 200 } }: Props) => {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const canvasX = useSharedValue(0);
  const canvasY = useSharedValue(0);

  // Create a path that connects all nodes
  const path = nodes.reduce((acc, node, index) => {
    if (index === 0) {
      return `M ${node.x} ${node.y}`;
    }
    return `${acc} L ${node.x} ${node.y}`;
  }, "");

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
    <GestureDetector gesture={canvasGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <Canvas style={[styles.canvas, size]}>
          <Path
            path={path}
            color="black"
            style="stroke"
            strokeWidth={4}
            strokeCap="round"
            strokeJoin="round"
          />
          {nodes.map((node, index) => (
            <Node
              key={`${node.x}-${node.y}`}
              x={node.x}
              y={node.y}
              size={index === 0 ? NODE_HIT_AREA : undefined}
            />
          ))}
        </Canvas>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
  },
  canvas: {
    backgroundColor: "red",
  },
});
