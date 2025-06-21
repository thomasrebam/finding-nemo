import { Body } from "@/components/animation/Body/Body";
import { StyleSheet, View } from "react-native";

const Fishes = () => {
  return (
    <View style={styles.container}>
      <Body
        animal={{
          spine: [
            { x: 15, y: 15, size: 12 },
            { x: 30, y: 30, size: 12 },
            { x: 45, y: 45, size: 10 },
            { x: 60, y: 60, size: 9 },
            { x: 75, y: 75, size: 8 },
            { x: 90, y: 90, size: 7 },
            { x: 105, y: 105, size: 6 },
            { x: 120, y: 120, size: 5 },
            { x: 135, y: 135, size: 4 },
            { x: 150, y: 150, size: 3 },
            { x: 165, y: 165, size: 2 },
            { x: 180, y: 180, size: 1 },
          ],
        }}
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
