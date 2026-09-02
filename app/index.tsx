import { Nemo } from "@/components/animation/Nemo";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Fishes = () => {
  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
      edges={["top", "bottom"]}
    >
      <View style={{ flex: 1 }}>
        <Nemo />
      </View>
    </SafeAreaView>
  );
};

export default Fishes;
