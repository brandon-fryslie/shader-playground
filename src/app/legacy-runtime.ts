import { startAppRuntime } from './runtime';

// [LAW:locality-or-seam] This file remains only as a compatibility seam while
// callers move to app/runtime.ts. Runtime behavior lives below this boundary.
export const startLegacyRuntime = startAppRuntime;
