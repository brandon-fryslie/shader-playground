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
