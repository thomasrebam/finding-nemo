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

export const BASE_NODE_STROKE = 4;

export const RNSVGNode = ({ size = BASE_NODE_SIZE }: Props) => {
  return (
    <Svg height={size * 2} width={size * 2} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="50" fill="green" />
    </Svg>
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
