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

## Deployment

GitHub Pages, multiplexed by version slot via `.github/workflows/deploy.yml`:
- **PR previews**: `https://brandon-fryslie.github.io/shader-playground/pr-<PR-number>/` (auto-deployed on every PR push; concurrency-grouped, no cancel)
- **master commits**: `https://brandon-fryslie.github.io/shader-playground/r<count>-<short-sha>/`
- **tags `v*`**: `https://brandon-fryslie.github.io/shader-playground/<tag>/`

The Vision Pro user tests against PR previews — they do **not** run `npm run dev` locally for review. After pushing to a PR branch, the deploy completes in ~1–2 minutes; verify with `gh run list --workflow deploy.yml --limit 1`. The user reloads the PR preview URL; no local dev server involved.

## Architecture

WebGPU compute shader playground with 4 simulation modes (boids, N-body physics, fluid dynamics, parametric shapes), a color theme system, shader debug editor, and WebXR stereo rendering for Apple Vision Pro.

### Current State: Monolith with Shader Extraction

`src/main.ts` contains all application logic (~5000 lines). WGSL shaders are in individual files under `src/shaders/` imported via Vite's `?raw` suffix. Types are in `src/types.ts`. The codebase uses strict TypeScript (no `@ts-nocheck`).

### Section Map of main.ts

| Section | Content |
|---------|---------|
| 1: Constants | DEFAULTS, PRESETS, PARAM_DEFS, COLOR_THEMES, SHAPE_IDS, SHAPE_PARAMS, state object |
| Attractor Lifecycle | `attractorStrength`, `attractorDead`, `attractorDecayDuration`, `pruneAttractors`, `createAttractor`, `moveAttractor`, `releaseAttractor` |
| 2: (empty) | Shader strings were here, now imported from .wgsl files |
| 3: Math | mat4 library, vec3 utilities, orbit camera, camera uniform packing, depth texture management, screen-to-world projection |
| 4: WebGPU Init | Device/adapter/canvas setup with fallback messaging |
| Grid Renderer | Shared animated grid background rendered before each simulation |
| 5: Simulations | Factory functions: createBoidsSimulation, createPhysicsSimulation, createFluidSimulation, createParametricSimulation |
| 6: UI & Controls | DOM construction for sliders/dropdowns/presets, theme selector, mouse/touch handling, time-reverse controls |
| 7: Prompt Generator | Natural language description of current config |
| 7b: Shader Panel | Live WGSL editor with compile/reset |
| 8: WebXR | Session management for Vision Pro (XRGPUBinding, stereo rendering) |
| 9: Render Loop | requestAnimationFrame loop, FPS counter, step counter, canvas resize |
| 10: Persistence | localStorage save/load/sync |

### Key Patterns

**Simulation interface:** Every simulation is `{compute(encoder), render(encoder, textureView, viewport), getCount(), destroy()}`. The physics simulation adds: `setTimeDirection(dir)`, `getSimStep()`, `getTimeDirection()`, `getJournalCapacity()`, `getJournalHighWater()`. The `simulations` registry maps mode name to active instance. Simulations are lazy-initialized on first tab switch.

**Double-buffer ping-pong:** Boids and N-body use A/B storage buffers that swap each frame. Fluid uses copy-back-to-A after each stage for predictable buffer state.

**Camera uniform (192 bytes):** `view(mat4) + proj(mat4) + eye(vec3) + pad + primary(vec3) + pad + secondary(vec3) + pad + accent(vec3) + pad`. Theme colors ride the camera buffer to avoid extra bind groups.

**XR camera override:** `xrCameraOverride` global — when set, `getCameraUniformData()` uses XR-provided view/projection matrices instead of the orbit camera.

**Shader edits:** `SHADER_*_EDIT` variables override originals when non-null. Simulations check `EDIT || ORIGINAL` at creation time. Edits take effect on simulation reset.

### WebXR on Vision Pro

Safari visionOS requires: `requiredFeatures: ['webgpu']` (not `'layers'`). Use `optionalFeatures: ['layers', 'local-floor']`. The `XRGPUBinding` API is available. Key differences from Chrome: use `getViewSubImage` (not `getSubImage`), pass `colorFormat` (not `textureFormat`) to `createProjectionLayer`, and use `subImage.getViewDescriptor()` when creating texture views.

### WGSL Shaders

~13 shader files in `src/shaders/`, imported as raw strings. The parametric compute shader contains ALL 5 shape equations in one file — shape selection is via a `shapeId` uniform, not pipeline recompilation.

---

## N-Body Physics: Time-Reversible Conservative Architecture

The N-body simulation uses **exclusively conservative (position-only) forces** and a **DKD leapfrog integrator**. This makes the simulation exactly time-reversible: negating `dt` produces the exact inverse trajectory.

### DKD Leapfrog Integrator (`nbody.compute.wgsl`)

The integration scheme per step (single GPU dispatch):

1. **Half-drift**: `posHalf = pos + vel × dt/2` — all particles, including tile-loaded sources (computed inline during tile load for consistent half-step force evaluation)
2. **Forces**: `acc = F(posHalf)` — gravity + dark matter + attractors + tidal + boundary
3. **Kick**: `velNew = vel + acc × dt` — full velocity update
4. **Half-drift**: `posNew = posHalf + velNew × dt/2` — complete position step

**Why inline half-drift matters**: each source particle loaded into the shared-memory tile is half-drifted on the fly (`srcHalf = src.pos + src.vel × halfDt`). This ensures gravity is evaluated at consistent half-step positions across all pairs — the symmetry that makes DKD exactly reversible. One force evaluation per step, same GPU cost as the old Euler integrator.

### Forces (ALL conservative, position-only)

| Force | Description | Constants/Params |
|-------|-------------|------------------|
| N-body gravity | Tile-based O(N×S), softened | `params.G`, `params.softening` |
| Plummer dark matter halo | Spherical confinement: `F = -M r / (r² + a²)^(3/2)` | `params.haloMass`, `params.haloScale` |
| Miyamoto-Nagai disk | Axisymmetric vertical confinement | `params.diskMass`, `params.diskScaleA`, `params.diskScaleB` |
| Attractor wells | Per-attractor 1/r² well + repulsive core (up to 32) | `INTERACTION_WELL_STRENGTH`, `INTERACTION_CORE_*` |
| Tidal quadrupole | Rotating quadrupole seeds spiral arms | `params.tidalStrength`, rate 0.15 rad/s |
| Soft boundary | Containment at r > 60 | `N_BODY_OUTER_RADIUS = 60`, `N_BODY_BOUNDARY_PULL` |

**No velocity-dependent forces exist.** All dissipative forces (damping, friction, disk recovery) were removed and replaced with the dark matter potentials. The virial controller is removed — dark matter provides structural stability.

### Nested PM Grids (cosmic-weaving-flask, Phase A)

N-body gravity above is powered by a **two-grid nested Particle-Mesh solver**:

- **Inner grid**: 128³ covering ±16 world units (cell size 0.25). Sharp central gravity where particles actually live.
- **Outer grid**: 64³ covering the full ±64 periodic domain (cell size 2.0). Cheap long-range coupling for particles that escape the inner domain.
- Both solves use the existing multigrid V-cycle with red-black Gauss-Seidel; inner phase-splits the V across 2 frames (the existing Vision Pro 11 ms budget discipline), outer runs a full V-cycle per frame (~0.6 ms on M2).
- `pm.interpolate_nested.wgsl` samples both grids per particle and smoothstep-blends force across the [±14, ±16] transition shell. No branches — the blend weight decides which contribution survives.
- `pm.deposit.wgsl` filters particles outside each grid's `domainHalf`, so inner gets only particles inside ±16 while outer gets everyone. Nbody.compute's periodic wrap at ±64 keeps the outer grid's periodic BC consistent.

Diagnostics: `__pmMaxResidual()` returns `{ inner, outer }`. `__pmDumpOuterDensity()` / `__pmDumpOuterPotential()` dump the outer grid. `__pmReversibilityTest(1000)` exercises both grids in the full fwd/rev pass.

### Simulation Clock

`simStep` is the canonical step index of the simulation state currently in the particle buffer. It advances by `timeDirection` each compute dispatch — forward (`+1` after journal write) or reverse (`−1` at the top of `compute()` before param packing). Tidal angle = `simStep × dt × 0.15`. Attractor timing uses `simStep × dt`. No `performance.now()` in the simulation path — fully deterministic.

**Decrement timing matters:** in reverse mode, `simStep` is decremented at the very start of `compute()` so that every downstream consumer (tidal angle, journal lookup, `nowSec`) uses the same step index — specifically, the step whose params were packed during the original forward step that produced the current state. Without this ordering, reverse params would mix values from step N and step N-1, breaking the `reverse(forward(s)) = s` invariant.

### Body Struct (48 bytes)

| Field | Type | Purpose |
|-------|------|---------|
| `pos` | vec3f | Position |
| `mass` | f32 | Particle mass |
| `vel` | vec3f | Velocity |
| `_pad` | f32 | Alignment |
| `_unused` | vec3f | Available (was `home` for disk recovery springs) |
| `_pad2` | f32 | Alignment |

### Params Uniform (608 bytes)

96-byte header + 32 × 16-byte `Attractor` array.

| f32 Index | Field | Notes |
|-----------|-------|-------|
| 0 | dt | `0.016 × timeScale × timeDirection` |
| 1 | G | Normalized by `sqrt(sourceCount/1000)` |
| 2 | softening | |
| 3 | haloMass | Plummer halo (was `damping`) |
| 4 (u32) | count | Particle count |
| 5 (u32) | sourceCount | MASSIVE_BODY_COUNT |
| 6 | haloScale | Plummer radius (was `coreOrbit`) |
| 7 | time | `simStep × baseDt` (deterministic) |
| 8 (u32) | attractorCount | 0–32 |
| 12–14 | diskNormal | Fixed [0, 1, 0] |
| 16 | diskMass | Miyamoto-Nagai mass |
| 17 | diskScaleA | MN radial scale |
| 18 | diskScaleB | MN vertical scale |
| 23 | tidalStrength | |
| 24+ | attractors[32] | `{pos: vec3f, strength: f32}` × 32 |

---

## Attractor Wand System

Users interact with the N-body simulation via **placeable, charging attractors**. Each click creates an attractor that follows the cursor while held (wand behavior), quadratically charges strength over 1.5s, then decays after release.

### Lifecycle

- **pointerdown** → `createAttractor(pointerId, worldPos)` — new attractor at ray-plane intersection
- **pointermove** → `moveAttractor(pointerId, worldPos)` — wand tracks cursor
- **pointerup** → `releaseAttractor(pointerId)` — marks released, decay begins
- **Each frame** → `pruneAttractors(simTime)` — removes dead attractors

### Charge/Decay Curves

- **Charge**: `strength = (t / 1.5s)² × ceiling` — accelerating quadratic ramp
- **Decay**: `strength = peak × (1 − t/decayDur)²` — ease-out, fast drop then long tail
- **Decay duration**: `max(0.05s, min(attractorDecayCap, attractorDecayRatio × holdDuration))`
- User sliders: `attractorDecayRatio` (default 0.5), `attractorDecayCap` (default 2.0s)

### Per-pointer tracking

Each pointer (mouse, touch finger, XR pinch) maps to its own attractor via `state.pointerToAttractor: Map<number, number>`. XR uses synthetic pointer ID `-1`. Multi-touch naturally produces independent attractors.

### Attractor forces (in shader)

Each attractor contributes two conservative forces (position-only):
- **1/r² well**: `dir × strength × 12.0 × countScale / (dist² + 0.25)`
- **Repulsive core**: `dir × max(0, 0.3 − dist) × strength × 16.0 × countScale`

Both zero when `strength = 0` — no branching (dataflow-not-control-flow).

---

## Time Reversal System

### How it works

1. **Hold R key** (desktop) or **rewind FAB** (mobile) → `setTimeDirection(-1)`
2. Compute shader receives `dt = baseDt × (−1)` → DKD leapfrog runs exactly backwards
3. Attractor forces read from the **journal** (not computed live) to match the original forward forces
4. Release R → `setTimeDirection(1)`, forward resumes from the rewound step (timeline branching)

### Attractor Journal

Circular buffer storing the packed attractor uniform data at each simulation step:

- **Capacity**: 18000 steps (5 minutes at 60fps)
- **Entry size**: 129 floats (1 count + 32 × 4 floats) = 516 bytes
- **Total memory**: ~9.3 MB
- **Forward**: compute strengths normally, write to `journal[simStep]`, then `simStep++`
- **Reverse**: `simStep--` first (at top of `compute()`), then read from `journal[simStep]` — the same entry that was written during the forward step that produced the current state

### Boundary conditions

- Can't reverse past step 0 → auto-pauses
- New interactions blocked during reverse (`createAttractor` checks `timeDirection`)
- Resuming forward overwrites journal entries from current step onward

### Step counter

Visible in the stats bar when in physics mode: `Step: 1234 ▶` (forward) or `Step: 1234 ◀` (reverse).

---

## N-Body Diagnostic System

The N-body simulation exposes GPU readback diagnostics via three global functions, callable from Chrome DevTools MCP (`mcp__electric-cherry__renderer_evaluate`) or the browser console:

**`window.__simDiagnose()`** — Returns a Promise that resolves to a stats object from a 2048-particle GPU buffer sample. Uses a staging buffer with `COPY_SRC` on the particle buffers and async `mapAsync` readback. Stats returned:

| Stat | Type | Meaning |
|------|------|---------|
| `rmsRadius` | float | RMS distance from origin — spatial extent |
| `rmsHeight` | float | RMS height above disk plane |
| `rmsSpeed` | float | RMS velocity magnitude |
| `maxRadius` | float | Farthest particle. Boundary at 15.0 |
| `tangentialFraction` | float | How circular the orbits are (1.0 = perfect circles) |
| `armContrast` | float | Angular density variation — higher = more spiral arm structure |
| `radialProfile` | float[10] | Particle count in 10 radial bins |
| `angularProfile` | float[12] | Particle count in 12 angular bins (30° each) |
| `comX/Y/Z` | float | Center of mass — should stay near origin |
| `diskNormalX/Y/Z` | float | Current disk plane normal from angular momentum reduction |

**`window.__simPreset(name)`** — Clicks a preset button by name. Returns `'ok'` or `'preset not found'`.

**`window.__simState()`** — Returns current simulation parameters + FPS as a JSON object.

**Implementation:** The `diagnose()` method lives on the physics simulation return object (`createPhysicsSimulation`). It copies the first 2048 bodies (96KB) from the active ping-pong buffer to a pre-allocated staging buffer, waits for GPU completion, then computes stats in JS.

---

## Post-Processing Pipeline

HDR scene → bloom (downsample/upsample chain) → composite with tone mapping, chromatic aberration, vignette, color grading, gravitational lensing, and per-attractor reticle rendering.

**Bind group caching**: `ensureHdrTargets()` pre-builds `fadeBGs`, `downsampleBGs`, `upsampleBGs`, `compositeBGs` on resize. Per-frame passes reuse the cached bind groups — no per-frame `createBindGroup` calls.

**Composite uniform (592 bytes)**: 80-byte header + 32 × 16-byte `ReticleAttractor` array. Screen-space attractor positions are projected on CPU once per attractor per frame.

**Per-attractor reticle**: aspect-corrected ring + dot in the composite fragment shader. Size and brightness scale with attractor strength (extrapolates for `strength > 1` at high ceiling settings). Pulsing at 5 Hz via `sin(time × 5)`.

---

## Future: Phase 3 — Gas Grid (Conservative Structure Recovery)

Planned: Eulerian gas physics on a 256×256×32 anisotropic grid coupled to the N-body particles. Gas provides "friction" that forms disks through conservative momentum exchange — fully reversible. See `.claude/plans/cosmic-soaring-squirrel.md` for the full design.

Key elements: isothermal Euler equations (no viscosity), sort-and-bin spatial hashing for particle↔grid coupling, fixed-point atomic CIC deposition, semi-Lagrangian advection, and P³M gravity as an optional optimization.
