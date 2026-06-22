#!/usr/bin/env node
// Acceptance gate: the published dist must carry no bundler raw-import contract.
// Inspects every import/require SPECIFIER in the emitted dist and fails if any carries
// a `?raw` loader query or resolves a raw `.wgsl` file. Matching specifier position —
// not incidental text — keeps the check faithful to what the contract actually is.
// [LAW:verifiable-goals] turns "needs no raw-import loader" into a deterministic check;
// [LAW:no-silent-failure] a leak aborts the build.

// import/export ... from '<spec>' | import('<spec>') | require('<spec>')
const SPECIFIER = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"]([^'"]+)['"]/g;
const isRawImport = (spec) => /\?raw\b/.test(spec) || /\.wgsl$/.test(spec);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(here, '..', 'dist');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

if (!fs.existsSync(DIST)) {
  console.error(`No dist/ to verify at ${DIST} — did tsc emit?`);
  process.exit(1);
}

const offenders = walk(DIST)
  .filter((f) => /\.(js|d\.ts|mjs|cjs)$/.test(f))
  .flatMap((f) => {
    const text = fs.readFileSync(f, 'utf8');
    const bad = [...text.matchAll(SPECIFIER)].map((m) => m[1]).filter(isRawImport);
    return bad.map((spec) => `${path.relative(path.join(here, '..'), f)}: ${spec}`);
  });

if (offenders.length > 0) {
  console.error(`Raw-import loader contract leaked into dist:\n  ${offenders.join('\n  ')}`);
  process.exit(1);
}

console.log('dist carries no raw-import loader contract');
