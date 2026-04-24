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

WebGPU compute shader playground with 6 simulation modes (boids, N-body physics, classic N-body, fluid dynamics, parametric shapes, reaction diffusion), a color theme system, shader debug editor, and WebXR stereo rendering for Apple Vision Pro.

### Current State: Thin Entrypoint With Legacy Runtime Seam

`src/main.ts` is a bootstrap-only entrypoint. `src/app/bootstrap.ts` composes the app and calls `src/app/legacy-runtime.ts`, which is the explicit migration seam for remaining runtime code. Extracted ownership exists for state creation, WGSL originals/edits, math, metrics, persistence, prompt generation, and DevTools globals. The codebase uses strict TypeScript.

### Module Map

| Module | Content |
|--------|---------|
| `src/main.ts` | Thin entrypoint |
| `src/app/bootstrap.ts` | Composition root |
| `src/app/legacy-runtime.ts` | Remaining runtime seam during extraction |
| `src/gpu/shaders.ts` | WGSL originals, edited sources, shader tab mapping |
| `src/math/` | Matrix/vector helpers |
| `src/metrics/bus.ts` | Typed metrics channels and burst recording |
| `src/persistence/local-storage.ts` | localStorage serialization/hydration |
| `src/ui/prompt.ts` | Prompt text derivation |
| `src/diagnostics/devtools.ts` | Diagnostic `window.__*` globals |

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

### PM Solver (nested grids, full V-cycle per frame)

N-body gravity is solved via Particle-Mesh multigrid on **two concentric grids**:

- **Inner**: 128³ cells covering ±16 (cell size **0.25**). Resolves the central galaxy region with 4× the resolution of the old uniform ±64 grid. Uses **Dirichlet BC** seeded each frame from the outer potential (`pm.boundary_sample.wgsl`).
- **Outer**: 64³ cells covering the full periodic domain ±64 (cell size **2.0**). Handles long-range gravity and all mass outside the inner domain. Uses periodic BC (3-torus).

Both grids run one **complete** V-cycle per frame — descent, coarsest-level over-smooth, ascent — producing fully-solved `pmPotential[0]` buffers that the interpolate pass reads as-is. No phase-split, no double-buffering, no half-solved state visible to consumers.

**Per-frame ordering:**
1. Outer deposit + V-cycle → fully-solved `pmOuterPotential[0]` (periodic BC).
2. `pm.boundary_sample` → writes outer φ values into the inner grid's level-0 face cells (6 faces, via a 3D dispatch masked by the face-cell predicate). This is the sole bridge between the two grids during the inner solve. [LAW:single-enforcer]
3. Inner deposit + V-cycle → reads face cells as Dirichlet BC (smoother / residual / prolong freeze face cells via a `dirichletBoundary` flag in their per-level uniforms). Interior cells solve `∇²φ = 4πGρ_inner` with the outer potential clamping the faces.

The V-cycle is dispatched by the module-scope `runPmVCycle` helper (`src/main.ts`). It is called twice per frame, once per grid, with the relevant buffer bundle:

1. **Clear levels 1..maxLevel.** Level 0 keeps the previous frame's potential as a warm-start. Density evolves slowly, so last frame's solution is a near-converged initial guess and one V-cycle per frame suffices for sub-1% residual.
2. **Descent** (`l = 0..maxLevel-1`): `PM_SMOOTH_PRE` red-black GS sweeps → residual → restrict residual to level `l+1` as RHS.
3. **Coarsest level** (`l = maxLevel`): over-smooth with `PM_COARSEST_SWEEPS` = 16 red-black GS sweeps (cheap — level is 4³).
4. **Ascent** (`l = maxLevel-1..0`): prolong correction from level `l+1`, add into level `l`'s potential, then `PM_SMOOTH_POST` red-black GS sweeps.

With `PM_SMOOTH_PRE = PM_SMOOTH_POST = 1`, per-frame smoother work is 1+1 sweeps per level. On M2, the inner 128³ V-cycle fits under ~3.5 ms; the outer 64³ V-cycle adds ~0.6 ms; total PM work ~1.15× the old single-grid cost — well under the 11 ms Vision Pro budget.

**Deposit** (`pm.deposit.wgsl`): CIC scatter with a domain filter — particles outside ±domainHalf skip deposition so they don't wrap-pollute the inner grid via the periodic cell-index wrap. For the outer grid (domainHalf = 64 = periodic-wrap radius), the filter never triggers.

**Interpolate** (`pm.interpolate_nested.wgsl`): for each particle, sample force from **both** potentials via the CIC transpose kernel, then `mix(innerAcc, outerAcc, t)` where `t = smoothstep(PM_DOMAIN_HALF-2, PM_DOMAIN_HALF, max(|x|,|y|,|z|))` — 0 inside ±14 (pure inner), 1 beyond ±16 (pure outer), C¹ blend in between. [LAW:dataflow-not-control-flow] Always sample both; the blend weight decides which contribution survives — no branch, no seam.

**Boundary-sample shader** (`pm.boundary_sample.wgsl`): runs once per frame between the outer and inner V-cycles. Dispatches over the full 128³ inner grid; every thread trilinearly samples `outerPhi[0]` at its cell's world-space center, then `select` writes the sampled value at face cells and keeps the warm-start value at interior cells. The approximation is that the outer potential includes mass *inside* ±16 as well as outside, so the BC slightly over-states the "external-only" gravitational potential — acceptable for this simulation because >90% of mass lives inside the inner domain anyway, and the nested interpolate's smoothstep blend shell absorbs residual mismatch at the faces.

Diagnostics: `__pmMaxResidual()` returns `{ inner, outer }`. `__pmDumpDensity()` / `__pmDumpPotential()` dump the inner grid; `__pmDumpOuterDensity()` / `__pmDumpOuterPotential()` dump the outer. `__pmReversibilityTest(1000)` should hold maxErr < 0.01 world units.

### Simulation Clock

`simStep` is the canonical step index of the simulation state currently in the particle buffer. It advances by `timeDirection` each compute dispatch — forward (`+1` after journal write) or reverse (`−1` at the top of `compute()` before param packing). Tidal angle = `simStep × dt × 0.15`. Attractor timing uses `simStep × dt`. No `performance.now()` in the simulation path — fully deterministic.

**Decrement timing matters:** in reverse mode, `simStep` is decremented at the very start of `compute()` so that every downstream consumer (tidal angle, journal lookup, `nowSec`) uses the same step index — specifically, the step whose params were packed during the original forward step that produced the current state. Without this ordering, reverse params would mix values from step N and step N-1, breaking the `reverse(forward(s)) = s` invariant.

### Body Struct (48 bytes — shared by stars and gas)

| Field | Type | Purpose |
|-------|------|---------|
| `pos` | vec3f | Position |
| `mass` | f32 | Particle mass |
| `vel` | vec3f | Velocity |
| `_pad` | f32 | Alignment |
| `_unused` | vec3f | Available (was `home` for disk recovery springs) |
| `_pad2` | f32 | Alignment |

Gas particles in `src/gasReservoir.ts` use this identical layout so `pm.deposit.wgsl` and `pm.interpolate_nested.wgsl` consume either population without per-species adapters — the same shader is dispatched against the star buffer and the gas buffer with different bind groups.

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

## Gas Reservoir (Cooling via Gravitational Wake + Visible Nebula)

A volumetric gas reservoir lives alongside the stars on the same periodic torus. It is the **kinetic-energy sink** that lets a hot/diffuse cloud be re-cooled into a settled disc: stars dragging gas into gravitational wakes lose orbital energy to the wake, which then disperses across many gas DOFs as bulk motion + isothermal compressive energy. All forces are position-only — gas reversibility is on the same DKD footing as stars.

Owned entirely by `src/gasReservoir.ts`. `main.ts` only dispatches the subsystem at the existing PM seams; no gas state is held in `main.ts`.

### Architectural Choice: Particles + Grid Pressure

Gas is **Lagrangian particles** (fixed mass, evolving pos/vel under DKD), but pressure is computed via a **grid-stored scalar potential**, not via SPH kernel sums. The crucial math: for isothermal gas with `P = c_s² ρ`, pressure force per unit mass simplifies to

```
F_pressure = -∇P/ρ = -c_s² ∇(ln ρ) = -∇χ        where χ = c_s² · ln(ρ_gas)
```

— a position-only scalar potential, structurally identical to gravity Φ. Gas particles feel `-∇χ` interpolated via CIC, exactly like they feel `-∇Φ`. This buys O(N_gas) scaling per frame: no neighbor search, no hash, no sort. The same PM deposit and nested interpolate shaders are reused for the gravity coupling; gas pressure adds one new grid (gas-only density), one new χ pass, and one new force-interpolate pass.

### Coupling Channels (exactly two)

1. **Gravity (bidirectional, single channel).** Gas mass deposits into both PM density grids (inner ±16 and outer ±64) alongside stars (`gas.depositInnerPm`, `gas.depositOuterPm` — both reuse `pm.deposit.wgsl` with different bind groups). Stars feel gas gravity automatically through the nested interpolate. Gas particles separately read the same nested PM force via `gas.interpolateForces` (which dispatches the existing `pm.interpolate_nested` pipeline against the gas body buffer).
2. **Pressure (gas-only).** Gas particles deposit into a separate 128³ gas-only density grid spanning ±64 (cell size 1.0); `gas.chi.wgsl` computes `χ = c_s² · ln(max(ρ_gas, ρ_floor) / ρ_ref)` pointwise; `gas.pressure_interpolate.wgsl` samples `-∇χ` via CIC. Stars do **not** feel χ — pressure is a fluid property of gas alone.

`ρ_ref = totalGasMass / cellCount` and `ρ_floor = ρ_ref × 1e-6` are set at gas-init time and never change. Both are pure functions of the deterministic initial state, so reversibility is unaffected. The floor regularizes `ln` at empty cells; gradient is zero there.

### Reservoir Hamiltonian

```
H_gas_kinetic   = Σᵢ ½ m_g |vᵢ|²
H_gas_internal  = Σᵢ m_g · c_s² · ln(ρᵢ / ρ_ref)        ← the cooling sink
H_gravity(all)  = existing PM coupling, now reflects gas mass
```

`H_gas_internal` is the compressive energy of isothermal gas; it rises when wakes form (local ρ > ρ_ref) and disperses across many cells via pressure waves traveling at `c_s`. `Δ(starKinetic) + Δ(gasKinetic + gasInternal)` should sum to ~0 within solver noise, and the cooling signature is `Δ(starKinetic) < 0` while `Δ(gasInternal) > 0` over a relaxation phase.

### Per-Frame Pipeline

In `compute()`, after star param packing and PM density clears:

1. `gas.clear(encoder)` — clears gas-only density grid.
2. **Inner deposit pass:** stars (`pmDepositPipeline` w/ `pmDepositBG`), then `gas.depositInnerPm`, then density convert (mean-zero RHS).
3. **Outer deposit pass:** stars (`pmDepositPipeline` w/ `pmOuterDepositBG`), then `gas.depositOuterPm`, then outer density convert.
4. `gas.depositGasAndBuildPressure` — gas-only CIC deposit + χ pass. Both dispatches share one compute pass; WebGPU's implicit dispatch-to-dispatch barrier serializes deposit→χ correctly.
5. **Outer V-cycle** → `pmOuterPotential[0]`.
6. `pm.boundary_sample` → seeds inner Dirichlet BC from outer φ.
7. **Inner V-cycle** → `pmPotential[0]` with Dirichlet faces.
8. **Force interpolate pass:** `pm.interpolate_nested` against stars (writes `pmForce`), then `gas.interpolateForces` (writes gas `gravityForce` from the same nested interpolate, then `gas.pressure_interpolate.wgsl` writes `pressureForce` from χ).
9. **Integrate pass:** `gas.integrate` (DKD over gas, periodic-wrapped; reads `gravityForce + pressureForce`), then `nbody.compute` (DKD over stars; reads `pmForce`).
10. **Render** (later in frame): particle render, then `gas.render` (volumetric raymarch, additive blend, no depth write — guarded by `state.physics.gasVisible` via a uniform factor).

### Sliders (physical, not arbitrary)

- `gasMassFraction` (0.0..0.5, default 0.15) — total gas mass as a fraction of stellar mass. `requiresReset: true` (gas particle count and mass-per-particle are fixed at init).
- `gasSoundSpeed` (0.5..5.0, default 2.0) — isothermal `c_s`. Higher → faster pressure-wave dispersal → faster cooling.
- `gasVisible` (bool) — toggles the volumetric render pass output (uniform-gated; pass still dispatches).

### Reversibility

Gas uses the same DKD leapfrog as stars (`gas.compute.wgsl`). Forces are pure functions of current positions: `gravityForce` from nested interpolate of `Φ(ρ_total)`, `pressureForce` from interpolate of `χ(ρ_gas)`. Both grids' values reproduce exactly when positions reproduce, so flipping `dt` retraces every gas trajectory within the same atomic-deposit drift envelope as stars. `__gasReversibilityTest(1000)` should hold `maxPosErr < 0.01` world units.

Diagnostics: `__gasDumpDensity`, `__gasEnergyBreakdown` (returns `{ starKinetic, gasKinetic, gasInternal, total }`), `__gasWakeProbe(starIdx)` (returns `{ aheadDensity, behindDensity, asymmetry }` around a given star — positive asymmetry confirms wake formation), `__gasReversibilityTest(n)`.

### Costs (M2 estimates)

- ~200k gas particles cap (`Math.min(200000, starCount × 2.5)`); 48-byte struct (shared with stars).
- Memory: 19 MB (gas pingpong) + 8 MB (gas density f32) + 8 MB (χ) + small force buffers ≈ 36 MB on top of the ~50 MB PM footprint.
- Compute: ~0.9 ms gas chain (deposits + χ + interpolates + integrate) + ~2 ms gas render stereo. Combined with PM (~3.5 ms inner + ~0.6 ms outer) and existing star compute/render, fits the 11 ms Vision Pro budget with knobs (`gasMassFraction`, render step count, gas resolution) for headroom.
