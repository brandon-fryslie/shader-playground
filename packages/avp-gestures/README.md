# @shader-playground/avp-gestures

The Apple Vision Pro hand **input + gesture-recognition** library. It turns the
noisy visionOS WebXR hand-tracking stream into two things, derived once per
frame:

- an **input frame** — the per-hand spatial substrate (rays, wrist pose, palm
  normal, pinch state) plus the head pose; and
- a list of **recognized gestures** — a closed, intent-neutral vocabulary of the
  motions/poses the hands made this frame.

Its headline value is the **recognizer**: a pure function that names hand motion
without deciding what that motion *means*. Meaning is the consumer's job. That
single rule is what makes the library reusable by any AVP app instead of welded
to this one.

> Apple Vision Pro specific throughout. Every field means exactly what visionOS
> WebXR provides; there is no device-generic abstraction layer. A `| null` field
> is **data** that says AVP tracking dropped that datum this frame — never a
> substituted default.

---

## The per-frame call

```ts
import { createAvpInput } from '@shader-playground/avp-gestures';

const avp = createAvpInput();

// AVP signals a pinch as WebXR select events; forward both edges.
session.addEventListener('selectstart', (e) => avp.selectStart(e.inputSource));
session.addEventListener('selectend',   (e) => avp.selectEnd(e.inputSource));

// Once per XR animation frame:
const now = performance.now();            // the consumer owns the one clock read
const { input, gestures } = avp.frame(xrFrame, refSpace, now);
```

`frame(xrFrame, refSpace, nowMs)` runs the impure adapter, then the pure
recognizer, and returns `{ input, gestures }` as plain data. It always runs and
never calls back or acts on the world. `reset()` clears all carried state (idle
hands, fresh recognizer FSM) for a new XR session.

`nowMs` is passed *in* rather than read inside, so the clock has exactly one
owner — the consumer — and both the adapter (which stamps pinch-start time) and
the recognizer (which times flicks and pinch-hold) see the same instant.

---

## The two layers

The library is split at the world boundary, and the split is the design:

| Layer | Module | Reads WebXR? | Testable without a headset? |
|-------|--------|:---:|:---:|
| **Adapter** (impure boundary) | `adapter.ts` | **yes — the only WebXR reads** | no |
| **Recognizer** (pure) | `recognizer.ts` | no | **yes** |

- **Adapter** — `createAvpInputAdapter()`. The one part that touches `XRFrame`,
  `XRInputSource`, joint poses, and select events. It assigns each pinching
  source to a hand, freezes the gaze ray at pinch-start, tracks the live hand
  pose, and derives palm normal / grip / advisory ray from the full 25-joint
  set. No WebXR object ever escapes — only number arrays and flags.
- **Recognizer** — `recognizeGestures(hands, state, nowMs)` with
  `makeRecognizerState()`. A deterministic function of `(frames, state, now)`
  that carries its own finite-state-machine state explicitly and returns
  `{ gestures, state }`. Because it reads no WebXR and no clock, it is
  unit-tested with synthetic frames and no device (`npm run verify:gestures`).

`createAvpInput()` is the convenience that wires the two together and holds the
recognizer state for you. Reach for the layers directly only when you need to
test the recognizer in isolation or feed it a non-WebXR substrate.

---

## The gesture vocabulary

`XrGesture` is a closed discriminated union. **Every variant is named for the
motion or pose the hand makes, never for what an app makes it mean.** The
consumer supplies meaning.

| Gesture | Carries | The motion it names |
|---------|---------|---------------------|
| `pinch-start` | `hand`, `gazeRay` | thumb-index select began; gaze ray frozen at this instant |
| `pinch-hold` | `hand`, `dur` | select still held; `dur` ms since start |
| `pinch-end` | `hand`, `dur` | select released |
| `two-hand-pinch-start` | — | both hands entered select together |
| `two-hand-pinch-end` | — | one hand left a two-hand select |
| `ring-pinch-on` / `ring-pinch-off` | `hand` | thumb-to-**ring**-finger contact edge |
| `palm-up` / `palm-down` | `hand` | palm normal crossed the facing-up hysteresis band |
| `wrist-flick` | `hand`, `axis` (`roll`/`pitch`/`yaw`), `sign` | a fast wrist rotation while not pinching |

The naming rule, made concrete: `ring-pinch` is a thumb-to-ring-finger contact —
distinct from the thumb-index `pinch` WebXR surfaces as *select*. This app
happens to use a held ring-pinch as a **precision modifier**, but the pose
itself is just a ring pinch, so the gesture is named for the pose, not the role.
A variant called `precision-modifier` or `zoom` would couple the library to one
app's intent and is exactly what this vocabulary refuses to do.

---

## The input frame

`InputContext` = `{ hands: Record<'left'|'right', InputFrame>, headPose }`.

Each `InputFrame` carries **three distinct rays**, because an AVP pinch needs
three different ray semantics across its lifecycle:

| Ray | When captured | Drives |
|-----|---------------|--------|
| `gazeRay` | **frozen** at pinch-start, never re-read | the *blind commit* — what you were aiming at when you committed, so the target can't slip while you pinch |
| `currentRay` | live, hand-steered each frame | *slide-off-to-cancel* — steer away after pinching and the action aborts |
| `ray` | advisory, derived from hand pose | *pre-pinch hover* — the laser you see before committing |

Plus `pinch` (`active`, `origin`, `current`, `startTime`), `joints.wrist`, and
`palmNormal`. Any of these is `null` when visionOS did not track it this frame.

There are two shapes of frame, one extending the other, so the menu contract
stays narrow while the recognizer gets the extra inputs it needs:

- `InputFrame` — the **menu-facing** projection (`xr-ui` consumes this).
- `HandInputFrame extends InputFrame` — adds the wrist `JointSample` (with
  radius) and `grip: GripState` (thumb-to-each-fingertip contacts) the
  recognizer needs for wrist-flick and ring-pinch. Because it *extends*
  `InputFrame`, a `Record<Hand, HandInputFrame>` *is* a `Record<Hand,
  InputFrame>` — the menu reads it as-is, no projection step.

The full 25-joint set is intentionally **not** in the public types: only the
adapter reads every joint, and it surfaces the derived results (`palmNormal`,
`grip`, the advisory ray) as their own fields rather than dragging the WebXR
joint-name vocabulary onto every consumer's compile for data none of them read.

---

## The consumer pattern: derive once → map → arbitrate

```ts
const { input, gestures } = avp.frame(xrFrame, refSpace, now);

// 1. Share the SAME input frame with the UI and your own logic — derived once.
ui.frame({ input });

// 2. Map gestures to YOUR meaning. The library never does this.
for (const g of gestures) {
  switch (g.kind) {
    case 'ring-pinch-on':  fineModifier[g.hand] = true;  break;  // app policy
    case 'two-hand-pinch-start': beginCameraScale();      break;
    // ...
  }
}

// 3. Arbitrate: if the UI claimed a hand this frame, don't also drive the scene
//    with that hand's pinch.
```

Detection (a recognizable hand motion) and mapping (what it controls) are
different concerns that meet at a data interface. Detection is reusable; mapping
is app policy. Keeping them apart is the whole point of the seam.

---

## Environment & type dependencies

- **Runtime:** visionOS Safari WebXR with hand tracking. Nothing else is
  assumed — no `requestAnimationFrame` wrapper, no renderer, no DOM.
- **Types:** the package ships its **own** WebXR ambient declarations
  (`src/webxr.d.ts`) and triple-slash-references them from `adapter.ts` and
  `input.ts`, so it type-checks standalone with **no `@types/webxr`** in the
  tree. It depends on nothing but those WebXR types.

This is the lowest package in the dependency graph: `xr-ui` depends on it (for
the input-frame type), the app depends on it (for the gesture vocabulary and the
per-frame entry), and it depends on neither. The direction is compile-enforced
by the package boundary. See `../xr-ui/README.md` for the full three-package
picture.

---

## Testing

```
npm run verify:gestures   # Deno unit tests over the pure recognizer (no headset)
```

The recognizer's headset-free testability is the payoff of the pure/impure
split: every gesture edge — pinch lifecycle, ring-pinch, palm hysteresis,
wrist-flick arming and refractory — is asserted against synthetic frames.
