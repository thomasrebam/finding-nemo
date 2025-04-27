import Svg, { Circle } from "react-native-svg";

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
