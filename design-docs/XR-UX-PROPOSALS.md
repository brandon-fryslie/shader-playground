# XR UX Proposals — Panel Controls

Brainstorm + proposed data model for the Vision Pro WebXR control panel. The
goal is to replace the current half-finished single-slider panel with something
that can surface ~10–20 controls with precise continuous value adjustment. Hand
tracking is available and reliable on visionOS WebXR, so we can assume
continuous hand joint poses (not just during pinch).

This document is a menu of options to try and iterate on, not a committed
design. The data model at the bottom is chosen to support all of these as
configuration rather than rewrites.

---

## Constraints

- **Gaze seeds the pointer ray at pinch-start; hand motion drives it after.**
  On visionOS Safari, the `transient-pointer` input source delivers a single
  ray whose direction at the instant of pinch is the user's gaze direction,
  and whose subsequent motion during the hold is driven by hand displacement
  — *not* by continuing eye tracking. The ray is "gaze-seeded,
  hand-steered." This is why "slide off to cancel" works naturally: moving
  the hand translates the ray off the original target, even if the eyes are
  still on it.
- **Pre-pinch gaze is never exposed to WebXR.** The OS uses it for its own
  hover highlight, but we see nothing until the pinch fires. So pre-commit
  hover feedback has to come from hand-tracking, not gaze.
- **Hand tracking is available and reliable.** With `hand-tracking` requested
  as an optional feature, we get per-frame joint poses for both hands even
  when no pinch is active. This enables a continuous, advisory hand-ray
  pointer for hover feedback, and gives us extra drag axes (wrist roll,
  forward pull) and bimanual gestures (fine-modifier on the off hand).
- **The clean division of labor is gaze-selects, hand-drags.** Gaze-at-pinch
  picks *which* widget the interaction applies to (accurate, visionOS-native
  feel). Hand displacement from the pinch origin drives the drag/scrub
  value. The optional hand-ray laser is advisory-only — a hover hint, not
  the real selector.
- **Follow visionOS HIG for hit target sizing.** Because WebXR has no
  pre-pinch hover preview, users are committing blind to whatever they
  gaze-at-pinch. Apple's answer on native visionOS is **generous hit
  targets with smaller visual elements inside them** — the visible slider
  knob or button chip is small and aesthetic; the actual hit rectangle is
  padded significantly and spaced away from its neighbors. Gaze is
  accurate, but not pixel-accurate — give it room. This is a hard
  constraint on layout, not a suggestion: controls that look adjacent on
  screen need meaningful world-space separation between their hitboxes,
  and every hitbox should be larger than the visual element inside it.
- **~10–20 controls needed**, with precise continuous value adjustment
  (slider replacement). HIG-compliant hitboxes are what let a dense panel
  still work — visual density is fine, hitbox density is not.
- **Current panel** is a single fixed in-world quad at `(0, -0.4, -3.5)` with
  prev/next buttons, one mode-dependent slider, a grab handle, and an FPS
  readout. It already uses the gaze-derived transient-pointer ray for
  hit-testing, so targeting isn't the problem — breadth of controls and
  visual design are. It feels unusable because there's almost nothing on it.

---

## Input model: gaze seeds, hand steers

The single most important design decision, stated once and reused throughout:

| Role                    | Source                                           | When valid              |
|-------------------------|--------------------------------------------------|-------------------------|
| **Select** (target)     | Transient-pointer ray at pinch-start (gaze-seeded)| At the pinch-start instant |
| **Drag / scrub** (value)| Hand pose displacement from pinch origin         | While pinch is held     |
| **Hover preview**       | Synthesized hand ray (advisory)                  | Always, when tracked    |
| **Commit / cancel**     | Pinch-end; cancels if pointer left the original hitbox | End of pinch      |

- **The transient-pointer ray is one ray that changes source over time.** At
  pinch-start, its direction is the user's gaze. From that instant on,
  motion of the ray is driven by the hand, not by continuing eye tracking.
  So "where the ray is" during the hold depends on where the hand has moved
  since pinch-start — not on where the eyes are now.
- **Selection happens exactly once per interaction**, at pinch-start, using
  the gaze-seeded direction. This is the only moment eye position matters.
- **"Slide off to cancel" is a hand gesture, not an eye gesture.** Because
  the ray is hand-steered after pinch-start, moving the hand translates the
  ray off the original hitbox — that's the cancel affordance. It works
  identically whether or not the user is still looking at the target.
- **Drag values come from hand displacement relative to the pinch origin,**
  not from the ray's screen-space position. This is what makes wrist-twist
  and pinch-pull mechanics possible.
- **Hitboxes must follow visionOS HIG.** Gaze is accurate but not
  pixel-accurate, and there is no pre-pinch hover to course-correct with.
  Visible element small; hit rect padded; neighbor spacing generous.
- **The hand-ray laser is advisory-only.** It's rendered for hover feedback
  so users have *something* to anchor on before pinch, but it never decides
  selection. If the hand ray and the gaze-seeded pointer disagree about
  which widget is "pointed at," the gaze-seeded pointer wins at pinch.

This division is the spine of the data model below.

---

## Three orthogonal decisions

The panel design splits cleanly into three independent dimensions. Picking one
answer per dimension yields a concrete UX. Mix freely.

1. **Form factor** — where does the UI live in space.
2. **Control mechanic** — how a single continuous value gets edited.
3. **Organization** — how 10–20 controls coexist without becoming soup.

### 1. Form factor

#### A. Wrist-anchored "watch"
Non-dominant hand becomes the panel. Palm-up wakes it, palm-down hides it.
Controls are small but at ~30 cm, so targeting is trivial. Natural show/hide,
no dismiss button. Downside: real estate is limited — needs tabs/pages for
~20 controls.

#### B. Bimanual "floating clipboard"
The panel is anchored to the non-dominant hand like a tablet held in the
off-hand. Pull close to read, push away to see the sim. Dominant hand rays
into it. This is Oculus/Quest's default UX language — instantly familiar.
Same size concern as A, but the panel can be bigger since you're "holding" it.

#### C. Big in-space "mixing console"
Keep the current panel model but much bigger and organized like a synth/DAW.
Hand ray targets it. Comfortable for long sessions, shows many controls at
once, but eats visual space and doesn't hide elegantly.

#### D. Hybrid: watch + summonable console
Watch for the 4–6 most-adjusted controls (speed, gravity, intensity), big
panel for everything else, summoned by a gesture (e.g., both palms up). Highest
ceiling, highest cost.

**Current lean: B.** Biggest win per line of code, feels native, scales to
~20 controls with light categorization. Evolves into D later.

### 2. Control mechanic — slider replacement

Gaze picks the widget at pinch start; hand displacement does the scrubbing.
The dominant insight from VR UX: **map the scrub to a large physical
displacement.** Arm travel is cheap, pixels are expensive. Several options
that all satisfy this:

#### Long-throw track
Slider is physically large (30–50 cm of travel). Gaze picks the knob at
pinch; hand drags along the track axis; release commits. Precision falls
out of physical size, not gesture complexity.

#### Expand-to-focus
Slider is small in the panel. Gaze-pinch it → the surrounding panel region
expands, becoming a single giant slider filling the panel width. Hand drags
to adjust; release commits and collapses back. Buys precision without
permanently spending panel real estate. Works especially well with gaze
selection because even a tiny on-panel slider is easy to pick.

#### Pinch-and-twist (virtual dial)
Gaze picks a knob; rotate wrist while pinched. ~180° of wrist roll covers
the full range. Works for knob grids because knobs can be tiny — gaze picks
accurately, and wrist rotation doesn't require a big on-screen target. Very
dense — 20 knobs fit where 5 sliders would.

#### Pinch-and-pull (depth scrub)
Gaze picks a parameter; pull the hand toward or away from the body while
pinched. Distance from grab-origin sets the value delta. Works in free
space — the on-screen element doesn't have to be visually tracked during
the pull; gaze already committed the target.

#### Dual-speed modifier
Any of the above, but a second gesture (thumb+ring on the same hand, or a
non-dominant pinch) switches to "fine mode" with 10× reduced gain. How pros
get the last 1% of precision on any gestural control.

**Current lean: expand-to-focus + dual-speed modifier.** Expand-to-focus solves
density-vs-precision in one mechanic — you see 20 tiny sliders; focus blows up
whichever you're touching. Dual-speed adds pro-level precision when needed.

### 3. Organization

#### i. Category tabs
5–8 tab chips across the top (Physics, Forces, Visuals, Camera, Theme,
Presets). Each tab shows 3–5 controls. Standard and boring — works.

#### ii. Preset-first
Big grid of presets takes most of the panel. A small "adjust" row of 3–4
currently-relevant sliders lets you tweak off a preset. Matches how people
actually use this — 80% preset-picking, 20% fine-tuning.

#### iii. Progressive disclosure
Top level: big tiles for each *category* showing its dominant state. Pinch a
tile → it expands into that category's controls, filling the panel. Collapse
with the grab bar or a back chevron. One context at a time; no visual noise.

#### iv. Compact gridded "parameter lattice"
All 20 controls shown as small dial-tiles (mechanic 3 above). No tabs, no
drill-in. Works if everything shown has a quick-hit dial representation. Flat
and scannable.

**Current lean: iii + ii.** Progressive disclosure for the main body,
persistent preset strip at the bottom.

---

## Proposed composite design (v1)

- **Bimanual clipboard** anchored to the non-dominant hand's palm. Palm-up
  shows it, palm-away hides it.
- **Top level is a tile grid** of 6–8 categories (Physics, Forces, Visuals,
  Camera, Attractors, Theme, Presets). Each tile previews its current
  headline value.
- **Pinch a category tile** → expands into that category's 3–6 controls,
  filling the clipboard.
- **Each control is an expand-to-focus slider** — small by default, blows up
  to full clipboard width while grabbed, collapses back on release.
- **Dual-speed modifier**: non-dominant pinch while dominant is grabbing the
  knob → 10× reduced gain.
- **Persistent preset strip** along the bottom — always visible, one pinch
  applies.
- **In-space placement** (attractors, fluid interaction) still uses the direct
  hand ray, unchanged from today.

Scales from today's ~20 sliders to ~40–50 before it hurts, keeps visible
surface low, and gets precise continuous adjustment without targeting pain.

---

## Data model

The model below treats form factor, widget type, and interaction mechanic as
orthogonal. Trying a new UX is a config change, not a rewrite.

### Principles

1. **Widget type ≠ interaction mechanic.** A continuous value can be edited
   by direct-drag, twist, pull, or expand-to-focus. These are all gestures
   bound to the same underlying binding. Widget type decides the *rendered
   form*; interaction decides *how the gesture maps to a value delta*.
2. **Anchors are first-class values**, not code branches. An anchor is a
   `(pose-source, offset)` pair evaluated every frame. Swapping a panel from
   in-space to wrist-anchored is data.
3. **Bindings decouple UI from state.** A control knows nothing about
   `state.physics.G`; it holds a `Binding` object with `get`/`set`/`range`.
   The panel tree does not need to know about specific simulation modes.
4. **One input pipeline.** Hand tracking produces a `HandFrame` per hand per
   frame. Everything downstream — ray rendering, hit testing, gesture
   detection, interaction state — reads from the same `HandFrame`. Matches
   our `one-source-of-truth` law.
5. **Two ray sources, different roles.** The transient-pointer ray is
   gaze-seeded at pinch-start and hand-steered during the hold; we
   therefore sample it exactly once — at pinch-start — to decide *which*
   widget an interaction targets. That single sample is the selection.
   Subsequent ray samples during the hold are only used for the
   "slide-off-to-cancel" hit test (hand-driven, not gaze-driven). The
   synthesized `HandFrame.ray` is advisory only — used for a visible hover
   laser before pinch, never for selection. This is how we avoid ambiguity
   about "which ray won".
6. **HIG-compliant hitboxes are structural.** Each widget's hit rect is
   larger than its rendered visual. Neighbor widgets have explicit gap
   between hit rects (not just between visuals). Tight visual grouping is
   fine; tight hitbox grouping is not. Encoded in the layout container
   rules, not in individual widget code.
7. **Gesture detection is a pure function** of the last N `HandFrame`s +
   transient-pointer state. No side effects in the detector. Interactions
   consume detected gestures, not raw frames.

### Core types (TypeScript sketch)

```ts
// ─── Bindings ─────────────────────────────────────────────────────────
// A Binding is a uniform get/set interface over a piece of app state.
// Controls reference a binding by id; the binding knows how to talk to
// the underlying state shape.

type Binding =
  | ContinuousBinding
  | ToggleBinding
  | EnumBinding
  | ActionBinding;

interface BindingCommon {
  id: string;            // unique, used in layout references
  label: string;
  description?: string;  // for accessibility / hover text
  group?: string;        // 'physics' | 'visuals' | 'camera' | …
}

interface ContinuousBinding extends BindingCommon {
  kind: 'continuous';
  get: () => number;
  set: (v: number) => void;
  range: { min: number; max: number };
  step?: number;                       // snap granularity, optional
  scale?: 'linear' | 'log' | 'pow2';   // how value maps to slider position
  format?: (v: number) => string;      // e.g. '2.3 m/s'
}

interface ToggleBinding extends BindingCommon {
  kind: 'toggle';
  get: () => boolean;
  set: (v: boolean) => void;
}

interface EnumBinding extends BindingCommon {
  kind: 'enum';
  get: () => string;
  set: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}

interface ActionBinding extends BindingCommon {
  kind: 'action';
  invoke: () => void;   // presets, reset, step, etc.
}

// ─── Anchors ──────────────────────────────────────────────────────────
// Evaluated per frame to produce a world-space pose for a container.

type Anchor =
  | { kind: 'world';    pose: Pose; }
  | { kind: 'wrist';    hand: Hand; offset: Pose; }
  | { kind: 'palm';     hand: Hand; offset: Pose; facing: 'up' | 'down'; }
  | { kind: 'held';     hand: Hand; offset: Pose; } // bimanual clipboard
  | { kind: 'head-hud'; distance: number; offset: Pose; };

type Hand = 'left' | 'right';

interface Pose { position: Vec3; rotation: Quat; scale?: Vec3; }

// ─── Containers and widgets ───────────────────────────────────────────
// A panel is a tree of containers. Leaves are widgets; internal nodes are
// layout containers. Everything positions in container-local space.

type Node = Container | Widget;

type Container =
  | { kind: 'panel';      anchor: Anchor; size: Vec2; children: Node[];
                          visibility?: VisibilityGate; }
  | { kind: 'group';      layout: 'row' | 'column' | 'grid';
                          gap?: number; columns?: number; children: Node[]; }
  | { kind: 'tabs';       tabs: Array<{ id: string; label: string; body: Node }>;
                          activeTabId: string; }
  | { kind: 'focus-view'; // expand-to-focus host
                          focused: string | null; children: Node[]; };

// All interactive widgets carry an explicit hitbox separate from their
// visual size. `visualSize` is what's rendered; `hitPadding` expands the
// hit rectangle outward on all sides. Layout containers enforce that
// adjacent widgets' hit rectangles have a minimum gap. Defaults come from
// the HIG; per-widget overrides are rare and must be justified.
interface WidgetCommon {
  visualSize: Vec2;                  // what the SDF draws
  hitPadding: Vec2;                  // expands hit rect beyond visualSize
  // Effective hit rect half-extents = visualSize/2 + hitPadding.
  // Used for both pinch-start selection and cancel detection.
}

type Widget = WidgetCommon & (
  | { kind: 'slider';      binding: string /*id*/;
                           orientation: 'horizontal' | 'vertical';
                           interaction: ContinuousInteraction; }
  | { kind: 'dial';        binding: string;
                           interaction: ContinuousInteraction; }
  | { kind: 'toggle';      binding: string; style: 'switch' | 'button'; }
  | { kind: 'stepper';     binding: string; step: number; }
  | { kind: 'enum-chips';  binding: string; }
  | { kind: 'button';      binding: string /*ActionBinding.id*/;
                           style: 'primary' | 'secondary' | 'danger'; }
  | { kind: 'preset-tile'; binding: string; preview?: PreviewSpec; }
  | { kind: 'category-tile'; targetTabId: string; summary: SummarySpec; }
  | { kind: 'readout';     binding: string; format?: (v: unknown) => string; }
);

// HIG-derived defaults. Exact numbers should be tuned against Apple's
// current visionOS HIG guidance; the shape is: hit rect meaningfully
// larger than visual rect, neighbor gap meaningfully larger than zero.
const HIG_DEFAULTS = {
  minHitHalfExtent:    { x: 0.06, y: 0.06 }, // ≥ 12cm on a side, min
  defaultHitPadding:   { x: 0.02, y: 0.02 }, // 2cm outward padding
  minNeighborHitGap:   0.02,                 // 2cm between hit rects
};

// Visibility gates let anchors like wrist-anchored panels show/hide based on
// hand pose without per-widget plumbing.
type VisibilityGate =
  | { kind: 'always' }
  | { kind: 'palm-facing-user'; hand: Hand; threshold?: number }
  | { kind: 'hand-raised'; hand: Hand; minY?: number }
  | { kind: 'gesture'; gesture: GestureKind };

// ─── Interactions ─────────────────────────────────────────────────────
// How a gesture delta maps to a value delta, independent of widget shape.

type ContinuousInteraction =
  | { kind: 'direct-drag'; axis: 'x' | 'y'; }           // drag on track
  | { kind: 'pinch-twist'; axis: 'roll' | 'pitch' | 'yaw'; }
  | { kind: 'pinch-pull';  axis: 'forward' | 'up' | 'right'; unitsPerMeter: number; }
  | { kind: 'expand-to-focus'; underlying: ContinuousInteraction; };

// A "fine modifier" is detected globally (non-dominant pinch, or thumb+ring).
// When active, all continuous interactions apply gainMultiplier to their
// computed delta. No per-interaction special case.
interface InteractionTuning {
  gainMultiplier: number;   // 1.0 default, 0.1 when fine-modifier active
  snap?: number;            // optional snap on release
}

// ─── Input pipeline ───────────────────────────────────────────────────
// Produced each frame. Two ray sources with different roles:
//   - TransientPointer: the XR transient-pointer ray. Gaze-seeded at
//     pinch-start, hand-steered during the hold. Sampled for SELECTION
//     exactly once, at pinch-start; sampled during the hold only for the
//     "slide off to cancel" hit test.
//   - HandFrame.ray: advisory HOVER LASER, continuous via hand-tracking,
//     never used to select.
// Hand displacement (joints and pinch.origin) drives DRAG/SCRUB values.

interface TransientPointer {
  active: boolean;                   // true while a pinch is active
  hand: Hand;                        // which hand's pinch owns this ray
  origin: Vec3;
  dir: Vec3;
  // pinchStart is set once at pinch-start and frozen for the rest of the
  // hold. It is the gaze-seeded sample used for selection. `origin` / `dir`
  // above are the CURRENT (hand-steered) values used for cancel detection.
  pinchStart: { origin: Vec3; dir: Vec3; t: number } | null;
}

interface HandFrame {
  hand: Hand;
  tracked: boolean;
  joints: Record<JointName, Pose>;   // wrist, index-metacarpal, index-tip, …
  pinch: {
    active: boolean;
    strength: number;                // 0..1, continuous if available
    origin: Pose;                    // pinch centroid (thumb-tip + index-tip)/2
  };
  ray: { origin: Vec3; dir: Vec3 };  // synthesized — wrist → index knuckle
                                     // ADVISORY ONLY, not used for selection
  palmNormal: Vec3;                  // for palm-facing gates
  grip: GripState;                   // thumb+ring, thumb+pinky, etc.
}

type JointName = 'wrist' | 'thumb-tip' | 'index-metacarpal' | 'index-tip'
               | 'middle-tip' | 'ring-tip' | 'pinky-tip' /* … */;

interface GripState {
  thumbIndex: boolean;   // the primary pinch; redundant with pinch.active
  thumbMiddle: boolean;
  thumbRing: boolean;    // candidate for "fine modifier"
  thumbPinky: boolean;   // candidate for "summon panel" or similar
}

// ─── Gesture detection ────────────────────────────────────────────────
// Pure function of a short HandFrame history. Produces semantic gestures
// consumed by the interaction state machine.

type Gesture =
  // pinch-start carries the gaze-seeded ray sample for selection and the
  // current hand frame to capture the drag origin.
  | { kind: 'pinch-start'; hand: Hand; frame: HandFrame; pointer: TransientPointer; }
  // pinch-hold's pointer is hand-steered; useful for cancel detection only.
  | { kind: 'pinch-hold';  hand: Hand; frame: HandFrame; pointer: TransientPointer; dur: number; }
  | { kind: 'pinch-end';   hand: Hand; frame: HandFrame; pointer: TransientPointer; dur: number; }
  | { kind: 'pinch-double'; hand: Hand; frame: HandFrame; pointer: TransientPointer; }
  | { kind: 'fine-modifier-on';  hand: Hand; }
  | { kind: 'fine-modifier-off'; hand: Hand; }
  | { kind: 'palm-up';   hand: Hand; }
  | { kind: 'palm-down'; hand: Hand; }
  | { kind: 'two-palms-up'; }          // summon console (design D)
  | { kind: 'wrist-flick'; hand: Hand; axis: 'roll'|'pitch'|'yaw'; sign: 1|-1; };

type GestureKind = Gesture['kind'];

// ─── Interaction state machine ────────────────────────────────────────
// At most one interaction is active per hand at a time. UI uses left-hand
// and right-hand channels independently for bimanual operations like "drag
// slider with right while modifying fine mode with left."

type InteractionState =
  | { kind: 'idle'; hand: Hand; }
  // hovering: sourced from HandFrame.ray only — advisory, no commitment.
  | { kind: 'hovering';  hand: Hand; widgetId: string; }
  | { kind: 'focusing';  hand: Hand; widgetId: string; } // expand-to-focus mid-transition
  // dragging: widget was resolved at pinch-start by hit-testing the
  // gaze-seeded transient-pointer ray. handOrigin/valueAtOrigin are
  // captured then; drag deltas come from live hand displacement relative
  // to that origin — not from the transient-pointer ray during the hold
  // (which is hand-steered and drifts off the widget by design).
  | { kind: 'dragging';  hand: Hand; widgetId: string;
      bindingId: string;
      handOrigin: Pose;           // pinch centroid at pinch-start
      valueAtOrigin: number;
      interaction: ContinuousInteraction;
      tuning: InteractionTuning; }
  // pressing: resolved at pinch-start via the gaze-seeded pointer. Commit
  // on release only if the transient-pointer ray is still on the same
  // widget's hitbox at pinch-end. Since the ray is hand-steered after
  // pinch-start, sliding the hand off = cancel — matches visionOS
  // native behavior without any special-case code.
  | { kind: 'pressing';  hand: Hand; widgetId: string;
      bindingId: string;
      startedAt: number; };

// ─── Registry ────────────────────────────────────────────────────────
// The app registers bindings once at startup. The panel tree references
// them by id. Swapping a layout does not touch bindings; adding a binding
// does not touch layouts.

interface UIRegistry {
  bindings: Map<string, Binding>;
  layouts: Map<string, Container>;    // named layouts — 'default', 'watch', …
  activeLayoutId: string;
}

// ─── Frame function signature ────────────────────────────────────────
// The whole system reduces to this pure-ish pipeline each XR frame:

function xrUiStep(
  registry: UIRegistry,
  hands: Record<Hand, HandFrame>,
  pointer: TransientPointer | null,    // null when no pinch is active
  prevState: Record<Hand, InteractionState>,
  dt: number,
): {
  nextState: Record<Hand, InteractionState>;
  gesturesEmitted: Gesture[];
  sideEffects: Array<{ bindingId: string; value: unknown } | { action: string }>;
  renderList: RenderCommand[];     // SDF quads, labels, laser rays, reticles
}
// Invariants:
// 1. Selection transitions (idle/hovering → pressing/dragging) only happen
//    on a 'pinch-start' gesture, and only hit-test against
//    `pointer.pinchStart` (the gaze-seeded sample).
// 2. Cancel detection during a hold uses `pointer.origin/dir` (the
//    hand-steered current ray) and the widget's HIG-padded hitbox.
// 3. Hover transitions (idle ↔ hovering) only use `hands[*].ray`. They
//    never look at `pointer`.
// These three pipelines don't cross.
```

### What this supports, concretely

Every idea in the brainstorm maps to data, not code changes:

| Idea                                | Change              |
|-------------------------------------|---------------------|
| Move panel from fixed to wrist      | `anchor.kind` flip  |
| Bimanual clipboard                  | `anchor: { kind: 'held', hand: 'left' }` |
| Wrist watch with palm-up gate       | add `visibility: { kind: 'palm-facing-user', hand: 'left' }` |
| Long-throw tracks                   | `slider` with big `size` |
| Expand-to-focus                     | wrap container in `focus-view`; widget uses `interaction: { kind: 'expand-to-focus', underlying: ... }` |
| Pinch-twist dials                   | replace `slider` with `dial`, `interaction.kind: 'pinch-twist'` |
| Pinch-pull depth scrub              | `interaction.kind: 'pinch-pull'`, pick axis |
| Dual-speed fine modifier            | global gesture `fine-modifier-on/off` → tuning.gainMultiplier |
| Category tabs                       | `tabs` container |
| Progressive disclosure              | `category-tile` widgets that swap the tabs' `activeTabId` |
| Preset strip                        | row of `preset-tile` widgets |
| Summon console (design D)           | `two-palms-up` gesture → set `activeLayoutId = 'console'` |

### Migration from today's panel

Today's panel collapses to a single layout:
```
panel {
  anchor: { kind: 'world', pose: {position: [0, -0.4, -3.5], …} }
  children: [
    row [
      button(prev),
      readout(mode-label),
      button(next),
    ],
    slider { binding: XR_UI_SLIDER_DEFS[state.mode].key,
             interaction: { kind: 'direct-drag', axis: 'x' } },
    button(grab),  // anchor re-parenter; becomes built-in panel behavior
    readout(fps),
  ]
}
```

`XR_UI_SLIDER_DEFS` becomes one `ContinuousBinding` per mode, registered at
simulation init. The per-mode slider visible on the panel is just "the
binding whose group matches the active mode" — a tiny filter, not a
special case.

---

## Iteration plan (proposed)

1. **Land the model.** Introduce `Binding`, `Anchor`, the container tree, and
   the hand-tracking `HandFrame` pipeline. Port the current panel to express
   itself in the new model without changing behavior. Ship.
2. **Add the hand-ray.** Render a persistent laser from the synthesized
   wrist→knuckle ray. Hover state lights up widgets before commit. This alone
   makes the current panel usable.
3. **Try bimanual clipboard (B).** Flip the anchor to `held` on the
   non-dominant hand. Nothing else changes.
4. **Introduce expand-to-focus.** Wrap the control strip in `focus-view`,
   swap slider interactions. Measure whether the density/precision story
   works.
5. **Category tabs + progressive disclosure.** Expose all ~20 bindings with
   tabs; iterate on grouping.
6. **Dial grid experiment.** Swap some sliders for pinch-twist dials, see if
   they feel better for certain param types.
7. **Fine modifier.** Add the non-dominant-pinch modifier as a gain scalar.
8. **Summonable console (D) if needed.** Add the `two-palms-up` gesture and
   a second layout.

Each step lands behind the same data model. No step rewrites the previous.
