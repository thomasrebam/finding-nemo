import { NemoColors } from "@/constants/Colors";
import {
  Canvas,
  Circle,
  Fill,
  Group,
  Path,
  Shader,
  Skia,
  useClock,
} from "@shopify/react-native-skia";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { SharedValue, useDerivedValue } from "react-native-reanimated";
import { AnimalNode } from "../animation";

export const SkiaFishBody = ({
  spine,
}: {
  spine: SharedValue<AnimalNode[]>;
}) => {
  const { fishPath } = useFishPath(spine);

  // Create separate derived values for each eye coordinate
  const { topEyeX, topEyeY, bottomEyeX, bottomEyeY } = useEyesValues(spine);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* <SkiaVoronoiBackground /> */}
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
            cx={topEyeX}
            cy={topEyeY}
            r={3}
            color="#000000"
            opacity={0.5}
          />
          <Circle
            cx={bottomEyeX}
            cy={bottomEyeY}
            r={3}
            color="#000000"
            opacity={0.5}
          />
        </Group>
      </Canvas>
    </View>
  );
};

const useFishPath = (spinePositions: SharedValue<AnimalNode[]>) => {
  const fishPath = useDerivedValue(() => {
    const spineNodes = spinePositions.value;

    if (spineNodes.length < 2) {
      return "M 0 0"; // Return simple path if not enough nodes
    }

    // Create offset points for top and bottom of fish
    const leftSidePoints: { x: number; y: number }[] = [];
    const rightSidePoints: { x: number; y: number }[] = [];

    spineNodes.forEach((node, index) => {
      // Calculate perpendicular offset
      let angle = 0;

      if (index === 0) {
        // First node: use angle to next node
        const next = spineNodes[index + 1];
        angle = Math.atan2(next.y - node.y, next.x - node.x);
      } else if (index === spineNodes.length - 1) {
        // Last node: use angle from previous node
        const prev = spineNodes[index - 1];
        angle = Math.atan2(node.y - prev.y, node.x - prev.x);
      } else {
        // Middle nodes: average angle between neighbors
        const prev = spineNodes[index - 1];
        const next = spineNodes[index + 1];
        angle = Math.atan2(next.y - prev.y, next.x - prev.x);
      }

      // Use the node's size to determine the fish width at this point
      const currentWidth = node.displayedSize * 3;
      const perpAngle = angle + Math.PI / 2;

      // Special handling for the head node (first node)
      if (index === 0) {
        // Create a more detailed head shape for BOTH top and bottom
        const headRadius = currentWidth / 2;

        // Top head points
        const sideHead1X = node.x + Math.cos(perpAngle) * headRadius;
        const sideHead1Y = node.y + Math.sin(perpAngle) * headRadius;

        const tipHead1X = node.x - Math.cos(angle) * headRadius;
        const tipHead1Y = node.y - Math.sin(angle) * headRadius;
        const tipHead3X = node.x - Math.cos(angle - Math.PI / 6) * headRadius;
        const tipHead3Y = node.y - Math.sin(angle - Math.PI / 6) * headRadius;

        // Bottom head points (mirror of top)
        const sideHeadBottomX = node.x - Math.cos(perpAngle) * headRadius;
        const sideHeadBottomY = node.y - Math.sin(perpAngle) * headRadius;

        const tipHeadBottom1X = tipHead1X; // Same tip point
        const tipHeadBottom1Y = tipHead1Y;
        const tipHeadBottom3X =
          node.x - Math.cos(angle + Math.PI / 6) * headRadius; // Mirror of tipHead2
        const tipHeadBottom3Y =
          node.y - Math.sin(angle + Math.PI / 6) * headRadius;

        // Add detailed points to TOP
        leftSidePoints.push({ x: tipHead1X, y: tipHead1Y });
        leftSidePoints.push({ x: tipHead3X, y: tipHead3Y });
        leftSidePoints.push({ x: sideHead1X, y: sideHead1Y });

        // Add detailed points to BOTTOM (in reverse order for proper path)
        rightSidePoints.push({ x: tipHeadBottom1X, y: tipHeadBottom1Y });
        rightSidePoints.push({ x: tipHeadBottom3X, y: tipHeadBottom3Y });
        rightSidePoints.push({ x: sideHeadBottomX, y: sideHeadBottomY });
      } else {
        // Regular body nodes
        const offsetX = (Math.cos(perpAngle) * currentWidth) / 2;
        const offsetY = (Math.sin(perpAngle) * currentWidth) / 2;

        leftSidePoints.push({
          x: node.x + offsetX,
          y: node.y + offsetY,
        });

        rightSidePoints.push({
          x: node.x - offsetX,
          y: node.y - offsetY,
        });
      }
    });

    if (leftSidePoints.length === 0) return "M 0 0";

    // Build SVG path string with smooth curves for ALL points
    let pathString = `M ${leftSidePoints[0].x} ${leftSidePoints[0].y}`;

    // Add top fin
    if (leftSidePoints.length > 1) {
      const middleIndex = Math.floor(leftSidePoints.length / 2) + 1;
      const middlePoint = leftSidePoints[middleIndex];
      const angle = Math.atan2(
        leftSidePoints[middleIndex + 1].x - leftSidePoints[middleIndex - 1].x,
        leftSidePoints[middleIndex + 1].y - leftSidePoints[middleIndex - 1].y
      );
      const offsetX1 = (Math.cos(-angle - Math.PI / 2.5) * 15) / 2;
      const offsetY1 = (Math.sin(-angle - Math.PI / 2.5) * 15) / 2;
      const offsetX2 = (Math.cos(-angle - Math.PI / 6) * 5) / 2;
      const offsetY2 = (Math.sin(-angle - Math.PI / 6) * 5) / 2;
      leftSidePoints.splice(middleIndex, 0, {
        x: middlePoint.x - offsetX1,
        y: middlePoint.y - offsetY1,
      });
      leftSidePoints.splice(middleIndex, 0, {
        x: middlePoint.x - offsetX2,
        y: middlePoint.y - offsetY2,
      });
    }
    if (leftSidePoints.length > 5) {
      const baseIndex = 5;
      const middlePoint = leftSidePoints[baseIndex];
      const angle = Math.atan2(
        leftSidePoints[baseIndex + 1].x - leftSidePoints[baseIndex - 1].x,
        leftSidePoints[baseIndex + 1].y - leftSidePoints[baseIndex - 1].y
      );
      const offsetX2 = (Math.cos(-angle - Math.PI / 6) * 10) / 2;
      const offsetY2 = (Math.sin(-angle - Math.PI / 6) * 10) / 2;
      const offsetX3 = (Math.cos(-angle - Math.PI / 8) * 30) / 2;
      const offsetY3 = (Math.sin(-angle - Math.PI / 8) * 30) / 2;
      leftSidePoints.splice(baseIndex, 0, {
        x: middlePoint.x - offsetX2,
        y: middlePoint.y - offsetY2,
      });
      leftSidePoints.splice(baseIndex, 0, {
        x: middlePoint.x - offsetX3,
        y: middlePoint.y - offsetY3,
      });
    }

    // Add bottom fin
    if (rightSidePoints.length > 1) {
      const middleIndex = Math.floor(rightSidePoints.length / 2) + 1;
      const middlePoint = rightSidePoints[middleIndex];
      const angle = Math.atan2(
        rightSidePoints[middleIndex - 1].x - rightSidePoints[middleIndex + 1].x,
        rightSidePoints[middleIndex - 1].y - rightSidePoints[middleIndex + 1].y
      );
      const offsetX1 = (Math.cos(-angle + Math.PI / 2.5) * 15) / 2;
      const offsetY1 = (Math.sin(-angle + Math.PI / 2.5) * 15) / 2;
      const offsetX2 = (Math.cos(-angle + Math.PI / 6) * 5) / 2;
      const offsetY2 = (Math.sin(-angle + Math.PI / 6) * 5) / 2;
      rightSidePoints.splice(middleIndex, 0, {
        x: middlePoint.x - offsetX2,
        y: middlePoint.y - offsetY2,
      });
      rightSidePoints.splice(middleIndex, 0, {
        x: middlePoint.x - offsetX1,
        y: middlePoint.y - offsetY1,
      });
    }
    if (rightSidePoints.length > 4) {
      const baseIndex = 5;
      const middlePoint = rightSidePoints[baseIndex];
      const angle = Math.atan2(
        rightSidePoints[baseIndex - 1].x - rightSidePoints[baseIndex + 1].x,
        rightSidePoints[baseIndex - 1].y - rightSidePoints[baseIndex + 1].y
      );
      const offsetX2 = (Math.cos(-angle + Math.PI / 6) * 10) / 2;
      const offsetY2 = (Math.sin(-angle + Math.PI / 6) * 10) / 2;
      const offsetX3 = (Math.cos(-angle + Math.PI / 8) * 30) / 2;
      const offsetY3 = (Math.sin(-angle + Math.PI / 8) * 30) / 2;
      rightSidePoints.splice(baseIndex, 0, {
        x: middlePoint.x - offsetX2,
        y: middlePoint.y - offsetY2,
      });
      rightSidePoints.splice(baseIndex, 0, {
        x: middlePoint.x - offsetX3,
        y: middlePoint.y - offsetY3,
      });
    }

    // Draw top side - smooth curves for ALL points
    for (let i = 0; i < leftSidePoints.length; i++) {
      if (i === leftSidePoints.length - 1) {
        // Last point - just line to it
      } else {
        // Smooth curves between all points
        const nextPoint = leftSidePoints[i + 1];
        const controlX = (leftSidePoints[i].x + nextPoint.x) / 2;
        const controlY = (leftSidePoints[i].y + nextPoint.y) / 2;
        pathString += ` Q ${leftSidePoints[i].x} ${leftSidePoints[i].y} ${controlX} ${controlY}`;
      }
    }

    // Connect to bottom side (reverse order) - smooth curves for ALL points
    for (let i = rightSidePoints.length - 1; i >= 0; i--) {
      if (i === 0) {
        // Last bottom point - just line to it to close the shape
        pathString += ` Q ${rightSidePoints[i].x} ${rightSidePoints[i].y} ${leftSidePoints[0].x} ${leftSidePoints[0].y}`;
      } else {
        // Smooth curves between all bottom points
        const prevPoint = rightSidePoints[i - 1];
        const controlX = (rightSidePoints[i].x + prevPoint.x) / 2;
        const controlY = (rightSidePoints[i].y + prevPoint.y) / 2;
        pathString += ` Q ${rightSidePoints[i].x} ${rightSidePoints[i].y} ${controlX} ${controlY}`;
      }
    }

    pathString += " Z"; // Close path

    return pathString;
  }, [spinePositions]);

  return { fishPath };
};

const useEyesValues = (spinePositions: SharedValue<AnimalNode[]>) => {
  const topEyeX = useDerivedValue(() => {
    const spineNodes = spinePositions.value;
    if (spineNodes.length < 2) return 0;

    const headNode = spineNodes[0];
    const next = spineNodes[1];
    const angle = Math.atan2(next.y - headNode.y, next.x - headNode.x);
    const currentWidth = headNode.displayedSize * 3;
    const headRadius = currentWidth / 2;
    const perpAngle = angle + Math.PI / 2;

    return headNode.x + Math.cos(perpAngle) * headRadius * 0.7;
  }, [spinePositions]);

  const topEyeY = useDerivedValue(() => {
    const spineNodes = spinePositions.value;
    if (spineNodes.length < 2) return 0;

    const headNode = spineNodes[0];
    const next = spineNodes[1];
    const angle = Math.atan2(next.y - headNode.y, next.x - headNode.x);
    const currentWidth = headNode.displayedSize * 3;
    const headRadius = currentWidth / 2;
    const perpAngle = angle + Math.PI / 2;

    return headNode.y + Math.sin(perpAngle) * headRadius * 0.7;
  }, [spinePositions]);

  const bottomEyeX = useDerivedValue(() => {
    const spineNodes = spinePositions.value;
    if (spineNodes.length < 2) return 0;

    const headNode = spineNodes[0];
    const next = spineNodes[1];
    const angle = Math.atan2(next.y - headNode.y, next.x - headNode.x);
    const currentWidth = headNode.displayedSize * 3;
    const headRadius = currentWidth / 2;
    const perpAngle = angle + Math.PI / 2;

    return headNode.x - Math.cos(perpAngle) * headRadius * 0.7;
  }, [spinePositions]);

  const bottomEyeY = useDerivedValue(() => {
    const spineNodes = spinePositions.value;
    if (spineNodes.length < 2) return 0;

    const headNode = spineNodes[0];
    const next = spineNodes[1];
    const angle = Math.atan2(next.y - headNode.y, next.x - headNode.x);
    const currentWidth = headNode.displayedSize * 3;
    const headRadius = currentWidth / 2;
    const perpAngle = angle + Math.PI / 2;

    return headNode.y - Math.sin(perpAngle) * headRadius * 0.7;
  }, [spinePositions]);

  return { topEyeX, topEyeY, bottomEyeX, bottomEyeY };
};

const newSource = Skia.RuntimeEffect.Make(`
  uniform float iTime;
  uniform vec3 iResolution;
  
  vec2 N22(vec2 p) {
      vec3 a = fract(p.xyx * vec3(452.6, 725.34, 921.2));
      a += dot(a, a + 16.2);
      return fract(vec2(a.x * a.y, a.y * a.z));
  }
  
  vec4 main(vec2 fragCoord) {
      float aspectRatio = iResolution.x / iResolution.y;
      // Normalized pixel coordinates (from 0 to 1)
      vec2 uv = (aspectRatio * fragCoord - iResolution.xy)/iResolution.y;
      float t = iTime;
  
      float m = 0.;
      float minDist = 999999.;
  
      // generate random points, draw voronoi
      for (float i = 0.; i < 20.; i++) {
          vec2 n = N22(vec2(i));
          vec2 p = sin(n * ((t / 1000.) + 10.));
          p.x = p.x * aspectRatio;
  
          float d = length(p - uv);
          if (d < minDist) {
              minDist = d;
              m = d;
          }
  
      }
      
      // Output to screen - color
      vec3 col = vec3(0.01, 0.53, 0.87) * (1.4 + m) + vec3(1.7, 0., 0.) * m;
  
      return vec4(col,1.0);
  }`);

const colors = ["#4A90AA", "#4A90BB", "#4A80CC", "#109068"];

const SkiaVoronoiBackground = () => {
  const { width, height } = useWindowDimensions();

  const clock = useClock();
  const uniforms = useDerivedValue(
    () => ({
      iTime: clock.value,
      iResolution: [width, height, 1],
      colors: colors.map((color) => Skia.Color(color)),
    }),
    [clock]
  );

  return (
    <Fill>
      <Shader
        // @ts-expect-error - Skia.RuntimeEffect is not typed
        source={newSource}
        uniforms={uniforms}
      />
    </Fill>
  );
};
