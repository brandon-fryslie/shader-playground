#!/usr/bin/env node
// Post-emit build step: make the published dist pull its WebGPU types into a
// consumer's program by injecting a `/// <reference types="@webgpu/types" />`
// into dist/index.d.ts (the published `types` entry — the first file a consumer
// loads).
//
// Why this is needed (verified against tsc, not assumed):
//   - The package's public API (renderer/session) names GPUDevice/GPUTextureView/…
//     in its emitted .d.ts, but tsc does NOT emit a `/// <reference types=>` for
//     types supplied via tsconfig `types: ["@webgpu/types"]`: a globally-configured
//     `types` entry is treated as ambient environment the consumer also provides.
//   - @webgpu/types installs to node_modules/@webgpu/types, NOT under @types, so a
//     consumer never auto-includes it either. Result without this step: the dist
//     names GPUDevice as a bare global that resolves nowhere downstream.
// Injecting the reference makes loading the package pull @webgpu/types into the
// consumer's program; @webgpu/types itself reaches the tree as a peerDependency
// (the consumer is a WebGPU app and owns the version — we never fork upstream's
// package into our dist). [LAW:one-source-of-truth]
//
// Unlike avp-gestures' carry step, NOTHING is copied here: @webgpu/types is a real
// published package, not a local declaration file. This step only injects the
// directive; resolution is the peerDependency's job. [LAW:no-silent-failure] every
// step is asserted; any miss aborts the build loudly.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(here, '..');
const DIST_INDEX = path.join(PKG, 'dist', 'index.d.ts');
const REFERENCE = '/// <reference types="@webgpu/types" />';

function fail(msg) {
  console.error(`inject-webgpu-types-ref: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(DIST_INDEX)) fail(`no dist/index.d.ts — did tsc -p tsconfig.build.json run first?`);

// Inject the reference into the published entry (idempotent).
const index = fs.readFileSync(DIST_INDEX, 'utf8');
if (!index.includes(REFERENCE)) {
  fs.writeFileSync(DIST_INDEX, `${REFERENCE}\n${index}`);
}

// Assert the contract holds — the published entry now pulls @webgpu/types.
if (!fs.readFileSync(DIST_INDEX, 'utf8').includes(REFERENCE)) {
  fail('reference directive missing from dist/index.d.ts');
}

console.log('dist/index.d.ts references @webgpu/types');
