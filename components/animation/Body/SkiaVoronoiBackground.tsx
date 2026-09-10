import { Fill, Shader, Skia, useClock } from "@shopify/react-native-skia";
import { useWindowDimensions } from "react-native";
import { useDerivedValue } from "react-native-reanimated";

const newSource = Skia.RuntimeEffect.Make(`
    uniform float iTime;
    uniform vec3 iResolution;
    
    vec2 N22(vec2 p) {
        vec3 a = fract(p.xyx * vec3(452.6, 725.34, 921.2));
        a += dot(a, a + 16.2);
        return fract(vec2(a.x * a.y, a.y * a.z));
    }
    
    vec4 main(vec2 fragCoord) {
        float aspectRatio = iResolution.x / iResolution.y;
        // Normalized pixel coordinates (from 0 to 1)
        vec2 uv = (aspectRatio * fragCoord - iResolution.xy)/iResolution.y;
        float t = iTime;
    
        float m = 0.;
        float minDist = 999999.;
    
        // generate random points, draw voronoi
        for (float i = 0.; i < 20.; i++) {
            vec2 n = N22(vec2(i));
            vec2 p = sin(n * ((t / 1000.) + 10.));
            p.x = p.x * aspectRatio;
    
            float d = length(p - uv);
            if (d < minDist) {
                minDist = d;
                m = d;
            }
    
        }
        
        // Output to screen - color
        vec3 col = vec3(0.01, 0.53, 0.87) * (1.4 + m) + vec3(1.7, 0., 0.) * m;
    
        return vec4(col,1.0);
    }`);

const colors = ["#4A90AA", "#4A90BB", "#4A80CC", "#109068"];

const SkiaVoronoiBackground = () => {
  const { width, height } = useWindowDimensions();

  const clock = useClock();
  const uniforms = useDerivedValue(
    () => ({
      iTime: clock.value,
      iResolution: [width, height, 1],
      colors: colors.map((color) => Skia.Color(color)),
    }),
    [clock]
  );

  return (
    <Fill>
      <Shader
        // @ts-expect-error - Skia.RuntimeEffect is not typed
        source={newSource}
        uniforms={uniforms}
      />
    </Fill>
  );
};
