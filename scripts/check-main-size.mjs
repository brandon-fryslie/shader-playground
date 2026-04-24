#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const mainPath = path.join(process.cwd(), 'src', 'main.ts');
const lineCount = fs.readFileSync(mainPath, 'utf8').trimEnd().split('\n').length;
const maxLines = 50;

// [LAW:verifiable-goals] The bootstrap-only main target is checked mechanically.
if (lineCount > maxLines) {
  console.error(`src/main.ts has ${lineCount} lines; expected <= ${maxLines}.`);
  process.exit(1);
}
