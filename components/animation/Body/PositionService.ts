import { NativeEventEmitter } from "react-native";
import { Animal, AnimalNode, moveAnimalTo } from "../animation";

export class PositionService {
  private static animal: Animal = {
    spine: [],
  };

  private static eventEmitter = new NativeEventEmitter();

  static setPositions({
    animal,
    goTo,
  }: {
    animal: Animal;
    goTo: { x: number; y: number };
  }) {
    this.animal = moveAnimalTo({
      animal,
      x: goTo.x,
      y: goTo.y,
    });

    this.eventEmitter.emit("position-update", this.animal.spine);

    return this.animal;
  }
  static subscribe(callback: (positions: AnimalNode[]) => void) {
    const listener = this.eventEmitter.addListener("position-update", callback);
    return () => {
      listener.remove();
    };
  }
}
