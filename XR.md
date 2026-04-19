# WebXR Architecture

WebXR stereo rendering for Apple Vision Pro with a unified gesture system designed for extensibility.

## XR Input Pipeline

All XR input flows through a four-stage pipeline, run once per XR frame via `xrInputStep()`. The architecture matches the design in `design-docs/XR-UX-PROPOSALS.md`.

```
selectstart → xrPendingSources → [per frame] → HandFrames → Gestures → InteractionStates → side effects
```

### Stage 1: `xrUpdateHandFrames`

Resolves pending `XRInputSource`s from `selectstart` into per-hand `XrHandFrame`s. Each hand frame captures:

- **`gazeRay`** — frozen at pinch-start. This is the gaze-seeded transient-pointer ray, authoritative for **selection** (which widget/target the interaction commits to). Never updated after pinch-start.
- **`currentRay`** — updated every frame. Hand-steered ray that drives **drag/scrub** values during an active interaction.
- **`pinch.origin` / `pinch.current`** — hand positions for distance-based gestures (two-hand scale).

Stubs for future hand-tracking data: `joints`, `palmNormal`, `grip`.

### Stage 2: `xrDetectGestures`

Pure function with no side effects. Compares current vs previous pinch state and emits `XrGesture` events:

| Gesture | Trigger |
|---------|---------|
| `pinch-start` | Hand begins pinching (edge: inactive → active) |
| `pinch-hold` | Hand continues pinching |
| `pinch-end` | Hand releases pinch (edge: active → inactive) |
| `two-hand-pinch-start` | Both hands pinching simultaneously (edge) |
| `two-hand-pinch-end` | One hand releases during two-hand pinch (edge) |

Stubs for future gestures (detected when hand-tracking joints are available):
- `fine-modifier-on/off` — non-dominant thumb+ring pinch for 10× reduced gain
- `palm-up/palm-down` — panel visibility gating
- `wrist-flick` — discrete actions via wrist rotation

### Stage 3: `xrTransitionInteractions`

Consumes gesture events and transitions per-hand `XrInteraction` state machines. At most one interaction per hand at a time. Selection transitions use `gazeRay` (frozen at pinch-start), not the live ray.

**Interaction states:**

| State | Description |
|-------|-------------|
| `idle` | No active interaction |
| `hovering` | Advisory hover (stub — requires hand-tracking ray) |
| `pressing` | Button press in progress; commits on release if still on target |
| `dragging` | Continuous value adjustment. Subtypes: `slider`, `panel-grab`, `sim` |
| `two-hand-scale` | Both hands cooperating on viewpoint zoom |

**Priority**: `two-hand-scale` > UI interactions > sim interactions. If both hands are pinching in space, any single-hand sim interaction is ended and two-hand scale begins.

### Stage 4: `xrApplyInteractions`

Reads interaction state + hand frames, produces side effects:

- **Two-hand scale** — ratio of current inter-hand distance to start distance scales the reference space Z offset (zoom range: 1m to 50m from simulation center)
- **Slider drag** — updates simulation parameter via hit-test position on UI panel
- **Panel grab** — translates the floating UI panel in world space
- **Sim interaction** — drives `state.mouse` for fluid forces / N-body attractor placement

## Two-Hand Pinch-to-Scale (Zoom)

Pinch with both hands in empty space (not on the UI panel):

- **Pull apart** → zoom in (viewpoint moves closer, Z offset decreases)
- **Push together** → zoom out (viewpoint moves farther, Z offset increases)
- **Range**: 1m to 50m from simulation center
- **Mechanism**: modifies `xrViewOffset.z` and rebuilds the XR reference space via `getOffsetReferenceSpace()`

The gesture is ratio-based (current distance / start distance), so absolute hand positions don't matter — only the relative change. Releasing either hand ends the zoom gesture; the remaining hand can start a new single-hand interaction.

## Reference Space Management

`xrBaseRefSpace` stores the original reference space (before any gesture offsets). `xrViewOffset` is the single source of truth for the user's virtual viewpoint. `applyXrViewOffset()` rebuilds `xrRefSpace` from `xrBaseRefSpace + xrViewOffset` whenever the offset changes.

The Y offset includes a `1.6m` lift when using `local-floor` reference space, so the simulation center appears at eye level.

## Extending the System

| Extension | Where to add it |
|-----------|----------------|
| New gesture type | Add variant to `XrGesture` union + detection logic in `xrDetectGestures` |
| New interaction type | Add variant to `XrInteraction` union + transition in `xrTransitionInteractions` + effects in `xrApplyInteractions` |
| Binding registry | Replace hardcoded `setXrSliderFromHit` calls with `binding.set()` |
| Hand-tracking joints | Populate `XrHandFrame.joints/palmNormal/grip`, enable `palm-up`/`fine-modifier` detection |
| Expand-to-focus | New `dragging` subtype with `xrTuning.gainMultiplier` for precision control |
| Bimanual clipboard | New anchor type evaluated per-frame from non-dominant hand pose |
| Pinch-and-twist dials | New `ContinuousInteraction` kind using wrist roll from joint data |

## WebXR on Vision Pro

Safari visionOS specifics:

- `requiredFeatures: ['webgpu']` (not `'layers'`)
- `optionalFeatures: ['layers', 'local-floor']`
- Use `getViewSubImage` (not `getSubImage`)
- Pass `colorFormat` (not `textureFormat`) to `createProjectionLayer`
- Use `subImage.getViewDescriptor()` for texture array layer views
- `fixedFoveation` set to `0` to disable peripheral blur
- Transient-pointer ray is gaze-seeded at pinch-start, hand-steered during hold
