# Finding Nemo 🐠

This is a little Expo playground where a Nemo-style fish swims after your finger, rendered on a live animated voronoi background.

## What's in here

### Spine-following fish body

[components/animation/animation.ts](components/animation/animation.ts) -> a simple inverse-kinematics chain: each spine node chases the previous one at a fixed distance, so dragging the head with a pan gesture ([components/animation/Body/Body.tsx](components/animation/Body/Body.tsx)) makes the whole body trail behind naturally.

### Skia-rendered body

[components/animation/Body/SkiaFishBody.tsx](components/animation/Body/SkiaFishBody.tsx) -> the fish outline and eyes are drawn through [Skia](https://shopify.github.io/react-native-skia/).

### Redraw-rendered body

[components/animation/Body/RedrawFishBody.tsx](components/animation/Body/RedrawFishBody.tsx) -> the fish outline and eyes are drawn every frame with [react-native-redraw](https://redraw.dev/docs/intro), shaded with a custom spine-gradient shader ([SpineGradient.ts](components/animation/Body/SpineGradient.ts)) and a velocity-based motion blur.

> **_NOTE:_** At the time I am publishing this repo, redraw is still closed source. To run the redraw fish body, you might want to go to [https://wcandillon.dev/](https://wcandillon.dev/) to get a license and install the corresponding tar.gz packages.

### TypeGPU voronoi background

[components/animation/Body/TypeGpuStepByStepVoronoi.tsx](components/animation/Body/TypeGpuStepByStepVoronoi.tsx) -> an animated cell pattern built with [TypeGPU](https://typegpu.com), layered above and below the fish.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```
