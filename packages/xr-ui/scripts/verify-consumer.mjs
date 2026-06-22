#!/usr/bin/env node
// Acceptance gate for the dist build: an out-of-workspace consumer that imports the
// package in its PUBLISHED form (exports → dist, as publishConfig resolves at publish
// time) must type-check AND resolve the WebGPU globals it exposes (GPUDevice,
// GPUTextureView, …).
//
// This is the real proof a standalone `tsc` of the package cannot give: it exercises
// consumer-side module resolution against the dist artifact, with NO @webgpu/types in
// the consumer's tsconfig `types` and NONE in the TS DOM lib — so the GPU globals
// resolve ONLY if (a) the dist entry references @webgpu/types and (b) @webgpu/types is
// installed in the consumer tree as the peerDependency demands. [LAW:verifiable-goals]
//
// The gate is self-validating with TWO negative controls, because the fix has two
// load-bearing parts and each must be proven necessary: [LAW:no-silent-failure]
//   NEG-A: remove @webgpu/types from the consumer — the same compile must FAIL,
//          proving the peer (not the DOM lib or a leak) is what resolves the globals.
//   NEG-B: keep @webgpu/types but strip the injected reference from index.d.ts — the
//          same compile must FAIL, proving the inject step is what brings the
//          (non-@types, never-auto-included) package into the consumer's program.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(here, '..');
const REPO = path.resolve(PKG, '..', '..');
const DIST = path.join(PKG, 'dist');
const GESTURES = path.join(REPO, 'packages', 'avp-gestures');
const TSC = path.join(REPO, 'node_modules', 'typescript', 'bin', 'tsc');
const WEBGPU_TYPES = path.join(REPO, 'node_modules', '@webgpu', 'types');
const PKG_NAME = '@shader-playground/xr-ui';
const REFERENCE = '/// <reference types="@webgpu/types" />';

function fail(msg) {
  console.error(`verify-consumer: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(DIST, 'index.d.ts'))) fail('no dist/index.d.ts — run the package build first');
if (!fs.existsSync(path.join(GESTURES, 'dist', 'index.d.ts'))) fail('avp-gestures dist missing — build it first (xr-ui re-exports its types)');
if (!fs.existsSync(WEBGPU_TYPES)) fail(`@webgpu/types not found at ${WEBGPU_TYPES}`);
if (!fs.existsSync(TSC)) fail(`tsc not found at ${TSC}`);

// Published-form manifest: apply publishConfig over the real manifest exactly as npm
// does at publish, then keep only what a published package carries. Derived from the
// real package.json so a publishConfig change is reflected here, never hardcoded.
function publishedManifest(pkgDir) {
  const m = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  return { name: m.name, version: m.version, type: m.type, ...m.publishConfig };
}

// Build a throwaway consumer OUTSIDE the workspace so no hoisted types leak in.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xrui-consumer-'));
function placePkg(name, distSrc, manifest) {
  const dep = path.join(root, 'node_modules', name);
  fs.mkdirSync(dep, { recursive: true });
  fs.cpSync(distSrc, path.join(dep, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(dep, 'package.json'), JSON.stringify(manifest, null, 2));
  return dep;
}

const xrUiDep = placePkg(PKG_NAME, DIST, publishedManifest(PKG));
// xr-ui re-exports types from avp-gestures, so the consumer must resolve it too —
// in its published form, exactly as a real install would deliver it.
placePkg('@shader-playground/avp-gestures', path.join(GESTURES, 'dist'), publishedManifest(GESTURES));
// @webgpu/types reaches the consumer as the peerDependency it declares.
const webgpuDep = path.join(root, 'node_modules', '@webgpu', 'types');
fs.mkdirSync(webgpuDep, { recursive: true });
fs.cpSync(WEBGPU_TYPES, webgpuDep, { recursive: true });

fs.writeFileSync(
  path.join(root, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        strict: true,
        skipLibCheck: false,
        types: [],
        lib: ['ES2023', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        moduleResolution: 'bundler',
        noEmit: true,
      },
      include: ['index.ts'],
    },
    null,
    2,
  ),
);

// Imports the package by name (resolves via the published exports → dist) and names a
// WebGPU global directly through its surface. Only type-checks if @webgpu/types reached
// the program through the injected reference + the installed peer.
fs.writeFileSync(
  path.join(root, 'index.ts'),
  [
    `import { createXrWidgetRenderer } from '${PKG_NAME}';`,
    `import type { XrWidgetRenderer } from '${PKG_NAME}';`,
    ``,
    `export function makeRenderer(device: GPUDevice): XrWidgetRenderer {`,
    `  return createXrWidgetRenderer(device);`,
    `}`,
    ``,
  ].join('\n'),
);

function compile() {
  try {
    execFileSync('node', [TSC, '--project', path.join(root, 'tsconfig.json')], { stdio: 'pipe' });
    return { ok: true, out: '' };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

const positive = compile();
if (!positive.ok) {
  console.error(positive.out);
  fs.rmSync(root, { recursive: true, force: true });
  fail('consumer failed to type-check against the published dist');
}

// NEG-A: remove the peer; the same compile must now fail, proving @webgpu/types — not
// the DOM lib or a leak — is what resolves the GPU globals.
fs.rmSync(webgpuDep, { recursive: true, force: true });
const negNoPeer = compile();
if (negNoPeer.ok) {
  fs.rmSync(root, { recursive: true, force: true });
  fail('negative control A passed — GPU globals resolved without @webgpu/types; the peer proves nothing');
}

// NEG-B: restore the peer, strip the injected reference from the dist entry; the same
// compile must fail, proving the inject step is what pulls the (never-auto-included)
// package into the consumer's program.
fs.cpSync(WEBGPU_TYPES, webgpuDep, { recursive: true });
const distIndex = path.join(xrUiDep, 'dist', 'index.d.ts');
const stripped = fs.readFileSync(distIndex, 'utf8').split('\n').filter((l) => l.trim() !== REFERENCE).join('\n');
fs.writeFileSync(distIndex, stripped);
const negNoRef = compile();
fs.rmSync(root, { recursive: true, force: true });
if (negNoRef.ok) {
  fail('negative control B passed — GPU globals resolved without the injected reference; the inject step proves nothing');
}

console.log('consumer type-checks against published dist; WebGPU globals resolve through @webgpu/types peer + injected reference');
console.log('negative control A confirms the @webgpu/types peer is load-bearing');
console.log('negative control B confirms the injected reference is load-bearing');
