import { NemoColors } from "@/constants/Colors";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { AnimalNode } from "../animation";

type Props = {
  size?: number;
};

export const BASE_NODE_SIZE = 12;

const SvgCircleNode = ({ size = BASE_NODE_SIZE }: Props) => {
  return (
    <Svg height={size * 2} width={size * 2} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="50" fill={NemoColors.orange} />
    </Svg>
  );
};

const AnimatedSpineNode = ({
  index,
  spine,
}: {
  index: number;
  spine: SharedValue<AnimalNode[]>;
}) => {
  const node = useDerivedValue(() => spine.value[index]);

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    transform: [
      { translateX: node.value.x - node.value.displayedSize },
      { translateY: node.value.y - node.value.displayedSize },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <SvgCircleNode size={node.value.displayedSize} />
    </Animated.View>
  );
};

const NODES = [12, 10, 8, 6, 4, 2, 1];

export const AnimatedSpine = ({
  spine,
}: {
  spine: SharedValue<AnimalNode[]>;
}) => {
  const nodes = useDerivedValue(() => spine.value);
  return (
    <>
      {nodes.value.map((_, index) => (
        <AnimatedSpineNode
          key={`spine-node-${index}`}
          index={index}
          spine={spine}
        />
      ))}
    </>
  );
};
