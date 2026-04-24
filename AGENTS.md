# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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

WebGPU compute shader playground with 6 simulation modes (boids, N-body physics, classic N-body, fluid dynamics, parametric shapes, reaction diffusion), a color theme system, shader debug editor, and WebXR stereo rendering for Apple Vision Pro.

### Current State: Thin Entrypoints With Internal Runtime Implementation

`src/main.ts`, `src/app/bootstrap.ts`, `src/app/runtime.ts`, and `src/app/legacy-runtime.ts` are thin composition/compatibility seams. The remaining monolithic runtime implementation currently lives in `src/app/runtime-impl.ts`. Extracted ownership already exists for state creation, WGSL originals/edits, math, metrics, persistence, prompt generation, and DevTools globals.

### Module Map

| Module | Content |
|--------|---------|
| `src/main.ts` | Thin entrypoint |
| `src/app/bootstrap.ts` | Composition root |
| `src/app/runtime.ts` | Thin active runtime entrypoint |
| `src/app/runtime-impl.ts` | Current monolithic runtime implementation |
| `src/app/legacy-runtime.ts` | Compatibility shim only |
| `src/gpu/shaders.ts` | WGSL originals, edited sources, shader tab mapping |
| `src/math/` | Matrix/vector helpers |
| `src/metrics/bus.ts` | Typed metrics channels and burst recording |
| `src/persistence/local-storage.ts` | localStorage serialization/hydration |
| `src/ui/prompt.ts` | Prompt text derivation |
| `src/diagnostics/devtools.ts` | Diagnostic `window.__*` globals |

### Key Patterns

**Simulation interface:** Every simulation is `{compute(encoder), render(encoder, textureView, viewport), getCount(), destroy()}`. The `simulations` registry maps mode name to active instance. Simulations are lazy-initialized on first tab switch.

**Double-buffer ping-pong:** Boids and N-body use A/B storage buffers that swap each frame. Fluid uses copy-back-to-A after each stage for predictable buffer state.

**Camera uniform (192 bytes):** `view(mat4) + proj(mat4) + eye(vec3) + pad + primary(vec3) + pad + secondary(vec3) + pad + accent(vec3) + pad`. Theme colors ride the camera buffer to avoid extra bind groups.

**XR camera override:** `xrCameraOverride` global — when set, `getCameraUniformData()` uses XR-provided view/projection matrices instead of the orbit camera. Set per-eye in the XR frame loop, cleared after rendering.

**Shader edits:** `src/gpu/shaders.ts` is the single source of truth for original and edited WGSL. Simulations request sources by shader id. Edits take effect on simulation reset.

**Architecture checks:** `npm run check` runs dependency-direction and `src/main.ts` size guards, then the production build.

### WebXR on Vision Pro

Safari visionOS requires: `requiredFeatures: ['webgpu']` (not `'layers'`). Use `optionalFeatures: ['layers', 'local-floor']`. The `XRGPUBinding` API is available. Key differences from Chrome: use `getViewSubImage` (not `getSubImage`), pass `colorFormat` (not `textureFormat`) to `createProjectionLayer`, and use `subImage.getViewDescriptor()` when creating texture views.

### WGSL Shaders

13 shader files in `src/shaders/`, imported as raw strings. The parametric compute shader contains ALL 5 shape equations in one file — shape selection is via a `shapeId` uniform, not pipeline recompilation.

<!-- BEGIN LINKS INTEGRATION -->
## links Agent-Native Workflow

This repository is configured for agent-native issue tracking with `lit`.

Run `lit quickstart` to get instructions.

<!-- END LINKS INTEGRATION -->
