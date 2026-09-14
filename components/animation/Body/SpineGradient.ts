import {
  gradientPosAt,
  gradientStopAt,
  paintProps,
  paints,
  parseColor,
  type Binding,
  type ColorLike,
  type Function,
  type PaintProps,
} from "redraw";

interface SpinePoint {
  x: number;
  y: number;
}

// For every fragment, walks the spine polyline to find its closest point and
// shades with the palette color assigned to that point's position along the
// spine's arc length. Unlike LinearGradient (straight-line position) or
// GradientAlongPath (only reads a meaningful `ctx.t` on stroked paths), this
// follows the spine's actual curvature, so a bent fish keeps its stripes
// perpendicular to its body instead of to the head-tail axis.
//
// Color stops are rendered as flat bands rather than blended with
// gradientRampAt: each stop's color fills from its own position up to the
// next stop's position, with a narrow anti-aliased seam (width `edge`,
// clamped to half the shorter neighboring band so thin bands - like an
// accent stripe - never bleed into each other) at the boundary.
//
// Band boundaries also wiggle: each fragment's signed lateral offset from
// the spine (`bestSide`) feeds a sine wave, so the stripes ripple gently
// across the body's width instead of sitting as dead-straight perpendicular
// lines.
const spineGradientFn: Function<PaintProps> = {
  name: "SpineGradient",
  kind: "color",
  arg: paints,
  fnDeps: [gradientStopAt, gradientPosAt],
  wgsl: /* wgsl */ `
fn SpineGradient(ctx: RenderCtx, tctx: TransformCtx, paint: PaintCtx, props: PaintProps) -> vec4f {
  let spineBase = u32(props.value1.x);
  let spineCount = u32(props.value1.y);
  let colorBase = u32(props.value1.z);
  let colorCount = u32(props.value1.w);
  let edge = props.value2.x;
  let wigglePhase = props.value2.y;
  let wiggleAmp = props.value2.z;
  let wiggleFreq = props.value2.w;

  var bestDistSq = 3.402823e38;
  var bestT = 0.0;
  var bestSide = 0.0;

  for (var i = 0u; i + 1u < spineCount; i = i + 1u) {
    let a = paints[spineBase + i].value1.xy;
    let b = paints[spineBase + i + 1u].value1.xy;
    let ta = paints[spineBase + i].value1.z;
    let tb = paints[spineBase + i + 1u].value1.z;

    let ba = b - a;
    let pa = (*tctx).pos - a;
    let lenSq = dot(ba, ba);
    var h = 0.0;
    if (lenSq > 0.0) {
      h = clamp(dot(pa, ba) / lenSq, 0.0, 1.0);
    }
    let toClosest = (*tctx).pos - (a + ba * h);
    let distSq = dot(toClosest, toClosest);

    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestT = mix(ta, tb, h);
      let baLen = sqrt(lenSq);
      var normal = vec2f(0.0, 0.0);
      if (baLen > 0.0) {
        normal = vec2f(-ba.y, ba.x) / baLen;
      }
      bestSide = dot(toClosest, normal);
    }
  }

  let wiggle = wiggleAmp * sin(bestSide * wiggleFreq + wigglePhase);
  let x = clamp(bestT + wiggle, 0.0, 1.0);
  var lower = 0u;
  for (var i = 1u; i < colorCount; i = i + 1u) {
    lower = select(lower, i, x >= gradientPosAt(colorBase, i));
  }

  let color = gradientStopAt(colorBase, lower);
  if (lower + 1u >= colorCount) {
    return color;
  }

  let upper = lower + 1u;
  let nextColor = gradientStopAt(colorBase, upper);
  let boundary = gradientPosAt(colorBase, upper);
  let prevBoundary = gradientPosAt(colorBase, lower);
  var afterBoundary = 1.0;
  if (upper + 1u < colorCount) {
    afterBoundary = gradientPosAt(colorBase, upper + 1u);
  }

  let halfWidth = min(edge, min(boundary - prevBoundary, afterBoundary - boundary) * 0.5);
  let frac = smoothstep(boundary - halfWidth, boundary + halfWidth, x);
  return mix(color, nextColor, frac);
}`,
};

/**
 * Paint binding that colors every fragment by the palette stop nearest its
 * closest point on a moving polyline (the fish's spine). Pass fresh spine
 * points every frame via `setSpine`; the palette is fixed at construction.
 */
export class SpineGradient implements Binding<PaintProps> {
  static readonly fn = spineGradientFn;
  readonly fn = spineGradientFn;

  private readonly colors: number[][];
  private readonly positions: number[];
  private readonly edgeWidth: number;
  private readonly wiggleAmplitude: number;
  private readonly wiggleFrequency: number;
  private readonly wiggleSpeed: number;
  private spine: SpinePoint[] = [];

  /**
   * @param edgeWidth Half-width, in normalized arc length, of the
   * anti-aliased seam between two color bands. Smaller reads as a crisper
   * stripe edge; it's clamped per-boundary so it never eats into a
   * neighboring band thinner than itself.
   * @param wiggle Ripples the band boundaries across the body's width.
   * `amplitude` is in normalized arc length, `frequency` in radians per
   * pixel of lateral offset from the spine, `speed` in radians per second.
   */
  constructor(
    colors: ColorLike[],
    positions?: number[],
    edgeWidth = 0.008,
    wiggle?: { amplitude?: number; frequency?: number; speed?: number }
  ) {
    if (colors.length === 0) {
      throw new Error("SpineGradient: at least one color is required");
    }
    this.colors = colors.map((c) => Array.from(parseColor(c)));
    this.positions =
      positions ??
      (colors.length <= 1
        ? [0]
        : colors.map((_, i) => i / (colors.length - 1)));
    this.edgeWidth = edgeWidth;
    this.wiggleAmplitude = wiggle?.amplitude ?? 0.015;
    this.wiggleFrequency = wiggle?.frequency ?? 0.25;
    this.wiggleSpeed = wiggle?.speed ?? 1.2;
  }

  /** Live spine points for the current frame, head first, tail last. */
  setSpine(points: SpinePoint[]) {
    this.spine = points;
  }

  get props(): PaintProps {
    return this.lanes(0, 0);
  }

  stageProps(alloc: (elements: PaintProps[]) => number): PaintProps {
    if (this.spine.length < 2) {
      return this.lanes(0, alloc(this.colorElements()));
    }

    // Cumulative arc length per spine point, normalized to [0, 1], so the
    // palette distributes along the spine's actual curved length rather than
    // by node index or straight-line head-to-tail distance.
    const cumulative = [0];
    for (let i = 1; i < this.spine.length; i++) {
      const prev = this.spine[i - 1];
      const curr = this.spine[i];
      cumulative.push(
        cumulative[i - 1] + Math.hypot(curr.x - prev.x, curr.y - prev.y)
      );
    }
    const totalLength = cumulative[cumulative.length - 1] || 1;

    const spineElements = this.spine.map((p, i) =>
      paintProps([p.x, p.y, cumulative[i] / totalLength, 0])
    );
    const spineBase = alloc(spineElements);
    const colorBase = alloc(this.colorElements());

    return this.lanes(spineBase, colorBase);
  }

  private colorElements(): PaintProps[] {
    return this.colors.map((color, i) =>
      paintProps(color, [this.positions[i]])
    );
  }

  private lanes(spineBase: number, colorBase: number): PaintProps {
    return paintProps(
      [spineBase, this.spine.length, colorBase, this.colors.length],
      [
        this.edgeWidth,
        this.wiggleSpeed,
        this.wiggleAmplitude,
        this.wiggleFrequency,
      ]
    );
  }
}
