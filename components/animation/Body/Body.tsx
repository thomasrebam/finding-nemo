import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { RNSVGNode } from "./RNSVGNode";

type Node = {
  x: number;
  y: number;
};

type Props = {
  nodes: Node[];
};

export const Body = ({ nodes }: Props) => {
  // Lead node position (first fish)
  const leadX = useSharedValue(0);
  const leadY = useSharedValue(0);

  return (
    <View style={styles.container}>
      <LeadNode x={leadX} y={leadY} allNodes={[{ x: 0, y: 0 }, ...nodes]} />
    </View>
  );
};

type LeadNodeProps = {
  allNodes: Node[];
  x: SharedValue<number>;
  y: SharedValue<number>;
};

const LeadNode = ({ allNodes, x, y }: LeadNodeProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  // For lead node only - handle gesture
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onStart(() => {
      offsetX.value = x.value;
      offsetY.value = y.value;
    })
    .onUpdate((e) => {
      "worklet";
      x.value = e.translationX + offsetX.value;
      y.value = e.translationY + offsetY.value;
    });

  // We assume to have at least 2 nodes
  const nextNode = allNodes[1] as Node;

  // If there's a follower, create shared values for its position
  const followerX = useSharedValue(nextNode.x);
  const followerY = useSharedValue(nextNode.y);

  useDerivedValue(() => {
    const currentNode = allNodes[0];
    const theoreticalDistanceWithCurrentNode = Math.sqrt(
      (currentNode.x - nextNode.x) ** 2 + (currentNode.y - nextNode.y) ** 2
    );
    const distanceWithCurrentNode = Math.sqrt(
      (followerX.value - x.value) ** 2 + (followerY.value - y.value) ** 2
    );

    if (distanceWithCurrentNode === 0) {
      return;
    }
    const sinusSign = Math.sign(
      Math.asin((followerY.value - y.value) / distanceWithCurrentNode)
    );
    const theta =
      sinusSign *
      Math.acos((followerX.value - x.value) / distanceWithCurrentNode);

    if (distanceWithCurrentNode !== theoreticalDistanceWithCurrentNode) {
      followerX.value = withSpring(
        Math.cos(theta) * theoreticalDistanceWithCurrentNode
      );
      followerY.value = withSpring(
        Math.sin(theta) * theoreticalDistanceWithCurrentNode
      );
    }
  });

  return (
    <Animated.View style={animatedStyle}>
      <GestureDetector gesture={gesture}>
        <View style={{ zIndex: 100 }}>
          <RNSVGNode />
        </View>
      </GestureDetector>
      <RecursiveNode
        x={followerX}
        y={followerY}
        allNodes={allNodes}
        nodeIndex={1}
      />
    </Animated.View>
  );
};

type RecursiveNodeProps = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  allNodes: Node[];
  nodeIndex: number;
};

const RecursiveNode = ({ x, y, allNodes, nodeIndex }: RecursiveNodeProps) => {
  // Render current node and recursively render first follower if any
  const nextNode = allNodes[nodeIndex + 1];

  if (!nextNode) {
    return <LastNodeStanding x={x} y={y} />;
  }

  return (
    <NonLastRecursiveNode
      nextNode={nextNode}
      allNodes={allNodes}
      nodeIndex={nodeIndex}
      x={x}
      y={y}
    />
  );
};

const NonLastRecursiveNode = ({
  allNodes,
  nodeIndex,
  x,
  y,
  nextNode,
}: RecursiveNodeProps & { nextNode: Node }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  // If there's a follower, create shared values for its position
  const followerX = useSharedValue(nextNode.x - allNodes[nodeIndex].x);
  const followerY = useSharedValue(nextNode.y - allNodes[nodeIndex].y);

  useDerivedValue(() => {
    const currentNode = allNodes[nodeIndex];
    const theoreticalDistanceWithCurrentNode = Math.sqrt(
      (currentNode.x - nextNode.x) ** 2 + (currentNode.y - nextNode.y) ** 2
    );
    const distanceWithCurrentNode = Math.sqrt(
      followerX.value ** 2 + followerY.value ** 2
    );

    if (distanceWithCurrentNode === 0) {
      return;
    }

    const sinusSign = Math.sign(
      Math.asin(followerY.value / distanceWithCurrentNode)
    );
    const theta =
      sinusSign * Math.acos(followerX.value / distanceWithCurrentNode);
    if (distanceWithCurrentNode !== theoreticalDistanceWithCurrentNode) {
      followerX.value = withSpring(
        Math.cos(theta) * theoreticalDistanceWithCurrentNode
      );
      followerY.value = withSpring(
        Math.sin(theta) * theoreticalDistanceWithCurrentNode
      );
    }
  });

  return (
    <Animated.View style={animatedStyle}>
      <RNSVGNode />
      <RecursiveNode
        x={followerX}
        y={followerY}
        allNodes={allNodes}
        nodeIndex={nodeIndex + 1}
      />
    </Animated.View>
  );
};

const LastNodeStanding = ({
  x,
  y,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <RNSVGNode />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
