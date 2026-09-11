import { createColor, type Binding } from "redraw";
import { d, std } from "typegpu";

interface SpinePoint {
  x: number;
  y: number;
}

type Vec2Tuple = [number, number];

// Six fixed anchors resampled every frame from the live spine's arc length
// (0%, 20%, ..., 100%), matching the six-color clownfish palette one-to-one.
// This is the "createColor" counterpart of SpineGradient.ts: instead of a
// dynamic pool of however-many spine points (which createColor's fixed-shape
// props can't express - see the discussion that led here), it approximates
// "closest point on the spine" with a small, compile-time-fixed number of
// segments, so the whole shader can be authored as a plain "use gpu" function
// with named vec2 props instead of hand-written WGSL + manual pool packing.
interface SpineGradientSimpleProps {
  p0: Vec2Tuple;
  p1: Vec2Tuple;
  p2: Vec2Tuple;
  p3: Vec2Tuple;
  p4: Vec2Tuple;
  p5: Vec2Tuple;
}

// The per-segment "closest point" math is inlined 5 times rather than
// factored into a shared `tgpu.fn` helper: `createColor` resolves this
// callback with the (differently versioned) typegpu instance `redraw`
// bundles internally, and a helper built with the project's own `typegpu`
// is a foreign object to that resolver - calling it from here crashed at
// runtime ("Cannot read property 'filter' of undefined") even though it
// typechecked fine. Staying inside one callback avoids crossing that
// boundary, matching the pattern the working `HeartFill` example uses.
//
// The callback itself is cast at the boundary for the same version-mismatch
// reason (vec types aren't structurally identical to TypeScript, even though
// they're the same shape at runtime).
const spineGradientSimpleFn = createColor(
  ((_ctx: any, tctx: any, _paint: any, props: any) => {
    "use gpu";
    const pos = tctx.pos as unknown as d.v2f;

    const orange = d.vec4f(0.929, 0.361, 0.149, 1);
    const white = d.vec4f(1, 1, 1, 1);

    const p0 = props.p0 as unknown as d.v2f;
    const p1 = props.p1 as unknown as d.v2f;
    const p2 = props.p2 as unknown as d.v2f;
    const p3 = props.p3 as unknown as d.v2f;
    const p4 = props.p4 as unknown as d.v2f;
    const p5 = props.p5 as unknown as d.v2f;

    // Segment 0: p0 -> p1 (orange -> white)
    const ba0 = p1.sub(p0);
    const h0 = std.clamp(
      std.dot(pos.sub(p0), ba0) / std.max(std.dot(ba0, ba0), 0.000001),
      0,
      1
    );
    const toClosest0 = pos.sub(p0.add(ba0.mul(h0)));
    const distSq0 = std.dot(toClosest0, toClosest0);

    // Segment 1: p1 -> p2 (white -> orange)
    const ba1 = p2.sub(p1);
    const h1 = std.clamp(
      std.dot(pos.sub(p1), ba1) / std.max(std.dot(ba1, ba1), 0.000001),
      0,
      1
    );
    const toClosest1 = pos.sub(p1.add(ba1.mul(h1)));
    const distSq1 = std.dot(toClosest1, toClosest1);

    // Segment 2: p2 -> p3 (orange -> white)
    const ba2 = p3.sub(p2);
    const h2 = std.clamp(
      std.dot(pos.sub(p2), ba2) / std.max(std.dot(ba2, ba2), 0.000001),
      0,
      1
    );
    const toClosest2 = pos.sub(p2.add(ba2.mul(h2)));
    const distSq2 = std.dot(toClosest2, toClosest2);

    // Segment 3: p3 -> p4 (white -> orange)
    const ba3 = p4.sub(p3);
    const h3 = std.clamp(
      std.dot(pos.sub(p3), ba3) / std.max(std.dot(ba3, ba3), 0.000001),
      0,
      1
    );
    const toClosest3 = pos.sub(p3.add(ba3.mul(h3)));
    const distSq3 = std.dot(toClosest3, toClosest3);

    // Segment 4: p4 -> p5 (orange -> white)
    const ba4 = p5.sub(p4);
    const h4 = std.clamp(
      std.dot(pos.sub(p4), ba4) / std.max(std.dot(ba4, ba4), 0.000001),
      0,
      1
    );
    const toClosest4 = pos.sub(p4.add(ba4.mul(h4)));
    const distSq4 = std.dot(toClosest4, toClosest4);

    let bestDistSq = distSq0;
    let bestColor = std.mix(orange, white, h0);

    if (distSq1 < bestDistSq) {
      bestDistSq = distSq1;
      bestColor = std.mix(white, orange, h1);
    }
    if (distSq2 < bestDistSq) {
      bestDistSq = distSq2;
      bestColor = std.mix(orange, white, h2);
    }
    if (distSq3 < bestDistSq) {
      bestDistSq = distSq3;
      bestColor = std.mix(white, orange, h3);
    }
    if (distSq4 < bestDistSq) {
      bestColor = std.mix(orange, white, h4);
    }

    return bestColor;
  }) as any,
  { p0: [0, 0], p1: [0, 0], p2: [0, 0], p3: [0, 0], p4: [0, 0], p5: [0, 0] },
  { name: "SpineGradientSimple" }
);

/**
 * Simpler, `createColor`-based alternative to `SpineGradient`: approximates
 * "closest point on the spine" with six fixed anchors instead of an arbitrary
 * live-length polyline. No pool/`stageProps` plumbing - just a plain props
 * object refreshed every frame via `setSpine`.
 */
export class SpineGradientSimple implements Binding<SpineGradientSimpleProps> {
  static readonly fn = spineGradientSimpleFn;
  readonly fn = spineGradientSimpleFn;

  props: SpineGradientSimpleProps = {
    p0: [0, 0],
    p1: [0, 0],
    p2: [0, 0],
    p3: [0, 0],
    p4: [0, 0],
    p5: [0, 0],
  };

  /** Live spine points for the current frame, head first, tail last. */
  setSpine(points: SpinePoint[]) {
    if (points.length < 2) return;

    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      cumulative.push(
        cumulative[i - 1] + Math.hypot(curr.x - prev.x, curr.y - prev.y)
      );
    }
    const totalLength = cumulative[cumulative.length - 1] || 1;

    const sampleAt = (fraction: number): Vec2Tuple => {
      const target = fraction * totalLength;
      let i = 1;
      while (i < cumulative.length - 1 && cumulative[i] < target) i++;
      const prev = points[i - 1];
      const curr = points[i];
      const span = cumulative[i] - cumulative[i - 1] || 1;
      const t = (target - cumulative[i - 1]) / span;
      return [prev.x + (curr.x - prev.x) * t, prev.y + (curr.y - prev.y) * t];
    };

    this.props = {
      p0: sampleAt(0),
      p1: sampleAt(0.2),
      p2: sampleAt(0.4),
      p3: sampleAt(0.6),
      p4: sampleAt(0.8),
      p5: sampleAt(1),
    };
  }
}
