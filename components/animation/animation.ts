export type AnimalNode = {
  x: number;
  y: number;
  // represents the distance between the node and the next node
  size: number;
  // represents the width of the node on the screen
  displayedSize: number;
};

export type Animal = {
  spine: AnimalNode[];
};

const MAX_DISTANCE_BY_INCREMENT = 10;

export const moveAnimalTo = ({
  animal,
  x,
  y,
}: {
  animal: Animal;
  x: number;
  y: number;
}) => {
  const oldSpine = [...animal.spine];
  const newSpine = [...animal.spine];

  for (let index = 0; index < oldSpine.length; index++) {
    const currentNode = oldSpine[index];

    if (index === 0) {
      const theta = Math.atan2(y - currentNode.y, x - currentNode.x);

      newSpine[index] = {
        size: currentNode.size,
        x: Math.cos(theta) * MAX_DISTANCE_BY_INCREMENT + currentNode.x,
        y: Math.sin(theta) * MAX_DISTANCE_BY_INCREMENT + currentNode.y,
        displayedSize: currentNode.displayedSize,
      };

      continue;
    }

    const previousNode = newSpine[index - 1];

    const theoreticalDistanceWithPreviousNode = previousNode.size;

    const currentDistanceWithPreviousNode = Math.sqrt(
      (previousNode.x - currentNode.x) ** 2 +
        (previousNode.y - currentNode.y) ** 2
    );

    const theta = Math.atan2(
      currentNode.y - previousNode.y,
      currentNode.x - previousNode.x
    );

    if (
      currentDistanceWithPreviousNode !== theoreticalDistanceWithPreviousNode
    ) {
      newSpine[index] = {
        x:
          Math.cos(theta) * theoreticalDistanceWithPreviousNode +
          previousNode.x,
        y:
          Math.sin(theta) * theoreticalDistanceWithPreviousNode +
          previousNode.y,
        size: currentNode.size,
        displayedSize: currentNode.displayedSize,
      };
    }
  }

  return {
    spine: newSpine,
  };
};
