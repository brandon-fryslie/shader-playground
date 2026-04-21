// Widget + Container types for the XR UI rewrite.
//
// A panel is a tree of containers; leaves are widgets. Every widget carries
// TWO sizes: visualSize (drawn) and hitPadding (expands hitbox outward). The
// hit rect is meaningfully LARGER than the visual element — this is a HARD
// HIG constraint, not a suggestion. Vision Pro WebXR commits selection blind
// at pinch-start, so generous targets compensate for gaze inaccuracy.
//
// [LAW:one-type-per-behavior] Slider 'horizontal' and 'vertical' are one
// kind differentiated by `orientation` — not two widget kinds. Same for
// button/toggle styles, which are visual variants of one kind.
//
// [LAW:no-mode-explosion] The set of Widget kinds is the FULL inventory.
// New visual variants ride on existing kinds (style, orientation flags) —
// not new kinds. Adding a kind requires layout, hit-test, render, and
// interaction code to all gain a case.
//
// [LAW:one-way-deps] Imports Anchor from anchors.ts; nothing else from
// the project. Concrete widget rendering (.12) and interaction (.11)
// import from this module — never the other way.

import type { Anchor } from './anchors';

export interface Vec2 { x: number; y: number }

export interface WidgetCommon {
  id: string;
  visualSize: Vec2;   // what the SDF/renderer draws
  hitPadding: Vec2;   // expands hit rect beyond visualSize on each side
}

// Opaque schema markers. Concrete shapes land alongside their consumers:
// PreviewSpec with the preset-tile renderer (.12 / .17), SummarySpec with
// the category-tile renderer (.16). Typed as Record so a forgotten field
// doesn't silently match `unknown`.
export type PreviewSpec = Record<string, unknown>;
export type SummarySpec = Record<string, unknown>;

export type ContinuousInteraction =
  | { kind: 'direct-drag'; axis: 'x' | 'y' }
  | { kind: 'pinch-twist'; axis: 'roll' | 'pitch' | 'yaw' }
  | { kind: 'pinch-pull';  axis: 'forward' | 'up' | 'right'; unitsPerMeter: number }
  | { kind: 'expand-to-focus'; underlying: ContinuousInteraction };

export type Widget = WidgetCommon & (
  | { kind: 'slider';        binding: string; orientation: 'horizontal' | 'vertical'; interaction: ContinuousInteraction }
  | { kind: 'dial';          binding: string; interaction: ContinuousInteraction }
  | { kind: 'toggle';        binding: string; style: 'switch' | 'button' }
  | { kind: 'stepper';       binding: string; step: number }
  | { kind: 'enum-chips';    binding: string }
  | { kind: 'button';        binding: string; style: 'primary' | 'secondary' | 'danger' }
  | { kind: 'preset-tile';   binding: string; preview?: PreviewSpec }
  | { kind: 'category-tile'; targetTabId: string; summary: SummarySpec }
  | { kind: 'readout';       binding: string; format?: (v: unknown) => string }
);

// Visibility gate referenced by 'panel' container. Behavior is implemented in
// ticket .18; for now, layout treats `visibility` as advisory metadata only.
export type VisibilityGate =
  | { kind: 'always' }
  | { kind: 'palm-facing-user'; hand: 'left' | 'right'; threshold?: number }
  | { kind: 'hand-raised'; hand: 'left' | 'right'; minY?: number };

export interface ContainerCommon { id: string }

export type Container = ContainerCommon & (
  | { kind: 'panel';      anchor: Anchor; size: Vec2; children: Node[]; visibility?: VisibilityGate }
  | { kind: 'group';      layout: 'row' | 'column' | 'grid'; gap?: number; columns?: number; children: Node[] }
  | { kind: 'tabs';       tabs: Array<{ id: string; label: string; body: Node }>; activeTabId: string }
  | { kind: 'focus-view'; focused: string | null; children: Node[] }
);

export type Node = Container | Widget;

// HIG-derived defaults. Numbers are starting points calibrated against Apple's
// visionOS guidance — the SHAPE of the constraint (hit rect > visual rect,
// neighbor gap > 0) is structural and not negotiable; the exact magnitudes can
// be tuned. Frozen so accidental writes during layout fail loudly.
export const HIG_DEFAULTS = Object.freeze({
  minHitHalfExtent:  Object.freeze({ x: 0.06, y: 0.06 }) as Vec2, // ≥ 12cm side
  defaultHitPadding: Object.freeze({ x: 0.02, y: 0.02 }) as Vec2, // 2cm outward
  minNeighborHitGap: 0.02,                                        // 2cm between hit rects
}) as { minHitHalfExtent: Vec2; defaultHitPadding: Vec2; minNeighborHitGap: number };

// Discriminator. Container and Widget kinds are disjoint by construction.
const WIDGET_KINDS: ReadonlySet<string> = new Set([
  'slider', 'dial', 'toggle', 'stepper', 'enum-chips',
  'button', 'preset-tile', 'category-tile', 'readout',
]);

export function isWidget(node: Node): node is Widget {
  return WIDGET_KINDS.has(node.kind);
}
