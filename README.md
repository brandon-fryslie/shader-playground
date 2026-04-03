# WebGPU Compute Shader Playground

A real-time GPU simulation playground with four compute shader modes and WebXR stereo rendering for Apple Vision Pro.

**Requires:** Chrome 113+, Safari 18+, or Edge 113+ (WebGPU required)

---

## Simulations

| Mode | Description |
|------|-------------|
| **Boids** | Craig Reynolds flocking — separation, alignment, cohesion forces computed per-particle on GPU |
| **N-Body** | Gravitational physics with softening, configurable distributions (random, disk, shell) |
| **Fluid** | Stable-fluids Navier–Stokes: advection → diffusion (Jacobi iteration) → pressure solve → gradient subtraction |
| **Parametric Shapes** | Point-cloud surfaces (torus, sphere, trefoil knot, klein bottle, mobius strip) via GPU-evaluated parametric equations |

All simulations use WebGPU compute shaders. Rendering uses instanced draw calls fed directly from compute output buffers — no CPU readback.

---

## Running Locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173` with hot reload.

**Production build:**
```bash
npm run build   # type-checks with tsc, then bundles
npm run preview # serves dist/
```

---

## Running on Apple Vision Pro

Vision Pro requires HTTPS. Generate a self-signed cert first (one-time):

```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=shader-playground"
```

Then start the dev server — it auto-detects the cert files and serves HTTPS:

```bash
npm run dev   # serves on https://0.0.0.0:4443
```

Open `https://<your-mac-ip>:4443` in Safari on Vision Pro, accept the cert warning, and tap **Enter VR**.

Alternatively, `server.py` serves a production build with no-cache headers (useful if you've already run `npm run build`):

```bash
python3 server.py
```

---

## Live Shader Editing

Click the `</>` button to open the WGSL editor. Select compute or render shaders per simulation, edit live, and hit **Compile** — the simulation resets with your new shader. **Reset** restores the original source.

---

## How the WebXR–WebGPU Integration Works

### The Problem

Standard WebXR assumes you render to a canvas. WebGPU renders to textures via a `GPUCanvasContext`. These two APIs don't speak the same language out of the box — WebXR needs to hand you a render target per-eye each frame, and that target must be a `GPUTexture`.

`XRGPUBinding` is the bridge. It's a WebXR API extension that lets you create an `XRProjectionLayer` backed by GPU textures, and retrieve per-eye `GPUTextureView`s each frame.

### Session Setup

```
navigator.xr.requestSession('immersive-vr', { requiredFeatures: ['webgpu'] })
  → XRGPUBinding(session, device)
  → xrBinding.createProjectionLayer({ colorFormat: xrBinding.getPreferredColorFormat() })
  → session.updateRenderState({ layers: [xrLayer] })
```

The session config waterfall (`requiredFeatures: ['webgpu', 'layers', 'local-floor']` down to `{}`) handles browser variation — Safari visionOS accepts `layers[]` in `updateRenderState` even without the `'layers'` feature string; Chrome requires it explicitly.

The GPU adapter is requested with `xrCompatible: true` at startup so the device is eligible for XR use before a session exists.

### Per-Frame Stereo Rendering

Each XR frame drives this loop:

```
xrFrame(time, xrFrameData):
  pose = xrFrameData.getViewerPose(refSpace)   // head pose + per-eye views

  encoder = device.createCommandEncoder()
  sim.compute(encoder)                          // physics runs ONCE for both eyes

  for each view in pose.views:                  // typically 2: left + right
    subImage = xrBinding.getViewSubImage(xrLayer, view)
    textureView = subImage.colorTexture.createView(subImage.getViewDescriptor())

    xrCameraOverride = {
      viewMatrix: view.transform.inverse.matrix,  // eye-space transform
      projMatrix: view.projectionMatrix,           // per-eye FOV/offset
      eye: view.transform.position,
    }

    sim.render(encoder, textureView, subImage.viewport)

  xrCameraOverride = null
  device.queue.submit([encoder.finish()])
```

**Key insight:** compute runs once; render runs twice. The `xrCameraOverride` global is a lightweight seam — it's set before each render call and cleared after. The simulation's render function has no XR-specific code; it just reads from `getCameraUniformData()`, which checks whether the override is set.

### Camera Uniform Override

The camera uniform buffer (192 bytes) packs `view(mat4) + proj(mat4) + eye(vec3) + color theme(3×vec3)`. In desktop mode this comes from the orbit camera. In XR mode, `getCameraUniformData()` substitutes the XR-provided matrices:

```typescript
if (xrCameraOverride) {
  data.set(xrCameraOverride.viewMatrix, 0);
  data.set(xrCameraOverride.projMatrix, 16);
  data.set(xrCameraOverride.eye, 32);
}
```

The theme colors ride the same buffer — no extra bind group needed per-eye.

### Depth Texture

In XR mode, `subImage.depthStencilTexture` provides an XR-owned depth buffer. If absent (some Safari configurations), a fallback depth texture is created at the color texture's dimensions. The `getDepthView()` function checks `xrDepthView` first, falling back to the per-simulation desktop depth texture.

### Safari vs Chrome Differences

| | Safari visionOS | Chrome |
|---|---|---|
| Session feature | `requiredFeatures: ['webgpu']` | `requiredFeatures: ['webgpu', 'layers']` |
| Sub-image API | `getViewSubImage(layer, view)` | `getSubImage(layer, view)` |
| Layer config key | `colorFormat` | `textureFormat` |
| View descriptor | `subImage.getViewDescriptor()` | not needed |

The code detects and handles both via capability checks (`binding.getViewSubImage ? ... : ...`).

---

## Architecture

`src/main.ts` is a single-file application (~2400 lines). WGSL shaders live in `src/shaders/` and are imported as raw strings via Vite's `?raw` suffix. `src/types.ts` contains all TypeScript types.

Each simulation implements:
```typescript
{ compute(encoder), render(encoder, textureView, viewport), getCount(), destroy() }
```

Simulations are lazy-initialized on first tab switch and reuse GPU buffers until destroyed. Boids and N-body use ping-pong (A/B) storage buffers; fluid uses staged copy-back.
