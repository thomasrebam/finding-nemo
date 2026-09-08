import { NativeEventEmitter } from "react-native";
import { AnimalNode } from "../animation";

// Spine positions are now computed on the UI thread (see Body.tsx) for
// zero-lag tracking of the pointer. This service only re-publishes the
// already-computed positions to JS-thread consumers (e.g. RedrawFishBody's
// canvas render loop) that can't read UI-thread shared values directly.
export class PositionService {
  private static readonly eventEmitter = new NativeEventEmitter({} as any);

  static publish(spine: AnimalNode[]) {
    this.eventEmitter.emit("position-update", spine);
  }

  static subscribe(callback: (positions: AnimalNode[]) => void) {
    const listener = this.eventEmitter.addListener("position-update", callback);
    return () => {
      listener.remove();
    };
  }
}
