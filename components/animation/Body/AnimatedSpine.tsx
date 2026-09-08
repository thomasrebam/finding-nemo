import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { PositionService } from "./PositionService";

type Props = {
  size?: number;
};

export const BASE_NODE_SIZE = 12;

const SvgCircleNode = ({ size = BASE_NODE_SIZE }: Props) => {
  return (
    <Svg height={size * 2} width={size * 2} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="50" fill="#ed5c26" />
    </Svg>
  );
};

const AnimatedSpineNode = ({
  index,
  size,
}: {
  index: number;
  size: number;
}) => {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    const removeListener = PositionService.subscribe((positions) => {
      if (positions[index]) {
        x.value = withSpring(positions[index].x);
        y.value = withSpring(positions[index].y);
      }
    });
    return () => removeListener();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    transform: [{ translateX: x.value - size }, { translateY: y.value - size }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <SvgCircleNode size={size} />
    </Animated.View>
  );
};

const NODES = [12, 10, 8, 6, 4, 2, 1];

export const AnimatedSpine = () => {
  return (
    <>
      {NODES.map((size, index) => (
        <AnimatedSpineNode
          key={`spine-node-${index}`}
          index={index}
          size={size}
        />
      ))}
    </>
  );
};
