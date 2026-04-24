import { startLegacyRuntime } from './legacy-runtime';

// [LAW:one-way-deps] Bootstrap is the composition root; behavior lives below this boundary.
export async function main(): Promise<void> {
  await startLegacyRuntime();
}
