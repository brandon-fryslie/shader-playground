#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const sourceExt = new Set(['.ts', '.tsx']);

const layers = new Map([
  ['main', 0],
  ['app', 1],
  ['ui', 2],
  ['xr', 2],
  ['input', 2],
  ['render', 3],
  ['simulations', 3],
  ['gpu', 4],
  ['metrics', 4],
  ['persistence', 4],
  ['diagnostics', 5],
  ['math', 6],
  ['xr-ui', 6],
  ['types.ts', 6],
]);

const allowedUpward = new Set([
  'app/bootstrap.ts->ui',
  'app/bootstrap.ts->xr',
  'app/bootstrap.ts->input',
  'app/bootstrap.ts->render',
  'app/bootstrap.ts->simulations',
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function layerFor(file) {
  const rel = path.relative(srcRoot, file).replaceAll(path.sep, '/');
  const first = rel.split('/')[0];
  return layers.has(rel) ? layers.get(rel) : layers.get(first);
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && sourceExt.has(path.extname(candidate))) ?? null;
}

const violations = [];
for (const file of walk(srcRoot).filter((f) => sourceExt.has(path.extname(f)))) {
  const fromLayer = layerFor(file);
  const rel = path.relative(srcRoot, file).replaceAll(path.sep, '/');
  const source = fs.readFileSync(file, 'utf8');
  const importSpecs = [...source.matchAll(/^\s*import\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  for (const spec of importSpecs) {
    const resolved = resolveImport(file, spec);
    if (!resolved) continue;
    const toLayer = layerFor(resolved);
    const toRel = path.relative(srcRoot, resolved).replaceAll(path.sep, '/');
    const targetRoot = toRel.split('/')[0];
    const exceptionKey = `${rel}->${targetRoot}`;
    // [LAW:one-way-deps] Layer ranks are the mechanical dependency direction.
    if (fromLayer !== undefined && toLayer !== undefined && toLayer < fromLayer && !allowedUpward.has(exceptionKey)) {
      violations.push(`${rel} imports upward ${toRel}`);
    }
    // [LAW:one-way-deps] Nothing imports bootstrap or main; they are composition roots.
    if (toRel === 'main.ts' || (toRel === 'app/bootstrap.ts' && rel !== 'main.ts')) {
      violations.push(`${rel} imports composition root ${toRel}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Architecture violations:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}
