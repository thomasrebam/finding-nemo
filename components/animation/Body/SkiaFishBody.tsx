import { NemoColors } from "@/constants/Colors";
import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  vec,
} from "@shopify/react-native-skia";
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
  const gradientStart = useDerivedValue(() => {
    const head = spine.value[0];
    return vec(head.x, head.y);
  }, [spine]);
  const gradientEnd = useDerivedValue(() => {
    const tail = spine.value[spine.value.length - 1];
    return vec(tail.x, tail.y);
  }, [spine]);

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
          <Path path={fishPath} style="fill" opacity={1}>
            <LinearGradient
              start={gradientStart}
              end={gradientEnd}
              colors={[
                NemoColors.orange,
                NemoColors.white,
                NemoColors.orange,
                NemoColors.white,
                NemoColors.orange,
                NemoColors.white,
                NemoColors.orange,
                NemoColors.white,
                NemoColors.orange,
                NemoColors.white,
                NemoColors.orange,
                NemoColors.white,
              ]}
            />
          </Path>

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
