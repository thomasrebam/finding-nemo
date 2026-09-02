import { NativeEventEmitter } from "react-native";
import { Animal, AnimalNode, computeNextSpine } from "../animation";

export class PositionService {
  private static animal: Animal = {
    spine: [],
  };

  private static readonly eventEmitter = new NativeEventEmitter({} as any);

  static setPositions({
    animal,
    goTo,
  }: {
    animal: Animal;
    goTo: { x: number; y: number };
  }) {
    this.animal = computeNextSpine({
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
