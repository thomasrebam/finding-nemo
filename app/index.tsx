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
        CELL_COUNT={20}
        borderColor={[0.08, 0.3, 0.55]}
        seedOffset={100}
        fillOpacity={0.5}
      />
      <Nemo />
      <TypeGpuStepByStepVoronoi CELL_COUNT={20} fillOpacity={0.5} />
    </View>
  );
};

export default Fishes;
