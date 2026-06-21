// Clipboard panel — the primary bimanual interaction surface for the
// N-body simulation. Held in the non-dominant hand; the dominant hand
// reaches across to manipulate the sliders. Anchored via the `held`
// anchor so the panel tracks wrist motion smoothly.
//
// [LAW:one-source-of-truth] The active layout is a single Container tree
// produced by this factory. Subsequent panel features (.16 tabs,
// .17 preset strip, .18 palm-visibility) extend this tree rather than
// minting a parallel layout.
// [LAW:dataflow-not-control-flow] The held hand is data — the same factory
// produces a left- or right-hand clipboard; there is no per-hand branch.
// [LAW:one-way-deps] This module imports only the xr-ui foundation types;
// nothing in xr-ui/* imports back from layouts/*.

import type { Hand } from '../anchors';
import type { Container, Widget } from '../widgets';
import { HIG_DEFAULTS } from '../widgets';

// 60° wrist tilt around X — the panel cants toward the user's gaze when
// the wrist is held in a natural reading pose. Tuned in headset; tweak
// here, not inline in xr/runtime.ts.
const TILT_HALF_ANGLE = Math.PI * 0.33;
const TILT_X = Math.sin(TILT_HALF_ANGLE);
const TILT_W = Math.cos(TILT_HALF_ANGLE);

const SLIDER_VISUAL = { x: 0.17, y: 0.030 };

function horizontalSlider(id: string, binding: string): Widget {
  return {
    id,
    kind: 'slider',
    binding,
    orientation: 'horizontal',
    interaction: { kind: 'direct-drag', axis: 'x' },
    visualSize: SLIDER_VISUAL,
    hitPadding: HIG_DEFAULTS.defaultHitPadding,
  };
}

export function createClipboardLayout(hand: Hand): Container & { kind: 'panel' } {
  return {
    id: 'clipboard-panel',
    kind: 'panel',
    anchor: {
      kind: 'held',
      hand,
      offset: {
        position: [0.00, 0.15, -0.10],
        orientation: [TILT_X, 0, 0, TILT_W],
      },
    },
    size: { x: 0.20, y: 0.28 },
    children: [{
      id: 'clipboard-col',
      kind: 'group',
      layout: 'column',
      gap: 0.015,
      children: [
        horizontalSlider('clipboard-G',     'physics.G'),
        horizontalSlider('clipboard-soft',  'physics.softening'),
        horizontalSlider('clipboard-int',   'physics.interactionStrength'),
        horizontalSlider('clipboard-tidal', 'physics.tidalStrength'),
      ],
    }],
  };
}
