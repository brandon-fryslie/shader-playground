#!/usr/bin/env node
// Post-emit build step: make the published dist carry its ambient WebXR types so a
// downstream consumer resolves XRFrame/XRInputSource/XRReferenceSpace/XRHandJoint/…
// without an @types/webxr in their tree.
//
// Why this is needed (verified against tsc, not assumed): the source references
// webxr.d.ts via `/// <reference path="./webxr.d.ts" />` in adapter.ts/input.ts, but
// tsc neither copies a source `.d.ts` into outDir nor re-emits a LOCAL triple-slash
// directive into the emitted declarations — with or without removeComments. So the
// emitted adapter.d.ts/input.d.ts name XRFrame as a bare global with nothing pulling
// the declaration in. This step closes both gaps deterministically:
//   1. copy src/webxr.d.ts → dist/webxr.d.ts            (carry the declarations)
//   2. inject the reference at the top of dist/index.d.ts (the published `types`
//      entry — the one file a consumer always loads first), so loading the package
//      pulls webxr.d.ts into the program and its ambient interfaces go global.
// [LAW:one-source-of-truth] dist/webxr.d.ts is a derived copy of the single source
// src/webxr.d.ts, re-synced on every build. [LAW:no-silent-failure] every step is
// asserted; any miss aborts the build loudly.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(here, '..');
const SRC_DTS = path.join(PKG, 'src', 'webxr.d.ts');
const DIST = path.join(PKG, 'dist');
const DIST_DTS = path.join(DIST, 'webxr.d.ts');
const DIST_INDEX = path.join(DIST, 'index.d.ts');
const REFERENCE = '/// <reference path="./webxr.d.ts" />';

function fail(msg) {
  console.error(`carry-webxr-types: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(SRC_DTS)) fail(`source ambient types missing at ${SRC_DTS}`);
if (!fs.existsSync(DIST_INDEX)) fail(`no dist/index.d.ts — did tsc -p tsconfig.build.json run first?`);

// 1. Carry the ambient declarations next to the emitted entry.
fs.copyFileSync(SRC_DTS, DIST_DTS);

// 2. Inject the reference into the published entry (idempotent).
const index = fs.readFileSync(DIST_INDEX, 'utf8');
if (!index.includes(REFERENCE)) {
  fs.writeFileSync(DIST_INDEX, `${REFERENCE}\n${index}`);
}

// 3. Assert the contract holds — the dist is now self-contained.
if (!fs.existsSync(DIST_DTS)) fail('dist/webxr.d.ts was not written');
if (!fs.readFileSync(DIST_INDEX, 'utf8').includes(REFERENCE)) {
  fail('reference directive missing from dist/index.d.ts');
}

console.log('dist carries webxr.d.ts; index.d.ts references it');
