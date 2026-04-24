#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const entrypoints = [
  { rel: path.join('src', 'main.ts'), maxLines: 50 },
  { rel: path.join('src', 'app', 'bootstrap.ts'), maxLines: 50 },
  { rel: path.join('src', 'app', 'runtime.ts'), maxLines: 50 },
  { rel: path.join('src', 'app', 'legacy-runtime.ts'), maxLines: 50 },
];

for (const entrypoint of entrypoints) {
  const abs = path.join(root, entrypoint.rel);
  const lineCount = fs.readFileSync(abs, 'utf8').trimEnd().split('\n').length;
  // [LAW:verifiable-goals] Thin compatibility/bootstrap seams are enforced mechanically.
  if (lineCount > entrypoint.maxLines) {
    console.error(`${entrypoint.rel} has ${lineCount} lines; expected <= ${entrypoint.maxLines}.`);
    process.exit(1);
  }
}
