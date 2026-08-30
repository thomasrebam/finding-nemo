import { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import {
  RedrawCanvas,
  RedrawProvider,
  RenderCallback,
} from "react-native-redraw";
import { Circle, LinearGradient, Paint, parseSVG } from "redraw";
import { AnimalNode } from "../animation";
import { PositionService } from "./PositionService";

export const RedrawFishBody = () => {
  const spinePositionsRef = useRef<AnimalNode[]>([]);

  // Subscribe to position service. The listener fires on the JS thread, same
  // as RedrawCanvas's render loop, so a plain ref (read every frame below) is
  // enough - no need for a cross-thread Reanimated shared value here.
  useEffect(() => {
    const removeListener = PositionService.subscribe((positions) => {
      spinePositionsRef.current = positions;
    });
    return () => removeListener();
  }, []);

  // GradientAlongPath shades by ctx.t, which only exists on stroked paths
  // (a fill reports ctx.t = 0, i.e. a flat color) - LinearGradient shades by
  // position instead, so it actually paints on the filled body. Pointing its
  // live from/to at the head and tail every frame keeps the axis following
  // the spine instead of a fixed screen direction.
  const bodyGradient = useRef(
    new LinearGradient([
      "#ed5c26",
      "#ffffff",
      "#ed5c26",
      "#ffffff",
      "#ed5c26",
      "#ffffff",
    ])
  ).current;
  const bodyPaint = useRef(new Paint().addShader(bodyGradient)).current;
  const eyePaint = useRef(new Paint().setColor("rgba(0, 0, 0, 0.5)")).current;

  const render: RenderCallback = useCallback(
    (canvas) => {
      const spineNodes = spinePositionsRef.current;
      if (spineNodes.length < 2) return;

      const head = spineNodes[0];
      const tail = spineNodes[spineNodes.length - 1];
      bodyGradient.from = [head.x, head.y];
      bodyGradient.to = [tail.x, tail.y];

      const fishPath = parseSVG(buildFishPathString(spineNodes));
      canvas.drawPath(fishPath, bodyPaint);

      const { topEyeX, topEyeY, bottomEyeX, bottomEyeY } =
        computeEyePositions(spineNodes);
      canvas.draw(new Circle([topEyeX, topEyeY], 3), eyePaint);
      canvas.draw(new Circle([bottomEyeX, bottomEyeY], 3), eyePaint);
    },
    [bodyGradient, bodyPaint, eyePaint]
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <RedrawProvider>
        <RedrawCanvas
          style={{ width: "100%", height: "100%" }}
          render={render}
        />
      </RedrawProvider>
      {/* <TypeGpuVoronoiBackground /> */}
    </View>
  );
};

const buildFishPathString = (spineNodes: AnimalNode[]): string => {
  if (spineNodes.length < 2) return "M 0 0";

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
};

const computeEyePositions = (spineNodes: AnimalNode[]) => {
  const headNode = spineNodes[0];
  const next = spineNodes[1];
  const angle = Math.atan2(next.y - headNode.y, next.x - headNode.x);
  const currentWidth = headNode.displayedSize * 3;
  const headRadius = currentWidth / 2;
  const perpAngle = angle + Math.PI / 2;

  return {
    topEyeX: headNode.x + Math.cos(perpAngle) * headRadius * 0.7,
    topEyeY: headNode.y + Math.sin(perpAngle) * headRadius * 0.7,
    bottomEyeX: headNode.x - Math.cos(perpAngle) * headRadius * 0.7,
    bottomEyeY: headNode.y - Math.sin(perpAngle) * headRadius * 0.7,
  };
};
