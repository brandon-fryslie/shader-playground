# @shader-playground/xr-ui

The Apple Vision Pro spatial **menu / widget foundation**. A consumer constructs
one session and drives the whole in-headset menu through it — panels, sliders,
buttons, toggles, steppers, enum chips, tab tiles, hover laser, slide-off
cancel, head-anchored HUDs — without ever sequencing the pieces by hand.

It reads **no WebXR**. It consumes the plain input-frame from
[`@shader-playground/avp-gestures`](../avp-gestures/README.md) and does its own
widget-interaction recognition on top of it. WebXR lives entirely in the
consumer and the gestures adapter, never here.

> Apple Vision Pro specific. Target environment: visionOS Safari + WebGPU + a
> DOM (it builds a label-atlas `<canvas>`). Not a bare worker.

---

## The happy path: `createXrUiSession`

```ts
import { createXrUiSession } from '@shader-playground/xr-ui';

// 1. Construct once, at app boot.
const ui = createXrUiSession({
  device,                                  // your GPUDevice
  registerBindings: (registry) => {        // get/set windows onto YOUR state
    registry.register({
      kind: 'continuous', id: 'exposure', label: 'Exposure', group: 'render',
      range: { min: 0, max: 4 },
      get: () => state.exposure, set: (v) => { state.exposure = v; },
    });
    // ...one binding per interactive widget (kind: continuous | toggle | enum | action)
  },
});

// 2. On each XR entry, install fresh layouts.
ui.setLayouts({ layouts, activeLayoutId: 'main', hudLayoutIds: ['debug'] });

// 3a. Once per frame: the CPU step. Returns which hands the menu claimed.
const { claimed } = ui.frame({ input, tuning });

// 3b. Once per eye: draw the stashed render list into your scene target.
ui.renderEye({ encoder, targetView, targetFormat, viewIndex, view, proj, theme });
```

The session owns everything you should never have to coordinate: the
`BindingRegistry`, the interaction state (`XrUiPrev`), this frame's render list,
and the GPU widget renderer with its camera buffer. It asks only for what is
genuinely yours — your device, your bindings, your layouts, the input-frame, and
your render targets.

---

## Construction inputs

```ts
createXrUiSession({ device, registerBindings, tuning? })
```

- **`device: GPUDevice`** — your WebGPU device. The widget renderer (and its
  camera buffer) is created **lazily on the first `renderEye`**, so a session
  that never enters XR allocates no widget GPU resources.
- **`registerBindings: (registry: BindingRegistry) => void`** — called
  synchronously, here, with the fresh session-owned registry. Populate it with
  get/set windows onto your own state; only you know where that state lives.
  One registry, owned by the session, populated by you — never a second copy.
- **`tuning?`** — optional starting tuning (e.g. `gainMultiplier`). The *live*
  per-frame value is supplied to `frame()` as data, because it is consumer
  policy, not fixed config.

There is **no `colorFormat`** at construction — `renderEye` takes
`targetFormat` per eye, since the real target is the per-eye HDR scene format and
the renderer caches a pipeline per draw-format. There are **no `layouts`** at
construction either — see below.

---

## Layouts: per XR entry, not at construction

```ts
ui.setLayouts({ layouts, activeLayoutId, hudLayoutIds });
```

- `layouts: Map<string, Container & { kind: 'panel' }>` — your UI trees.
- `activeLayoutId: string | null` — the single interactive panel.
- `hudLayoutIds: string[]` — passive, head-anchored HUD panels.

Call this on **each** XR activation. The bindings are boot-lifetime and persist
across VR entries, but layouts are rebuilt fresh each entry to reset tab/focus
state. `setLayouts` replaces the registry's three layout fields wholesale;
*which* layouts exist is consumer policy, hosting and driving them is the
session's job.

---

## Per frame = two methods

Stereo rendering forces the per-frame work into two phases, and your XR
animation-frame loop is the single owner of their order:

### `frame({ input, tuning? }) → { claimed }`

The CPU step, run **once per frame, before you map your own gestures**. It runs
the interaction update, applies side effects through the bindings, computes the
per-hand UI claim, and stashes this frame's render list.

- `input: InputContext` — the input-frame from `avp-gestures` (the menu's
  `AnchorContext` is a type alias of it). The session reads it; it never reads
  WebXR.
- `tuning?: XrUiTuning` — the live per-frame tuning (e.g. a precision-mode gain
  you map from your own gestures). Falls back to the construction/default tuning
  when omitted.
- **Returns `{ claimed: Record<'left'|'right', boolean> }`** — did the menu claim
  this hand this frame (pressing/dragging a widget)? Arbitrate your own gestures
  against this so a pinch that drove a slider does not also drive the scene.

The interaction tween rate uses a fixed internal `dt` of 16 ms — *not* a measured
frame delta — so menu feel stays deterministic and free of frame-time jitter.

### `renderEye({ encoder, targetView, targetFormat, viewIndex, view, proj, theme })`

Draw the stashed render list into one eye's target. Run **once per eye**, after
`frame()`, interleaved with your own per-eye scene render. `view`/`proj` are
plain `Float32Array` matrices you already derived for your scene camera.

`theme` (`{ primary, secondary, accent }`) is a per-frame input **shared across
eyes** — fetch it once per frame and pass the same value to every eye. It rides
the camera buffer, so it can't be construction config: it changes over time.

With no `frame()` yet, or an empty layout, the render list is empty and
`renderEye` draws nothing — absence flows as data, never a guard.

`reset()` returns interaction state to idle (idle hands, empty render list);
layouts persist, rebuild them via `setLayouts` if you want a fresh tree.

---

## What the session derives / owns internally

You trust the minimalism above because the session pins down everything the
fixed visionOS environment makes derivable. Owned internally, never your concern:

- the `BindingRegistry`, the active/HUD layout selection;
- the `XrUiPrev` widget-interaction state (focus, drag, press, tab, panel
  visibility);
- this frame's render list;
- the GPU widget renderer **and its camera buffer** (lazy on first `renderEye`);
- the tuning default.

You supply five irreducible things — device, bindings, layouts, the per-frame
input-frame, and your render targets. Everything else is downstream of those.

---

## Build & publish

The widget shader is **inlined at build** so consumers need no bundler
raw-import loader:

- `src/xr-widgets.wgsl` is the source of truth.
- `scripts/gen-shader.mjs` emits `src/xr-widgets.wgsl.gen.ts` (committed,
  byte-exact via `JSON.stringify`); `renderer.ts` imports it normally — **no
  `?raw` anywhere**.
- `npm run build -w @shader-playground/xr-ui` runs codegen → `tsc -p
  tsconfig.build.json` (emits `dist/`, declarations) →
  `scripts/verify-no-raw-import.mjs` (fails if any `dist` specifier carries
  `?raw` or a raw `.wgsl`).
- `exports` stays `./src` for in-repo dev; `publishConfig` swaps `exports` to
  `./dist` on publish.
- The root `npm run check` runs `codegen:check`, so shader drift fails loudly.

**Types:** `@webgpu/types` is a devDependency and a `/// <reference>` in the
renderer/session, so the package type-checks standalone.

**Layout-regression gate (no headset):**

```
npm run verify:gpu-layout   # Deno + WebGPU readback test
```

It compiles the real `xr-widgets.wgsl`, packs via the real `packCameraUniform`,
and asserts the shader reads `view`/`proj`/`primary`/`secondary`/`accent` from
the correct byte offsets. WGSL uniform offsets are spec-defined, so this
validates the on-device layout contract without a device. It needs Deno+WebGPU
and is intentionally **not** wired into `npm run check` (the Pages-deploy CI has
no Deno).

---

## Advanced escape hatch

The granular pieces stay exported for tooling (e.g. a devtools probe) that needs
to inspect or drive the menu directly. The happy path never touches them:

- `xrUiStep`, `applySideEffects`, `makeIdlePrev`, `uiHandClaimed`
- `layout`, `hitTestWidgets`
- `createXrWidgetRenderer` (the GPU factory the session wraps)
- `BindingRegistry`
- On the session itself: `bindings`, `registry`, `getPrev()`, `getRenderList()`,
  `getClaimed()`.

### Deferred: the widget-kind ↔ WGSL duplication

The widget-kind codes are duplicated across the TS renderer (`renderer.ts`) and
the WGSL shader (`xr-widgets.wgsl`) by necessity — the two sides of a CPU/GPU
boundary. This is **intentional, not an oversight**. Revisit only when widget
kinds exceed nine (currently nine).

---

## The three-package dependency graph

```
        app  ──────────────┐
         │                 │
         ▼                 ▼
   @shader-playground   @shader-playground
       /xr-ui    ───────►  /avp-gestures
   (this package)        (input + gestures)
```

- **`avp-gestures`** — input frame + gesture recognition. Depends on nothing but
  WebXR types.
- **`xr-ui`** (this package) — the menu. Depends on `avp-gestures` for the
  input-frame type only; it consumes the input frame (not gestures — it does its
  own widget-interaction recognition) and reads no WebXR.
- **app** — depends on both. Derives the input-frame + gestures **once** per
  frame, feeds the input-frame and its render targets to the menu, maps gestures
  to its own actions, and arbitrates those against which hands the menu claimed.

Detection (`avp-gestures`), UI (`xr-ui`), and mapping + arbitration (app) are
three different concerns. Splitting them into separate packages makes the
dependency direction compile-enforced: neither library depends on the app, and
the menu and the simulation never depend on each other.
