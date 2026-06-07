import { startAppRuntimeImpl } from './runtime-impl';

// [LAW:locality-or-seam] app/runtime.ts is the active runtime entrypoint, but
// the heavy implementation lives below this boundary so composition roots stay small.
export const startAppRuntime = startAppRuntimeImpl;
