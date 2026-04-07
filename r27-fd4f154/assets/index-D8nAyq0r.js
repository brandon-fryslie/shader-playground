(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`// [LAW:one-source-of-truth] Net angular momentum is computed in one place so the disk-recovery layer always reads from a single canonical source.
// Single-workgroup reduction: 64 threads cooperatively sum cross(pos, vel)*mass over all bodies.
// Output is one vec4f (xyz = L, w = unused) which the CPU reads back asynchronously to derive the disk normal.

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

struct ReduceParams {
  count: u32,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<storage, read_write> outL: array<vec4f, 1>;
@group(0) @binding(2) var<uniform> rp: ReduceParams;

var<workgroup> partial: array<vec3f, 64>;

@compute @workgroup_size(64)
fn main(@builtin(local_invocation_id) lid: vec3u) {
  var sum = vec3f(0.0);
  let n = rp.count;
  var i = lid.x;
  // [LAW:dataflow-not-control-flow] Stride loop runs the same shape for every thread; only the iteration count varies with body count.
  loop {
    if (i >= n) { break; }
    let b = bodies[i];
    let m = max(b.mass, 0.001);
    sum += cross(b.pos, b.vel) * m;
    i += 64u;
  }
  partial[lid.x] = sum;
  workgroupBarrier();
  if (lid.x == 0u) {
    var total = vec3f(0.0);
    for (var k = 0u; k < 64u; k++) {
      total += partial[k];
    }
    outL[0] = vec4f(total, 1.0);
  }
}
`,t=`struct Camera {
  view: mat4x4f,
  proj: mat4x4f,
  eye: vec3f,
  _pad: f32,
  primary: vec3f,
  _pad2: f32,
  secondary: vec3f,
  _pad3: f32,
  accent: vec3f,
  _pad4: f32,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<uniform> time: f32;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) worldPos: vec3f,
  @location(1) surfaceCoord: vec2f,
}

// [LAW:one-source-of-truth] Room dimensions live in one block so floor and wall placement stay aligned.
const ROOM_HALF_WIDTH = 72.0;
const ROOM_HALF_HEIGHT = 34.0;
const ROOM_FLOOR_Y = -48.0;
const ROOM_SURFACE_COUNT = 5u;
// [LAW:one-source-of-truth] Grid spacing and width stay centralized so the distant shell reads consistently.
const GRID_SPACING = 12.0;
const GRID_LINE_WIDTH = 0.18;

fn roomSurfacePosition(faceIndex: u32, surfaceCoord: vec2f) -> vec3f {
  switch faceIndex {
    case 0u: { return vec3f(surfaceCoord.x, ROOM_FLOOR_Y, surfaceCoord.y); }
    case 1u: { return vec3f(surfaceCoord.x, surfaceCoord.y, -ROOM_HALF_WIDTH); }
    case 2u: { return vec3f(surfaceCoord.x, surfaceCoord.y, ROOM_HALF_WIDTH); }
    case 3u: { return vec3f(-ROOM_HALF_WIDTH, surfaceCoord.y, surfaceCoord.x); }
    default: { return vec3f(ROOM_HALF_WIDTH, surfaceCoord.y, surfaceCoord.x); }
  }
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let positions = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );
  let faceIndex = min(vid / 6u, ROOM_SURFACE_COUNT - 1u);
  let p = positions[vid % 6u];
  let surfaceCoord = vec2f(p.x * ROOM_HALF_WIDTH, select(p.y * ROOM_HALF_WIDTH, p.y * ROOM_HALF_HEIGHT, faceIndex != 0u));
  let worldPos = roomSurfacePosition(faceIndex, surfaceCoord);

  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);
  out.worldPos = worldPos;
  out.surfaceCoord = surfaceCoord;
  return out;
}

@fragment
fn fs_main(@location(0) worldPos: vec3f, @location(1) surfaceCoord: vec2f) -> @location(0) vec4f {
  let gx = abs(fract(surfaceCoord.x / GRID_SPACING + 0.5) - 0.5) * GRID_SPACING;
  let gy = abs(fract(surfaceCoord.y / GRID_SPACING + 0.5) - 0.5) * GRID_SPACING;

  let dx = fwidth(surfaceCoord.x);
  let dy = fwidth(surfaceCoord.y);
  let lx = 1.0 - smoothstep(0.0, GRID_LINE_WIDTH + dx, gx);
  let ly = 1.0 - smoothstep(0.0, GRID_LINE_WIDTH + dy, gy);
  let line = max(lx, ly);

  let dist = length(worldPos);
  let centerFade = smoothstep(34.0, 66.0, dist);
  let eyeFade = smoothstep(52.0, 92.0, distance(worldPos, camera.eye));
  let environmentFade = centerFade * eyeFade;

  // Travelling light pulses — slow waves rippling outward from origin
  let wave1 = sin(dist * 0.8 - time * 0.7) * 0.5 + 0.5;
  let wave2 = sin(dist * 0.5 - time * 0.4 + 2.0) * 0.5 + 0.5;
  let pulse1 = pow(wave1, 12.0);
  let pulse2 = pow(wave2, 16.0);
  let pulse = max(pulse1, pulse2);

  let baseAlpha = line * environmentFade * 0.04;
  let pulseFade = environmentFade * (1.0 - smoothstep(72.0, 128.0, dist));
  let pulseAlpha = line * pulseFade * pulse * 0.12;
  let totalAlpha = baseAlpha + pulseAlpha;

  if (totalAlpha < 0.001) { discard; }

  let baseColor = vec3f(0.35, 0.35, 0.45);
  let pulseColor = camera.accent;
  let color = mix(baseColor, pulseColor, pulse);

  return vec4f(color, totalAlpha);
}
`,n={boids:{count:1e3,separationRadius:25,alignmentRadius:50,cohesionRadius:50,maxSpeed:2,maxForce:.05,visualRange:100},physics:{count:2e3,G:1,softening:.5,damping:1,coreOrbit:.28,distribution:`disk`,interactionStrength:1,diskVertDamp:.35,diskRadDamp:.12,diskTangGain:.18,diskTangSpeed:.5,diskVertSpring:0,diskAlignGain:0},fluid:{resolution:256,viscosity:.1,diffusionRate:.001,forceStrength:100,volumeScale:1.5,dyeMode:`rainbow`,jacobiIterations:40},parametric:{shape:`torus`,scale:1,p1Min:.7,p1Max:1.3,p1Rate:.3,p2Min:.2,p2Max:.55,p2Rate:.5,p3Min:.15,p3Max:.45,p3Rate:.7,p4Min:.5,p4Max:2,p4Rate:.4,twistMin:0,twistMax:.4,twistRate:.15}},r={boids:{Default:{...n.boids},"Tight Flock":{count:3e3,separationRadius:10,alignmentRadius:30,cohesionRadius:80,maxSpeed:3,maxForce:.08,visualRange:60},Dispersed:{count:2e3,separationRadius:60,alignmentRadius:100,cohesionRadius:20,maxSpeed:1.5,maxForce:.03,visualRange:200},Massive:{count:2e4,separationRadius:15,alignmentRadius:40,cohesionRadius:40,maxSpeed:2.5,maxForce:.04,visualRange:80},"Slow Dance":{count:500,separationRadius:40,alignmentRadius:80,cohesionRadius:100,maxSpeed:.5,maxForce:.01,visualRange:150}},physics:{Default:{...n.physics},Galaxy:{count:3e3,G:.5,softening:1,damping:1,coreOrbit:.32,distribution:`disk`,interactionStrength:1,diskVertDamp:.4,diskRadDamp:.15,diskTangGain:.22,diskTangSpeed:.5,diskVertSpring:0,diskAlignGain:0},Collapse:{count:2e3,G:10,softening:.1,damping:.998,coreOrbit:.14,distribution:`shell`,interactionStrength:1,diskVertDamp:.05,diskRadDamp:.02,diskTangGain:0,diskTangSpeed:.5,diskVertSpring:0,diskAlignGain:0},Gentle:{count:1e3,G:.1,softening:2,damping:1,coreOrbit:.2,distribution:`random`,interactionStrength:1,diskVertDamp:.2,diskRadDamp:.08,diskTangGain:.12,diskTangSpeed:.4,diskVertSpring:0,diskAlignGain:0}},fluid:{Default:{...n.fluid},Thick:{resolution:256,viscosity:.8,diffusionRate:.005,forceStrength:200,volumeScale:1.8,dyeMode:`rainbow`,jacobiIterations:40},Turbulent:{resolution:512,viscosity:.01,diffusionRate:1e-4,forceStrength:300,volumeScale:1.3,dyeMode:`rainbow`,jacobiIterations:60},"Ink Drop":{resolution:256,viscosity:.3,diffusionRate:0,forceStrength:50,volumeScale:2.1,dyeMode:`single`,jacobiIterations:40}},parametric:{Default:{shape:`torus`,scale:1,p1Min:.7,p1Max:1.3,p1Rate:.3,p2Min:.2,p2Max:.55,p2Rate:.5,p3Min:.15,p3Max:.45,p3Rate:.7,p4Min:.5,p4Max:2,p4Rate:.4,twistMin:0,twistMax:.4,twistRate:.15},"Rippling Ring":{shape:`torus`,scale:1,p1Min:.5,p1Max:1.5,p1Rate:.5,p2Min:.15,p2Max:.7,p2Rate:.7,p3Min:.3,p3Max:.8,p3Rate:1,p4Min:1,p4Max:3,p4Rate:.6,twistMin:0,twistMax:1,twistRate:.2},"Wild Möbius":{shape:`mobius`,scale:1.5,p1Min:.8,p1Max:2,p1Rate:.3,p2Min:1,p2Max:3,p2Rate:.15,p3Min:.2,p3Max:.6,p3Rate:.8,p4Min:.5,p4Max:2.5,p4Rate:.5,twistMin:1,twistMax:4,twistRate:.1},"Trefoil Pulse":{shape:`trefoil`,scale:1.2,p1Min:.08,p1Max:.35,p1Rate:.9,p2Min:.25,p2Max:.55,p2Rate:.4,p3Min:.3,p3Max:.9,p3Rate:1.2,p4Min:1,p4Max:4,p4Rate:.7,twistMin:0,twistMax:.5,twistRate:.2},"Klein Chaos":{shape:`klein`,scale:1.2,p1Min:.5,p1Max:1.5,p1Rate:.4,p2Min:0,p2Max:0,p2Rate:0,p3Min:.2,p3Max:.6,p3Rate:.9,p4Min:.8,p4Max:3.5,p4Rate:.5,twistMin:0,twistMax:.8,twistRate:.15}}},i={boids:[{section:`Flock`,params:[{key:`count`,label:`Count`,min:100,max:3e4,step:100,requiresReset:!0},{key:`visualRange`,label:`Visual Range`,min:10,max:500,step:5}]},{section:`Forces`,params:[{key:`separationRadius`,label:`Separation`,min:1,max:100,step:1},{key:`alignmentRadius`,label:`Alignment`,min:1,max:200,step:1},{key:`cohesionRadius`,label:`Cohesion`,min:1,max:200,step:1},{key:`maxSpeed`,label:`Max Speed`,min:.1,max:10,step:.1},{key:`maxForce`,label:`Max Force`,min:.001,max:.5,step:.001}]}],physics:[{section:`Simulation`,params:[{key:`count`,label:`Bodies`,min:10,max:1e4,step:10,requiresReset:!0},{key:`G`,label:`Gravity (G)`,min:.01,max:100,step:.01},{key:`softening`,label:`Softening`,min:.01,max:10,step:.01},{key:`damping`,label:`Damping`,min:.9,max:1,step:.001},{key:`coreOrbit`,label:`Core Friction`,min:0,max:1.5,step:.01},{key:`interactionStrength`,label:`Interaction Pull`,min:0,max:10,step:.05}]},{section:`Initial State`,params:[{key:`distribution`,label:`Distribution`,type:`dropdown`,options:[`random`,`disk`,`shell`]}]},{section:`Disk Recovery`,params:[{key:`diskVertDamp`,label:`Vertical Damp`,min:0,max:2,step:.001},{key:`diskRadDamp`,label:`Radial Damp`,min:0,max:2,step:.001},{key:`diskTangGain`,label:`Tangential Nudge`,min:0,max:2,step:.001},{key:`diskTangSpeed`,label:`Orbit Speed`,min:0,max:2,step:.01},{key:`diskVertSpring`,label:`Plane Spring`,min:0,max:2,step:.001},{key:`diskAlignGain`,label:`Flow Align`,min:0,max:2,step:.001}]}],fluid:[{section:`Grid`,params:[{key:`resolution`,label:`Resolution`,type:`dropdown`,options:[64,128,256,512],requiresReset:!0}]},{section:`Physics`,params:[{key:`viscosity`,label:`Viscosity`,min:0,max:1,step:.01},{key:`diffusionRate`,label:`Diffusion`,min:0,max:.01,step:1e-4},{key:`forceStrength`,label:`Force`,min:1,max:500,step:1},{key:`jacobiIterations`,label:`Iterations`,min:10,max:80,step:5}]},{section:`Appearance`,params:[{key:`volumeScale`,label:`Volume`,min:.4,max:3,step:.05},{key:`dyeMode`,label:`Dye Mode`,type:`dropdown`,options:[`rainbow`,`single`,`temperature`]}]}],parametric:[{section:`Shape`,params:[{key:`shape`,label:`Equation`,type:`dropdown`,options:[`torus`,`klein`,`mobius`,`sphere`,`trefoil`]}]},{section:`Shape Parameters`,id:`shape-params-section`,params:[],dynamic:!0},{section:`Transform`,params:[{key:`scale`,label:`Scale`,min:.1,max:5,step:.1}]},{section:`Twist`,params:[{key:`twistMin`,label:`Min`,min:0,max:12.56,step:.05},{key:`twistMax`,label:`Max`,min:0,max:12.56,step:.05},{key:`twistRate`,label:`Rate`,min:0,max:3,step:.05}]},{section:`Wave Amplitude`,params:[{key:`p3Min`,label:`Min`,min:0,max:2,step:.05},{key:`p3Max`,label:`Max`,min:0,max:2,step:.05},{key:`p3Rate`,label:`Rate`,min:0,max:3,step:.05}]},{section:`Wave Frequency`,params:[{key:`p4Min`,label:`Min`,min:0,max:5,step:.1},{key:`p4Max`,label:`Max`,min:0,max:5,step:.1},{key:`p4Rate`,label:`Rate`,min:0,max:3,step:.05}]}]},a={Dracula:{primary:`#BD93F9`,secondary:`#FF79C6`,accent:`#50FA7B`,bg:`#282A36`,fg:`#F8F8F2`},Nord:{primary:`#88C0D0`,secondary:`#81A1C1`,accent:`#A3BE8C`,bg:`#2E3440`,fg:`#D8DEE9`},Monokai:{primary:`#AE81FF`,secondary:`#F82672`,accent:`#A5E22E`,bg:`#272822`,fg:`#D6D6D6`},"Rose Pine":{primary:`#C4A7E7`,secondary:`#EBBCBA`,accent:`#9CCFD8`,bg:`#191724`,fg:`#E0DEF4`},Gruvbox:{primary:`#85A598`,secondary:`#F9BD2F`,accent:`#B7BB26`,bg:`#282828`,fg:`#FBF1C7`},Solarized:{primary:`#268BD2`,secondary:`#2AA198`,accent:`#849900`,bg:`#002B36`,fg:`#839496`},"Tokyo Night":{primary:`#BB9AF7`,secondary:`#7AA2F7`,accent:`#9ECE6A`,bg:`#1A1B26`,fg:`#A9B1D6`},Catppuccin:{primary:`#F5C2E7`,secondary:`#CBA6F7`,accent:`#ABE9B3`,bg:`#181825`,fg:`#CDD6F4`},"Atom One":{primary:`#61AFEF`,secondary:`#C678DD`,accent:`#62F062`,bg:`#282C34`,fg:`#ABB2BF`},Flexoki:{primary:`#205EA6`,secondary:`#24837B`,accent:`#65800B`,bg:`#100F0F`,fg:`#FFFCF0`}},o=`Dracula`,s=12e3,c={r:.02,g:.02,b:.025,a:1};function l(e){let t=parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function u(e){let t=a[e]||a[o];return{primary:l(t.primary),secondary:l(t.secondary),accent:l(t.accent),bg:l(t.bg),fg:l(t.fg),clearColor:{r:l(t.bg)[0],g:l(t.bg)[1],b:l(t.bg)[2],a:1}}}function d(e,t,n){return e.map((e,r)=>e+(t[r]-e)*n)}function f(e,t,n){let r=d(e.bg,t.bg,n);return{primary:d(e.primary,t.primary,n),secondary:d(e.secondary,t.secondary,n),accent:d(e.accent,t.accent,n),bg:r,fg:d(e.fg,t.fg,n),clearColor:{r:r[0],g:r[1],b:r[2],a:1}}}var p={from:u(o),to:u(o),startedAtMs:0},m=u(o);function h(e){let t=Math.max(0,Math.min(1,(e-p.startedAtMs)/s));return f(p.from,p.to,t)}function g(){return m}function _(e){m=h(e)}function v(e){let t=u(e);p.from=t,p.to=t,p.startedAtMs=0,m=t}function y(e,t=performance.now()){let n=u(e),r=h(t);p.from=r,p.to=n,p.startedAtMs=t,m=r}function b(e){return x[e]}var x={mode:`boids`,colorTheme:`Dracula`,xrEnabled:!1,paused:!1,boids:{...n.boids},physics:{...n.physics},fluid:{...n.fluid},parametric:{...n.parametric},camera:{distance:5,fov:60,rotX:.3,rotY:0,panX:0,panY:0},mouse:{down:!1,x:0,y:0,dx:0,dy:0,worldX:0,worldY:0,worldZ:0}},ee=96,S=4,C=192,w=256,T=160,E={torus:0,klein:1,mobius:2,sphere:3,trefoil:4},D={torus:{p1:{label:`Major Radius`,animMin:.7,animMax:1.3,animRate:.3,min:.2,max:2.5,step:.05},p2:{label:`Minor Radius`,animMin:.2,animMax:.6,animRate:.5,min:.05,max:1.2,step:.05}},klein:{p1:{label:`Bulge`,animMin:.7,animMax:1.5,animRate:.4,min:.2,max:3,step:.05}},mobius:{p1:{label:`Width`,animMin:.5,animMax:1.8,animRate:.35,min:.1,max:3,step:.05},p2:{label:`Half-Twists`,animMin:1,animMax:3,animRate:.15,min:.5,max:5,step:.5}},sphere:{p1:{label:`XY Stretch`,animMin:.6,animMax:1.5,animRate:.4,min:.1,max:3,step:.05},p2:{label:`Z Stretch`,animMin:.5,animMax:1.8,animRate:.6,min:.1,max:3,step:.05}},trefoil:{p1:{label:`Tube Radius`,animMin:.08,animMax:.35,animRate:.6,min:.05,max:1,step:.05},p2:{label:`Knot Scale`,animMin:.25,animMax:.5,animRate:.35,min:.1,max:1,step:.05}}},O={identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])},perspective(e,t,n,r){let i=1/Math.tan(e*.5),a=1/(n-r),o=new Float32Array(16);return o[0]=i/t,o[5]=i,o[10]=r*a,o[11]=-1,o[14]=n*r*a,o},lookAt(e,t,n){let r=k(te(e,t)),i=k(A(n,r)),a=A(r,i);return new Float32Array([i[0],a[0],r[0],0,i[1],a[1],r[1],0,i[2],a[2],r[2],0,-j(i,e),-j(a,e),-j(r,e),1])},multiply(e,t){let n=new Float32Array(16);for(let r=0;r<4;r++)for(let i=0;i<4;i++)n[i*4+r]=e[r]*t[i*4]+e[4+r]*t[i*4+1]+e[8+r]*t[i*4+2]+e[12+r]*t[i*4+3];return n},rotateX(e,t){let n=Math.cos(t),r=Math.sin(t),i=O.identity();return i[5]=n,i[6]=r,i[9]=-r,i[10]=n,O.multiply(e,i)},rotateY(e,t){let n=Math.cos(t),r=Math.sin(t),i=O.identity();return i[0]=n,i[2]=-r,i[8]=r,i[10]=n,O.multiply(e,i)},rotateZ(e,t){let n=Math.cos(t),r=Math.sin(t),i=O.identity();return i[0]=n,i[1]=r,i[4]=-r,i[5]=n,O.multiply(e,i)},translate(e,t,n,r){let i=O.identity();return i[12]=t,i[13]=n,i[14]=r,O.multiply(e,i)}};function k(e){let t=Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);return t>0?[e[0]/t,e[1]/t,e[2]/t]:[0,0,0]}function A(e,t){return[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]]}function te(e,t){return[e[0]-t[0],e[1]-t[1],e[2]-t[2]]}function j(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function ne(){let e=x.camera,t=[e.distance*Math.cos(e.rotX)*Math.sin(e.rotY),e.distance*Math.sin(e.rotX),e.distance*Math.cos(e.rotX)*Math.cos(e.rotY)];return{eye:t,view:O.lookAt(t,[e.panX,e.panY,0],[0,1,0]),proj:null}}var M=null,N=null,P=4,re=1;function F(e,t,n,r,i){return e&&e.width===t&&e.height===n&&e.format===r&&e.sampleCount===i?e:(e?.destroy(),L.createTexture({size:[t,n],format:r,sampleCount:i,usage:GPUTextureUsage.RENDER_ATTACHMENT}))}function I(e){return N&&V===1?N:(e.tex=F(e.tex,R.width,R.height,`depth24plus`,V),e.tex.createView())}function ie(e,t,n){if(V===1)return{view:t,clearValue:c,loadOp:`clear`,storeOp:`store`};let r=n?n[2]:R.width,i=n?n[3]:R.height;return e.msaaColorTex=F(e.msaaColorTex,r,i,B,V),{view:e.msaaColorTex.createView(),resolveTarget:t,clearValue:c,loadOp:`clear`,storeOp:`discard`}}function ae(e,t){if(V>1&&t){let n=t[2],r=t[3];return e.msaaDepthTex=F(e.msaaDepthTex,n,r,`depth24plus`,V),{view:e.msaaDepthTex.createView(),depthClearValue:1,depthLoadOp:`clear`,depthStoreOp:`discard`}}return{view:I(e),depthClearValue:1,depthLoadOp:`clear`,depthStoreOp:`store`}}function oe(e){return e?V===1?e:[0,0,e[2],e[3]]:null}function se(e){e.tex?.destroy(),e.msaaColorTex?.destroy(),e.msaaDepthTex?.destroy()}function ce(e){let t=g(),n=new Float32Array(48);if(M)n.set(M.viewMatrix,0),n.set(M.projMatrix,16),n.set(M.eye,32);else{let t=ne(),r=x.camera.fov*Math.PI/180,i=O.perspective(r,e,.01,T);n.set(t.view,0),n.set(i,16),n.set(t.eye,32)}return n.set(t.primary,36),n.set(t.secondary,40),n.set(t.accent,44),n}var L,R,z,le,B,V=P;async function H(){let e=document.getElementById(`fallback`),t=t=>{e.querySelector(`p`).textContent=t,e.classList.add(`visible`)};if(!navigator.gpu)return t(`navigator.gpu not found. This browser may not support WebGPU, or it may need to be enabled in settings.`),!1;let n;try{n=await navigator.gpu.requestAdapter({powerPreference:`high-performance`,xrCompatible:!0})}catch(e){return t(`requestAdapter() failed: ${e.message}`),!1}if(!n)return t(`requestAdapter() returned null. WebGPU may be available but no suitable GPU adapter was found.`),!1;try{L=await n.requestDevice()}catch(e){return t(`requestDevice() failed: ${e.message}`),!1}return L.lost.then(e=>{console.error(`WebGPU device lost:`,e.message),e.reason!==`destroyed`&&H().then(e=>{e&&(he(),Ct(),requestAnimationFrame(Dt))})}),R=document.getElementById(`gpu-canvas`),z=R.getContext(`webgpu`),le=navigator.gpu.getPreferredCanvasFormat(),B||=le,V||=P,z.configure({device:L,format:le,alphaMode:`opaque`}),!0}function ue(){for(let e of Object.keys(G))G[e]?.destroy(),delete G[e]}function de(e,t){B===e&&V===t||(B=e,V=t,ue(),he(),Ct())}var fe,U,W,pe,me=0;function he(){W?.destroy(),pe?.destroy(),W=L.createBuffer({size:w*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),pe=L.createBuffer({size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let e=L.createShaderModule({code:t}),n=L.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]});fe=L.createRenderPipeline({layout:L.createPipelineLayout({bindGroupLayouts:[n]}),vertex:{module:e,entryPoint:`vs_main`},fragment:{module:e,entryPoint:`fs_main`,targets:[{format:B,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:V}}),U=[0,1].map(e=>L.createBindGroup({layout:n,entries:[{binding:0,resource:{buffer:W,offset:e*w,size:C}},{binding:1,resource:{buffer:pe}}]}))}function ge(e,t,n=0){me+=.016,L.queue.writeBuffer(W,n*w,ce(t)),L.queue.writeBuffer(pe,0,new Float32Array([me])),e.setPipeline(fe),e.setBindGroup(0,U[n]),e.draw(30)}var G={};function _e(){let e=x.boids.count,t=e*32,n=new Float32Array(e*8);for(let t=0;t<e;t++){let e=t*8;n[e]=(Math.random()-.5)*2*2,n[e+1]=(Math.random()-.5)*2*2,n[e+2]=(Math.random()-.5)*2*2,n[e+4]=(Math.random()-.5)*.5,n[e+5]=(Math.random()-.5)*.5,n[e+6]=(Math.random()-.5)*.5}let r=L.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(r.getMappedRange()).set(n),r.unmap();let i=L.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),a=L.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),o=L.createBuffer({size:w*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),s=L.createShaderModule({code:et||`struct Particle {
  pos: vec3f,
  vel: vec3f,
}

struct SimParams {
  dt: f32,
  separationRadius: f32,
  alignmentRadius: f32,
  cohesionRadius: f32,
  maxSpeed: f32,
  maxForce: f32,
  visualRange: f32,
  count: u32,
  boundSize: f32,
  attractorX: f32,
  attractorY: f32,
  attractorZ: f32,
  attractorActive: f32,
}

@group(0) @binding(0) var<storage, read> particlesIn: array<Particle>;
@group(0) @binding(1) var<storage, read_write> particlesOut: array<Particle>;
@group(0) @binding(2) var<uniform> params: SimParams;

fn limit(v: vec3f, maxLen: f32) -> vec3f {
  let len2 = dot(v, v);
  if (len2 > maxLen * maxLen) {
    return normalize(v) * maxLen;
  }
  return v;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = particlesIn[idx];
  var separation = vec3f(0.0);
  var alignment = vec3f(0.0);
  var cohesion = vec3f(0.0);
  var sepCount = 0u;
  var aliCount = 0u;
  var cohCount = 0u;

  for (var i = 0u; i < params.count; i++) {
    if (i == idx) { continue; }
    let other = particlesIn[i];
    let diff = me.pos - other.pos;
    let dist = length(diff);

    if (dist < params.separationRadius && dist > 0.0) {
      separation += diff / dist;
      sepCount++;
    }
    if (dist < params.alignmentRadius) {
      alignment += other.vel;
      aliCount++;
    }
    if (dist < params.cohesionRadius) {
      cohesion += other.pos;
      cohCount++;
    }
  }

  var force = vec3f(0.0);

  if (sepCount > 0u) {
    separation = separation / f32(sepCount);
    if (length(separation) > 0.0) {
      separation = normalize(separation) * params.maxSpeed - me.vel;
      force += limit(separation, params.maxForce) * 1.5;
    }
  }
  if (aliCount > 0u) {
    alignment = alignment / f32(aliCount);
    if (length(alignment) > 0.0) {
      alignment = normalize(alignment) * params.maxSpeed - me.vel;
      force += limit(alignment, params.maxForce);
    }
  }
  if (cohCount > 0u) {
    cohesion = cohesion / f32(cohCount) - me.pos;
    if (length(cohesion) > 0.0) {
      cohesion = normalize(cohesion) * params.maxSpeed - me.vel;
      force += limit(cohesion, params.maxForce);
    }
  }

  // [LAW:dataflow-not-control-flow] Vortex well attractor — always computed, attractorActive scales to zero when inactive.
  // Three forces create orbital behavior: radial pull, core repulsion, tangential swirl.
  let attractorPos = vec3f(params.attractorX, params.attractorY, params.attractorZ);
  let toAttractor = attractorPos - me.pos;
  let aDist = length(toAttractor) + 0.0001; // epsilon avoids division by zero
  let aDir = toAttractor / aDist;

  // Tuning constants — relative to maxForce so behavior scales across presets
  let mf = params.maxForce;
  const ATTRACT_SCALE = 3.0;       // gravity well depth (multiples of maxForce at softening distance)
  const ATTRACT_SOFTENING = 0.3;   // prevents singularity in gravity calc
  const CORE_RADIUS = 0.25;        // repulsion shell radius
  const CORE_PRESSURE_SCALE = 8.0; // core push strength (multiples of maxForce)
  const SWIRL_SCALE = 2.4;         // tangential orbit strength (multiples of maxForce)
  const SWIRL_PEAK_RADIUS = 0.4;   // where swirl is strongest
  const SWIRL_FALLOFF = 0.8;       // gaussian width of swirl envelope
  const INFLUENCE_RADIUS = 2.5;    // beyond this, attractor fades to zero

  // 1. Radial pull: inverse-distance with softening
  let radialPull = mf * ATTRACT_SCALE / (aDist + ATTRACT_SOFTENING);

  // 2. Core repulsion: linear ramp inside core radius prevents singularity
  let coreRepulsion = max(0.0, CORE_RADIUS - aDist) / CORE_RADIUS * mf * CORE_PRESSURE_SCALE;

  // 3. Net radial force = pull inward minus push outward
  let radialForce = aDir * (radialPull - coreRepulsion);

  // 4. Tangential swirl: cross with world-up for orbit direction
  let worldUp = vec3f(0.0, 1.0, 0.0);
  let worldX = vec3f(1.0, 0.0, 0.0);
  let swirlAxis = select(worldUp, worldX, abs(dot(aDir, worldUp)) > 0.95);
  let tangent = normalize(cross(aDir, swirlAxis));
  // Gaussian peak near orbit shell, fading with distance
  let swirlEnvelope = exp(-((aDist - SWIRL_PEAK_RADIUS) * (aDist - SWIRL_PEAK_RADIUS)) / (SWIRL_FALLOFF * SWIRL_FALLOFF));
  let swirlForce = tangent * mf * SWIRL_SCALE * swirlEnvelope;

  // 5. Influence envelope: smooth fadeout so distant boids keep flocking naturally
  let influenceFade = 1.0 - smoothstep(INFLUENCE_RADIUS * 0.5, INFLUENCE_RADIUS, aDist);

  // 6. Combine — attractorActive is 0.0 (inactive) or 1.0 (active)
  force += (radialForce + swirlForce) * influenceFade * params.attractorActive;

  // Boundary force - soft repulsion from edges
  let bs = params.boundSize;
  let margin = bs * 0.1;
  var boundary = vec3f(0.0);
  if (me.pos.x < -bs + margin) { boundary.x = params.maxForce; }
  if (me.pos.x >  bs - margin) { boundary.x = -params.maxForce; }
  if (me.pos.y < -bs + margin) { boundary.y = params.maxForce; }
  if (me.pos.y >  bs - margin) { boundary.y = -params.maxForce; }
  if (me.pos.z < -bs + margin) { boundary.z = params.maxForce; }
  if (me.pos.z >  bs - margin) { boundary.z = -params.maxForce; }
  force += boundary * 2.0;

  var vel = me.vel + force;
  vel = limit(vel, params.maxSpeed);
  let pos = me.pos + vel * params.dt;

  particlesOut[idx] = Particle(pos, vel);
}
`}),c=L.createShaderModule({code:tt||`struct Camera {
  view: mat4x4f,
  proj: mat4x4f,
  eye: vec3f,
  _pad: f32,
  primary: vec3f,
  _pad2: f32,
  secondary: vec3f,
  _pad3: f32,
  accent: vec3f,
  _pad4: f32,
}

struct Particle {
  pos: vec3f,
  vel: vec3f,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> camera: Camera;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) color: vec3f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let p = particles[iid];
  let speed = length(p.vel);
  let dir = select(vec3f(0.0, 1.0, 0.0), normalize(p.vel), speed > 0.001);

  // Build a basis from velocity direction
  let up = select(vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0), abs(dir.z) < 0.99);
  let right = normalize(cross(dir, up));
  let realUp = cross(right, dir);

  // Triangle vertices pointing in velocity direction
  let size = 0.06;
  var localPos: vec3f;
  switch (vid) {
    case 0u: { localPos = dir * size * 2.0; }           // tip
    case 1u: { localPos = -dir * size + right * size; }  // left
    case 2u: { localPos = -dir * size - right * size; }  // right
    default: { localPos = vec3f(0.0); }
  }

  let worldPos = p.pos + localPos;
  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);

  // Color by speed: primary (slow) → accent (fast)
  let t = clamp(speed / 4.0, 0.0, 1.0);
  out.color = mix(camera.primary, camera.accent, t);
  return out;
}

@fragment
fn fs_main(@location(0) color: vec3f) -> @location(0) vec4f {
  return vec4f(color, 1.0);
}
`}),l=L.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),u=L.createComputePipeline({layout:L.createPipelineLayout({bindGroupLayouts:[l]}),compute:{module:s,entryPoint:`main`}}),d=L.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),f=L.createRenderPipeline({layout:L.createPipelineLayout({bindGroupLayouts:[d]}),vertex:{module:c,entryPoint:`vs_main`},fragment:{module:c,entryPoint:`fs_main`,targets:[{format:B}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:V}}),p=[L.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:r}},{binding:1,resource:{buffer:i}},{binding:2,resource:{buffer:a}}]}),L.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:i}},{binding:1,resource:{buffer:r}},{binding:2,resource:{buffer:a}}]})],m=[0,1].map(e=>[r,i].map(t=>L.createBindGroup({layout:d,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:o,offset:e*w,size:C}}]}))),h=0,g={};return{compute(t){let n=x.boids,r=x.mouse,i=new Float32Array(16);i[0]=.016,i[1]=n.separationRadius/50,i[2]=n.alignmentRadius/50,i[3]=n.cohesionRadius/50,i[4]=n.maxSpeed,i[5]=n.maxForce,i[6]=n.visualRange/50,i[8]=2,i[9]=r.worldX,i[10]=r.worldY,i[11]=r.worldZ,i[12]=r.down?1:0,new Uint32Array(i.buffer)[7]=e,L.queue.writeBuffer(a,0,i);let o=t.beginComputePass();o.setPipeline(u),o.setBindGroup(0,p[h]),o.dispatchWorkgroups(Math.ceil(e/64)),o.end(),h=1-h},render(t,n,r,i=0){let a=r?r[2]/r[3]:R.width/R.height;L.queue.writeBuffer(o,i*w,ce(a));let s=t.beginRenderPass({colorAttachments:[ie(g,n,r)],depthStencilAttachment:ae(g,r)}),c=oe(r);c&&s.setViewport(c[0],c[1],c[2],c[3],0,1),ge(s,a,i),s.setPipeline(f),s.setBindGroup(0,m[i][h]),s.draw(3,e),s.end()},getCount(){return e},destroy(){r.destroy(),i.destroy(),a.destroy(),o.destroy(),se(g)}}}function ve(){let t=x.physics.count,n=t*48,r=.45,i=Math.min(t,Math.max(1,Math.round(t*.05))),a=Math.min(t-i,Math.max(1,Math.round(t*.2))),o=i+a,s=2.5,c=new Float32Array(t*12),l=x.physics.distribution,u=k([.18,1,-.12]),d=k(A([0,1,0],u)),f=A(u,d);for(let e=0;e<t;e++){let t=e*12,n,p,m,h=0,g=0,_=0,v=0,y=e===0,b=e<i,x=e>=i&&e<o;if(y)n=0,p=0,m=0,h=0,g=0,_=0,v=42;else if(b||x){let t=b?e-1:e-i,r=b?Math.max(1,i-1):a,o=r>1?t/(r-1):.5,c=b?.2:.95,l=b?.85:1.85,y=b?.05:.1,x=c+(l-c)*o+(Math.random()-.5)*y,ee=b?.12:.2,S=(Math.random()-.5)*ee,C=b?Math.PI*.18:Math.PI/Math.max(3,a),w=t/Math.max(1,r)*Math.PI*2+C,T=[d[0]*Math.cos(w)*x+f[0]*Math.sin(w)*x+u[0]*S,d[1]*Math.cos(w)*x+f[1]*Math.sin(w)*x+u[1]*S,d[2]*Math.cos(w)*x+f[2]*Math.sin(w)*x+u[2]*S];n=T[0],p=T[1],m=T[2];let E=(b?.9:.6)/Math.sqrt(x+.05),D=[(-Math.sin(w)*d[0]+Math.cos(w)*f[0])*E,(-Math.sin(w)*d[1]+Math.cos(w)*f[1])*E,(-Math.sin(w)*d[2]+Math.cos(w)*f[2])*E];h=D[0],g=D[1],_=D[2],v=b?14+Math.random()**.4*16:s+Math.random()**.7*(9-s)}else if(l===`disk`){let e=Math.random()*Math.PI*2,t=Math.random()*2,i=k([(Math.random()-.5)*r,1,(Math.random()-.5)*r]),a=k(A([0,1,0],i)),o=A(i,a),s=(Math.random()-.5)*.35*(.35+t*.4),c=[a[0]*Math.cos(e)*t+o[0]*Math.sin(e)*t+i[0]*s,a[1]*Math.cos(e)*t+o[1]*Math.sin(e)*t+i[1]*s,a[2]*Math.cos(e)*t+o[2]*Math.sin(e)*t+i[2]*s];n=c[0],p=c[1],m=c[2];let l=.5/Math.sqrt(t+.1),u=[(-Math.sin(e)*a[0]+Math.cos(e)*o[0])*l,(-Math.sin(e)*a[1]+Math.cos(e)*o[1])*l,(-Math.sin(e)*a[2]+Math.cos(e)*o[2])*l],d=s*.18;h=u[0]+i[0]*d,g=u[1]+i[1]*d,_=u[2]+i[2]*d}else if(l===`shell`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),r=1.5+Math.random()*.1;n=r*Math.sin(t)*Math.cos(e),p=r*Math.sin(t)*Math.sin(e),m=r*Math.cos(t);let i=k([n,p,m]),a=k(A(i,[.3,1,-.2])),o=A(i,a),s=.18+Math.random()*.08;h=(a[0]+o[0]*.35)*s,g=(a[1]+o[1]*.35)*s,_=(a[2]+o[2]*.35)*s}else n=(Math.random()-.5)*4,p=(Math.random()-.5)*4,m=(Math.random()-.5)*4,h=(Math.random()-.5)*.12,g=(Math.random()-.5)*.12,_=(Math.random()-.5)*.12;c[t]=n,c[t+1]=p,c[t+2]=m,c[t+3]=v,c[t+4]=h,c[t+5]=g,c[t+6]=_,c[t+8]=n,c[t+9]=p,c[t+10]=m}let p=L.createBuffer({size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(p.getMappedRange()).set(c),p.unmap();let m=L.createBuffer({size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),h=L.createBuffer({size:96,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),g=L.createBuffer({size:w*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),_=L.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),v=L.createBuffer({size:16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),y=L.createBuffer({size:16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),b=L.createShaderModule({code:nt||`struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

struct Params {
  dt: f32,
  G: f32,
  softening: f32,
  damping: f32,
  count: u32,
  sourceCount: u32,
  coreOrbit: f32,
  _pad3: f32,
  targetX: f32,
  targetY: f32,
  targetZ: f32,
  interactionActive: f32,
  // [LAW:one-source-of-truth] Disk-recovery state lives in the same Params block so the CPU sends one coherent snapshot per frame.
  diskNormal: vec3f,
  _pad4: f32,
  diskVertDamp: f32,
  diskRadDamp: f32,
  diskTangGain: f32,
  diskVertSpring: f32,
  diskAlignGain: f32,
  interactionStrength: f32,
  diskTangSpeed: f32,
  _pad7: f32,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;

// [LAW:one-source-of-truth] Long-run N-body stability thresholds are owned here so containment and anti-collapse stay coherent.
const N_BODY_OUTER_RADIUS = 3.6;
const N_BODY_BOUNDARY_PULL = 0.012;
const INTERACTION_WELL_STRENGTH = 42.0;
const INTERACTION_WELL_SOFTENING = 0.18;
const INTERACTION_CORE_RADIUS = 0.3;
const INTERACTION_CORE_PRESSURE = 54.0;
const HOME_WELL_STRENGTH = 0.0;
const HOME_WELL_SOFTENING = 1.8;
const HOME_CORE_RADIUS = 0.0;
const HOME_CORE_PRESSURE = 0.0;
// [LAW:dataflow-not-control-flow] Interaction and recovery share one force pipeline; only the strengths change.
const HOME_RESTORE_STIFFNESS_ACTIVE = 0.14;
const HOME_RESTORE_DAMPING_ACTIVE = 0.18;
const INTERACTION_DRAG_GAIN = 1.9;
// [LAW:dataflow-not-control-flow] Recovery always runs; the central-well fade changes the home-anchor strength instead of branching the solver.
const HOME_ANCHOR_WELL_RADIUS = 2.2;
const HOME_ANCHOR_FADE_RADIUS = 3.0;
const HOME_REENTRY_KICK = 0.48;
const HOME_REENTRY_DAMPING = 0.12;
// [LAW:one-source-of-truth] Anti-collapse pressure is centralized here so the simulation keeps one coherent stability model.
const PARTICLE_PRESSURE_RADIUS = 0.2;
const PARTICLE_PRESSURE_SOFTENING = 0.03;
const PARTICLE_PRESSURE_STRENGTH = 0.012;
const PARTICLE_PRESSURE_MASS_CAP = 3.0;
// [LAW:dataflow-not-control-flow] Core-speed damping is always evaluated; distance and speed decide whether it contributes.
const CORE_FRICTION_RADIUS = 0.95;
const CORE_FRICTION_INNER_RADIUS = 0.14;
const CORE_FRICTION_SPEED_START = 0.9;
const CORE_FRICTION_GAIN = 3.4;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodiesIn[idx];
  var acc = vec3f(0.0);

  for (var i = 0u; i < params.sourceCount; i++) {
    if (i == idx) { continue; }
    let other = bodiesIn[i];
    let diff = other.pos - me.pos;
    let rawDist2 = dot(diff, diff);
    let dist2 = dot(diff, diff) + params.softening * params.softening;
    let inv = 1.0 / sqrt(dist2);
    let inv3 = inv * inv * inv;
    acc += diff * (params.G * other.mass * inv3);
    let pressureDist = sqrt(rawDist2 + 0.0001);
    let pressureFade = 1.0 - smoothstep(0.0, PARTICLE_PRESSURE_RADIUS, pressureDist);
    let pressureMass = min(other.mass, PARTICLE_PRESSURE_MASS_CAP);
    let pressureScale = pressureFade * pressureFade * (PARTICLE_PRESSURE_STRENGTH * pressureMass / (rawDist2 + PARTICLE_PRESSURE_SOFTENING));
    acc -= (diff / pressureDist) * pressureScale;
  }

  let targetPos = vec3f(params.targetX, params.targetY, params.targetZ);
  let interactionOn = params.interactionActive > 0.5;
  let wellStrength = select(HOME_WELL_STRENGTH, INTERACTION_WELL_STRENGTH * params.interactionStrength, interactionOn);
  let wellSoftening = select(HOME_WELL_SOFTENING, INTERACTION_WELL_SOFTENING, interactionOn);
  let coreRadius = select(HOME_CORE_RADIUS, INTERACTION_CORE_RADIUS, interactionOn);
  let corePressure = select(HOME_CORE_PRESSURE, INTERACTION_CORE_PRESSURE * params.interactionStrength, interactionOn);
  let homeRestoreStiffness = select(0.0, HOME_RESTORE_STIFFNESS_ACTIVE, interactionOn);
  let homeRestoreDamping = select(0.0, HOME_RESTORE_DAMPING_ACTIVE, interactionOn);
  let interactionDrag = select(0.0, INTERACTION_DRAG_GAIN, interactionOn);
  let homeReentryKick = select(HOME_REENTRY_KICK, 0.0, interactionOn);
  let homeReentryDamping = select(HOME_REENTRY_DAMPING, 0.0, interactionOn);
  let coreDist = length(me.pos);
  let coreFrictionFade = 1.0 - smoothstep(CORE_FRICTION_INNER_RADIUS, CORE_FRICTION_RADIUS, coreDist);

  let toTarget = targetPos - me.pos;
  let targetDist2 = dot(toTarget, toTarget);
  let targetDist = sqrt(targetDist2 + 0.0001);
  let targetDir = toTarget / targetDist;
  let toHome = me.home - me.pos;
  let homeAnchorFade = select(
    smoothstep(HOME_ANCHOR_WELL_RADIUS, HOME_ANCHOR_FADE_RADIUS, targetDist),
    1.0,
    interactionOn
  );
  let recoveryForceScale = select(homeAnchorFade, 1.0, interactionOn);
  acc += targetDir * (wellStrength / (targetDist2 + wellSoftening)) * recoveryForceScale;
  if (targetDist < coreRadius) {
    acc -= targetDir * ((coreRadius - targetDist) * corePressure * recoveryForceScale);
  }
  acc += toHome * (homeRestoreStiffness * homeAnchorFade);
  acc -= me.vel * (homeRestoreDamping * homeAnchorFade);
  acc += targetDir * (homeReentryKick * homeAnchorFade);
  acc -= me.vel * (homeReentryDamping * homeAnchorFade);
  acc += targetDir * interactionDrag;
  let speed = length(me.vel);
  let coreSpeedExcess = max(0.0, speed - CORE_FRICTION_SPEED_START);
  let coreFrictionStrength = params.coreOrbit * coreFrictionFade * coreSpeedExcess * CORE_FRICTION_GAIN;
  acc -= me.vel * coreFrictionStrength;

  // [LAW:dataflow-not-control-flow] Disk recovery always runs; gains of zero make individual terms inert without branching the solver.
  // All five corrections are applied as accelerations only — never as direct velocity edits — so the integrator preserves frame-rate independence.
  // [LAW:dataflow-not-control-flow] When R is degenerate, basis vectors become zero (not NaN); zero-weighted terms then contribute zero acceleration.
  let n = params.diskNormal;
  let r = me.pos;
  let z = dot(r, n);
  let vz = dot(me.vel, n);
  let rPlane = r - z * n;
  let R2 = dot(rPlane, rPlane);
  let valid = R2 > 1e-8;
  let safeR = sqrt(max(R2, 1e-8));
  let eR = select(vec3f(0.0), rPlane / safeR, valid);
  let crossNE = cross(n, eR);
  let crossLen2 = dot(crossNE, crossNE);
  let ePhi = select(vec3f(0.0), crossNE / sqrt(max(crossLen2, 1e-8)), crossLen2 > 1e-8);
  let R = select(0.0, safeR, valid);
  let vR = dot(me.vel, eR);
  let vPhi = dot(me.vel, ePhi);
  // Term 1: vertical velocity damping (primary flattener).
  acc -= n * (vz * params.diskVertDamp);
  // Term 2: radial velocity damping (orbit circularization).
  acc -= eR * (vR * params.diskRadDamp);
  // Term 3: vertical position spring (z² potential — opt-in via slider).
  acc -= n * (z * params.diskVertSpring);
  // Term 4: tangential target-speed nudge toward a Keplerian-ish circular speed.
  // diskTangSpeed sets the orbital speed at R=1; falloff matches the seeded disk init (1/sqrt(R+0.1)).
  let vc = params.diskTangSpeed / sqrt(safeR + 0.1);
  acc += ePhi * ((vc - vPhi) * params.diskTangGain);
  // Term 5: bias non-tangential velocity components toward the disk's coherent flow.
  let vNonTan = me.vel - n * vz - eR * vR;
  acc -= vNonTan * params.diskAlignGain;

  // A soft outer boundary keeps the toy system readable without letting the system escape to infinity.
  let centerDist = length(me.pos);
  if (centerDist > N_BODY_OUTER_RADIUS) {
    let toCenter = -normalize(me.pos);
    acc += toCenter * ((centerDist - N_BODY_OUTER_RADIUS) * N_BODY_BOUNDARY_PULL);
  }

  let effectiveDamping = 1.0 - (1.0 - params.damping) * params.dt;
  var vel = (me.vel + acc * params.dt) * effectiveDamping;
  let pos = me.pos + vel * params.dt;

  bodiesOut[idx] = Body(pos, me.mass, vel, 0.0, me.home, 0.0);
}
`}),ee=L.createShaderModule({code:e}),S=L.createShaderModule({code:rt||`struct Camera {
  view: mat4x4f,
  proj: mat4x4f,
  eye: vec3f,
  _pad: f32,
  primary: vec3f,
  _pad2: f32,
  secondary: vec3f,
  _pad3: f32,
  accent: vec3f,
  _pad4: f32,
}

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<uniform> camera: Camera;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let body = bodies[iid];

  let quadPos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  let viewPos = camera.view * vec4f(body.pos, 1.0);
  // [LAW:single-enforcer] Mass-to-appearance compression is owned here so physics mass stays authoritative while visuals remain legible.
  let massVisual = clamp(sqrt(max(body.mass, 0.02)) / 3.4, 0.14, 1.0);
  let baseSize = mix(0.015, 0.042, massVisual);
  let size = baseSize;
  let offset = quadPos[vid] * size;
  let billboarded = viewPos + vec4f(offset, 0.0, 0.0);

  var out: VSOut;
  out.pos = camera.proj * billboarded;
  out.uv = quadPos[vid];

  // Color: primary → secondary by mass.
  let massTint = clamp(pow(massVisual, 0.8), 0.0, 1.0);
  out.color = mix(camera.primary, camera.secondary, massTint);
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f, @location(1) color: vec3f) -> @location(0) vec4f {
  let dist = length(uv);
  let alpha = smoothstep(1.0, 0.55, dist);
  if (alpha < 0.01) { discard; }
  let g = exp(-dist * 3.6);
  return vec4f(color * (0.26 + g * 0.52), alpha * 0.78);
}
`}),T=L.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),E=L.createComputePipeline({layout:L.createPipelineLayout({bindGroupLayouts:[T]}),compute:{module:b,entryPoint:`main`}}),D=L.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),O=L.createComputePipeline({layout:L.createPipelineLayout({bindGroupLayouts:[D]}),compute:{module:ee,entryPoint:`main`}}),te=[L.createBindGroup({layout:D,entries:[{binding:0,resource:{buffer:m}},{binding:1,resource:{buffer:v}},{binding:2,resource:{buffer:_}}]}),L.createBindGroup({layout:D,entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:v}},{binding:2,resource:{buffer:_}}]})];L.queue.writeBuffer(_,0,new Uint32Array([t]));let j=L.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),ne=L.createRenderPipeline({layout:L.createPipelineLayout({bindGroupLayouts:[j]}),vertex:{module:S,entryPoint:`vs_main`},fragment:{module:S,entryPoint:`fs_main`,targets:[{format:B,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:V}}),M=[L.createBindGroup({layout:T,entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:m}},{binding:2,resource:{buffer:h}}]}),L.createBindGroup({layout:T,entries:[{binding:0,resource:{buffer:m}},{binding:1,resource:{buffer:p}},{binding:2,resource:{buffer:h}}]})],N=[0,1].map(e=>[p,m].map(t=>L.createBindGroup({layout:j,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:g,offset:e*w,size:C}}]}))),P=0,re={},F=[0,1,0],I=!1,z=.02;return{compute(e){let n=x.physics,r=x.mouse,i=new ArrayBuffer(96),a=new Float32Array(i),s=new Uint32Array(i);a[0]=.016,a[1]=n.G*.001,a[2]=n.softening,a[3]=n.damping,s[4]=t,s[5]=o,a[6]=n.coreOrbit,a[8]=r.down?r.worldX:0,a[9]=r.down?r.worldY:0,a[10]=r.down?r.worldZ:0,a[11]=r.down?1:0,a[12]=F[0],a[13]=F[1],a[14]=F[2],a[16]=n.diskVertDamp??0,a[17]=n.diskRadDamp??0,a[18]=n.diskTangGain??0,a[19]=n.diskVertSpring??0,a[20]=n.diskAlignGain??0,a[21]=n.interactionStrength??1,a[22]=n.diskTangSpeed??.5,L.queue.writeBuffer(h,0,new Uint8Array(i));let c=e.beginComputePass();c.setPipeline(E),c.setBindGroup(0,M[P]),c.dispatchWorkgroups(Math.ceil(t/64)),c.end();let l=1-P,u=e.beginComputePass();u.setPipeline(O),u.setBindGroup(0,te[l]),u.dispatchWorkgroups(1),u.end(),I||(e.copyBufferToBuffer(v,0,y,0,16),I=!0,L.queue.onSubmittedWorkDone().then(()=>{y.mapAsync(GPUMapMode.READ).then(()=>{let e=new Float32Array(y.getMappedRange().slice(0));y.unmap();let t=e[0],n=e[1],r=e[2],i=Math.sqrt(t*t+n*n+r*r);if(i>1e-4){let e=t/i,a=n/i,o=r/i,s=F[0]+(e-F[0])*z,c=F[1]+(a-F[1])*z,l=F[2]+(o-F[2])*z,u=Math.sqrt(s*s+c*c+l*l)||1;F[0]=s/u,F[1]=c/u,F[2]=l/u}I=!1}).catch(()=>{I=!1})})),P=1-P},render(e,n,r,i=0){let a=r?r[2]/r[3]:R.width/R.height;L.queue.writeBuffer(g,i*w,ce(a));let o=e.beginRenderPass({colorAttachments:[ie(re,n,r)],depthStencilAttachment:ae(re,r)}),s=oe(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),ge(o,a,i),o.setPipeline(ne),o.setBindGroup(0,N[i][P]),o.draw(6,t),o.end()},getCount(){return t},destroy(){p.destroy(),m.destroy(),h.destroy(),g.destroy(),_.destroy(),v.destroy(),y.destroy(),se(re)}}}function ye(){let e=x.fluid.resolution,t=e*e,n=t*8,r=t*4,i=t*16,a=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,o=L.createBuffer({size:n,usage:a}),s=L.createBuffer({size:n,usage:a}),c=L.createBuffer({size:r,usage:a}),l=L.createBuffer({size:r,usage:a}),u=L.createBuffer({size:r,usage:a}),d=L.createBuffer({size:i,usage:a}),f=L.createBuffer({size:i,usage:a}),p=L.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),m=L.createBuffer({size:w*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),h=new Float32Array(t*4),g=new Float32Array(t*2);for(let t=0;t<e;t++)for(let n=0;n<e;n++){let r=t*e+n,i=n/e,a=t/e,o=i-.5,s=a-.5;g[r*2]=-s*3,g[r*2+1]=o*3}L.queue.writeBuffer(d,0,h),L.queue.writeBuffer(o,0,g);let _=L.createShaderModule({code:it||`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  time: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> velOut: array<vec2f>;
@group(0) @binding(2) var<storage, read> dyeIn: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> dyeOut: array<vec4f>;
@group(0) @binding(4) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  let cx = clamp(x, 0, res - 1);
  let cy = clamp(y, 0, res - 1);
  return u32(cy * res + cx);
}

fn sampleVel(px: f32, py: f32) -> vec2f {
  let res = params.resolution;
  let x0 = i32(floor(px)); let y0 = i32(floor(py));
  let fx = px - f32(x0); let fy = py - f32(y0);
  return mix(
    mix(velIn[idx(x0, y0)], velIn[idx(x0+1, y0)], fx),
    mix(velIn[idx(x0, y0+1)], velIn[idx(x0+1, y0+1)], fx),
    fy
  );
}

fn sampleDye(px: f32, py: f32) -> vec4f {
  let res = params.resolution;
  let x0 = i32(floor(px)); let y0 = i32(floor(py));
  let fx = px - f32(x0); let fy = py - f32(y0);
  return mix(
    mix(dyeIn[idx(x0, y0)], dyeIn[idx(x0+1, y0)], fx),
    mix(dyeIn[idx(x0, y0+1)], dyeIn[idx(x0+1, y0+1)], fx),
    fy
  );
}

fn gaussian(delta: vec2f, radius: f32) -> f32 {
  return exp(-dot(delta, delta) / (2.0 * radius * radius));
}

fn orbitCenter(time: f32, phase: f32, radius: f32, wobble: f32) -> vec2f {
  return vec2f(
    0.5 + cos(time * 0.17 + phase) * radius + cos(time * 0.31 + phase * 1.7) * wobble,
    0.5 + sin(time * 0.14 + phase * 1.3) * radius + sin(time * 0.27 + phase * 0.8) * wobble
  );
}

fn driftImpulse(delta: vec2f, falloff: f32, spin: f32, strength: f32, timePhase: f32) -> vec2f {
  let dist = max(length(delta), 1e-4);
  let tangent = vec2f(-delta.y, delta.x) / dist * spin * (0.18 + 0.08 * sin(timePhase));
  let inward = -delta * 0.95;
  let grain = vec2f(sin(delta.y * 18.0 + timePhase), cos(delta.x * 16.0 - timePhase)) * 0.035;
  return (tangent + inward + grain) * falloff * strength;
}

fn ambientDyeColor(phase: f32, pulse: f32) -> vec3f {
  if (params.dyeMode < 0.5) {
    return hsvToRgb(fract(params.time * 0.08 + phase), 0.85, 1.0);
  }
  if (params.dyeMode < 1.5) {
    return vec3f(0.1, 0.5, 1.0) * (0.75 + pulse * 0.25);
  }
  return mix(vec3f(0.18, 0.3, 1.0), vec3f(1.0, 0.28, 0.1), 0.5 + pulse * 0.5);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let i = idx(x, y);
  let uv = vec2f((f32(x) + 0.5) / params.resolution, (f32(y) + 0.5) / params.resolution);
  var velocityImpulse = vec2f(0.0);
  var dyeInjection = vec4f(0.0);

  // [LAW:dataflow-not-control-flow] Both ambient drive and pointer input are evaluated every invocation; the mask values decide whether they contribute.
  let mouseMask = select(0.0, 1.0, params.mouseActive > 0.5);
  let mouseDelta = uv - vec2f(params.mouseX, params.mouseY);
  let mouseRadius = 0.02;
  let mouseSplat = gaussian(mouseDelta, mouseRadius) * params.forceStrength * mouseMask;
  velocityImpulse += vec2f(params.mouseDX, params.mouseDY) * mouseSplat;

  let mouseDyeSplat = gaussian(mouseDelta, mouseRadius * 2.0) * mouseMask;
  var mouseDyeColor: vec3f;
  if (params.dyeMode < 0.5) {
    let angle = atan2(params.mouseDY, params.mouseDX);
    let h = angle / 6.283 + 0.5;
    mouseDyeColor = hsvToRgb(h, 0.9, 1.0);
  } else if (params.dyeMode < 1.5) {
    mouseDyeColor = vec3f(0.1, 0.5, 1.0);
  } else {
    let speed = length(vec2f(params.mouseDX, params.mouseDY));
    mouseDyeColor = mix(vec3f(0.2, 0.3, 1.0), vec3f(1.0, 0.2, 0.1), clamp(speed * 5.0, 0.0, 1.0));
  }
  dyeInjection += vec4f(mouseDyeColor * mouseDyeSplat, mouseDyeSplat);

  let driveBase = params.forceStrength * 0.0032;
  let ambientDyeRamp = smoothstep(1.5, 7.0, params.time);

  let pulse0 = 0.75 + 0.25 * sin(params.time * 0.42);
  let center0 = orbitCenter(params.time, 0.0, 0.19, 0.035);
  let delta0 = uv - center0;
  let falloff0 = gaussian(delta0, 0.32);
  velocityImpulse += driftImpulse(delta0, falloff0, 1.0, driveBase * pulse0, params.time * 0.7);
  dyeInjection += vec4f(ambientDyeColor(0.03, pulse0) * falloff0 * 0.0006, falloff0 * 0.0003) * ambientDyeRamp;

  let pulse1 = 0.75 + 0.25 * sin(params.time * 0.37 + 2.1);
  let center1 = orbitCenter(params.time, 2.1, 0.16, 0.04);
  let delta1 = uv - center1;
  let falloff1 = gaussian(delta1, 0.30);
  velocityImpulse += driftImpulse(delta1, falloff1, -1.0, driveBase * pulse1 * 0.9, params.time * 0.63 + 1.7);
  dyeInjection += vec4f(ambientDyeColor(0.37, pulse1) * falloff1 * 0.0005, falloff1 * 0.00025) * ambientDyeRamp;

  let pulse2 = 0.75 + 0.25 * sin(params.time * 0.33 + 4.2);
  let center2 = orbitCenter(params.time, 4.2, 0.21, 0.03);
  let delta2 = uv - center2;
  let falloff2 = gaussian(delta2, 0.34);
  velocityImpulse += driftImpulse(delta2, falloff2, 1.0, driveBase * pulse2 * 0.8, params.time * 0.57 + 3.4);
  dyeInjection += vec4f(ambientDyeColor(0.69, pulse2) * falloff2 * 0.0004, falloff2 * 0.0002) * ambientDyeRamp;

  let drivenVel = velIn[i] + velocityImpulse;
  let px = f32(x) - drivenVel.x * params.dt;
  let py = f32(y) - drivenVel.y * params.dt;
  let advectedVel = sampleVel(px, py);
  let advectedDye = sampleDye(px, py) * 0.992;

  velOut[i] = (advectedVel + velocityImpulse) * 0.94;
  dyeOut[i] = min(advectedDye + dyeInjection, vec4f(2.2, 2.2, 2.2, 1.6));
}

fn hsvToRgb(h: f32, s: f32, v: f32) -> vec3f {
  let hh = fract(h) * 6.0;
  let i = u32(floor(hh));
  let f = hh - f32(i);
  let p = v * (1.0 - s);
  let q = v * (1.0 - s * f);
  let t = v * (1.0 - s * (1.0 - f));
  switch (i) {
    case 0u: { return vec3f(v, t, p); }
    case 1u: { return vec3f(q, v, p); }
    case 2u: { return vec3f(p, v, t); }
    case 3u: { return vec3f(p, q, v); }
    case 4u: { return vec3f(t, p, v); }
    default: { return vec3f(v, p, q); }
  }
}
`}),v=L.createShaderModule({code:at||`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> velOut: array<vec2f>;
@group(0) @binding(2) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let alpha = 1.0 / (params.viscosity * params.dt);
  let beta = 4.0 + alpha;

  let center = velIn[idx(x, y)];
  let left = velIn[idx(x-1, y)];
  let right = velIn[idx(x+1, y)];
  let down = velIn[idx(x, y-1)];
  let up = velIn[idx(x, y+1)];

  velOut[idx(x, y)] = (left + right + down + up + center * alpha) / beta;
}
`}),y=L.createShaderModule({code:st||`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> pressIn: array<f32>;
@group(0) @binding(1) var<storage, read_write> pressOut: array<f32>;
@group(0) @binding(2) var<storage, read> divergence: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let left = pressIn[idx(x-1, y)];
  let right = pressIn[idx(x+1, y)];
  let down = pressIn[idx(x, y-1)];
  let up = pressIn[idx(x, y+1)];
  let div = divergence[idx(x, y)];

  pressOut[idx(x, y)] = (left + right + down + up - div) * 0.25;
}
`}),b=L.createShaderModule({code:ot||`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> divergenceOut: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let vr = velIn[idx(x+1, y)].x;
  let vl = velIn[idx(x-1, y)].x;
  let vu = velIn[idx(x, y+1)].y;
  let vd = velIn[idx(x, y-1)].y;
  divergenceOut[idx(x, y)] = (vr - vl + vu - vd) * 0.5;
}
`}),T=L.createShaderModule({code:ct||`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> velOut: array<vec2f>;
@group(0) @binding(2) var<storage, read> pressure: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let pl = pressure[idx(x-1, y)];
  let pr = pressure[idx(x+1, y)];
  let pd = pressure[idx(x, y-1)];
  let pu = pressure[idx(x, y+1)];
  let vel = velIn[idx(x, y)];
  velOut[idx(x, y)] = vel - vec2f(pr - pl, pu - pd) * 0.5;
}
`}),E=L.createShaderModule({code:lt||`struct Camera {
  view: mat4x4f,
  proj: mat4x4f,
  eye: vec3f,
  _pad: f32,
  primary: vec3f,
  _pad2: f32,
  secondary: vec3f,
  _pad3: f32,
  accent: vec3f,
  _pad4: f32,
}

struct FluidRenderParams {
  simRes: f32,
  gridRes: f32,
  heightScale: f32,
  worldSize: f32,
}

@group(0) @binding(0) var<storage, read> dye: array<vec4f>;
@group(0) @binding(1) var<uniform> params: FluidRenderParams;
@group(0) @binding(2) var<uniform> camera: Camera;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
  @location(2) worldPos: vec3f,
  @location(3) density: f32,
}

fn sampleDye(u: f32, v: f32) -> vec4f {
  let res = i32(params.simRes);
  let x = clamp(i32(u * f32(res)), 0, res - 1);
  let y = clamp(i32(v * f32(res)), 0, res - 1);
  return dye[y * res + x];
}

fn sampleDensity(u: f32, v: f32) -> f32 {
  // [LAW:one-source-of-truth] Density comes solely from dye.a (the mode-invariant
  // splat amount written by fluid.forces.wgsl). Mixing length(d.rgb) here makes
  // surface height depend on dye color, so single/rainbow/temperature presets
  // would render at different thicknesses for the same injected density.
  let d = sampleDye(u, v);
  let raw = clamp(d.a * 0.14, 0.0, 2.5);
  return 1.0 - exp(-raw * 1.35);
}

fn spectralThemeColor(uv: vec2f, worldPos: vec3f, dyeColor: vec3f, density: f32, camera: Camera) -> vec3f {
  let ribbon = 0.5 + 0.5 * sin(worldPos.x * 3.4 + worldPos.z * 2.8 + density * 4.0);
  let cross = 0.5 + 0.5 * sin((uv.x - uv.y) * 12.0 + worldPos.y * 6.0);
  let dyeEnergy = clamp(dot(dyeColor, vec3f(0.3333)), 0.0, 1.0);
  let warm = mix(camera.secondary, camera.accent, cross);
  let cool = mix(camera.primary, camera.secondary, ribbon);
  let spectral = mix(cool, warm, 0.45 + 0.35 * ribbon);
  let dyeTint = mix(dyeColor, vec3f(dyeColor.b, dyeColor.r, dyeColor.g), cross * 0.55);
  return mix(spectral, dyeTint, 0.35 + dyeEnergy * 0.4);
}

fn cubeCorner(vid: u32) -> vec3f {
  let corners = array<vec3f, 36>(
    vec3f(-1.0, -1.0,  1.0), vec3f( 1.0, -1.0,  1.0), vec3f(-1.0,  1.0,  1.0),
    vec3f(-1.0,  1.0,  1.0), vec3f( 1.0, -1.0,  1.0), vec3f( 1.0,  1.0,  1.0),
    vec3f( 1.0, -1.0, -1.0), vec3f(-1.0, -1.0, -1.0), vec3f( 1.0,  1.0, -1.0),
    vec3f( 1.0,  1.0, -1.0), vec3f(-1.0, -1.0, -1.0), vec3f(-1.0,  1.0, -1.0),
    vec3f(-1.0, -1.0, -1.0), vec3f(-1.0, -1.0,  1.0), vec3f(-1.0,  1.0, -1.0),
    vec3f(-1.0,  1.0, -1.0), vec3f(-1.0, -1.0,  1.0), vec3f(-1.0,  1.0,  1.0),
    vec3f( 1.0, -1.0,  1.0), vec3f( 1.0, -1.0, -1.0), vec3f( 1.0,  1.0,  1.0),
    vec3f( 1.0,  1.0,  1.0), vec3f( 1.0, -1.0, -1.0), vec3f( 1.0,  1.0, -1.0),
    vec3f(-1.0,  1.0,  1.0), vec3f( 1.0,  1.0,  1.0), vec3f(-1.0,  1.0, -1.0),
    vec3f(-1.0,  1.0, -1.0), vec3f( 1.0,  1.0,  1.0), vec3f( 1.0,  1.0, -1.0),
    vec3f(-1.0, -1.0, -1.0), vec3f( 1.0, -1.0, -1.0), vec3f(-1.0, -1.0,  1.0),
    vec3f(-1.0, -1.0,  1.0), vec3f( 1.0, -1.0, -1.0), vec3f( 1.0, -1.0,  1.0)
  );
  return corners[vid];
}

fn cubeNormal(vid: u32) -> vec3f {
  let normals = array<vec3f, 36>(
    vec3f( 0.0,  0.0,  1.0), vec3f( 0.0,  0.0,  1.0), vec3f( 0.0,  0.0,  1.0),
    vec3f( 0.0,  0.0,  1.0), vec3f( 0.0,  0.0,  1.0), vec3f( 0.0,  0.0,  1.0),
    vec3f( 0.0,  0.0, -1.0), vec3f( 0.0,  0.0, -1.0), vec3f( 0.0,  0.0, -1.0),
    vec3f( 0.0,  0.0, -1.0), vec3f( 0.0,  0.0, -1.0), vec3f( 0.0,  0.0, -1.0),
    vec3f(-1.0,  0.0,  0.0), vec3f(-1.0,  0.0,  0.0), vec3f(-1.0,  0.0,  0.0),
    vec3f(-1.0,  0.0,  0.0), vec3f(-1.0,  0.0,  0.0), vec3f(-1.0,  0.0,  0.0),
    vec3f( 1.0,  0.0,  0.0), vec3f( 1.0,  0.0,  0.0), vec3f( 1.0,  0.0,  0.0),
    vec3f( 1.0,  0.0,  0.0), vec3f( 1.0,  0.0,  0.0), vec3f( 1.0,  0.0,  0.0),
    vec3f( 0.0,  1.0,  0.0), vec3f( 0.0,  1.0,  0.0), vec3f( 0.0,  1.0,  0.0),
    vec3f( 0.0,  1.0,  0.0), vec3f( 0.0,  1.0,  0.0), vec3f( 0.0,  1.0,  0.0),
    vec3f( 0.0, -1.0,  0.0), vec3f( 0.0, -1.0,  0.0), vec3f( 0.0, -1.0,  0.0),
    vec3f( 0.0, -1.0,  0.0), vec3f( 0.0, -1.0,  0.0), vec3f( 0.0, -1.0,  0.0)
  );
  return normals[vid];
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let gr = u32(params.gridRes);
  let cx = iid % gr;
  let cy = iid / gr;

  let u = (f32(cx) + 0.5) / f32(gr);
  let v = (f32(cy) + 0.5) / f32(gr);
  let density = sampleDensity(u, v);

  let cellSize = params.worldSize / f32(gr);
  let halfWidth = cellSize * mix(0.92, 1.34, density);
  // [LAW:one-source-of-truth] Render height is derived from the same density scalar for both the permanent floor and dynamic variation.
  let liftedDensity = pow(density, 0.58);
  let totalHeight = 0.14 + liftedDensity * params.heightScale * 2.6;
  let halfHeight = totalHeight * 0.5;
  let centerY = halfHeight;

  let local = cubeCorner(vid);
  let worldPos = vec3f(
    (u - 0.5) * params.worldSize + local.x * halfWidth,
    centerY + local.y * halfHeight,
    (v - 0.5) * params.worldSize + local.z * halfWidth
  );

  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);
  out.uv = vec2f(u, v);
  out.normal = cubeNormal(vid);
  out.worldPos = worldPos;
  out.density = density;
  return out;
}

@fragment
fn fs_main(
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
  @location(2) worldPos: vec3f,
  @location(3) density: f32
) -> @location(0) vec4f {
  let d = sampleDye(uv.x, uv.y);
  let n = normalize(normal);
  let lightDir = normalize(vec3f(1.0, 2.5, 1.3));
  let diffuse = max(dot(n, lightDir), 0.0);
  let viewDir = normalize(camera.eye - worldPos);
  let rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5);
  let spec = pow(max(dot(n, normalize(lightDir + viewDir)), 0.0), 24.0);

  // [LAW:one-source-of-truth] The richer palette is derived from the existing dye field plus theme colors; no parallel color state is introduced.
  let dyeColor = min(d.rgb, vec3f(1.0));
  let baseColor = spectralThemeColor(uv, worldPos, dyeColor, density, camera);
  let lit = baseColor * (0.16 + diffuse * 0.78) + camera.accent * rim * 0.16 + vec3f(1.0) * spec * 0.2;
  return vec4f(lit, 1.0);
}
`}),D=L.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),O=L.createComputePipeline({layout:L.createPipelineLayout({bindGroupLayouts:[D]}),compute:{module:_,entryPoint:`main`}}),k=L.createBindGroup({layout:D,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:d}},{binding:3,resource:{buffer:f}},{binding:4,resource:{buffer:p}}]}),A=L.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),te=L.createComputePipeline({layout:L.createPipelineLayout({bindGroupLayouts:[A]}),compute:{module:v,entryPoint:`main`}}),j=[L.createBindGroup({layout:A,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:p}}]}),L.createBindGroup({layout:A,entries:[{binding:0,resource:{buffer:s}},{binding:1,resource:{buffer:o}},{binding:2,resource:{buffer:p}}]})],ne=L.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),M=L.createComputePipeline({layout:L.createPipelineLayout({bindGroupLayouts:[ne]}),compute:{module:b,entryPoint:`main`}}),N=L.createBindGroup({layout:ne,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:u}},{binding:2,resource:{buffer:p}}]}),P=L.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),re=L.createComputePipeline({layout:L.createPipelineLayout({bindGroupLayouts:[P]}),compute:{module:y,entryPoint:`main`}}),F=[L.createBindGroup({layout:P,entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:u}},{binding:3,resource:{buffer:p}}]}),L.createBindGroup({layout:P,entries:[{binding:0,resource:{buffer:l}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:u}},{binding:3,resource:{buffer:p}}]})],I=L.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),z=L.createComputePipeline({layout:L.createPipelineLayout({bindGroupLayouts:[I]}),compute:{module:T,entryPoint:`main`}}),le=L.createBindGroup({layout:I,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:c}},{binding:3,resource:{buffer:p}}]}),H=L.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});L.queue.writeBuffer(H,0,new Float32Array([e,ee,x.fluid.volumeScale,S]));let ue=L.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),de=L.createRenderPipeline({layout:L.createPipelineLayout({bindGroupLayouts:[ue]}),vertex:{module:E,entryPoint:`vs_main`},fragment:{module:E,entryPoint:`fs_main`,targets:[{format:B}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:V}}),fe=[0,1].map(e=>L.createBindGroup({layout:ue,entries:[{binding:0,resource:{buffer:d}},{binding:1,resource:{buffer:H}},{binding:2,resource:{buffer:m,offset:e*w,size:C}}]})),U=Math.ceil(e/8),W={},pe=0;return{compute(t){let a=x.fluid,u=a.dyeMode===`rainbow`?0:a.dyeMode===`single`?1:2;pe+=.016;let m=new Float32Array([.22,a.viscosity,a.diffusionRate,a.forceStrength,e,x.mouse.x,x.mouse.y,x.mouse.dx,x.mouse.dy,x.mouse.down?1:0,u,pe]);L.queue.writeBuffer(p,0,m);{let e=t.beginComputePass();e.setPipeline(O),e.setBindGroup(0,k),e.dispatchWorkgroups(U,U),e.end()}t.copyBufferToBuffer(s,0,o,0,n),t.copyBufferToBuffer(f,0,d,0,i);let h=0;for(let e=0;e<a.jacobiIterations;e++){let e=t.beginComputePass();e.setPipeline(te),e.setBindGroup(0,j[h]),e.dispatchWorkgroups(U,U),e.end(),h=1-h}h===1&&t.copyBufferToBuffer(s,0,o,0,n);{let e=t.beginComputePass();e.setPipeline(M),e.setBindGroup(0,N),e.dispatchWorkgroups(U,U),e.end()}let g=0;for(let e=0;e<a.jacobiIterations;e++){let e=t.beginComputePass();e.setPipeline(re),e.setBindGroup(0,F[g]),e.dispatchWorkgroups(U,U),e.end(),g=1-g}g===1&&t.copyBufferToBuffer(l,0,c,0,r);{let e=t.beginComputePass();e.setPipeline(z),e.setBindGroup(0,le),e.dispatchWorkgroups(U,U),e.end()}t.copyBufferToBuffer(s,0,o,0,n)},render(t,n,r,i=0){let a=r?r[2]/r[3]:R.width/R.height;L.queue.writeBuffer(m,i*w,ce(a)),L.queue.writeBuffer(H,0,new Float32Array([e,ee,x.fluid.volumeScale,S]));let o=t.beginRenderPass({colorAttachments:[ie(W,n,r)],depthStencilAttachment:ae(W,r)}),s=oe(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),ge(o,a,i),o.setPipeline(de),o.setBindGroup(0,fe[i]),o.draw(36,ee*ee),o.end()},getCount(){return e+`x`+e},destroy(){o.destroy(),s.destroy(),c.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),H.destroy(),m.destroy(),se(W)}}}function be(){let e=65025*6,t=L.createBuffer({size:2097152,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.VERTEX}),n=L.createBuffer({size:e*4,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});{let t=new Uint32Array(e),r=0;for(let e=0;e<255;e++)for(let n=0;n<255;n++){let i=e*256+n,a=i+1,o=(e+1)*256+n,s=o+1;t[r++]=i,t[r++]=o,t[r++]=a,t[r++]=a,t[r++]=o,t[r++]=s}L.queue.writeBuffer(n,0,t)}let r=L.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),i=L.createBuffer({size:w*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),a=L.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),o=0,s=0,c=L.createShaderModule({code:ut||`struct Params {
  uRes: u32,
  vRes: u32,
  scale: f32,
  twist: f32,
  time: f32,
  shapeId: u32,
  p1: f32,
  p2: f32,
  p3: f32,  // wave amplitude
  p4: f32,  // wave frequency multiplier
  pokeX: f32,
  pokeY: f32,
  pokeZ: f32,
  pokeActive: f32,
}

struct Vertex {
  pos: vec3f,
  glow: f32,    // wave displacement magnitude — sits in the vec3f padding slot
  normal: vec3f,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(1) var<uniform> params: Params;

// Shape 0: Torus — p1=majorRadius, p2=minorRadius
fn torusShape(u: f32, v: f32) -> vec3f {
  let R = params.p1; let r = params.p2;
  return vec3f(
    (R + r * cos(v)) * cos(u),
    (R + r * cos(v)) * sin(u),
    r * sin(v)
  );
}

// Shape 1: Klein bottle — p1=scale
fn kleinShape(u: f32, v: f32) -> vec3f {
  let cosU = cos(u); let sinU = sin(u);
  let cosV = cos(v); let sinV = sin(v);
  let a = params.p1;
  var x: f32; var z: f32;
  if (u < 3.14159) {
    x = 3.0*cosU*(1.0+sinU) + (2.0*a)*(1.0-cosU*0.5)*cosU*cosV;
    z = -8.0*sinU - (2.0*a)*(1.0-cosU*0.5)*sinU*cosV;
  } else {
    x = 3.0*cosU*(1.0+sinU) + (2.0*a)*(1.0-cosU*0.5)*cos(v+3.14159);
    z = -8.0*sinU;
  }
  let y = -(2.0*a)*(1.0-cosU*0.5)*sinV;
  return vec3f(x, y, z) * 0.1;
}

// Shape 2: Möbius strip — p1=width, p2=halfTwists
fn mobiusShape(u: f32, v: f32) -> vec3f {
  let w = params.p1;
  let tw = params.p2;
  let vv = (v / 6.283185 - 0.5) * w;
  let halfU = u * tw * 0.5;
  return vec3f(
    (1.0 + vv * cos(halfU)) * cos(u),
    (1.0 + vv * cos(halfU)) * sin(u),
    vv * sin(halfU)
  );
}

// Shape 3: Sphere — p1=xStretch, p2=zStretch
fn sphereShape(u: f32, v: f32) -> vec3f {
  return vec3f(
    sin(v) * cos(u) * params.p1,
    sin(v) * sin(u) * params.p1,
    cos(v) * params.p2
  );
}

// Shape 4: Trefoil knot — p1=tubeRadius, p2=knotScale
fn trefoilShape(u: f32, v: f32) -> vec3f {
  let t = u;
  let ks = params.p2;
  let cx = sin(t) + 2.0 * sin(2.0 * t);
  let cy = cos(t) - 2.0 * cos(2.0 * t);
  let cz = -sin(3.0 * t);
  let dx = cos(t) + 4.0 * cos(2.0 * t);
  let dy = -sin(t) + 4.0 * sin(2.0 * t);
  let dz = -3.0 * cos(3.0 * t);
  let tangent = normalize(vec3f(dx, dy, dz));
  var up = vec3f(0.0, 0.0, 1.0);
  if (abs(dot(tangent, up)) > 0.99) { up = vec3f(0.0, 1.0, 0.0); }
  let normal = normalize(cross(tangent, up));
  let binormal = cross(tangent, normal);
  let r = params.p1;
  return vec3f(cx, cy, cz) * ks + (normal * cos(v) + binormal * sin(v)) * r * ks;
}

fn evalShape(u: f32, v: f32) -> vec3f {
  switch (params.shapeId) {
    case 0u: { return torusShape(u, v); }
    case 1u: { return kleinShape(u, v); }
    case 2u: { return mobiusShape(u, v); }
    case 3u: { return sphereShape(u, v); }
    case 4u: { return trefoilShape(u, v); }
    default: { return torusShape(u, v); }
  }
}

// Three interfering traveling waves — amplitude=p3, frequency=p4
fn waveDelta(u: f32, v: f32) -> f32 {
  let t = params.time;
  let a = params.p3;
  let f = max(params.p4, 0.3);
  let w1 = sin(u * 3.0 * f + v * 2.0 * f + t * 1.8) * 0.12;
  let w2 = cos(u * 5.0 * f - v * 4.0 * f + t * 2.3) * 0.07;
  let w3 = sin(u * 2.0 * f + v * 7.0 * f - t * 1.5) * 0.05;
  return (w1 + w2 + w3) * a;
}

// Scaled + wave-displaced position for a UV coordinate.
// Normal of the base shape is computed via finite differences and used as
// the displacement direction so waves are always surface-normal aligned.
fn evalFull(u: f32, v: f32) -> vec3f {
  let eps = 0.001;
  let p  = evalShape(u, v);
  let pu = evalShape(u + eps, v);
  let pv = evalShape(u, v + eps);
  let bn = normalize(cross(pu - p, pv - p));
  return (p + bn * waveDelta(u, v)) * params.scale;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let ui = gid.x;
  let vi = gid.y;
  if (ui >= params.uRes || vi >= params.vRes) { return; }

  let u = f32(ui) / f32(params.uRes) * 6.283185;
  let v = f32(vi) / f32(params.vRes) * 6.283185;
  let idx = vi * params.uRes + ui;

  let twistAngle = params.twist * f32(vi) / f32(params.vRes);
  let tu = u + twistAngle;

  // Displaced position
  var pos = evalFull(tu, v);

  // Normal of the displaced surface via finite differences of evalFull
  let feps = 0.005;
  let dpu = evalFull(tu + feps, v) - pos;
  let dpv = evalFull(tu, v + feps) - pos;
  let nc = cross(dpu, dpv);
  let nlen = length(nc);
  var normal = select(vec3f(0.0, 1.0, 0.0), nc / nlen, nlen > 0.0001);

  // Glow: wave displacement magnitude, scaled so default amp gives visible emission
  let disp = waveDelta(tu, v);
  let glow = abs(disp) * 5.0;

  // Poke deformation: push vertices outward near the interaction point
  if (params.pokeActive > 0.5) {
    let pokePos = vec3f(params.pokeX, params.pokeY, params.pokeZ);
    let diff = pos - pokePos;
    let dist = length(diff);
    let radius = 0.8;
    let strength = exp(-dist * dist / (2.0 * radius * radius)) * 0.5;
    pos += normal * strength;
  }

  vertices[idx] = Vertex(pos, glow, normal, 0.0);
}
`}),l=L.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),u=L.createComputePipeline({layout:L.createPipelineLayout({bindGroupLayouts:[l]}),compute:{module:c,entryPoint:`main`}}),d=L.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:r}}]}),f=L.createShaderModule({code:dt||`struct Camera {
  view: mat4x4f,
  proj: mat4x4f,
  eye: vec3f,
  _pad: f32,
  primary: vec3f,
  _pad2: f32,
  secondary: vec3f,
  _pad3: f32,
  accent: vec3f,
  _pad4: f32,
}

struct Vertex {
  pos: vec3f,
  glow: f32,    // wave displacement magnitude
  normal: vec3f,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> vertices: array<Vertex>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> modelMatrix: mat4x4f;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) normal: vec3f,
  @location(1) worldPos: vec3f,
  @location(2) glow: f32,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let v = vertices[vid];
  let world = modelMatrix * vec4f(v.pos, 1.0);

  var out: VSOut;
  out.pos = camera.proj * camera.view * world;
  out.normal = normalize((modelMatrix * vec4f(v.normal, 0.0)).xyz);
  out.worldPos = world.xyz;
  out.glow = v.glow;
  return out;
}

// Compact hue-to-rgb: maps [0,1] hue to full-saturation RGB
fn hue2rgb(h: f32) -> vec3f {
  let r = abs(h * 6.0 - 3.0) - 1.0;
  let g = 2.0 - abs(h * 6.0 - 2.0);
  let b = 2.0 - abs(h * 6.0 - 4.0);
  return clamp(vec3f(r, g, b), vec3f(0.0), vec3f(1.0));
}

fn hsv2rgb(h: f32, s: f32, v: f32) -> vec3f {
  return ((hue2rgb(fract(h)) - 1.0) * s + 1.0) * v;
}

@fragment
fn fs_main(
  @location(0) normal: vec3f,
  @location(1) worldPos: vec3f,
  @location(2) glow: f32
) -> @location(0) vec4f {
  let n = normalize(normal);
  let viewDir = normalize(camera.eye - worldPos);
  let lightDir  = normalize(vec3f(1.0, 2.0, 1.5));
  let lightDir2 = normalize(vec3f(-0.8, -0.5, 0.3));  // cool fill light

  let nDotV    = dot(n, viewDir);
  let absNDotV = abs(nDotV);

  // Fresnel: peaks at grazing (edge) angles — drives iridescence intensity
  let fresnel = pow(1.0 - absNDotV, 2.5);

  // Iridescent hue: NdotV angle + world position create a shifting rainbow that
  // animates naturally as the shape rotates and waves deform the surface
  let hue = fract(absNDotV * 1.2 + worldPos.x * 0.12 + worldPos.y * 0.08 + worldPos.z * 0.10);
  let iridColor = hsv2rgb(hue, 0.88, 1.0);

  // Phong: key light + cool fill light for depth
  let diffuse  = max(dot( n, lightDir),  0.0);
  let diffuse2 = max(dot( n, lightDir2), 0.0);
  let backDiff = max(dot(-n, lightDir),  0.0);
  let halfDir  = normalize(lightDir + viewDir);
  let spec     = pow(max(dot(n, halfDir), 0.0), 96.0);

  // Mix theme color with iridescence — blend is strongest at grazing angles
  let baseColor = mix(camera.primary, iridColor, fresnel * 0.55 + 0.15);
  let fillColor = camera.secondary * diffuse2 * 0.3;
  let backColor = mix(camera.secondary * 0.5, iridColor * 0.3, fresnel * 0.4);

  let ambient    = vec3f(0.04, 0.03, 0.07);
  let frontColor = ambient + baseColor * (diffuse * 0.85 + 0.1) + fillColor + spec * 0.9;
  let rearColor  = ambient + backColor * (backDiff * 0.4 + 0.05);

  let shadedColor = select(rearColor, frontColor, nDotV > 0.0);

  // Fresnel rim glow in accent color
  let rimGlow = fresnel * camera.accent * 1.0;

  // Wave displacement emission: peaks glow in accent color
  let emission = min(glow, 1.0) * camera.accent * 0.7;

  return vec4f(shadedColor + rimGlow + emission, 1.0);
}
`}),p=L.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),m=L.createRenderPipeline({layout:L.createPipelineLayout({bindGroupLayouts:[p]}),vertex:{module:f,entryPoint:`vs_main`},fragment:{module:f,entryPoint:`fs_main`,targets:[{format:B}]},primitive:{topology:`triangle-list`,cullMode:`none`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:V}}),h=[0,1].map(e=>L.createBindGroup({layout:p,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:i,offset:e*w,size:C}},{binding:2,resource:{buffer:a}}]})),g={};return{compute(e){let t=x.parametric;o+=.016;let n=Math.max(t.p1Rate,t.p2Rate,t.p3Rate,t.p4Rate,t.twistRate);s+=.016*(n>0?1:0);let i=(e,t,n,r)=>e+(t-e)*(.5+.5*Math.sin(o*n+r)),a=i(t.p1Min,t.p1Max,t.p1Rate,0),c=i(t.p2Min,t.p2Max,t.p2Rate,Math.PI*.7),l=i(t.p3Min,t.p3Max,t.p3Rate,Math.PI*1.3),f=i(t.p4Min,t.p4Max,t.p4Rate,Math.PI*.4),p=i(t.twistMin,t.twistMax,t.twistRate,Math.PI*.9),m=x.mouse,h=new ArrayBuffer(64),g=new Uint32Array(h),_=new Float32Array(h);g[0]=256,g[1]=256,_[2]=t.scale,_[3]=p,_[4]=s,g[5]=E[t.shape]||0,_[6]=a,_[7]=c,_[8]=l,_[9]=f,_[10]=m.worldX,_[11]=m.worldY,_[12]=m.worldZ,_[13]=m.down?1:0,L.queue.writeBuffer(r,0,new Uint8Array(h));let v=e.beginComputePass();v.setPipeline(u),v.setBindGroup(0,d),v.dispatchWorkgroups(32,32),v.end()},render(t,r,o,c=0){let l=o?o[2]/o[3]:R.width/R.height;L.queue.writeBuffer(i,c*w,ce(l));let u=O.rotateX(O.rotateY(O.identity(),s*.1),s*.03);L.queue.writeBuffer(a,0,u);let d=t.beginRenderPass({colorAttachments:[ie(g,r,o)],depthStencilAttachment:ae(g,o)}),f=oe(o);f&&d.setViewport(f[0],f[1],f[2],f[3],0,1),ge(d,l,c),d.setPipeline(m),d.setBindGroup(0,h[c]),d.setIndexBuffer(n,`uint32`),d.drawIndexed(e),d.end()},getCount(){return`256×256 (${x.parametric.shape})`},destroy(){t.destroy(),n.destroy(),r.destroy(),i.destroy(),a.destroy(),se(g)}}}function xe(){for(let[e,t]of Object.entries(i)){let n=e,i=document.getElementById(`params-${n}`),a=document.createElement(`div`);a.className=`presets`;for(let e of Object.keys(r[n])){let t=document.createElement(`button`);t.className=`preset-btn`+(e===`Default`?` active`:``),t.textContent=e,t.dataset.preset=e,t.dataset.mode=n,t.addEventListener(`click`,()=>Ee(n,e)),a.appendChild(t)}i.appendChild(a);for(let e of t){let t=document.createElement(`div`);t.className=`param-section`;let r=document.createElement(`div`);if(r.className=`param-section-title`,r.textContent=e.section,t.appendChild(r),e.dynamic){t.id=e.id??``,i.appendChild(t);continue}for(let r of e.params)Se(t,n,r);i.appendChild(t)}}}function Se(e,t,n){let r=document.createElement(`div`);r.className=`control-row`;let i=document.createElement(`span`);if(i.className=`control-label`,i.textContent=n.label,r.appendChild(i),n.type===`dropdown`){let e=document.createElement(`select`);e.dataset.mode=t,e.dataset.key=n.key;for(let t of n.options??[]){let n=document.createElement(`option`);n.value=String(t),n.textContent=String(t),e.appendChild(n)}e.value=String(b(t)[n.key]),e.addEventListener(`change`,()=>{let r=Number.isNaN(Number(e.value))?e.value:Number(e.value);b(t)[n.key]=r,n.requiresReset&&wt(),n.key===`shape`&&(Ce(String(r)),we()),He()}),r.appendChild(e)}else{let e=document.createElement(`input`);e.type=`range`,e.min=String(n.min),e.max=String(n.max),e.step=String(n.step),e.value=String(b(t)[n.key]),e.dataset.mode=t,e.dataset.key=n.key;let i=document.createElement(`span`);i.className=`control-value`,i.textContent=Te(Number(b(t)[n.key]),n.step??1),e.addEventListener(`input`,()=>{let r=Number(e.value);b(t)[n.key]=r,i.textContent=Te(r,n.step??1),n.requiresReset&&(e.dataset.needsReset=`1`),He()}),e.addEventListener(`change`,()=>{e.dataset.needsReset===`1`&&(e.dataset.needsReset=`0`,wt())}),r.appendChild(e),r.appendChild(i)}return e.appendChild(r),r}function Ce(e){let t=D[e]??{},n=x.parametric;t.p1?(n.p1Min=t.p1.animMin,n.p1Max=t.p1.animMax,n.p1Rate=t.p1.animRate):(n.p1Min=0,n.p1Max=0,n.p1Rate=0),t.p2?(n.p2Min=t.p2.animMin,n.p2Max=t.p2.animMax,n.p2Rate=t.p2.animRate):(n.p2Min=0,n.p2Max=0,n.p2Rate=0)}function we(){let e=document.getElementById(`shape-params-section`);if(!e)return;for(;e.children.length>1;)e.removeChild(e.lastChild);let t=D[x.parametric.shape]??{};for(let[n,r]of Object.entries(t)){let t=document.createElement(`div`);t.className=`anim-param-label`,t.textContent=r.label,e.appendChild(t),Se(e,`parametric`,{key:`${n}Min`,label:`Min`,min:r.min,max:r.max,step:r.step}),Se(e,`parametric`,{key:`${n}Max`,label:`Max`,min:r.min,max:r.max,step:r.step}),Se(e,`parametric`,{key:`${n}Rate`,label:`Rate`,min:0,max:3,step:.05})}}function Te(e,t){if(t>=1)return String(Math.round(e));let n=Math.max(0,-Math.floor(Math.log10(t)));return e.toFixed(n)}function Ee(e,t){let n=r[e][t];Object.assign(b(e),n);let i=document.getElementById(`params-${e}`);i.querySelectorAll(`input[type="range"]`).forEach(t=>{let r=t.dataset.key;if(r in n){t.value=String(n[r]);let i=t.parentElement?.querySelector(`.control-value`);if(i){let t=De(e,r);i.textContent=Te(Number(n[r]),t?t.step??1:1)}}}),i.querySelectorAll(`select`).forEach(e=>{let t=e.dataset.key;t in n&&(e.value=String(n[t]))}),i.querySelectorAll(`.preset-btn`).forEach(e=>{e.classList.toggle(`active`,e.dataset.preset===t)}),e===`parametric`&&we(),wt(),He()}function De(e,t){for(let n of i[e])for(let e of n.params)if(e.key===t)return e;return null}function Oe(){document.querySelectorAll(`.mode-tab`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.mode;x.mode=t,document.querySelectorAll(`.mode-tab`).forEach(t=>t.classList.toggle(`active`,t===e)),document.querySelectorAll(`.param-group`).forEach(e=>e.classList.toggle(`active`,e.dataset.mode===t)),Ct(),He()})})}function ke(){document.getElementById(`btn-pause`).addEventListener(`click`,()=>{x.paused=!x.paused,document.getElementById(`btn-pause`).textContent=x.paused?`Resume`:`Pause`,document.getElementById(`btn-pause`).classList.toggle(`active`,x.paused)}),document.getElementById(`btn-reset`).addEventListener(`click`,()=>{wt()}),document.getElementById(`copy-btn`).addEventListener(`click`,()=>{let e=document.getElementById(`prompt-text`).textContent??``;navigator.clipboard.writeText(e).then(()=>{let e=document.getElementById(`copy-btn`);e.textContent=`Copied!`,setTimeout(()=>{e.textContent=`Copy`},1500)})}),document.getElementById(`btn-reset-all`).addEventListener(`click`,()=>{localStorage.removeItem(Ot),location.reload()}),_t()}function Ae(){let e=document.getElementById(`theme-presets`);for(let t of Object.keys(a)){let n=a[t],r=document.createElement(`button`);r.className=`preset-btn`+(t===x.colorTheme?` active`:``),r.textContent=t,r.dataset.theme=t,r.style.borderLeftWidth=`3px`,r.style.borderLeftColor=n.primary,r.addEventListener(`click`,()=>{x.colorTheme!==t&&(x.colorTheme=t,y(t),e.querySelectorAll(`.preset-btn`).forEach(e=>e.classList.toggle(`active`,e.dataset.theme===t)),He())}),e.appendChild(r)}}function je(){let e=x.camera,t=Math.cos(e.rotX),n=Math.sin(e.rotX),r=Math.cos(e.rotY),i=Math.sin(e.rotY),a=[e.distance*t*i,e.distance*n,e.distance*t*r],o=k(te([0,0,0],a)),s=k(A(o,[0,1,0]));return{eye:a,forward:o,right:s,up:A(s,o)}}function Me(e,t){let n=x.camera.fov*Math.PI/180,r=R.width/R.height,{eye:i,forward:a,right:o,up:s}=je(),c=Math.tan(n*.5),l=(e*2-1)*c*r,u=(t*2-1)*c;return{eye:i,dir:k([a[0]+o[0]*l+s[0]*u,a[1]+o[1]*l+s[1]*u,a[2]+o[2]*l+s[2]*u])}}function Ne(e,t){let{dir:n}=Me(e,t),r=x.camera.distance*.5;return[n[0]*r,n[1]*r,n[2]*r]}function Pe(e,t){let{eye:n,dir:r}=Me(e,t);if(Math.abs(r[1])<1e-4)return null;let i=-n[1]/r[1];if(i<0)return null;let a=n[0]+r[0]*i,o=n[2]+r[2]*i,s=S*.5;return Math.abs(a)>s||Math.abs(o)>s?null:[(a+s)/S,(o+s)/S]}function Fe(e){let t=S*.5;return Math.abs(e[0])>t||Math.abs(e[2])>t?null:[(e[0]+t)/S,(e[2]+t)/S]}function Ie(e,t,n){if(Math.abs(t[1])<1e-4)return null;let r=(n-e[1])/t[1];return r<0?null:[e[0]+t[0]*r,e[1]+t[1]*r,e[2]+t[2]*r]}function Le(e,t){let n=j(t,t)||1,r=Math.max(0,-j(e,t)/n);return[e[0]+t[0]*r,e[1]+t[1]*r,e[2]+t[2]*r]}function K(){x.mouse.down=!1,x.mouse.dx=0,x.mouse.dy=0}function Re(){let e=R,t=!1,n=!1;e.addEventListener(`pointerdown`,r=>{if(x.xrEnabled)return;t=!0,n=r.ctrlKey||r.metaKey;let i=e.getBoundingClientRect(),a=(r.clientX-i.left)/i.width,o=1-(r.clientY-i.top)/i.height;if(x.mouse.dx=0,x.mouse.dy=0,n)if(x.mode===`fluid`){let e=Pe(a,o);if(!e)K();else{x.mouse.down=!0;let t=Ne(a,o);x.mouse.worldX=t[0],x.mouse.worldY=t[1],x.mouse.worldZ=t[2],x.mouse.x=e[0],x.mouse.y=e[1]}}else{x.mouse.down=!0;let e=Ne(a,o);x.mouse.worldX=e[0],x.mouse.worldY=e[1],x.mouse.worldZ=e[2],x.mouse.x=a,x.mouse.y=o}else x.mouse.x=a,x.mouse.y=o;r.preventDefault()}),e.addEventListener(`pointermove`,r=>{if(x.xrEnabled||!t)return;let i=e.getBoundingClientRect(),a=(r.clientX-i.left)/i.width,o=1-(r.clientY-i.top)/i.height;if(n||r.ctrlKey||r.metaKey)if(x.mode===`fluid`){let e=Pe(a,o);if(!e)K();else{x.mouse.down=!0;let t=Ne(a,o);x.mouse.worldX=t[0],x.mouse.worldY=t[1],x.mouse.worldZ=t[2],x.mouse.dx=(e[0]-x.mouse.x)*10,x.mouse.dy=(e[1]-x.mouse.y)*10,x.mouse.x=e[0],x.mouse.y=e[1]}}else{x.mouse.down=!0;let e=Ne(a,o);x.mouse.worldX=e[0],x.mouse.worldY=e[1],x.mouse.worldZ=e[2],x.mouse.dx=(a-x.mouse.x)*10,x.mouse.dy=(o-x.mouse.y)*10,x.mouse.x=a,x.mouse.y=o}else x.camera.rotY+=r.movementX*.005,x.camera.rotX+=r.movementY*.005,x.camera.rotX=Math.max(-Math.PI*.45,Math.min(Math.PI*.45,x.camera.rotX)),x.mouse.down=!1}),e.addEventListener(`pointerup`,()=>{x.xrEnabled||(t=!1,n=!1,x.mouse.down=!1,x.mouse.dx=0,x.mouse.dy=0)}),e.addEventListener(`contextmenu`,e=>e.preventDefault()),e.addEventListener(`wheel`,e=>{x.xrEnabled||(x.camera.distance*=1+e.deltaY*.001,x.camera.distance=Math.max(.5,Math.min(50,x.camera.distance)),e.preventDefault())},{passive:!1})}var ze={boids:`boids/flocking`,physics:`N-body gravitational`,fluid:`fluid dynamics`,parametric:`parametric shape`};function Be(){let e=x.mode,t=b(e),r=n[e],i=[];for(let[n,a]of Object.entries(t))a!==r[n]&&i.push(Ve(e,n,a));let a=`WebGPU ${ze[e]} simulation`;x.colorTheme!==`Dracula`&&(a+=` (${x.colorTheme} theme)`),i.length>0&&(a+=` with ${i.filter(Boolean).join(`, `)}`),a+=`.`,document.getElementById(`prompt-text`).textContent=a}function Ve(e,t,n){let r=Number(n),i={count:()=>`${n} particles`,separationRadius:()=>r<15?`tight separation (${n})`:r>50?`wide separation (${n})`:`separation radius ${n}`,alignmentRadius:()=>`alignment range ${n}`,cohesionRadius:()=>r>80?`strong cohesion (${n})`:`cohesion range ${n}`,maxSpeed:()=>r>4?`high speed (${n})`:r<1?`slow movement (${n})`:`speed ${n}`,maxForce:()=>r>.1?`strong steering (${n})`:`steering force ${n}`,visualRange:()=>`visual range ${n}`,G:()=>r>5?`strong gravity (G=${n})`:r<.5?`weak gravity (G=${n})`:`G=${n}`,softening:()=>`softening ${n}`,damping:()=>r<.995?`high damping (${n})`:`damping ${n}`,coreOrbit:()=>r<.1?`minimal core friction (${n})`:r>.8?`strong core friction (${n})`:`core friction ${n}`,distribution:()=>`${n} distribution`,resolution:()=>`${n}x${n} grid`,viscosity:()=>r>.5?`thick fluid (viscosity ${n})`:r<.05?`thin fluid (viscosity ${n})`:`viscosity ${n}`,diffusionRate:()=>`diffusion ${n}`,forceStrength:()=>r>200?`strong forces (${n})`:`force strength ${n}`,volumeScale:()=>r>2?`large volume (${n})`:r<1?`compact volume (${n})`:`volume scale ${n}`,dyeMode:()=>`${n} dye`,jacobiIterations:()=>`${n} solver iterations`,shape:()=>`${n} shape`,scale:()=>r===1?null:`scale ${n}`,p1Min:()=>null,p1Max:()=>null,p1Rate:()=>null,p2Min:()=>null,p2Max:()=>null,p2Rate:()=>null,p3Min:()=>null,p3Max:()=>null,p3Rate:()=>null,p4Min:()=>null,p4Max:()=>null,p4Rate:()=>null,twistMin:()=>null,twistMax:()=>null,twistRate:()=>null}[t];return i?i():`${t}: ${n}`}function He(){Be(),Tt(),Xe(),kt()}function Ue(e){return{boids:{"Compute (Flocking)":`struct Particle {
  pos: vec3f,
  vel: vec3f,
}

struct SimParams {
  dt: f32,
  separationRadius: f32,
  alignmentRadius: f32,
  cohesionRadius: f32,
  maxSpeed: f32,
  maxForce: f32,
  visualRange: f32,
  count: u32,
  boundSize: f32,
  attractorX: f32,
  attractorY: f32,
  attractorZ: f32,
  attractorActive: f32,
}

@group(0) @binding(0) var<storage, read> particlesIn: array<Particle>;
@group(0) @binding(1) var<storage, read_write> particlesOut: array<Particle>;
@group(0) @binding(2) var<uniform> params: SimParams;

fn limit(v: vec3f, maxLen: f32) -> vec3f {
  let len2 = dot(v, v);
  if (len2 > maxLen * maxLen) {
    return normalize(v) * maxLen;
  }
  return v;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = particlesIn[idx];
  var separation = vec3f(0.0);
  var alignment = vec3f(0.0);
  var cohesion = vec3f(0.0);
  var sepCount = 0u;
  var aliCount = 0u;
  var cohCount = 0u;

  for (var i = 0u; i < params.count; i++) {
    if (i == idx) { continue; }
    let other = particlesIn[i];
    let diff = me.pos - other.pos;
    let dist = length(diff);

    if (dist < params.separationRadius && dist > 0.0) {
      separation += diff / dist;
      sepCount++;
    }
    if (dist < params.alignmentRadius) {
      alignment += other.vel;
      aliCount++;
    }
    if (dist < params.cohesionRadius) {
      cohesion += other.pos;
      cohCount++;
    }
  }

  var force = vec3f(0.0);

  if (sepCount > 0u) {
    separation = separation / f32(sepCount);
    if (length(separation) > 0.0) {
      separation = normalize(separation) * params.maxSpeed - me.vel;
      force += limit(separation, params.maxForce) * 1.5;
    }
  }
  if (aliCount > 0u) {
    alignment = alignment / f32(aliCount);
    if (length(alignment) > 0.0) {
      alignment = normalize(alignment) * params.maxSpeed - me.vel;
      force += limit(alignment, params.maxForce);
    }
  }
  if (cohCount > 0u) {
    cohesion = cohesion / f32(cohCount) - me.pos;
    if (length(cohesion) > 0.0) {
      cohesion = normalize(cohesion) * params.maxSpeed - me.vel;
      force += limit(cohesion, params.maxForce);
    }
  }

  // [LAW:dataflow-not-control-flow] Vortex well attractor — always computed, attractorActive scales to zero when inactive.
  // Three forces create orbital behavior: radial pull, core repulsion, tangential swirl.
  let attractorPos = vec3f(params.attractorX, params.attractorY, params.attractorZ);
  let toAttractor = attractorPos - me.pos;
  let aDist = length(toAttractor) + 0.0001; // epsilon avoids division by zero
  let aDir = toAttractor / aDist;

  // Tuning constants — relative to maxForce so behavior scales across presets
  let mf = params.maxForce;
  const ATTRACT_SCALE = 3.0;       // gravity well depth (multiples of maxForce at softening distance)
  const ATTRACT_SOFTENING = 0.3;   // prevents singularity in gravity calc
  const CORE_RADIUS = 0.25;        // repulsion shell radius
  const CORE_PRESSURE_SCALE = 8.0; // core push strength (multiples of maxForce)
  const SWIRL_SCALE = 2.4;         // tangential orbit strength (multiples of maxForce)
  const SWIRL_PEAK_RADIUS = 0.4;   // where swirl is strongest
  const SWIRL_FALLOFF = 0.8;       // gaussian width of swirl envelope
  const INFLUENCE_RADIUS = 2.5;    // beyond this, attractor fades to zero

  // 1. Radial pull: inverse-distance with softening
  let radialPull = mf * ATTRACT_SCALE / (aDist + ATTRACT_SOFTENING);

  // 2. Core repulsion: linear ramp inside core radius prevents singularity
  let coreRepulsion = max(0.0, CORE_RADIUS - aDist) / CORE_RADIUS * mf * CORE_PRESSURE_SCALE;

  // 3. Net radial force = pull inward minus push outward
  let radialForce = aDir * (radialPull - coreRepulsion);

  // 4. Tangential swirl: cross with world-up for orbit direction
  let worldUp = vec3f(0.0, 1.0, 0.0);
  let worldX = vec3f(1.0, 0.0, 0.0);
  let swirlAxis = select(worldUp, worldX, abs(dot(aDir, worldUp)) > 0.95);
  let tangent = normalize(cross(aDir, swirlAxis));
  // Gaussian peak near orbit shell, fading with distance
  let swirlEnvelope = exp(-((aDist - SWIRL_PEAK_RADIUS) * (aDist - SWIRL_PEAK_RADIUS)) / (SWIRL_FALLOFF * SWIRL_FALLOFF));
  let swirlForce = tangent * mf * SWIRL_SCALE * swirlEnvelope;

  // 5. Influence envelope: smooth fadeout so distant boids keep flocking naturally
  let influenceFade = 1.0 - smoothstep(INFLUENCE_RADIUS * 0.5, INFLUENCE_RADIUS, aDist);

  // 6. Combine — attractorActive is 0.0 (inactive) or 1.0 (active)
  force += (radialForce + swirlForce) * influenceFade * params.attractorActive;

  // Boundary force - soft repulsion from edges
  let bs = params.boundSize;
  let margin = bs * 0.1;
  var boundary = vec3f(0.0);
  if (me.pos.x < -bs + margin) { boundary.x = params.maxForce; }
  if (me.pos.x >  bs - margin) { boundary.x = -params.maxForce; }
  if (me.pos.y < -bs + margin) { boundary.y = params.maxForce; }
  if (me.pos.y >  bs - margin) { boundary.y = -params.maxForce; }
  if (me.pos.z < -bs + margin) { boundary.z = params.maxForce; }
  if (me.pos.z >  bs - margin) { boundary.z = -params.maxForce; }
  force += boundary * 2.0;

  var vel = me.vel + force;
  vel = limit(vel, params.maxSpeed);
  let pos = me.pos + vel * params.dt;

  particlesOut[idx] = Particle(pos, vel);
}
`,"Render (Vert+Frag)":`struct Camera {
  view: mat4x4f,
  proj: mat4x4f,
  eye: vec3f,
  _pad: f32,
  primary: vec3f,
  _pad2: f32,
  secondary: vec3f,
  _pad3: f32,
  accent: vec3f,
  _pad4: f32,
}

struct Particle {
  pos: vec3f,
  vel: vec3f,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> camera: Camera;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) color: vec3f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let p = particles[iid];
  let speed = length(p.vel);
  let dir = select(vec3f(0.0, 1.0, 0.0), normalize(p.vel), speed > 0.001);

  // Build a basis from velocity direction
  let up = select(vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0), abs(dir.z) < 0.99);
  let right = normalize(cross(dir, up));
  let realUp = cross(right, dir);

  // Triangle vertices pointing in velocity direction
  let size = 0.06;
  var localPos: vec3f;
  switch (vid) {
    case 0u: { localPos = dir * size * 2.0; }           // tip
    case 1u: { localPos = -dir * size + right * size; }  // left
    case 2u: { localPos = -dir * size - right * size; }  // right
    default: { localPos = vec3f(0.0); }
  }

  let worldPos = p.pos + localPos;
  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);

  // Color by speed: primary (slow) → accent (fast)
  let t = clamp(speed / 4.0, 0.0, 1.0);
  out.color = mix(camera.primary, camera.accent, t);
  return out;
}

@fragment
fn fs_main(@location(0) color: vec3f) -> @location(0) vec4f {
  return vec4f(color, 1.0);
}
`},physics:{"Compute (Gravity)":`struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

struct Params {
  dt: f32,
  G: f32,
  softening: f32,
  damping: f32,
  count: u32,
  sourceCount: u32,
  coreOrbit: f32,
  _pad3: f32,
  targetX: f32,
  targetY: f32,
  targetZ: f32,
  interactionActive: f32,
  // [LAW:one-source-of-truth] Disk-recovery state lives in the same Params block so the CPU sends one coherent snapshot per frame.
  diskNormal: vec3f,
  _pad4: f32,
  diskVertDamp: f32,
  diskRadDamp: f32,
  diskTangGain: f32,
  diskVertSpring: f32,
  diskAlignGain: f32,
  interactionStrength: f32,
  diskTangSpeed: f32,
  _pad7: f32,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;

// [LAW:one-source-of-truth] Long-run N-body stability thresholds are owned here so containment and anti-collapse stay coherent.
const N_BODY_OUTER_RADIUS = 3.6;
const N_BODY_BOUNDARY_PULL = 0.012;
const INTERACTION_WELL_STRENGTH = 42.0;
const INTERACTION_WELL_SOFTENING = 0.18;
const INTERACTION_CORE_RADIUS = 0.3;
const INTERACTION_CORE_PRESSURE = 54.0;
const HOME_WELL_STRENGTH = 0.0;
const HOME_WELL_SOFTENING = 1.8;
const HOME_CORE_RADIUS = 0.0;
const HOME_CORE_PRESSURE = 0.0;
// [LAW:dataflow-not-control-flow] Interaction and recovery share one force pipeline; only the strengths change.
const HOME_RESTORE_STIFFNESS_ACTIVE = 0.14;
const HOME_RESTORE_DAMPING_ACTIVE = 0.18;
const INTERACTION_DRAG_GAIN = 1.9;
// [LAW:dataflow-not-control-flow] Recovery always runs; the central-well fade changes the home-anchor strength instead of branching the solver.
const HOME_ANCHOR_WELL_RADIUS = 2.2;
const HOME_ANCHOR_FADE_RADIUS = 3.0;
const HOME_REENTRY_KICK = 0.48;
const HOME_REENTRY_DAMPING = 0.12;
// [LAW:one-source-of-truth] Anti-collapse pressure is centralized here so the simulation keeps one coherent stability model.
const PARTICLE_PRESSURE_RADIUS = 0.2;
const PARTICLE_PRESSURE_SOFTENING = 0.03;
const PARTICLE_PRESSURE_STRENGTH = 0.012;
const PARTICLE_PRESSURE_MASS_CAP = 3.0;
// [LAW:dataflow-not-control-flow] Core-speed damping is always evaluated; distance and speed decide whether it contributes.
const CORE_FRICTION_RADIUS = 0.95;
const CORE_FRICTION_INNER_RADIUS = 0.14;
const CORE_FRICTION_SPEED_START = 0.9;
const CORE_FRICTION_GAIN = 3.4;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodiesIn[idx];
  var acc = vec3f(0.0);

  for (var i = 0u; i < params.sourceCount; i++) {
    if (i == idx) { continue; }
    let other = bodiesIn[i];
    let diff = other.pos - me.pos;
    let rawDist2 = dot(diff, diff);
    let dist2 = dot(diff, diff) + params.softening * params.softening;
    let inv = 1.0 / sqrt(dist2);
    let inv3 = inv * inv * inv;
    acc += diff * (params.G * other.mass * inv3);
    let pressureDist = sqrt(rawDist2 + 0.0001);
    let pressureFade = 1.0 - smoothstep(0.0, PARTICLE_PRESSURE_RADIUS, pressureDist);
    let pressureMass = min(other.mass, PARTICLE_PRESSURE_MASS_CAP);
    let pressureScale = pressureFade * pressureFade * (PARTICLE_PRESSURE_STRENGTH * pressureMass / (rawDist2 + PARTICLE_PRESSURE_SOFTENING));
    acc -= (diff / pressureDist) * pressureScale;
  }

  let targetPos = vec3f(params.targetX, params.targetY, params.targetZ);
  let interactionOn = params.interactionActive > 0.5;
  let wellStrength = select(HOME_WELL_STRENGTH, INTERACTION_WELL_STRENGTH * params.interactionStrength, interactionOn);
  let wellSoftening = select(HOME_WELL_SOFTENING, INTERACTION_WELL_SOFTENING, interactionOn);
  let coreRadius = select(HOME_CORE_RADIUS, INTERACTION_CORE_RADIUS, interactionOn);
  let corePressure = select(HOME_CORE_PRESSURE, INTERACTION_CORE_PRESSURE * params.interactionStrength, interactionOn);
  let homeRestoreStiffness = select(0.0, HOME_RESTORE_STIFFNESS_ACTIVE, interactionOn);
  let homeRestoreDamping = select(0.0, HOME_RESTORE_DAMPING_ACTIVE, interactionOn);
  let interactionDrag = select(0.0, INTERACTION_DRAG_GAIN, interactionOn);
  let homeReentryKick = select(HOME_REENTRY_KICK, 0.0, interactionOn);
  let homeReentryDamping = select(HOME_REENTRY_DAMPING, 0.0, interactionOn);
  let coreDist = length(me.pos);
  let coreFrictionFade = 1.0 - smoothstep(CORE_FRICTION_INNER_RADIUS, CORE_FRICTION_RADIUS, coreDist);

  let toTarget = targetPos - me.pos;
  let targetDist2 = dot(toTarget, toTarget);
  let targetDist = sqrt(targetDist2 + 0.0001);
  let targetDir = toTarget / targetDist;
  let toHome = me.home - me.pos;
  let homeAnchorFade = select(
    smoothstep(HOME_ANCHOR_WELL_RADIUS, HOME_ANCHOR_FADE_RADIUS, targetDist),
    1.0,
    interactionOn
  );
  let recoveryForceScale = select(homeAnchorFade, 1.0, interactionOn);
  acc += targetDir * (wellStrength / (targetDist2 + wellSoftening)) * recoveryForceScale;
  if (targetDist < coreRadius) {
    acc -= targetDir * ((coreRadius - targetDist) * corePressure * recoveryForceScale);
  }
  acc += toHome * (homeRestoreStiffness * homeAnchorFade);
  acc -= me.vel * (homeRestoreDamping * homeAnchorFade);
  acc += targetDir * (homeReentryKick * homeAnchorFade);
  acc -= me.vel * (homeReentryDamping * homeAnchorFade);
  acc += targetDir * interactionDrag;
  let speed = length(me.vel);
  let coreSpeedExcess = max(0.0, speed - CORE_FRICTION_SPEED_START);
  let coreFrictionStrength = params.coreOrbit * coreFrictionFade * coreSpeedExcess * CORE_FRICTION_GAIN;
  acc -= me.vel * coreFrictionStrength;

  // [LAW:dataflow-not-control-flow] Disk recovery always runs; gains of zero make individual terms inert without branching the solver.
  // All five corrections are applied as accelerations only — never as direct velocity edits — so the integrator preserves frame-rate independence.
  // [LAW:dataflow-not-control-flow] When R is degenerate, basis vectors become zero (not NaN); zero-weighted terms then contribute zero acceleration.
  let n = params.diskNormal;
  let r = me.pos;
  let z = dot(r, n);
  let vz = dot(me.vel, n);
  let rPlane = r - z * n;
  let R2 = dot(rPlane, rPlane);
  let valid = R2 > 1e-8;
  let safeR = sqrt(max(R2, 1e-8));
  let eR = select(vec3f(0.0), rPlane / safeR, valid);
  let crossNE = cross(n, eR);
  let crossLen2 = dot(crossNE, crossNE);
  let ePhi = select(vec3f(0.0), crossNE / sqrt(max(crossLen2, 1e-8)), crossLen2 > 1e-8);
  let R = select(0.0, safeR, valid);
  let vR = dot(me.vel, eR);
  let vPhi = dot(me.vel, ePhi);
  // Term 1: vertical velocity damping (primary flattener).
  acc -= n * (vz * params.diskVertDamp);
  // Term 2: radial velocity damping (orbit circularization).
  acc -= eR * (vR * params.diskRadDamp);
  // Term 3: vertical position spring (z² potential — opt-in via slider).
  acc -= n * (z * params.diskVertSpring);
  // Term 4: tangential target-speed nudge toward a Keplerian-ish circular speed.
  // diskTangSpeed sets the orbital speed at R=1; falloff matches the seeded disk init (1/sqrt(R+0.1)).
  let vc = params.diskTangSpeed / sqrt(safeR + 0.1);
  acc += ePhi * ((vc - vPhi) * params.diskTangGain);
  // Term 5: bias non-tangential velocity components toward the disk's coherent flow.
  let vNonTan = me.vel - n * vz - eR * vR;
  acc -= vNonTan * params.diskAlignGain;

  // A soft outer boundary keeps the toy system readable without letting the system escape to infinity.
  let centerDist = length(me.pos);
  if (centerDist > N_BODY_OUTER_RADIUS) {
    let toCenter = -normalize(me.pos);
    acc += toCenter * ((centerDist - N_BODY_OUTER_RADIUS) * N_BODY_BOUNDARY_PULL);
  }

  let effectiveDamping = 1.0 - (1.0 - params.damping) * params.dt;
  var vel = (me.vel + acc * params.dt) * effectiveDamping;
  let pos = me.pos + vel * params.dt;

  bodiesOut[idx] = Body(pos, me.mass, vel, 0.0, me.home, 0.0);
}
`,"Render (Vert+Frag)":`struct Camera {
  view: mat4x4f,
  proj: mat4x4f,
  eye: vec3f,
  _pad: f32,
  primary: vec3f,
  _pad2: f32,
  secondary: vec3f,
  _pad3: f32,
  accent: vec3f,
  _pad4: f32,
}

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<uniform> camera: Camera;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let body = bodies[iid];

  let quadPos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  let viewPos = camera.view * vec4f(body.pos, 1.0);
  // [LAW:single-enforcer] Mass-to-appearance compression is owned here so physics mass stays authoritative while visuals remain legible.
  let massVisual = clamp(sqrt(max(body.mass, 0.02)) / 3.4, 0.14, 1.0);
  let baseSize = mix(0.015, 0.042, massVisual);
  let size = baseSize;
  let offset = quadPos[vid] * size;
  let billboarded = viewPos + vec4f(offset, 0.0, 0.0);

  var out: VSOut;
  out.pos = camera.proj * billboarded;
  out.uv = quadPos[vid];

  // Color: primary → secondary by mass.
  let massTint = clamp(pow(massVisual, 0.8), 0.0, 1.0);
  out.color = mix(camera.primary, camera.secondary, massTint);
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f, @location(1) color: vec3f) -> @location(0) vec4f {
  let dist = length(uv);
  let alpha = smoothstep(1.0, 0.55, dist);
  if (alpha < 0.01) { discard; }
  let g = exp(-dist * 3.6);
  return vec4f(color * (0.26 + g * 0.52), alpha * 0.78);
}
`},fluid:{"Forces + Advect":`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  time: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> velOut: array<vec2f>;
@group(0) @binding(2) var<storage, read> dyeIn: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> dyeOut: array<vec4f>;
@group(0) @binding(4) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  let cx = clamp(x, 0, res - 1);
  let cy = clamp(y, 0, res - 1);
  return u32(cy * res + cx);
}

fn sampleVel(px: f32, py: f32) -> vec2f {
  let res = params.resolution;
  let x0 = i32(floor(px)); let y0 = i32(floor(py));
  let fx = px - f32(x0); let fy = py - f32(y0);
  return mix(
    mix(velIn[idx(x0, y0)], velIn[idx(x0+1, y0)], fx),
    mix(velIn[idx(x0, y0+1)], velIn[idx(x0+1, y0+1)], fx),
    fy
  );
}

fn sampleDye(px: f32, py: f32) -> vec4f {
  let res = params.resolution;
  let x0 = i32(floor(px)); let y0 = i32(floor(py));
  let fx = px - f32(x0); let fy = py - f32(y0);
  return mix(
    mix(dyeIn[idx(x0, y0)], dyeIn[idx(x0+1, y0)], fx),
    mix(dyeIn[idx(x0, y0+1)], dyeIn[idx(x0+1, y0+1)], fx),
    fy
  );
}

fn gaussian(delta: vec2f, radius: f32) -> f32 {
  return exp(-dot(delta, delta) / (2.0 * radius * radius));
}

fn orbitCenter(time: f32, phase: f32, radius: f32, wobble: f32) -> vec2f {
  return vec2f(
    0.5 + cos(time * 0.17 + phase) * radius + cos(time * 0.31 + phase * 1.7) * wobble,
    0.5 + sin(time * 0.14 + phase * 1.3) * radius + sin(time * 0.27 + phase * 0.8) * wobble
  );
}

fn driftImpulse(delta: vec2f, falloff: f32, spin: f32, strength: f32, timePhase: f32) -> vec2f {
  let dist = max(length(delta), 1e-4);
  let tangent = vec2f(-delta.y, delta.x) / dist * spin * (0.18 + 0.08 * sin(timePhase));
  let inward = -delta * 0.95;
  let grain = vec2f(sin(delta.y * 18.0 + timePhase), cos(delta.x * 16.0 - timePhase)) * 0.035;
  return (tangent + inward + grain) * falloff * strength;
}

fn ambientDyeColor(phase: f32, pulse: f32) -> vec3f {
  if (params.dyeMode < 0.5) {
    return hsvToRgb(fract(params.time * 0.08 + phase), 0.85, 1.0);
  }
  if (params.dyeMode < 1.5) {
    return vec3f(0.1, 0.5, 1.0) * (0.75 + pulse * 0.25);
  }
  return mix(vec3f(0.18, 0.3, 1.0), vec3f(1.0, 0.28, 0.1), 0.5 + pulse * 0.5);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let i = idx(x, y);
  let uv = vec2f((f32(x) + 0.5) / params.resolution, (f32(y) + 0.5) / params.resolution);
  var velocityImpulse = vec2f(0.0);
  var dyeInjection = vec4f(0.0);

  // [LAW:dataflow-not-control-flow] Both ambient drive and pointer input are evaluated every invocation; the mask values decide whether they contribute.
  let mouseMask = select(0.0, 1.0, params.mouseActive > 0.5);
  let mouseDelta = uv - vec2f(params.mouseX, params.mouseY);
  let mouseRadius = 0.02;
  let mouseSplat = gaussian(mouseDelta, mouseRadius) * params.forceStrength * mouseMask;
  velocityImpulse += vec2f(params.mouseDX, params.mouseDY) * mouseSplat;

  let mouseDyeSplat = gaussian(mouseDelta, mouseRadius * 2.0) * mouseMask;
  var mouseDyeColor: vec3f;
  if (params.dyeMode < 0.5) {
    let angle = atan2(params.mouseDY, params.mouseDX);
    let h = angle / 6.283 + 0.5;
    mouseDyeColor = hsvToRgb(h, 0.9, 1.0);
  } else if (params.dyeMode < 1.5) {
    mouseDyeColor = vec3f(0.1, 0.5, 1.0);
  } else {
    let speed = length(vec2f(params.mouseDX, params.mouseDY));
    mouseDyeColor = mix(vec3f(0.2, 0.3, 1.0), vec3f(1.0, 0.2, 0.1), clamp(speed * 5.0, 0.0, 1.0));
  }
  dyeInjection += vec4f(mouseDyeColor * mouseDyeSplat, mouseDyeSplat);

  let driveBase = params.forceStrength * 0.0032;
  let ambientDyeRamp = smoothstep(1.5, 7.0, params.time);

  let pulse0 = 0.75 + 0.25 * sin(params.time * 0.42);
  let center0 = orbitCenter(params.time, 0.0, 0.19, 0.035);
  let delta0 = uv - center0;
  let falloff0 = gaussian(delta0, 0.32);
  velocityImpulse += driftImpulse(delta0, falloff0, 1.0, driveBase * pulse0, params.time * 0.7);
  dyeInjection += vec4f(ambientDyeColor(0.03, pulse0) * falloff0 * 0.0006, falloff0 * 0.0003) * ambientDyeRamp;

  let pulse1 = 0.75 + 0.25 * sin(params.time * 0.37 + 2.1);
  let center1 = orbitCenter(params.time, 2.1, 0.16, 0.04);
  let delta1 = uv - center1;
  let falloff1 = gaussian(delta1, 0.30);
  velocityImpulse += driftImpulse(delta1, falloff1, -1.0, driveBase * pulse1 * 0.9, params.time * 0.63 + 1.7);
  dyeInjection += vec4f(ambientDyeColor(0.37, pulse1) * falloff1 * 0.0005, falloff1 * 0.00025) * ambientDyeRamp;

  let pulse2 = 0.75 + 0.25 * sin(params.time * 0.33 + 4.2);
  let center2 = orbitCenter(params.time, 4.2, 0.21, 0.03);
  let delta2 = uv - center2;
  let falloff2 = gaussian(delta2, 0.34);
  velocityImpulse += driftImpulse(delta2, falloff2, 1.0, driveBase * pulse2 * 0.8, params.time * 0.57 + 3.4);
  dyeInjection += vec4f(ambientDyeColor(0.69, pulse2) * falloff2 * 0.0004, falloff2 * 0.0002) * ambientDyeRamp;

  let drivenVel = velIn[i] + velocityImpulse;
  let px = f32(x) - drivenVel.x * params.dt;
  let py = f32(y) - drivenVel.y * params.dt;
  let advectedVel = sampleVel(px, py);
  let advectedDye = sampleDye(px, py) * 0.992;

  velOut[i] = (advectedVel + velocityImpulse) * 0.94;
  dyeOut[i] = min(advectedDye + dyeInjection, vec4f(2.2, 2.2, 2.2, 1.6));
}

fn hsvToRgb(h: f32, s: f32, v: f32) -> vec3f {
  let hh = fract(h) * 6.0;
  let i = u32(floor(hh));
  let f = hh - f32(i);
  let p = v * (1.0 - s);
  let q = v * (1.0 - s * f);
  let t = v * (1.0 - s * (1.0 - f));
  switch (i) {
    case 0u: { return vec3f(v, t, p); }
    case 1u: { return vec3f(q, v, p); }
    case 2u: { return vec3f(p, v, t); }
    case 3u: { return vec3f(p, q, v); }
    case 4u: { return vec3f(t, p, v); }
    default: { return vec3f(v, p, q); }
  }
}
`,Diffuse:`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> velOut: array<vec2f>;
@group(0) @binding(2) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let alpha = 1.0 / (params.viscosity * params.dt);
  let beta = 4.0 + alpha;

  let center = velIn[idx(x, y)];
  let left = velIn[idx(x-1, y)];
  let right = velIn[idx(x+1, y)];
  let down = velIn[idx(x, y-1)];
  let up = velIn[idx(x, y+1)];

  velOut[idx(x, y)] = (left + right + down + up + center * alpha) / beta;
}
`,Divergence:`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> divergenceOut: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let vr = velIn[idx(x+1, y)].x;
  let vl = velIn[idx(x-1, y)].x;
  let vu = velIn[idx(x, y+1)].y;
  let vd = velIn[idx(x, y-1)].y;
  divergenceOut[idx(x, y)] = (vr - vl + vu - vd) * 0.5;
}
`,"Pressure Solve":`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> pressIn: array<f32>;
@group(0) @binding(1) var<storage, read_write> pressOut: array<f32>;
@group(0) @binding(2) var<storage, read> divergence: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let left = pressIn[idx(x-1, y)];
  let right = pressIn[idx(x+1, y)];
  let down = pressIn[idx(x, y-1)];
  let up = pressIn[idx(x, y+1)];
  let div = divergence[idx(x, y)];

  pressOut[idx(x, y)] = (left + right + down + up - div) * 0.25;
}
`,"Gradient Sub":`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> velOut: array<vec2f>;
@group(0) @binding(2) var<storage, read> pressure: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let pl = pressure[idx(x-1, y)];
  let pr = pressure[idx(x+1, y)];
  let pd = pressure[idx(x, y-1)];
  let pu = pressure[idx(x, y+1)];
  let vel = velIn[idx(x, y)];
  velOut[idx(x, y)] = vel - vec2f(pr - pl, pu - pd) * 0.5;
}
`,Render:`struct Camera {
  view: mat4x4f,
  proj: mat4x4f,
  eye: vec3f,
  _pad: f32,
  primary: vec3f,
  _pad2: f32,
  secondary: vec3f,
  _pad3: f32,
  accent: vec3f,
  _pad4: f32,
}

struct FluidRenderParams {
  simRes: f32,
  gridRes: f32,
  heightScale: f32,
  worldSize: f32,
}

@group(0) @binding(0) var<storage, read> dye: array<vec4f>;
@group(0) @binding(1) var<uniform> params: FluidRenderParams;
@group(0) @binding(2) var<uniform> camera: Camera;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
  @location(2) worldPos: vec3f,
  @location(3) density: f32,
}

fn sampleDye(u: f32, v: f32) -> vec4f {
  let res = i32(params.simRes);
  let x = clamp(i32(u * f32(res)), 0, res - 1);
  let y = clamp(i32(v * f32(res)), 0, res - 1);
  return dye[y * res + x];
}

fn sampleDensity(u: f32, v: f32) -> f32 {
  // [LAW:one-source-of-truth] Density comes solely from dye.a (the mode-invariant
  // splat amount written by fluid.forces.wgsl). Mixing length(d.rgb) here makes
  // surface height depend on dye color, so single/rainbow/temperature presets
  // would render at different thicknesses for the same injected density.
  let d = sampleDye(u, v);
  let raw = clamp(d.a * 0.14, 0.0, 2.5);
  return 1.0 - exp(-raw * 1.35);
}

fn spectralThemeColor(uv: vec2f, worldPos: vec3f, dyeColor: vec3f, density: f32, camera: Camera) -> vec3f {
  let ribbon = 0.5 + 0.5 * sin(worldPos.x * 3.4 + worldPos.z * 2.8 + density * 4.0);
  let cross = 0.5 + 0.5 * sin((uv.x - uv.y) * 12.0 + worldPos.y * 6.0);
  let dyeEnergy = clamp(dot(dyeColor, vec3f(0.3333)), 0.0, 1.0);
  let warm = mix(camera.secondary, camera.accent, cross);
  let cool = mix(camera.primary, camera.secondary, ribbon);
  let spectral = mix(cool, warm, 0.45 + 0.35 * ribbon);
  let dyeTint = mix(dyeColor, vec3f(dyeColor.b, dyeColor.r, dyeColor.g), cross * 0.55);
  return mix(spectral, dyeTint, 0.35 + dyeEnergy * 0.4);
}

fn cubeCorner(vid: u32) -> vec3f {
  let corners = array<vec3f, 36>(
    vec3f(-1.0, -1.0,  1.0), vec3f( 1.0, -1.0,  1.0), vec3f(-1.0,  1.0,  1.0),
    vec3f(-1.0,  1.0,  1.0), vec3f( 1.0, -1.0,  1.0), vec3f( 1.0,  1.0,  1.0),
    vec3f( 1.0, -1.0, -1.0), vec3f(-1.0, -1.0, -1.0), vec3f( 1.0,  1.0, -1.0),
    vec3f( 1.0,  1.0, -1.0), vec3f(-1.0, -1.0, -1.0), vec3f(-1.0,  1.0, -1.0),
    vec3f(-1.0, -1.0, -1.0), vec3f(-1.0, -1.0,  1.0), vec3f(-1.0,  1.0, -1.0),
    vec3f(-1.0,  1.0, -1.0), vec3f(-1.0, -1.0,  1.0), vec3f(-1.0,  1.0,  1.0),
    vec3f( 1.0, -1.0,  1.0), vec3f( 1.0, -1.0, -1.0), vec3f( 1.0,  1.0,  1.0),
    vec3f( 1.0,  1.0,  1.0), vec3f( 1.0, -1.0, -1.0), vec3f( 1.0,  1.0, -1.0),
    vec3f(-1.0,  1.0,  1.0), vec3f( 1.0,  1.0,  1.0), vec3f(-1.0,  1.0, -1.0),
    vec3f(-1.0,  1.0, -1.0), vec3f( 1.0,  1.0,  1.0), vec3f( 1.0,  1.0, -1.0),
    vec3f(-1.0, -1.0, -1.0), vec3f( 1.0, -1.0, -1.0), vec3f(-1.0, -1.0,  1.0),
    vec3f(-1.0, -1.0,  1.0), vec3f( 1.0, -1.0, -1.0), vec3f( 1.0, -1.0,  1.0)
  );
  return corners[vid];
}

fn cubeNormal(vid: u32) -> vec3f {
  let normals = array<vec3f, 36>(
    vec3f( 0.0,  0.0,  1.0), vec3f( 0.0,  0.0,  1.0), vec3f( 0.0,  0.0,  1.0),
    vec3f( 0.0,  0.0,  1.0), vec3f( 0.0,  0.0,  1.0), vec3f( 0.0,  0.0,  1.0),
    vec3f( 0.0,  0.0, -1.0), vec3f( 0.0,  0.0, -1.0), vec3f( 0.0,  0.0, -1.0),
    vec3f( 0.0,  0.0, -1.0), vec3f( 0.0,  0.0, -1.0), vec3f( 0.0,  0.0, -1.0),
    vec3f(-1.0,  0.0,  0.0), vec3f(-1.0,  0.0,  0.0), vec3f(-1.0,  0.0,  0.0),
    vec3f(-1.0,  0.0,  0.0), vec3f(-1.0,  0.0,  0.0), vec3f(-1.0,  0.0,  0.0),
    vec3f( 1.0,  0.0,  0.0), vec3f( 1.0,  0.0,  0.0), vec3f( 1.0,  0.0,  0.0),
    vec3f( 1.0,  0.0,  0.0), vec3f( 1.0,  0.0,  0.0), vec3f( 1.0,  0.0,  0.0),
    vec3f( 0.0,  1.0,  0.0), vec3f( 0.0,  1.0,  0.0), vec3f( 0.0,  1.0,  0.0),
    vec3f( 0.0,  1.0,  0.0), vec3f( 0.0,  1.0,  0.0), vec3f( 0.0,  1.0,  0.0),
    vec3f( 0.0, -1.0,  0.0), vec3f( 0.0, -1.0,  0.0), vec3f( 0.0, -1.0,  0.0),
    vec3f( 0.0, -1.0,  0.0), vec3f( 0.0, -1.0,  0.0), vec3f( 0.0, -1.0,  0.0)
  );
  return normals[vid];
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let gr = u32(params.gridRes);
  let cx = iid % gr;
  let cy = iid / gr;

  let u = (f32(cx) + 0.5) / f32(gr);
  let v = (f32(cy) + 0.5) / f32(gr);
  let density = sampleDensity(u, v);

  let cellSize = params.worldSize / f32(gr);
  let halfWidth = cellSize * mix(0.92, 1.34, density);
  // [LAW:one-source-of-truth] Render height is derived from the same density scalar for both the permanent floor and dynamic variation.
  let liftedDensity = pow(density, 0.58);
  let totalHeight = 0.14 + liftedDensity * params.heightScale * 2.6;
  let halfHeight = totalHeight * 0.5;
  let centerY = halfHeight;

  let local = cubeCorner(vid);
  let worldPos = vec3f(
    (u - 0.5) * params.worldSize + local.x * halfWidth,
    centerY + local.y * halfHeight,
    (v - 0.5) * params.worldSize + local.z * halfWidth
  );

  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);
  out.uv = vec2f(u, v);
  out.normal = cubeNormal(vid);
  out.worldPos = worldPos;
  out.density = density;
  return out;
}

@fragment
fn fs_main(
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
  @location(2) worldPos: vec3f,
  @location(3) density: f32
) -> @location(0) vec4f {
  let d = sampleDye(uv.x, uv.y);
  let n = normalize(normal);
  let lightDir = normalize(vec3f(1.0, 2.5, 1.3));
  let diffuse = max(dot(n, lightDir), 0.0);
  let viewDir = normalize(camera.eye - worldPos);
  let rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5);
  let spec = pow(max(dot(n, normalize(lightDir + viewDir)), 0.0), 24.0);

  // [LAW:one-source-of-truth] The richer palette is derived from the existing dye field plus theme colors; no parallel color state is introduced.
  let dyeColor = min(d.rgb, vec3f(1.0));
  let baseColor = spectralThemeColor(uv, worldPos, dyeColor, density, camera);
  let lit = baseColor * (0.16 + diffuse * 0.78) + camera.accent * rim * 0.16 + vec3f(1.0) * spec * 0.2;
  return vec4f(lit, 1.0);
}
`},parametric:{"Compute (All Shapes)":`struct Params {
  uRes: u32,
  vRes: u32,
  scale: f32,
  twist: f32,
  time: f32,
  shapeId: u32,
  p1: f32,
  p2: f32,
  p3: f32,  // wave amplitude
  p4: f32,  // wave frequency multiplier
  pokeX: f32,
  pokeY: f32,
  pokeZ: f32,
  pokeActive: f32,
}

struct Vertex {
  pos: vec3f,
  glow: f32,    // wave displacement magnitude — sits in the vec3f padding slot
  normal: vec3f,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(1) var<uniform> params: Params;

// Shape 0: Torus — p1=majorRadius, p2=minorRadius
fn torusShape(u: f32, v: f32) -> vec3f {
  let R = params.p1; let r = params.p2;
  return vec3f(
    (R + r * cos(v)) * cos(u),
    (R + r * cos(v)) * sin(u),
    r * sin(v)
  );
}

// Shape 1: Klein bottle — p1=scale
fn kleinShape(u: f32, v: f32) -> vec3f {
  let cosU = cos(u); let sinU = sin(u);
  let cosV = cos(v); let sinV = sin(v);
  let a = params.p1;
  var x: f32; var z: f32;
  if (u < 3.14159) {
    x = 3.0*cosU*(1.0+sinU) + (2.0*a)*(1.0-cosU*0.5)*cosU*cosV;
    z = -8.0*sinU - (2.0*a)*(1.0-cosU*0.5)*sinU*cosV;
  } else {
    x = 3.0*cosU*(1.0+sinU) + (2.0*a)*(1.0-cosU*0.5)*cos(v+3.14159);
    z = -8.0*sinU;
  }
  let y = -(2.0*a)*(1.0-cosU*0.5)*sinV;
  return vec3f(x, y, z) * 0.1;
}

// Shape 2: Möbius strip — p1=width, p2=halfTwists
fn mobiusShape(u: f32, v: f32) -> vec3f {
  let w = params.p1;
  let tw = params.p2;
  let vv = (v / 6.283185 - 0.5) * w;
  let halfU = u * tw * 0.5;
  return vec3f(
    (1.0 + vv * cos(halfU)) * cos(u),
    (1.0 + vv * cos(halfU)) * sin(u),
    vv * sin(halfU)
  );
}

// Shape 3: Sphere — p1=xStretch, p2=zStretch
fn sphereShape(u: f32, v: f32) -> vec3f {
  return vec3f(
    sin(v) * cos(u) * params.p1,
    sin(v) * sin(u) * params.p1,
    cos(v) * params.p2
  );
}

// Shape 4: Trefoil knot — p1=tubeRadius, p2=knotScale
fn trefoilShape(u: f32, v: f32) -> vec3f {
  let t = u;
  let ks = params.p2;
  let cx = sin(t) + 2.0 * sin(2.0 * t);
  let cy = cos(t) - 2.0 * cos(2.0 * t);
  let cz = -sin(3.0 * t);
  let dx = cos(t) + 4.0 * cos(2.0 * t);
  let dy = -sin(t) + 4.0 * sin(2.0 * t);
  let dz = -3.0 * cos(3.0 * t);
  let tangent = normalize(vec3f(dx, dy, dz));
  var up = vec3f(0.0, 0.0, 1.0);
  if (abs(dot(tangent, up)) > 0.99) { up = vec3f(0.0, 1.0, 0.0); }
  let normal = normalize(cross(tangent, up));
  let binormal = cross(tangent, normal);
  let r = params.p1;
  return vec3f(cx, cy, cz) * ks + (normal * cos(v) + binormal * sin(v)) * r * ks;
}

fn evalShape(u: f32, v: f32) -> vec3f {
  switch (params.shapeId) {
    case 0u: { return torusShape(u, v); }
    case 1u: { return kleinShape(u, v); }
    case 2u: { return mobiusShape(u, v); }
    case 3u: { return sphereShape(u, v); }
    case 4u: { return trefoilShape(u, v); }
    default: { return torusShape(u, v); }
  }
}

// Three interfering traveling waves — amplitude=p3, frequency=p4
fn waveDelta(u: f32, v: f32) -> f32 {
  let t = params.time;
  let a = params.p3;
  let f = max(params.p4, 0.3);
  let w1 = sin(u * 3.0 * f + v * 2.0 * f + t * 1.8) * 0.12;
  let w2 = cos(u * 5.0 * f - v * 4.0 * f + t * 2.3) * 0.07;
  let w3 = sin(u * 2.0 * f + v * 7.0 * f - t * 1.5) * 0.05;
  return (w1 + w2 + w3) * a;
}

// Scaled + wave-displaced position for a UV coordinate.
// Normal of the base shape is computed via finite differences and used as
// the displacement direction so waves are always surface-normal aligned.
fn evalFull(u: f32, v: f32) -> vec3f {
  let eps = 0.001;
  let p  = evalShape(u, v);
  let pu = evalShape(u + eps, v);
  let pv = evalShape(u, v + eps);
  let bn = normalize(cross(pu - p, pv - p));
  return (p + bn * waveDelta(u, v)) * params.scale;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let ui = gid.x;
  let vi = gid.y;
  if (ui >= params.uRes || vi >= params.vRes) { return; }

  let u = f32(ui) / f32(params.uRes) * 6.283185;
  let v = f32(vi) / f32(params.vRes) * 6.283185;
  let idx = vi * params.uRes + ui;

  let twistAngle = params.twist * f32(vi) / f32(params.vRes);
  let tu = u + twistAngle;

  // Displaced position
  var pos = evalFull(tu, v);

  // Normal of the displaced surface via finite differences of evalFull
  let feps = 0.005;
  let dpu = evalFull(tu + feps, v) - pos;
  let dpv = evalFull(tu, v + feps) - pos;
  let nc = cross(dpu, dpv);
  let nlen = length(nc);
  var normal = select(vec3f(0.0, 1.0, 0.0), nc / nlen, nlen > 0.0001);

  // Glow: wave displacement magnitude, scaled so default amp gives visible emission
  let disp = waveDelta(tu, v);
  let glow = abs(disp) * 5.0;

  // Poke deformation: push vertices outward near the interaction point
  if (params.pokeActive > 0.5) {
    let pokePos = vec3f(params.pokeX, params.pokeY, params.pokeZ);
    let diff = pos - pokePos;
    let dist = length(diff);
    let radius = 0.8;
    let strength = exp(-dist * dist / (2.0 * radius * radius)) * 0.5;
    pos += normal * strength;
  }

  vertices[idx] = Vertex(pos, glow, normal, 0.0);
}
`,"Render (Phong)":`struct Camera {
  view: mat4x4f,
  proj: mat4x4f,
  eye: vec3f,
  _pad: f32,
  primary: vec3f,
  _pad2: f32,
  secondary: vec3f,
  _pad3: f32,
  accent: vec3f,
  _pad4: f32,
}

struct Vertex {
  pos: vec3f,
  glow: f32,    // wave displacement magnitude
  normal: vec3f,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> vertices: array<Vertex>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> modelMatrix: mat4x4f;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) normal: vec3f,
  @location(1) worldPos: vec3f,
  @location(2) glow: f32,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let v = vertices[vid];
  let world = modelMatrix * vec4f(v.pos, 1.0);

  var out: VSOut;
  out.pos = camera.proj * camera.view * world;
  out.normal = normalize((modelMatrix * vec4f(v.normal, 0.0)).xyz);
  out.worldPos = world.xyz;
  out.glow = v.glow;
  return out;
}

// Compact hue-to-rgb: maps [0,1] hue to full-saturation RGB
fn hue2rgb(h: f32) -> vec3f {
  let r = abs(h * 6.0 - 3.0) - 1.0;
  let g = 2.0 - abs(h * 6.0 - 2.0);
  let b = 2.0 - abs(h * 6.0 - 4.0);
  return clamp(vec3f(r, g, b), vec3f(0.0), vec3f(1.0));
}

fn hsv2rgb(h: f32, s: f32, v: f32) -> vec3f {
  return ((hue2rgb(fract(h)) - 1.0) * s + 1.0) * v;
}

@fragment
fn fs_main(
  @location(0) normal: vec3f,
  @location(1) worldPos: vec3f,
  @location(2) glow: f32
) -> @location(0) vec4f {
  let n = normalize(normal);
  let viewDir = normalize(camera.eye - worldPos);
  let lightDir  = normalize(vec3f(1.0, 2.0, 1.5));
  let lightDir2 = normalize(vec3f(-0.8, -0.5, 0.3));  // cool fill light

  let nDotV    = dot(n, viewDir);
  let absNDotV = abs(nDotV);

  // Fresnel: peaks at grazing (edge) angles — drives iridescence intensity
  let fresnel = pow(1.0 - absNDotV, 2.5);

  // Iridescent hue: NdotV angle + world position create a shifting rainbow that
  // animates naturally as the shape rotates and waves deform the surface
  let hue = fract(absNDotV * 1.2 + worldPos.x * 0.12 + worldPos.y * 0.08 + worldPos.z * 0.10);
  let iridColor = hsv2rgb(hue, 0.88, 1.0);

  // Phong: key light + cool fill light for depth
  let diffuse  = max(dot( n, lightDir),  0.0);
  let diffuse2 = max(dot( n, lightDir2), 0.0);
  let backDiff = max(dot(-n, lightDir),  0.0);
  let halfDir  = normalize(lightDir + viewDir);
  let spec     = pow(max(dot(n, halfDir), 0.0), 96.0);

  // Mix theme color with iridescence — blend is strongest at grazing angles
  let baseColor = mix(camera.primary, iridColor, fresnel * 0.55 + 0.15);
  let fillColor = camera.secondary * diffuse2 * 0.3;
  let backColor = mix(camera.secondary * 0.5, iridColor * 0.3, fresnel * 0.4);

  let ambient    = vec3f(0.04, 0.03, 0.07);
  let frontColor = ambient + baseColor * (diffuse * 0.85 + 0.1) + fillColor + spec * 0.9;
  let rearColor  = ambient + backColor * (backDiff * 0.4 + 0.05);

  let shadedColor = select(rearColor, frontColor, nDotV > 0.0);

  // Fresnel rim glow in accent color
  let rimGlow = fresnel * camera.accent * 1.0;

  // Wave displacement emission: peaks glow in accent color
  let emission = min(glow, 1.0) * camera.accent * 0.7;

  return vec4f(shadedColor + rimGlow + emission, 1.0);
}
`}}[e]||{}}var We=!1,q=null,J={},Ge={};function Ke(){let e=document.getElementById(`shader-toggle`),t=document.getElementById(`shader-panel`);e.addEventListener(`click`,()=>{We=!We,t.classList.toggle(`open`,We),e.classList.toggle(`active`,We),We&&qe()}),document.getElementById(`shader-compile`).addEventListener(`click`,Ze),document.getElementById(`shader-reset`).addEventListener(`click`,Qe),document.getElementById(`shader-editor`).addEventListener(`keydown`,e=>{if(e.key===`Tab`){e.preventDefault();let t=e.target,n=t.selectionStart;t.value=t.value.substring(0,n)+`  `+t.value.substring(t.selectionEnd),t.selectionStart=t.selectionEnd=n+2}})}function qe(){let e=Ue(x.mode);Ge={...e},(!J._mode||J._mode!==x.mode)&&(J={...e,_mode:x.mode});let t=document.getElementById(`shader-tabs`);t.innerHTML=``;let n=Object.keys(e);q=q&&n.includes(q)?q:n[0];for(let e of n){let n=document.createElement(`button`);n.className=`shader-tab`+(e===q?` active`:``),n.textContent=e,n.addEventListener(`click`,()=>{Je(),q=e,t.querySelectorAll(`.shader-tab`).forEach(t=>t.classList.toggle(`active`,t.textContent===e)),Ye()}),t.appendChild(n)}Ye()}function Je(){q&&(J[q]=document.getElementById(`shader-editor`).value)}function Ye(){let e=document.getElementById(`shader-editor`);e.value=J[q]||``,document.getElementById(`shader-status`).textContent=``,document.getElementById(`shader-status`).className=`shader-success`}function Xe(){We&&J._mode!==x.mode&&qe()}function Ze(){Je();let e=J[q],t=document.getElementById(`shader-status`);try{L.createShaderModule({code:e}).getCompilationInfo().then(n=>{let r=n.messages.filter(e=>e.type===`error`);r.length>0?(t.className=`shader-error`,t.textContent=r.map(e=>`Line ${e.lineNum}: ${e.message}`).join(`; `),t.title=r.map(e=>`Line ${e.lineNum}: ${e.message}`).join(`
`)):(t.className=`shader-success`,t.textContent=`Compiled OK — reset simulation to apply`,t.title=``,$e(x.mode,q,e))})}catch(e){t.className=`shader-error`,t.textContent=e.message,t.title=e.message}}function Qe(){q&&Ge[q]&&(J[q]=Ge[q],Ye(),$e(x.mode,q,Ge[q]),document.getElementById(`shader-status`).className=`shader-success`,document.getElementById(`shader-status`).textContent=`Shader reset to original`)}function $e(e,t,n){let r={boids:{"Compute (Flocking)":()=>{et=n},"Render (Vert+Frag)":()=>{tt=n}},physics:{"Compute (Gravity)":()=>{nt=n},"Render (Vert+Frag)":()=>{rt=n}},fluid:{"Forces + Advect":()=>{it=n},Diffuse:()=>{at=n},Divergence:()=>{ot=n},"Pressure Solve":()=>{st=n},"Gradient Sub":()=>{ct=n},Render:()=>{lt=n}},parametric:{"Compute (Mesh Gen)":()=>{ut=n},"Render (Phong)":()=>{dt=n}}}[e]?.[t];r&&r()}var et=null,tt=null,nt=null,rt=null,it=null,at=null,ot=null,st=null,ct=null,lt=null,ut=null,dt=null,Y=null,X=null,ft=null,Z=null,Q=null,pt=null,$=!1;function mt(e){pt=e,$=!1,K()}function ht(e){let t=e.matrix;return k([-t[8],-t[9],-t[10]])}function gt(e){let t=pt;if(!t||!X){K();return}let n=e.getPose(t.targetRaySpace,X);if(!n){K(),$=!1;return}let r=[n.transform.position.x,n.transform.position.y,n.transform.position.z],i=ht(n.transform),a=x.mode===`fluid`?Ie(r,i,0):Le(r,i);if(!a){K(),$=!1;return}if(x.mouse.down=!0,x.mouse.worldX=a[0],x.mouse.worldY=a[1],x.mouse.worldZ=a[2],x.mode===`fluid`){let e=Fe(a);if(!e){K(),$=!1;return}x.mouse.dx=$?(e[0]-x.mouse.x)*10:0,x.mouse.dy=$?(e[1]-x.mouse.y)*10:0,x.mouse.x=e[0],x.mouse.y=e[1]}else x.mouse.dx=0,x.mouse.dy=0,x.mouse.x=a[0],x.mouse.y=a[1];$=!0}function _t(){let e=document.getElementById(`btn-xr`);if(!navigator.xr){e.textContent=`VR Not Available`;return}navigator.xr.isSessionSupported(`immersive-vr`).then(t=>{t?(e.disabled=!1,e.addEventListener(`click`,vt)):e.textContent=`VR Not Supported`}).catch(()=>{e.textContent=`VR Check Failed`})}async function vt(){if(Y){Y.end();return}let e=document.getElementById(`btn-xr`);e.textContent=`Starting...`;try{Y=await navigator.xr.requestSession(`immersive-vr`,{requiredFeatures:[`webgpu`],optionalFeatures:[`layers`,`local-floor`]});let t=!1;try{X=await Y.requestReferenceSpace(`local-floor`),t=!0}catch{X=await Y.requestReferenceSpace(`local`)}let n=t?1.6:0,r=globalThis.XRRigidTransform;X=X.getOffsetReferenceSpace(new r({x:0,y:n,z:-5})),ft=new XRGPUBinding(Y,L);let i=ft.getPreferredColorFormat();de(i,re);let a=ft.nativeProjectionScaleFactor,o=[{colorFormat:i,scaleFactor:a,textureType:`texture-array`},{colorFormat:i,textureType:`texture-array`},{colorFormat:i,scaleFactor:a},{colorFormat:i}];for(let e of o)try{Z=ft.createProjectionLayer(e);break}catch(e){console.warn(`[XR] Projection layer config failed, trying next:`,e.message),Z=null}if(!Z)throw Error(`All projection layer configurations failed`);Y.updateRenderState({layers:[Z]}),Y.addEventListener(`selectstart`,e=>{mt(e.inputSource)}),Y.addEventListener(`selectend`,e=>{let t=e.inputSource;mt(pt===t?null:pt)}),e.textContent=`Exit VR`,x.xrEnabled=!0,Y.requestAnimationFrame(yt),Y.addEventListener(`end`,()=>{Y=null,X=null,ft=null,Z=null,x.xrEnabled=!1,de(le,P),mt(null),e.textContent=`Enter VR`,requestAnimationFrame(Dt)})}catch(t){if(console.error(`[XR] Failed to start session:`,t),e.textContent=`XR Error: ${t.message}`,Y)try{Y.end()}catch{}Y=null,setTimeout(()=>{e.textContent=`Enter VR`},4e3)}}function yt(e,t){if(Y){Y.requestAnimationFrame(yt),_(e);try{let e=t.getViewerPose(X);if(!e)return;let n=G[x.mode];if(!n)return;gt(t);let r=L.createCommandEncoder();x.paused||n.compute(r);for(let t=0;t<e.views.length;t++){let i=e.views[t],a=ft,o=a.getViewSubImage?a.getViewSubImage(Z,i):a.getSubImage(Z,i);if(!o)continue;let s=o.getViewDescriptor?o.getViewDescriptor():{},c=o.colorTexture.createView(s);if(o.depthStencilTexture)N=o.depthStencilTexture.createView(s);else{let e=o.colorTexture;(!Q||Q.width!==e.width||Q.height!==e.height)&&(Q&&Q.destroy(),Q=L.createTexture({size:[e.width,e.height],format:`depth24plus`,usage:GPUTextureUsage.RENDER_ATTACHMENT})),N=Q.createView()}let l=i.transform.position;M={viewMatrix:new Float32Array(i.transform.inverse.matrix),projMatrix:new Float32Array(i.projectionMatrix),eye:[l.x,l.y,l.z]};let{x:u,y:d,width:f,height:p}=o.viewport;n.render(r,c,[u,d,f,p],t)}M=null,N=null,L.queue.submit([r.finish()])}catch(e){console.error(`[XR] Frame error:`,e)}}}var bt=0,xt=0,St=0;function Ct(){let e=x.mode;G[e]||(G[e]={boids:_e,physics:ve,fluid:ye,parametric:be}[e]())}function wt(){let e=x.mode;G[e]&&(G[e].destroy(),delete G[e]),Ct()}function Tt(){document.getElementById(`stat-fps`).textContent=`FPS: ${St}`;let e=G[x.mode],t=e?e.getCount():`--`;document.getElementById(`stat-count`).textContent=x.mode===`fluid`?`Grid: ${t}`:`Particles: ${t}`}function Et(){let e=document.getElementById(`canvas-container`),t=window.devicePixelRatio||1,n=Math.floor(e.clientWidth*t),r=Math.floor(e.clientHeight*t);(R.width!==n||R.height!==r)&&(R.width=n,R.height=r)}function Dt(e){if(x.xrEnabled)return;requestAnimationFrame(Dt),_(e),Et(),bt++,e-xt>=1e3&&(St=bt,bt=0,xt=e,Tt());let t=G[x.mode];if(!t)return;let n=L.createCommandEncoder();x.paused||t.compute(n);let r=z.getCurrentTexture().createView();t.render(n,r,null),L.queue.submit([n.finish()])}var Ot=`shader-playground-state`;function kt(){try{let e={mode:x.mode,colorTheme:x.colorTheme,boids:x.boids,physics:x.physics,fluid:x.fluid,parametric:x.parametric,camera:x.camera};localStorage.setItem(Ot,JSON.stringify(e))}catch{}}function At(){try{let e=localStorage.getItem(Ot);if(!e)return;let t=JSON.parse(e);t.mode&&t.mode in n&&(x.mode=t.mode),t.colorTheme&&a[t.colorTheme]&&(x.colorTheme=t.colorTheme),t.boids&&Object.assign(x.boids,t.boids),t.physics&&Object.assign(x.physics,t.physics),t.fluid&&Object.assign(x.fluid,t.fluid),t.parametric&&Object.assign(x.parametric,t.parametric),t.camera&&Object.assign(x.camera,t.camera),v(x.colorTheme)}catch{}}function jt(){document.querySelectorAll(`.mode-tab`).forEach(e=>e.classList.toggle(`active`,e.dataset.mode===x.mode)),document.querySelectorAll(`.param-group`).forEach(e=>e.classList.toggle(`active`,e.dataset.mode===x.mode));for(let e of Object.keys(i)){let t=e,n=document.getElementById(`params-${t}`),r=b(t);n.querySelectorAll(`input[type="range"]`).forEach(e=>{let n=e.dataset.key;if(n&&n in r){e.value=String(r[n]);let i=e.parentElement?.querySelector(`.control-value`);if(i){let e=De(t,n);i.textContent=Te(Number(r[n]),e?e.step??.01:.01)}}}),n.querySelectorAll(`select`).forEach(e=>{let t=e.dataset.key;t&&t in r&&(e.value=String(r[t]))})}document.querySelectorAll(`#theme-presets .preset-btn`).forEach(e=>e.classList.toggle(`active`,e.dataset.theme===x.colorTheme)),we()}async function Mt(){await H()&&(he(),At(),v(x.colorTheme),xe(),Ae(),Oe(),ke(),Re(),Ke(),jt(),Et(),Ct(),He(),new ResizeObserver(()=>Et()).observe(document.getElementById(`canvas-container`)),requestAnimationFrame(Dt))}Mt();