# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Vite dev server with HTTPS on `0.0.0.0:4443` (hot reload)
- `npm run build` — Type-check with `tsc` then production build to `dist/`
- `npm run preview` — Serve production build locally

For Vision Pro testing, generate a self-signed cert first:
```
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=shader-playground"
```
Then `npm run dev` auto-detects the cert and serves HTTPS.

## Architecture

WebGPU compute shader playground with 4 simulation modes (boids, N-body physics, fluid dynamics, parametric shapes), a color theme system, shader debug editor, and WebXR stereo rendering for Apple Vision Pro.

### Current State: Monolith with Shader Extraction

`src/main.ts` contains all application logic (~2400 lines) with `@ts-nocheck`. WGSL shaders have been extracted into individual files under `src/shaders/` and are imported via Vite's `?raw` suffix. The planned decomposition into modules (state, gpu, camera, simulations, ui, xr) has not yet been done — types exist in `src/types.ts` but aren't wired in yet.

### Section Map of main.ts

| Section | Content |
|---------|---------|
| 1: Constants | DEFAULTS, PRESETS, PARAM_DEFS, COLOR_THEMES, SHAPE_IDS, SHAPE_PARAMS, state object |
| 2: (empty) | Shader strings were here, now imported from .wgsl files |
| 3: Math | mat4 library, vec3 utilities, orbit camera, camera uniform packing, depth texture management, screen-to-world projection |
| 4: WebGPU Init | Device/adapter/canvas setup with fallback messaging |
| Grid Renderer | Shared animated grid background rendered before each simulation |
| 5: Simulations | Factory functions: createBoidsSimulation, createPhysicsSimulation, createFluidSimulation, createParametricSimulation. Each returns {compute, render, getCount, destroy} |
| 6: UI & Controls | DOM construction for sliders/dropdowns/presets, theme selector, mouse handling with ctrl+drag interaction |
| 7: Prompt Generator | Natural language description of current config |
| 7b: Shader Panel | Live WGSL editor with compile/reset |
| 8: WebXR | Session management for Vision Pro (XRGPUBinding, stereo rendering) |
| 9: Render Loop | requestAnimationFrame loop, FPS counter, canvas resize |
| 10: Persistence | localStorage save/load/sync |

### Key Patterns

**Simulation interface:** Every simulation is `{compute(encoder), render(encoder, textureView, viewport), getCount(), destroy()}`. The `simulations` registry maps mode name to active instance. Simulations are lazy-initialized on first tab switch.

**Double-buffer ping-pong:** Boids and N-body use A/B storage buffers that swap each frame. Fluid uses copy-back-to-A after each stage for predictable buffer state.

**Camera uniform (192 bytes):** `view(mat4) + proj(mat4) + eye(vec3) + pad + primary(vec3) + pad + secondary(vec3) + pad + accent(vec3) + pad`. Theme colors ride the camera buffer to avoid extra bind groups.

**XR camera override:** `xrCameraOverride` global — when set, `getCameraUniformData()` uses XR-provided view/projection matrices instead of the orbit camera. Set per-eye in the XR frame loop, cleared after rendering.

**Shader edits:** `SHADER_*_EDIT` variables override originals when non-null. Simulations check `EDIT || ORIGINAL` at creation time. Edits take effect on simulation reset.

### WebXR on Vision Pro

Safari visionOS requires: `requiredFeatures: ['webgpu']` (not `'layers'`). Use `optionalFeatures: ['layers', 'local-floor']`. The `XRGPUBinding` API is available. Key differences from Chrome: use `getViewSubImage` (not `getSubImage`), pass `colorFormat` (not `textureFormat`) to `createProjectionLayer`, and use `subImage.getViewDescriptor()` when creating texture views.

### WGSL Shaders

13 shader files in `src/shaders/`, imported as raw strings. The parametric compute shader contains ALL 5 shape equations in one file — shape selection is via a `shapeId` uniform, not pipeline recompilation.

### N-Body Diagnostic System

The N-body simulation exposes GPU readback diagnostics via three global functions, callable from Chrome DevTools MCP (`mcp__electric-cherry__renderer_evaluate`) or the browser console:

**`window.__simDiagnose()`** — Returns a Promise that resolves to a stats object from a 2048-particle GPU buffer sample. Uses a staging buffer with `COPY_SRC` on the particle buffers and async `mapAsync` readback. Stats returned:

| Stat | Type | Meaning |
|------|------|---------|
| `rmsRadius` | float | RMS distance from origin — spatial extent. Healthy disk: 1-5 |
| `rmsHeight` | float | RMS height above disk plane. Flat disk: < 0.01 |
| `rmsSpeed` | float | RMS velocity magnitude. Stable: < 1.5 |
| `maxRadius` | float | Farthest particle. Should stay under ~8 (boundary) |
| `tangentialFraction` | float | How circular the orbits are (1.0 = perfect circles) |
| `armContrast` | float | Angular density variation — higher = more spiral arm structure |
| `radialProfile` | float[10] | Particle count in 10 radial bins (0-0.5, 0.5-1.0, ... 4.5-5.0) |
| `angularProfile` | float[12] | Particle count in 12 angular bins (30° each) |
| `comX/Y/Z` | float | Center of mass — should stay near origin |
| `diskNormalX/Y/Z` | float | Current disk plane normal from angular momentum reduction |

**`window.__simPreset(name)`** — Clicks a preset button by name. Returns `'ok'` or `'preset not found'`.

**`window.__simState()`** — Returns current simulation parameters + FPS as a JSON object.

**Typical diagnostic workflow (via Electric Cherry MCP):**
```js
// Switch preset and measure at t=1s and t=10s
window.__simPreset('Spiral Galaxy');
setTimeout(() => window.__simDiagnose().then(d => { window.__t1 = d; }), 1300);
setTimeout(() => window.__simDiagnose().then(d => { window.__t10 = d; }), 10300);
```

**Healthy baseline values (disk presets after 10s):**
- `rmsRadius`: 3-6 (contained within disk recovery fade zone)
- `rmsHeight`: < 0.01 (flat)
- `maxRadius`: < 7 (within boundary at 8.0)
- `tangentialFraction`: > 0.9 (circular orbits)
- `rmsSpeed`: 0.3-1.0 (bound orbits, not escaping)

**Implementation:** The `diagnose()` method lives on the physics simulation return object (`createPhysicsSimulation`). It copies the first 2048 bodies (96KB) from the active ping-pong buffer to a pre-allocated staging buffer, waits for GPU completion, then computes stats in JS. The `COPY_SRC` flag is on both particle buffers to support this.
