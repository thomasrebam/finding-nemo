import { Canvas, Circle, Group, Path } from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import {
  SharedValue,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { AnimalNode } from "../animation";
import { PositionService } from "./PositionService";

export const SkiaFishBody = () => {
  const spinePositions = useSharedValue<AnimalNode[]>([]);

  // Subscribe to position service
  useEffect(() => {
    const removeListener = PositionService.subscribe((positions) => {
      spinePositions.value = positions;
    });
    return () => removeListener();
  }, []);

  const { fishPath } = useFishPath(spinePositions);

  // Create separate derived values for each eye coordinate
  const { topEyeX, topEyeY, bottomEyeX, bottomEyeY } =
    useEyesValues(spinePositions);

  return (
    <Canvas
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Group>
        {/* Fish body */}
        <Path path={fishPath} color="#4A90E2" style="fill" />
        <Path path={fishPath} color="#2E5A8A" style="stroke" strokeWidth={2} />

        {/* Eyes */}
        <Circle cx={topEyeX} cy={topEyeY} r={3} color="#2E5A8A" />
        <Circle cx={bottomEyeX} cy={bottomEyeY} r={3} color="#2E5A8A" />
      </Group>
    </Canvas>
  );
};

const useFishPath = (spinePositions: SharedValue<AnimalNode[]>) => {
  const fishPath = useDerivedValue(() => {
    const spineNodes = spinePositions.value;

    if (spineNodes.length < 2) {
      return "M 0 0"; // Return simple path if not enough nodes
    }

    // Create offset points for top and bottom of fish
    const topPoints: { x: number; y: number }[] = [];
    const bottomPoints: { x: number; y: number }[] = [];

    spineNodes.forEach((node, index) => {
      // Calculate perpendicular offset
      let angle = 0;

      if (index === 0 && spineNodes.length > 1) {
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
        topPoints.push({ x: tipHead1X, y: tipHead1Y });
        topPoints.push({ x: tipHead3X, y: tipHead3Y });
        topPoints.push({ x: sideHead1X, y: sideHead1Y });

        // Add detailed points to BOTTOM (in reverse order for proper path)
        bottomPoints.push({ x: tipHeadBottom1X, y: tipHeadBottom1Y });
        bottomPoints.push({ x: tipHeadBottom3X, y: tipHeadBottom3Y });
        bottomPoints.push({ x: sideHeadBottomX, y: sideHeadBottomY });
      } else {
        // Regular body nodes
        const offsetX = (Math.cos(perpAngle) * currentWidth) / 2;
        const offsetY = (Math.sin(perpAngle) * currentWidth) / 2;

        topPoints.push({
          x: node.x + offsetX,
          y: node.y + offsetY,
        });

        bottomPoints.push({
          x: node.x - offsetX,
          y: node.y - offsetY,
        });
      }
    });

    if (topPoints.length === 0) return "M 0 0";

    // Build SVG path string with smooth curves for ALL points
    let pathString = `M ${topPoints[0].x} ${topPoints[0].y}`;

    // Add top fin
    if (topPoints.length > 1) {
      const middleIndex = Math.floor(topPoints.length / 2) + 1;
      const middlePoint = topPoints[middleIndex];
      const angle = Math.atan2(
        topPoints[middleIndex + 1].x - topPoints[middleIndex - 1].x,
        topPoints[middleIndex + 1].y - topPoints[middleIndex - 1].y
      );
      const offsetX1 = (Math.cos(-angle - Math.PI / 2.5) * 15) / 2;
      const offsetY1 = (Math.sin(-angle - Math.PI / 2.5) * 15) / 2;
      const offsetX2 = (Math.cos(-angle - Math.PI / 6) * 5) / 2;
      const offsetY2 = (Math.sin(-angle - Math.PI / 6) * 5) / 2;
      topPoints.splice(middleIndex, 0, {
        x: middlePoint.x - offsetX1,
        y: middlePoint.y - offsetY1,
      });
      topPoints.splice(middleIndex, 0, {
        x: middlePoint.x - offsetX2,
        y: middlePoint.y - offsetY2,
      });
    }
    if (topPoints.length > 5) {
      const baseIndex = 5;
      const middlePoint = topPoints[baseIndex];
      const angle = Math.atan2(
        topPoints[baseIndex + 1].x - topPoints[baseIndex - 1].x,
        topPoints[baseIndex + 1].y - topPoints[baseIndex - 1].y
      );
      const offsetX2 = (Math.cos(-angle - Math.PI / 6) * 10) / 2;
      const offsetY2 = (Math.sin(-angle - Math.PI / 6) * 10) / 2;
      const offsetX3 = (Math.cos(-angle - Math.PI / 8) * 30) / 2;
      const offsetY3 = (Math.sin(-angle - Math.PI / 8) * 30) / 2;
      topPoints.splice(baseIndex, 0, {
        x: middlePoint.x - offsetX2,
        y: middlePoint.y - offsetY2,
      });
      topPoints.splice(baseIndex, 0, {
        x: middlePoint.x - offsetX3,
        y: middlePoint.y - offsetY3,
      });
    }

    // Add bottom fin
    if (bottomPoints.length > 1) {
      const middleIndex = Math.floor(bottomPoints.length / 2) + 1;
      const middlePoint = bottomPoints[middleIndex];
      const angle = Math.atan2(
        bottomPoints[middleIndex - 1].x - bottomPoints[middleIndex + 1].x,
        bottomPoints[middleIndex - 1].y - bottomPoints[middleIndex + 1].y
      );
      const offsetX1 = (Math.cos(-angle + Math.PI / 2.5) * 15) / 2;
      const offsetY1 = (Math.sin(-angle + Math.PI / 2.5) * 15) / 2;
      const offsetX2 = (Math.cos(-angle + Math.PI / 6) * 5) / 2;
      const offsetY2 = (Math.sin(-angle + Math.PI / 6) * 5) / 2;
      bottomPoints.splice(middleIndex, 0, {
        x: middlePoint.x - offsetX2,
        y: middlePoint.y - offsetY2,
      });
      bottomPoints.splice(middleIndex, 0, {
        x: middlePoint.x - offsetX1,
        y: middlePoint.y - offsetY1,
      });
    }
    if (bottomPoints.length > 4) {
      const baseIndex = 5;
      const middlePoint = bottomPoints[baseIndex];
      const angle = Math.atan2(
        bottomPoints[baseIndex - 1].x - bottomPoints[baseIndex + 1].x,
        bottomPoints[baseIndex - 1].y - bottomPoints[baseIndex + 1].y
      );
      const offsetX2 = (Math.cos(-angle + Math.PI / 6) * 10) / 2;
      const offsetY2 = (Math.sin(-angle + Math.PI / 6) * 10) / 2;
      const offsetX3 = (Math.cos(-angle + Math.PI / 8) * 30) / 2;
      const offsetY3 = (Math.sin(-angle + Math.PI / 8) * 30) / 2;
      bottomPoints.splice(baseIndex, 0, {
        x: middlePoint.x - offsetX2,
        y: middlePoint.y - offsetY2,
      });
      bottomPoints.splice(baseIndex, 0, {
        x: middlePoint.x - offsetX3,
        y: middlePoint.y - offsetY3,
      });
    }

    // Draw top side - smooth curves for ALL points
    for (let i = 0; i < topPoints.length; i++) {
      if (i === topPoints.length - 1) {
        // Last point - just line to it
      } else {
        // Smooth curves between all points
        const nextPoint = topPoints[i + 1];
        const controlX = (topPoints[i].x + nextPoint.x) / 2;
        const controlY = (topPoints[i].y + nextPoint.y) / 2;
        pathString += ` Q ${topPoints[i].x} ${topPoints[i].y} ${controlX} ${controlY}`;
      }
    }

    // Connect to bottom side (reverse order) - smooth curves for ALL points
    for (let i = bottomPoints.length - 1; i >= 0; i--) {
      if (i === 0) {
        // Last bottom point - just line to it to close the shape
        pathString += ` Q ${bottomPoints[i].x} ${bottomPoints[i].y} ${topPoints[0].x} ${topPoints[0].y}`;
      } else {
        // Smooth curves between all bottom points
        const prevPoint = bottomPoints[i - 1];
        const controlX = (bottomPoints[i].x + prevPoint.x) / 2;
        const controlY = (bottomPoints[i].y + prevPoint.y) / 2;
        pathString += ` Q ${bottomPoints[i].x} ${bottomPoints[i].y} ${controlX} ${controlY}`;
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
