import { Body } from "@/components/animation/Body/Body";
import { StyleSheet, View } from "react-native";

const Fishes = () => {
  return (
    <View style={styles.container}>
      <Body
        nodes={[
          { x: 25, y: 25 },
          { x: 50, y: 50 },
          { x: 50, y: 75 },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    padding: 20,
    backgroundColor: "blue",
  },
});

export default Fishes;
