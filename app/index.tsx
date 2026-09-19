// Nemo must be imported before TypeGpuVoronoiBackground: importing Skia
// registers its worklet serializer for native objects first. Importing
// TypeGPU (react-native-webgpu) first registers its serializer instead,
// which false-positives on Skia's native objects (it only checks for
// JSI native state + a Symbol.toStringTag, both of which Skia objects also
// have) and hijacks them, breaking Skia's UI-thread recorder.
import { Nemo } from "@/components/animation/Nemo";
import { TypeGpuStepByStepVoronoi } from "@/components/animation/Body/TypeGpuStepByStepVoronoi";
import { View } from "react-native";

const Fishes = () => {
  return (
    <View style={{ flex: 1 }}>
      <TypeGpuStepByStepVoronoi
        CELL_COUNT={40}
        borderColor={[0.40390625, 0.759375, 0.77890625]}
        seedOffset={100}
        fillOpacity={0.5}
      />
      <Nemo />
      <TypeGpuStepByStepVoronoi
        CELL_COUNT={40}
        fillOpacity={0.5}
        borderColor={[0.9, 0.9, 0.9]}
      />
    </View>
  );
};

export default Fishes;
