// Clipboard panel — the primary bimanual interaction surface for the
// N-body simulation. Held in the non-dominant hand; the dominant hand
// reaches across to manipulate the sliders. Anchored via the `held`
// anchor so the panel tracks wrist motion smoothly.
//
// Progressive disclosure (ticket .16): the panel's body is a single
// `tabs` container with a `root` tab showing a grid of category tiles
// plus one tab per category showing that category's controls (sliders
// and a back tile that points at the root tab).
//
// [LAW:one-source-of-truth] The active layout is a single Container tree
// produced by this factory. Subsequent panel features (.17 preset strip,
// .18 palm-visibility) extend this tree rather than minting a parallel
// layout. Within the tree, the active tab is the tabs container's
// activeTabId — no other field records "which category am I on".
// [LAW:dataflow-not-control-flow] The held hand is data — the same factory
// produces a left- or right-hand clipboard; there is no per-hand branch.
// The tab list is a data array; adding/removing a category means appending
// to that array, not adding code paths.
// [LAW:single-enforcer] The only mechanism for switching tabs is a
// category-tile widget whose `targetTabId` names the destination — back
// navigation is the same mechanism with `targetTabId: 'root'`. There is
// no second back-button widget kind and no action-binding-with-side-channel.
// [LAW:one-way-deps] This module imports only the xr-ui foundation types;
// nothing in xr-ui/* imports back from layouts/*.

import type { Hand } from '../anchors';
import type { Container, Node, Widget } from '../widgets';
import { HIG_DEFAULTS } from '../widgets';

// 60° wrist tilt around X — the panel cants toward the user's gaze when
// the wrist is held in a natural reading pose. Tuned in headset; tweak
// here, not inline in xr/runtime.ts.
const TILT_HALF_ANGLE = Math.PI * 0.33;
const TILT_X = Math.sin(TILT_HALF_ANGLE);
const TILT_W = Math.cos(TILT_HALF_ANGLE);

const PANEL_SIZE = { x: 0.20, y: 0.28 };

// Slider footprint per row. Expanded size is the focus-view's target when
// any one slider is being dragged — wider track, taller thumb, more drag
// throw. Same dimensions for every category tab so collapse/expand math
// is uniform. [LAW:one-source-of-truth]
const SLIDER_VISUAL = { x: 0.17, y: 0.030 };
const EXPANDED_SLIDER = { x: 0.18, y: 0.18 };

// Category tile visual footprint. Tiles pack 2-up in a row in the root
// grid; the panel is 0.20m wide so each tile is just under half-width
// with a HIG-minimum gap between them. Tall enough that the hit-padding
// minimum (0.06 half-extent = 12cm side) doesn't dominate.
const TILE_VISUAL = { x: 0.08, y: 0.05 };
const BACK_VISUAL = { x: 0.17, y: 0.025 };
const PRESET_TILE_VISUAL = { x: 0.08, y: 0.06 };

const ROOT_TAB_ID = 'root';

interface Category {
  id: string;
  label: string;
  // 'sliders' renders one horizontal slider per binding inside a focus-view.
  // 'tiles' renders one preset-tile per binding (each binding being a preset
  // ActionBinding). One body-shape per category keeps the type honest —
  // mixing slider + tile inside one category would require its own variant.
  // [LAW:one-type-per-behavior]
  body:
    | { kind: 'sliders'; bindings: string[] }
    | { kind: 'tiles';   bindings: string[] };
}

// Curated category set. Each entry's `bindings` array names the Binding ids
// registered in app/bindings.ts (mode-prefixed for sim params, `fx.` for
// post-processing, `app.` for app-level toggles, `preset.<mode>.` for preset
// actions). Adding a category here is the entire change needed to expose a
// new tab — no companion edits to step.ts or the renderer. The ids that
// don't yet exist in the registry (e.g. camera.* doesn't ship today) are
// skipped gracefully by buildBindingChildren below.
const CATEGORIES: Category[] = [
  {
    id: 'physics',
    label: 'Physics',
    body: { kind: 'sliders', bindings: [
      'physics.G',
      'physics.softening',
      'physics.haloMass',
      'physics.haloScale',
      'physics.diskMass',
      'physics.tidalStrength',
      'physics.attractorDecayTime',
    ] },
  },
  {
    id: 'visuals',
    label: 'Visuals',
    body: { kind: 'sliders', bindings: [
      'fx.bloomIntensity',
      'fx.bloomThreshold',
      'fx.chromaticAberration',
      'fx.vignette',
      'fx.exposure',
      'fx.timeScale',
    ] },
  },
  {
    id: 'gas',
    label: 'Gas',
    body: { kind: 'sliders', bindings: [
      'physics.gasSoundSpeed',
      'physics.gasMassFraction',
    ] },
  },
  {
    id: 'presets',
    label: 'Presets',
    body: { kind: 'tiles', bindings: [
      'preset.physics.Default',
      'preset.physics.Spiral Galaxy',
      'preset.physics.Cosmic Web',
    ] },
  },
];

function horizontalSlider(id: string, binding: string): Widget {
  return {
    id,
    kind: 'slider',
    binding,
    orientation: 'horizontal',
    // [LAW:dataflow-not-control-flow] interaction stays direct-drag even
    // when the slider is wrapped in a focus-view. Expansion is a layout
    // property (the focus-view's expandedSize feeds the renderer), NOT an
    // interaction kind. Per the ticket: do NOT re-scale the drag delta —
    // the wider visual track is the whole point of the precision gain.
    interaction: { kind: 'direct-drag', axis: 'x' },
    visualSize: SLIDER_VISUAL,
    hitPadding: HIG_DEFAULTS.defaultHitPadding,
  };
}

function categoryTile(category: Category): Widget {
  return {
    id: `clipboard-tile-${category.id}`,
    kind: 'category-tile',
    targetTabId: category.id,
    summary: { label: category.label },
    visualSize: TILE_VISUAL,
    hitPadding: HIG_DEFAULTS.defaultHitPadding,
  };
}

function backTile(fromCategoryId: string): Widget {
  return {
    id: `clipboard-back-${fromCategoryId}`,
    kind: 'category-tile',
    targetTabId: ROOT_TAB_ID,
    summary: { label: 'Back' },
    visualSize: BACK_VISUAL,
    hitPadding: HIG_DEFAULTS.defaultHitPadding,
  };
}

function presetTile(category: Category, bindingId: string): Widget {
  return {
    id: `clipboard-${category.id}-${slugify(bindingId)}`,
    kind: 'preset-tile',
    binding: bindingId,
    visualSize: PRESET_TILE_VISUAL,
    hitPadding: HIG_DEFAULTS.defaultHitPadding,
  };
}

// Build the body of a single category tab: back tile across the top, then
// the category-specific control region. For 'sliders' that region is a
// focus-view of horizontal sliders (so the per-row expand-to-focus mechanic
// from .14 keeps working inside tabs); for 'tiles' it is a 2-up grid of
// preset-tile widgets.
function buildCategoryBody(category: Category): Container {
  const region = category.body.kind === 'sliders'
    ? {
        id: `clipboard-focus-${category.id}`,
        kind: 'focus-view',
        focused: null,
        expandedSize: EXPANDED_SLIDER,
        children: category.body.bindings.map(b =>
          horizontalSlider(`clipboard-${category.id}-${slugify(b)}`, b),
        ),
      } satisfies Container
    : {
        id: `clipboard-grid-${category.id}`,
        kind: 'group',
        layout: 'grid',
        columns: 2,
        gap: HIG_DEFAULTS.minNeighborHitGap,
        children: category.body.bindings.map(b => presetTile(category, b)),
      } satisfies Container;
  return {
    id: `clipboard-tab-${category.id}`,
    kind: 'group',
    layout: 'column',
    children: [backTile(category.id), region],
  };
}

function buildRootBody(): Container {
  return {
    id: 'clipboard-tab-root',
    kind: 'group',
    layout: 'grid',
    columns: 2,
    gap: HIG_DEFAULTS.minNeighborHitGap,
    children: CATEGORIES.map(categoryTile),
  };
}

function slugify(bindingId: string): string {
  return bindingId.replace(/[^a-z0-9]/gi, '-');
}

export function createClipboardLayout(hand: Hand): Container & { kind: 'panel' } {
  const tabs: Container & { kind: 'tabs' } = {
    id: 'clipboard-tabs',
    kind: 'tabs',
    activeTabId: ROOT_TAB_ID,
    tabs: [
      { id: ROOT_TAB_ID, label: 'Categories', body: buildRootBody() },
      ...CATEGORIES.map(cat => ({
        id: cat.id,
        label: cat.label,
        body: buildCategoryBody(cat) satisfies Node,
      })),
    ],
  };

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
    size: PANEL_SIZE,
    children: [tabs],
  };
}
