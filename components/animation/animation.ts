export type AnimalNode = {
  x: number;
  y: number;
  size: number;
};

export type Animal = {
  spine: AnimalNode[];
};

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

  // Calculate positions for other nodes
  for (let index = 0; index < oldSpine.length; index++) {
    const currentNode = oldSpine[index];

    if (index === 0) {
      newSpine[index] = {
        size: currentNode.size,
        x,
        y,
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
        size: theoreticalDistanceWithPreviousNode,
      };
    }
  }

  return {
    spine: newSpine,
  };
};
