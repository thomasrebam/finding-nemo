import { Canvas, Group, Path } from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import { AnimalNode } from "../animation";
import { PositionService } from "./PositionService";

type Props = {
  width?: number;
  height?: number;
};

export const SkiaFishBody = ({ width = 300, height = 300 }: Props) => {
  const spinePositions = useSharedValue<AnimalNode[]>([]);

  useEffect(() => {
    const removeListener = PositionService.subscribe((positions) => {
      spinePositions.value = positions;
    });
    return () => removeListener();
  }, []);

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
      const currentWidth = node.size; // Increased multiplier to make size differences more visible

      // Perpendicular angle for offsets
      const perpAngle = angle + Math.PI / 2;

      // Create offset points
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
    });

    if (topPoints.length === 0) return "M 0 0";

    // Build SVG path string - using linear connections to preserve width differences
    let pathString = `M ${topPoints[0].x} ${topPoints[0].y}`;

    // Draw top side with linear connections to preserve width variations
    for (let i = 1; i < topPoints.length; i++) {
      pathString += ` L ${topPoints[i].x} ${topPoints[i].y}`;
    }

    // Connect to bottom side (reverse order)
    for (let i = bottomPoints.length - 1; i >= 0; i--) {
      pathString += ` L ${bottomPoints[i].x} ${bottomPoints[i].y}`;
    }

    pathString += " Z"; // Close path
    return pathString;
  }, [spinePositions]);

  return (
    <Canvas style={{ width, height, position: "absolute" }}>
      <Group>
        <Path path={fishPath} color="#4A90E2" style="fill" />
        <Path path={fishPath} color="#2E5A8A" style="stroke" strokeWidth={2} />
      </Group>
    </Canvas>
  );
};
