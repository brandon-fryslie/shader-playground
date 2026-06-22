// Debug HUD — head-anchored stack of readout widgets surfacing FPS, GPU frame
// time, and the error log size while the user is inside an XR session. The
// desktop HUD already shows these three; the HUD makes them visible without
// leaving the headset, which is the whole point of ticket .22.
//
// [LAW:composability] Reuses the readout widget seam built in .12/.19: each
// metric is a registered ContinuousBinding (id `metrics.fps` / `metrics.gpuMs`
// / `metrics.errorCount`); this factory just arranges them in a head-anchored
// panel. No new render path, no parallel atlas, no per-HUD instance ABI.
// [LAW:one-source-of-truth] Anchor + size + which bindings to surface live
// in this factory only. The renderer reads RenderCommand[] uniformly; the
// step layer reads BindingRegistry + AnchorContext uniformly. Adding a fourth
// metric is one entry in METRICS below — no companion edit anywhere else.
// [LAW:dataflow-not-control-flow] visibility=always: the gate evaluates to
// `true` once and the alpha tween in step.ts ramps to 1; HUDs never need a
// "hide me" branch in the renderer.
// [LAW:one-way-deps] App-specific consumer; imports only the xr-ui package
// barrel. The package never imports back from the app.

import type { Container, Widget } from '@shader-playground/xr-ui';
import { HIG_DEFAULTS } from '@shader-playground/xr-ui';

// Curated list. Each id matches a ContinuousBinding registered in
// app/bindings.ts. Order is the visual stacking order in the column.
const METRICS: ReadonlyArray<{ id: string; bindingId: string }> = [
  { id: 'hud-readout-fps',    bindingId: 'metrics.fps' },
  { id: 'hud-readout-gpu',    bindingId: 'metrics.gpuMs' },
  { id: 'hud-readout-errors', bindingId: 'metrics.errorCount' },
];

// Sized to read at ~0.6m head distance. Width matches the clipboard's slider
// width-class so the label-atlas glyph metrics carry over without re-tuning.
const READOUT_VISUAL = { x: 0.08, y: 0.022 };
const PANEL_SIZE = { x: 0.10, y: 0.10 };

// Distance forward of the head. ~0.6m fits comfortably inside the user's
// stereoscopic comfort zone and clears the typical reach envelope so the
// clipboard panel and HUD never visually overlap.
const HUD_DISTANCE = 0.6;

// Offset places the HUD in the upper-right of the user's view: +x right of
// center, +y above center. The orientation is identity — head-hud's parent
// pose already aligns the panel's local +Z with the gaze direction.
const HUD_OFFSET_X = 0.18;
const HUD_OFFSET_Y = 0.12;

function readout(id: string, bindingId: string): Widget {
  return {
    id,
    kind: 'readout',
    binding: bindingId,
    visualSize: READOUT_VISUAL,
    hitPadding: HIG_DEFAULTS.defaultHitPadding,
  };
}

export function createDebugHudLayout(): Container & { kind: 'panel' } {
  const column: Container = {
    id: 'hud-column',
    kind: 'group',
    layout: 'column',
    gap: HIG_DEFAULTS.minNeighborHitGap,
    children: METRICS.map(m => readout(m.id, m.bindingId)),
  };
  return {
    id: 'debug-hud-panel',
    kind: 'panel',
    anchor: {
      kind: 'head-hud',
      distance: HUD_DISTANCE,
      offset: {
        position: [HUD_OFFSET_X, HUD_OFFSET_Y, 0],
        orientation: [0, 0, 0, 1],
      },
    },
    size: PANEL_SIZE,
    children: [column],
    visibility: { kind: 'always' },
  };
}
