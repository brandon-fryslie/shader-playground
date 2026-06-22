// The per-frame entry that composes the two layers: it runs the impure adapter
// then the pure recognizer, holding the recognizer's FSM state internally, and
// returns the input frame + this frame's gestures as DATA. [LAW:dataflow-not-
// control-flow] frame() always runs and never calls back or acts on the world.
//
// `input` is the menu-facing InputContext (HandInputFrame is an InputFrame, so
// the substrate flows through untouched). Mapping gestures to app actions and
// arbitrating against the menu stay in the consumer. [LAW:decomposition]

// XRFrame/XRReferenceSpace/XRInputSource appear in this façade's signatures; pull
// their ambient declarations in so a consumer's build resolves them. [LAW:locality-or-seam]
/// <reference path="./webxr.d.ts" />

import type { AvpFrameResult } from './types';
import { createAvpInputAdapter } from './adapter';
import { makeRecognizerState, recognizeGestures, type RecognizerState } from './recognizer';

export interface AvpInput {
  selectStart(source: XRInputSource): void;
  selectEnd(source: XRInputSource): void;
  frame(xrFrame: XRFrame, refSpace: XRReferenceSpace, nowMs: number): AvpFrameResult;
  reset(): void;
}

export function createAvpInput(): AvpInput {
  const adapter = createAvpInputAdapter();
  let recognizerState: RecognizerState = makeRecognizerState();

  return {
    selectStart: (source) => adapter.selectStart(source),
    selectEnd: (source) => adapter.selectEnd(source),
    frame(xrFrame, refSpace, nowMs) {
      const substrate = adapter.frame(xrFrame, refSpace, nowMs);
      const { gestures, state } = recognizeGestures(substrate.hands, recognizerState, nowMs);
      recognizerState = state;
      return {
        input: { hands: substrate.hands, headPose: substrate.headPose },
        gestures,
      };
    },
    reset() {
      adapter.reset();
      recognizerState = makeRecognizerState();
    },
  };
}
