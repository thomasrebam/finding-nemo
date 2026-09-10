import { TypeGpuVoronoiBackground } from "@/components/animation/Body/TypeGpuVoronoiBackground";
import { Nemo } from "@/components/animation/Nemo";
import { View } from "react-native";

const Fishes = () => {
  return (
    <View style={{ flex: 1 }}>
      <Nemo />
      <TypeGpuVoronoiBackground />
    </View>
  );
};

export default Fishes;
