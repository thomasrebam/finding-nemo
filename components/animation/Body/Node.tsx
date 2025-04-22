import { Circle } from "@shopify/react-native-skia";

type Props = {
  size?: number;
  x: number;
  y: number;
};

const BASE_SIZE = 20;

export const Node = ({ size = BASE_SIZE, x, y }: Props) => {
  return (
    <Circle
      cx={x}
      cy={y}
      r={size / 2}
      color="black"
      style="stroke"
      strokeWidth={4}
      strokeCap="round"
      strokeJoin="round"
    />
  );
};
