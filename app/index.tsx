import { Nemo } from "@/components/animation/Nemo";
import { StyleSheet, View } from "react-native";

const Fishes = () => {
  return (
    <View style={styles.container}>
      <Nemo />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default Fishes;
