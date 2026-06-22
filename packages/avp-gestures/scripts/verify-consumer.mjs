#!/usr/bin/env node
// Acceptance gate for the dist build: an out-of-workspace consumer that imports the
// package in its PUBLISHED form (exports → dist, as publishConfig resolves at publish
// time) must type-check AND resolve the WebXR globals through the carried webxr.d.ts.
//
// This is the real proof a standalone `tsc` of the package cannot give: it exercises
// consumer-side module resolution against the dist artifact, with NO @types/webxr and
// NO WebXR in the TS DOM lib — so XRFrame/XRReferenceSpace resolve ONLY if the dist
// carries webxr.d.ts and the entry references it. [LAW:verifiable-goals]
//
// The gate is self-validating: it also runs a NEGATIVE control with webxr.d.ts removed
// and requires that compile to FAIL. If it passed, the positive case proved nothing
// (globals leaked from elsewhere) and we abort. [LAW:no-silent-failure]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(here, '..');
const REPO = path.resolve(PKG, '..', '..');
const DIST = path.join(PKG, 'dist');
const TSC = path.join(REPO, 'node_modules', 'typescript', 'bin', 'tsc');
const PKG_NAME = '@shader-playground/avp-gestures';

function fail(msg) {
  console.error(`verify-consumer: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(DIST, 'index.d.ts'))) fail('no dist/index.d.ts — run the package build first');
if (!fs.existsSync(path.join(DIST, 'webxr.d.ts'))) fail('no dist/webxr.d.ts — the carry build step did not run');
if (!fs.existsSync(TSC)) fail(`tsc not found at ${TSC}`);

// Published-form manifest: apply publishConfig over the real manifest exactly as npm
// does at publish, then keep only what a published package carries. Derived from the
// real package.json so a publishConfig change is reflected here, never hardcoded.
const manifest = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8'));
const published = { name: manifest.name, version: manifest.version, type: manifest.type, ...manifest.publishConfig };

// Build a throwaway consumer OUTSIDE the workspace so no hoisted types leak in.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avp-consumer-'));
const dep = path.join(root, 'node_modules', PKG_NAME);
fs.mkdirSync(dep, { recursive: true });
fs.cpSync(DIST, path.join(dep, 'dist'), { recursive: true });
fs.writeFileSync(path.join(dep, 'package.json'), JSON.stringify(published, null, 2));

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

// Imports the package by name (resolves via the published exports → dist) and names
// the WebXR globals directly. Both only type-check if webxr.d.ts reached the program.
fs.writeFileSync(
  path.join(root, 'index.ts'),
  [
    `import { createAvpInput } from '${PKG_NAME}';`,
    `import type { XrGesture } from '${PKG_NAME}';`,
    ``,
    `export function step(frame: XRFrame, refSpace: XRReferenceSpace): XrGesture[] {`,
    `  return createAvpInput().frame(frame, refSpace, 0).gestures;`,
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

// Negative control: remove the carried declarations; the same compile must now fail,
// proving webxr.d.ts is what resolves the globals (not the DOM lib or a leak).
fs.rmSync(path.join(dep, 'dist', 'webxr.d.ts'));
const negative = compile();
fs.rmSync(root, { recursive: true, force: true });
if (negative.ok) {
  fail('negative control passed — webxr.d.ts was not load-bearing; the gate proves nothing');
}

console.log('consumer type-checks against published dist; WebXR globals resolve through carried webxr.d.ts');
console.log('negative control confirms webxr.d.ts is load-bearing');
