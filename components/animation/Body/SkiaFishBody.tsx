import { NemoColors } from "@/constants/Colors";
import { Canvas, Circle, Group, Path } from "@shopify/react-native-skia";
import { StyleSheet, View } from "react-native";
import { SharedValue, useDerivedValue } from "react-native-reanimated";
import { AnimalNode } from "../animation";
import { buildFishPathString, computeEyePositions } from "./drawSvg";

export const SkiaFishBody = ({
  spine,
}: {
  spine: SharedValue<AnimalNode[]>;
}) => {
  const { fishPath } = useFishPath(spine);

  // Create separate derived values for each eye coordinate
  const eyes = useEyesValues(spine);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Canvas
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <Group>
          {/* Fish body */}
          <Path
            path={fishPath}
            color={NemoColors.orange}
            style="fill"
            opacity={1}
          />

          {/* Eyes */}
          <Circle
            cx={eyes.topEyeX}
            cy={eyes.topEyeY}
            r={2}
            color={NemoColors.black}
          />
          <Circle
            cx={eyes.bottomEyeX}
            cy={eyes.bottomEyeY}
            r={2}
            color={NemoColors.black}
          />
        </Group>
      </Canvas>
    </View>
  );
};

const useFishPath = (spinePositions: SharedValue<AnimalNode[]>) => {
  const fishPath = useDerivedValue(() => {
    const spineNodes = spinePositions.value;

    return buildFishPathString(spineNodes);
  }, [spinePositions]);

  return { fishPath };
};

const useEyesValues = (spinePositions: SharedValue<AnimalNode[]>) => {
  const topEyeX = useDerivedValue(() => {
    const spineNodes = spinePositions.value;
    return computeEyePositions(spineNodes).topEyeX;
  }, [spinePositions]);

  const topEyeY = useDerivedValue(() => {
    const spineNodes = spinePositions.value;
    return computeEyePositions(spineNodes).topEyeY;
  }, [spinePositions]);

  const bottomEyeX = useDerivedValue(() => {
    const spineNodes = spinePositions.value;
    return computeEyePositions(spineNodes).bottomEyeX;
  }, [spinePositions]);

  const bottomEyeY = useDerivedValue(() => {
    const spineNodes = spinePositions.value;
    return computeEyePositions(spineNodes).bottomEyeY;
  }, [spinePositions]);

  return { topEyeX, topEyeY, bottomEyeX, bottomEyeY };
};
