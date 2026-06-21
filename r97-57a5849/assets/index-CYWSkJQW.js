(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=new class{map=new Map;register(e){if(this.map.has(e.id))throw Error(`BindingRegistry: id "${e.id}" already registered`);this.map.set(e.id,e)}get(e){return this.map.get(e)}list(){return Array.from(this.map.values())}filterByGroup(e){return this.list().filter(t=>t.group===e)}},t=[0,0,0,1];function n(e){return[-e[0],-e[1],-e[2],e[3]]}function r(e,n){switch(e.kind){case`world`:return e.pose;case`wrist`:case`held`:{let t=n.hands[e.hand].joints?.wrist??null;return t?s(i(t),e.offset):null}case`palm`:{let t=n.hands[e.hand],r=t.joints?.wrist??null,i=t.palmNormal;return!r||!i?null:s({position:a(r.position),orientation:u([0,0,1],a(i))},e.offset)}case`head-hud`:return n.headPose?s(s(n.headPose,{position:[0,0,-e.distance],orientation:t}),e.offset):null}}function i(e){return{position:a(e.position),orientation:o(e.orientation)}}function a(e){return[e[0],e[1],e[2]]}function o(e){return[e[0],e[1],e[2],e[3]]}function s(e,t){let n=l(e.orientation,t.position);return{position:[e.position[0]+n[0],e.position[1]+n[1],e.position[2]+n[2]],orientation:c(e.orientation,t.orientation)}}function c(e,t){return[e[3]*t[0]+e[0]*t[3]+e[1]*t[2]-e[2]*t[1],e[3]*t[1]-e[0]*t[2]+e[1]*t[3]+e[2]*t[0],e[3]*t[2]+e[0]*t[1]-e[1]*t[0]+e[2]*t[3],e[3]*t[3]-e[0]*t[0]-e[1]*t[1]-e[2]*t[2]]}function l(e,t){let n=e[0],r=e[1],i=e[2],a=e[3],o=r*t[2]-i*t[1],s=i*t[0]-n*t[2],c=n*t[1]-r*t[0],l=o+a*t[0],u=s+a*t[1],d=c+a*t[2];return[t[0]+2*(r*d-i*u),t[1]+2*(i*l-n*d),t[2]+2*(n*u-r*l)]}function u(e,t){let n=e[0],r=e[1],i=e[2],a=t[0],o=t[1],s=t[2],c=n*a+r*o+i*s;if(c>.999999)return[0,0,0,1];if(c<-.999999){let e=Math.abs(n)<.9?[1,0,0]:[0,1,0],t=r*e[2]-i*e[1],a=i*e[0]-n*e[2],o=n*e[1]-r*e[0],s=Math.hypot(t,a,o)||1;return[t/s,a/s,o/s,0]}let l=n+a,u=r+o,d=i+s,f=Math.hypot(l,u,d),p=l/f,m=u/f,h=d/f;return[r*h-i*m,i*p-n*h,n*m-r*p,n*p+r*m+i*h]}var d=Object.freeze({minHitHalfExtent:Object.freeze({x:.06,y:.06}),defaultHitPadding:Object.freeze({x:.02,y:.02}),minNeighborHitGap:.02}),f=new Set([`slider`,`dial`,`toggle`,`stepper`,`enum-chips`,`button`,`preset-tile`,`category-tile`,`readout`]);function p(e){return f.has(e.kind)}function m(e,t){let n=r(e.anchor,t);if(!n)return null;let i=new Map,a=[];return g(e.children,n,{x:0,y:0},e.id,i,a),i.set(e.id,{pose:n,visualRect:{halfExtent:b(e.size)},hitRect:{halfExtent:b(e.size)},widget:null,containerKind:`panel`,childrenIds:a}),i}function h(e,t,n,r,i,a){if(p(e)){let o=v(e);i.set(e.id,{pose:x(t,n),visualRect:{halfExtent:o.visualHalf},hitRect:{halfExtent:o.hitHalf},widget:e,parentId:r,childrenIds:[]}),a.push(e.id);return}switch(e.kind){case`group`:_(e,t,n,r,i,a);return;case`tabs`:{let o=e.tabs.find(t=>t.id===e.activeTabId);o&&h(o.body,t,n,r,i,a);return}case`focus-view`:{if(e.focused==null)return;let o=e.children.find(t=>t.id===e.focused);o&&h(o,t,n,r,i,a);return}case`panel`:return}}function g(e,t,n,r,i,a){let o=e.map(v),s=d.minNeighborHitGap,c=y(o,`y`,s)/2;for(let l=0;l<e.length;l++){let u=o[l],d=c-u.hitHalf.y;h(e[l],t,{x:n.x,y:n.y+d},r,i,a),c-=u.hitHalf.y*2+s}}function _(e,t,n,r,i,a){let o=Math.max(e.gap??0,d.minNeighborHitGap),s=e.children.map(v);if(e.layout===`row`){let c=-y(s,`x`,o)/2;for(let l=0;l<e.children.length;l++){let u=s[l],d=c+u.hitHalf.x;h(e.children[l],t,{x:n.x+d,y:n.y},r,i,a),c+=u.hitHalf.x*2+o}return}if(e.layout===`column`){let c=y(s,`y`,o)/2;for(let l=0;l<e.children.length;l++){let u=s[l],d=c-u.hitHalf.y;h(e.children[l],t,{x:n.x,y:n.y+d},r,i,a),c-=u.hitHalf.y*2+o}return}let c=Math.max(1,e.columns??1),l=Math.max(0,...s.map(e=>e.hitHalf.x)),u=Math.max(0,...s.map(e=>e.hitHalf.y)),f=Math.ceil(e.children.length/c),p=c*l*2+Math.max(0,c-1)*o,m=f*u*2+Math.max(0,f-1)*o;for(let s=0;s<e.children.length;s++){let d=Math.floor(s/c),f=s%c,g=-p/2+f*(l*2+o)+l,_=m/2-d*(u*2+o)-u;h(e.children[s],t,{x:n.x+g,y:n.y+_},r,i,a)}}function v(e){if(p(e)){let t=b(e.visualSize);return{hitHalf:{x:Math.max(t.x+e.hitPadding.x,d.minHitHalfExtent.x),y:Math.max(t.y+e.hitPadding.y,d.minHitHalfExtent.y)},visualHalf:t}}switch(e.kind){case`panel`:return{hitHalf:b(e.size),visualHalf:b(e.size)};case`group`:{let t=Math.max(e.gap??0,d.minNeighborHitGap),n=e.children.map(v);if(e.layout===`row`){let e=y(n,`x`,t),r=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.y*2));return{hitHalf:{x:e/2,y:r/2},visualHalf:{x:e/2,y:r/2}}}if(e.layout===`column`){let e=y(n,`y`,t),r=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.x*2));return{hitHalf:{x:r/2,y:e/2},visualHalf:{x:r/2,y:e/2}}}let r=Math.max(1,e.columns??1),i=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.x)),a=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.y)),o=Math.ceil(e.children.length/r),s=r*i*2+Math.max(0,r-1)*t,c=o*a*2+Math.max(0,o-1)*t;return{hitHalf:{x:s/2,y:c/2},visualHalf:{x:s/2,y:c/2}}}case`tabs`:{let t=e.tabs.find(t=>t.id===e.activeTabId);return t?v(t.body):{hitHalf:{x:0,y:0},visualHalf:{x:0,y:0}}}case`focus-view`:{if(e.focused==null)return{hitHalf:{x:0,y:0},visualHalf:{x:0,y:0}};let t=e.children.find(t=>t.id===e.focused);return t?v(t):{hitHalf:{x:0,y:0},visualHalf:{x:0,y:0}}}}}function y(e,t,n){let r=0;for(let i=0;i<e.length;i++)r+=(t===`x`?e[i].hitHalf.x:e[i].hitHalf.y)*2,i>0&&(r+=n);return r}function b(e){return{x:e.x/2,y:e.y/2}}function x(e,t){return s(e,{position:[t.x,t.y,0],orientation:[0,0,0,1]})}function S(e,t){let n=null,r=1/0;for(let[i,a]of e){if(!a.widget)continue;let e=C(t,a.pose,a.hitRect.halfExtent);e!==null&&e<r&&(r=e,n=i)}return n}function C(e,t,r){let i=n(t.orientation),a=l(i,[e.origin[0]-t.position[0],e.origin[1]-t.position[1],e.origin[2]-t.position[2]]),o=l(i,[e.dir[0],e.dir[1],e.dir[2]]);if(Math.abs(o[2])<1e-9)return null;let s=-a[2]/o[2];if(s<=0)return null;let c=a[0]+s*o[0],u=a[1]+s*o[1];return Math.abs(c)>r.x||Math.abs(u)>r.y?null:s}function w(){return{states:{left:{kind:`idle`},right:{kind:`idle`}},pinches:{left:!1,right:!1}}}var T=[`left`,`right`];function E(e,t,n,r,i,a){let o=[],s=[],c={states:{left:n.states.left,right:n.states.right},pinches:{left:t.left.pinch.active,right:t.right.pinch.active}},l=e.activeLayoutId==null?void 0:e.layouts.get(e.activeLayoutId);if(!l)return c.states.left={kind:`idle`},c.states.right={kind:`idle`},{next:c,sideEffects:o,renderList:s};let u=m(l,r);if(!u)return c.states.left={kind:`idle`},c.states.right={kind:`idle`},{next:c,sideEffects:o,renderList:s};for(let r of T){let a=t[r],s=n.pinches[r],l=a.pinch.active,d=n.states[r],f=d;if(l&&!s){let t=a.gazeRay?S(u,a.gazeRay):null,n=t?u.get(t)??null:null,r=n?.widget??null;f=r&&t&&n?ee(r,t,n.pose,e.bindings,a):{kind:`idle`}}else if(!l&&s){if(d.kind===`pressing`&&!d.cancelPending){let e=d.commit;if(e.kind===`invoke`)o.push({kind:`binding-invoke`,bindingId:d.bindingId});else if(e.kind===`toggle`)o.push({kind:`binding-set`,bindingId:d.bindingId,value:!e.valueAtOrigin});else{let t=Math.max(e.min,Math.min(e.max,e.valueAtOrigin+e.step));o.push({kind:`binding-set`,bindingId:d.bindingId,value:t})}}f={kind:`idle`}}else if(l&&s){if(d.kind===`dragging`){let t=e.bindings.get(d.bindingId);if(t&&t.kind===`continuous`){let e=te(d,a,t,i.gainMultiplier);o.push({kind:`binding-set`,bindingId:d.bindingId,value:e})}f=d}else if(d.kind===`pressing`){let e=!!a.currentRay&&S(u,a.currentRay)===d.widgetId;f={...d,cancelPending:!e}}}else{let e=a.ray?S(u,a.ray):null;f=e?{kind:`hovering`,widgetId:e}:{kind:`idle`}}c.states[r]=f}for(let[t,n]of u){if(!n.widget)continue;let r=n.widget,i=k(c.states,e=>e.kind===`hovering`&&e.widgetId===t),a=k(c.states,e=>e.kind===`pressing`&&e.widgetId===t),o=k(c.states,e=>e.kind===`dragging`&&e.widgetId===t);s.push({widgetId:t,pose:n.pose,visualHalfExtent:n.visualRect.halfExtent,kind:r.kind,state:{hover:i,pressed:a,dragging:o,value:M(r,e.bindings)},label:A(r,e.bindings)})}return{next:c,sideEffects:o,renderList:s}}function D(e){return e.kind===`pressing`||e.kind===`dragging`}function O(e,t){for(let n of e){if(n.kind===`tab-switch`)continue;let e=t.bindings.get(n.bindingId);if(e){if(n.kind===`binding-invoke`&&e.kind===`action`){e.invoke();continue}n.kind===`binding-set`&&(e.kind===`continuous`&&typeof n.value==`number`||e.kind===`toggle`&&typeof n.value==`boolean`||e.kind===`enum`&&typeof n.value==`string`)&&e.set(n.value)}}}function k(e,t){return t(e.left)||t(e.right)}function A(e,t){if(e.kind===`category-tile`)return;let n=t.get(e.binding);if(n){if(e.kind===`slider`||e.kind===`dial`||e.kind===`readout`||e.kind===`stepper`){if(n.kind!==`continuous`)return n.label;let e=n.get();return n.format?n.format(e):j(e)}if(e.kind===`toggle`)return n.kind===`toggle`?n.get()?`On`:`Off`:n.label;if(e.kind===`enum-chips`)return n.kind===`enum`?n.get():n.label;if(e.kind===`button`||e.kind===`preset-tile`)return n.label}}function j(e){if(Number.isInteger(e))return String(e);let t=Math.abs(e);return t>=100?e.toFixed(0):t>=10?e.toFixed(1):t>=1?e.toFixed(2):e.toFixed(3)}function M(e,t){if(e.kind!==`slider`&&e.kind!==`dial`&&e.kind!==`readout`)return;let n=t.get(e.binding);if(!n||n.kind!==`continuous`)return;let r=n.range.max-n.range.min;return r<=0?0:(n.get()-n.range.min)/r}function ee(e,t,n,r,i){if(e.kind===`button`||e.kind===`preset-tile`){let n=r.get(e.binding);return!n||n.kind!==`action`?{kind:`idle`}:{kind:`pressing`,widgetId:t,bindingId:n.id,startedAt:i.pinch.startTime,cancelPending:!1,commit:{kind:`invoke`}}}if(e.kind===`toggle`){let n=r.get(e.binding);return!n||n.kind!==`toggle`?{kind:`idle`}:{kind:`pressing`,widgetId:t,bindingId:n.id,startedAt:i.pinch.startTime,cancelPending:!1,commit:{kind:`toggle`,valueAtOrigin:n.get()}}}if(e.kind===`stepper`){let n=r.get(e.binding);return!n||n.kind!==`continuous`?{kind:`idle`}:{kind:`pressing`,widgetId:t,bindingId:n.id,startedAt:i.pinch.startTime,cancelPending:!1,commit:{kind:`increment`,valueAtOrigin:n.get(),step:e.step,min:n.range.min,max:n.range.max}}}if(e.kind===`slider`||e.kind===`dial`){let a=r.get(e.binding);return!a||a.kind!==`continuous`?{kind:`idle`}:{kind:`dragging`,widgetId:t,bindingId:a.id,handOriginPos:[...i.pinch.origin],widgetOrientationAtOrigin:[n.orientation[0],n.orientation[1],n.orientation[2],n.orientation[3]],valueAtOrigin:a.get(),interaction:e.interaction,cancelPending:!1}}return{kind:`idle`}}function te(e,t,r,i){let a=[t.pinch.current[0]-e.handOriginPos[0],t.pinch.current[1]-e.handOriginPos[1],t.pinch.current[2]-e.handOriginPos[2]],o=l(n(e.widgetOrientationAtOrigin),a),s=o[0],c=o[1],u=o[2],d=r.range.max-r.range.min,f=e=>{switch(e.kind){case`direct-drag`:return(e.axis===`x`?s:c)*d;case`pinch-pull`:{let t=e.axis;return(t===`forward`?-u:t===`up`?c:s)*e.unitsPerMeter}case`pinch-twist`:return 0;case`expand-to-focus`:return f(e.underlying)}},p=f(e.interaction),m=e.valueAtOrigin+p*i;return Math.max(r.range.min,Math.min(r.range.max,m))}var N=`// Gas pressure potential construction.
//
// Isothermal pressure acceleration is -c_s^2 ∇ln(ρ), so pressure is represented
// as a scalar potential χ = c_s² ln(max(ρ, ρ_floor)). The particle pass then
// samples -∇χ exactly like PM gravity samples -∇φ.
// [LAW:dataflow-not-control-flow] Empty cells are regularized by data
// (rhoFloor), not by skipping pressure work.

struct Params {
  gridRes: u32,
  cellCount: u32,
  fixedPointScale: f32,
  soundSpeed: f32,
  rhoFloor: f32,
  rhoRef: f32,
  domainHalf: f32,
  cellSize: f32,
}

@group(0) @binding(0) var<storage, read_write> densityU32: array<atomic<u32>>;
@group(0) @binding(1) var<storage, read_write> densityF32: array<f32>;
@group(0) @binding(2) var<storage, read_write> chi: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.cellCount) { return; }

  let rho = f32(atomicLoad(&densityU32[idx])) / params.fixedPointScale;
  let rhoSafe = max(rho, params.rhoFloor);
  densityF32[idx] = rho;
  chi[idx] = params.soundSpeed * params.soundSpeed * log(rhoSafe / params.rhoRef);
}
`,ne=`// Gas pressure force interpolation.
//
// Samples -∇χ from the gas pressure potential with the same CIC transpose
// pattern used by PM force interpolation.
// [LAW:one-source-of-truth] χ is the sole pressure representation; particles
// never compute neighbor/kernel pressure locally.

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  _unused: vec3f,
  _pad2: f32,
}

struct Params {
  dt: f32,
  count: u32,
  gridRes: u32,
  domainHalf: f32,
  cellSize: f32,
  fixedPointScale: f32,
  cellCount: u32,
  _pad: u32,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<storage, read> chi: array<f32>;
@group(0) @binding(2) var<storage, read_write> pressureOut: array<vec4f>;
@group(0) @binding(3) var<uniform> params: Params;

fn wrapIdx(i: i32, n: i32) -> u32 {
  return u32(((i % n) + n) % n);
}

fn cellIdx(ix: i32, iy: i32, iz: i32, n: i32) -> u32 {
  let x = wrapIdx(ix, n);
  let y = wrapIdx(iy, n);
  let z = wrapIdx(iz, n);
  let nu = u32(n);
  return u32(z) * nu * nu + u32(y) * nu + u32(x);
}

fn forceAtCell(ix: i32, iy: i32, iz: i32, n: i32, h: f32) -> vec3f {
  let fx = -(chi[cellIdx(ix + 1, iy,     iz,     n)] - chi[cellIdx(ix - 1, iy,     iz,     n)]) / (2.0 * h);
  let fy = -(chi[cellIdx(ix,     iy + 1, iz,     n)] - chi[cellIdx(ix,     iy - 1, iz,     n)]) / (2.0 * h);
  let fz = -(chi[cellIdx(ix,     iy,     iz + 1, n)] - chi[cellIdx(ix,     iy,     iz - 1, n)]) / (2.0 * h);
  return vec3f(fx, fy, fz);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodies[idx];
  let posHalf = me.pos + me.vel * (params.dt * 0.5);

  let fgrid = (posHalf + vec3f(params.domainHalf)) / params.cellSize - vec3f(0.5);
  let i0 = vec3i(floor(fgrid));
  let f = fgrid - vec3f(i0);
  let g = vec3f(1.0) - f;
  let n = i32(params.gridRes);
  let h = params.cellSize;

  var acc = vec3f(0.0);
  acc += forceAtCell(i0.x,     i0.y,     i0.z,     n, h) * g.x * g.y * g.z;
  acc += forceAtCell(i0.x + 1, i0.y,     i0.z,     n, h) * f.x * g.y * g.z;
  acc += forceAtCell(i0.x,     i0.y + 1, i0.z,     n, h) * g.x * f.y * g.z;
  acc += forceAtCell(i0.x + 1, i0.y + 1, i0.z,     n, h) * f.x * f.y * g.z;
  acc += forceAtCell(i0.x,     i0.y,     i0.z + 1, n, h) * g.x * g.y * f.z;
  acc += forceAtCell(i0.x + 1, i0.y,     i0.z + 1, n, h) * f.x * g.y * f.z;
  acc += forceAtCell(i0.x,     i0.y + 1, i0.z + 1, n, h) * g.x * f.y * f.z;
  acc += forceAtCell(i0.x + 1, i0.y + 1, i0.z + 1, n, h) * f.x * f.y * f.z;

  pressureOut[idx] = vec4f(acc, 0.0);
}
`,re=`// Gas DKD leapfrog integrator.
//
// Force = PM gravity + grid-pressure. Both inputs are position-only fields
// sampled at the DKD midpoint, so dt negation reverses the step.
// [LAW:one-source-of-truth] Gas uses the same 48-byte Body layout as stars so
// PM deposit/interpolate can consume either population without adapters.

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  _unused: vec3f,
  _pad2: f32,
}

struct Params {
  dt: f32,
  count: u32,
  domainHalf: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<storage, read> gravityForce: array<vec4f>;
@group(0) @binding(3) var<storage, read> pressureForce: array<vec4f>;
@group(0) @binding(4) var<uniform> params: Params;

fn wrapPeriodic(p: vec3f) -> vec3f {
  let size = params.domainHalf * 2.0;
  let shifted = p + vec3f(params.domainHalf);
  return shifted - floor(shifted / size) * size - vec3f(params.domainHalf);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodiesIn[idx];
  let halfDt = params.dt * 0.5;
  let posHalf = me.pos + me.vel * halfDt;
  let acc = gravityForce[idx].xyz + pressureForce[idx].xyz;
  let velNew = me.vel + acc * params.dt;
  let posNew = wrapPeriodic(posHalf + velNew * halfDt);

  bodiesOut[idx] = Body(posNew, me.mass, velNew, 0.0, vec3f(0.0), 0.0);
}
`,ie=`struct Camera {
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
  interactPos: vec3f,
  interactActive: f32,
}

struct RenderParams {
  gridRes: u32,
  stepCount: u32,
  domainHalf: f32,
  cellSize: f32,
  densityScale: f32,
  visible: f32,
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<storage, read> density: array<f32>;
@group(0) @binding(2) var<uniform> params: RenderParams;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let p = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0)
  );
  var out: VSOut;
  out.pos = vec4f(p[vid], 0.0, 1.0);
  out.uv = p[vid] * 0.5 + vec2f(0.5);
  return out;
}

fn wrapIdx(i: i32, n: i32) -> u32 {
  return u32(((i % n) + n) % n);
}

fn cellIdx(ix: i32, iy: i32, iz: i32, n: i32) -> u32 {
  let x = wrapIdx(ix, n);
  let y = wrapIdx(iy, n);
  let z = wrapIdx(iz, n);
  let nu = u32(n);
  return u32(z) * nu * nu + u32(y) * nu + u32(x);
}

fn sampleDensity(p: vec3f) -> f32 {
  let fgrid = (p + vec3f(params.domainHalf)) / params.cellSize - vec3f(0.5);
  let i0 = vec3i(floor(fgrid));
  let f = fgrid - vec3f(i0);
  let g = vec3f(1.0) - f;
  let n = i32(params.gridRes);
  var rho = 0.0;
  rho += density[cellIdx(i0.x,     i0.y,     i0.z,     n)] * g.x * g.y * g.z;
  rho += density[cellIdx(i0.x + 1, i0.y,     i0.z,     n)] * f.x * g.y * g.z;
  rho += density[cellIdx(i0.x,     i0.y + 1, i0.z,     n)] * g.x * f.y * g.z;
  rho += density[cellIdx(i0.x + 1, i0.y + 1, i0.z,     n)] * f.x * f.y * g.z;
  rho += density[cellIdx(i0.x,     i0.y,     i0.z + 1, n)] * g.x * g.y * f.z;
  rho += density[cellIdx(i0.x + 1, i0.y,     i0.z + 1, n)] * f.x * g.y * f.z;
  rho += density[cellIdx(i0.x,     i0.y + 1, i0.z + 1, n)] * g.x * f.y * f.z;
  rho += density[cellIdx(i0.x + 1, i0.y + 1, i0.z + 1, n)] * f.x * f.y * f.z;
  return rho;
}

fn intersectBox(ro: vec3f, rd: vec3f, b: f32) -> vec2f {
  let inv = 1.0 / rd;
  let t0 = (vec3f(-b) - ro) * inv;
  let t1 = (vec3f( b) - ro) * inv;
  let lo = min(t0, t1);
  let hi = max(t0, t1);
  let enter = max(max(lo.x, lo.y), lo.z);
  let exit = min(min(hi.x, hi.y), hi.z);
  return vec2f(enter, exit);
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4f {
  let ndc = in.uv * 2.0 - vec2f(1.0);
  let xAxis = vec3f(camera.view[0][0], camera.view[1][0], camera.view[2][0]);
  let yAxis = vec3f(camera.view[0][1], camera.view[1][1], camera.view[2][1]);
  let zAxis = vec3f(camera.view[0][2], camera.view[1][2], camera.view[2][2]);
  let ro = camera.eye;
  let viewRay = vec3f(ndc.x / camera.proj[0][0], ndc.y / camera.proj[1][1], -1.0);
  let rd = normalize(xAxis * viewRay.x + yAxis * viewRay.y + zAxis * viewRay.z);

  let hit = intersectBox(ro, rd, params.domainHalf);
  let t0 = max(hit.x, 0.0);
  let t1 = hit.y;
  if (t1 <= t0 || params.visible < 0.5) {
    discard;
  }

  let steps = max(params.stepCount, 1u);
  let dt = (t1 - t0) / f32(steps);
  var transmittance = 1.0;
  var glow = vec3f(0.0);

  for (var i = 0u; i < steps; i++) {
    let t = t0 + (f32(i) + 0.5) * dt;
    let p = ro + rd * t;
    let rho = sampleDensity(p) * params.densityScale;
    let alpha = clamp(1.0 - exp(-rho * dt), 0.0, 0.18);
    let tint = mix(camera.secondary * 0.7, camera.accent * 1.4, clamp(rho * 0.8, 0.0, 1.0));
    glow += transmittance * alpha * tint;
    transmittance *= 1.0 - alpha;
  }

  let a = clamp(1.0 - transmittance, 0.0, 0.75);
  return vec4f(glow, a);
}
`,ae={"Gas χ":N,"Gas Pressure":ne,"Gas Compute":re,"Gas Render":ie},P=128,F=64,I=F*2/P,L=P*P*P;function oe(e,t,n,r,i,a,o,s){let c=e.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),l=new ArrayBuffer(32),u=new Float32Array(l),d=new Uint32Array(l);return d[1]=t,d[2]=n,u[3]=r,u[4]=i,u[5]=a,d[6]=o,d[7]=s,{buffer:c,data:l,f32:u,u32:d}}function se(e){let{device:t}=e,n=Math.max(0,Math.min(.5,e.gasMassFraction)),r=Math.max(1,Math.min(2e5,Math.round(e.starCount*2.5))),i=r*48,a=e.totalStarMass*n,o=a/r,s=new Float32Array(r*12);for(let e=0;e<r;e++){let t=e*12;s[t]=(Math.random()-.5)*60,s[t+1]=(Math.random()-.5)*60,s[t+2]=(Math.random()-.5)*60,s[t+3]=o}let c=t.createBuffer({size:i,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,mappedAtCreation:!0});new Float32Array(c.getMappedRange()).set(s),c.unmap();let l=t.createBuffer({size:i,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC}),u=[c,l],d=t.createBuffer({size:r*16,usage:e.pmBufUsage}),f=t.createBuffer({size:r*16,usage:e.pmBufUsage}),p=t.createBuffer({size:L*4,usage:e.pmBufUsage}),m=t.createBuffer({size:L*4,usage:e.pmBufUsage}),h=t.createBuffer({size:L*4,usage:e.pmBufUsage}),g=Math.max(a/L,1e-12),_=Math.max(g*1e-6,1e-12),v=oe(t,r,e.innerParams.gridRes,e.innerParams.domainHalf,e.innerParams.cellSize,e.fixedPointScale,e.innerParams.cellCount,e.innerParams.filterOutOfDomain),y=oe(t,r,e.outerParams.gridRes,e.outerParams.domainHalf,e.outerParams.cellSize,e.fixedPointScale,e.outerParams.cellCount,e.outerParams.filterOutOfDomain),b=oe(t,r,P,F,I,e.fixedPointScale,L,0),x=u.map(n=>t.createBindGroup({layout:e.pmDepositBGL,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:e.innerDensityU32}},{binding:2,resource:{buffer:v.buffer}}]})),S=u.map(n=>t.createBindGroup({layout:e.pmDepositBGL,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:e.outerDensityU32}},{binding:2,resource:{buffer:y.buffer}}]})),C=u.map(n=>t.createBindGroup({layout:e.pmDepositBGL,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:p}},{binding:2,resource:{buffer:b.buffer}}]})),w=t.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),T=new ArrayBuffer(32),E=new Float32Array(T),D=new Uint32Array(T);D[0]=P,D[1]=L,E[2]=e.fixedPointScale,E[4]=_,E[5]=g,E[6]=F,E[7]=I;let O=e.createShaderModuleChecked(`gas.chi`,N),k=t.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),A=t.createComputePipeline({layout:t.createPipelineLayout({bindGroupLayouts:[k]}),compute:{module:O,entryPoint:`main`}}),j=t.createBindGroup({layout:k,entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:m}},{binding:2,resource:{buffer:h}},{binding:3,resource:{buffer:w}}]}),M=u.map(n=>t.createBindGroup({layout:e.pmInterpolateBGL,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:e.innerPotential}},{binding:2,resource:{buffer:e.outerPotential}},{binding:3,resource:{buffer:d}},{binding:4,resource:{buffer:v.buffer}},{binding:5,resource:{buffer:y.buffer}},{binding:6,resource:{buffer:e.pmBlendBuffer}}]})),ee=e.createShaderModuleChecked(`gas.pressure_interpolate`,ne),te=t.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),ae=t.createComputePipeline({layout:t.createPipelineLayout({bindGroupLayouts:[te]}),compute:{module:ee,entryPoint:`main`}}),se=u.map(e=>t.createBindGroup({layout:te,entries:[{binding:0,resource:{buffer:e}},{binding:1,resource:{buffer:h}},{binding:2,resource:{buffer:f}},{binding:3,resource:{buffer:b.buffer}}]})),R=t.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),ce=new ArrayBuffer(16),le=new Float32Array(ce),ue=new Uint32Array(ce);ue[1]=r,le[2]=F;let de=e.createShaderModuleChecked(`gas.compute`,re),fe=t.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),pe=t.createComputePipeline({layout:t.createPipelineLayout({bindGroupLayouts:[fe]}),compute:{module:de,entryPoint:`main`}}),me=[t.createBindGroup({layout:fe,entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:d}},{binding:3,resource:{buffer:f}},{binding:4,resource:{buffer:R}}]}),t.createBindGroup({layout:fe,entries:[{binding:0,resource:{buffer:l}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:d}},{binding:3,resource:{buffer:f}},{binding:4,resource:{buffer:R}}]})],he=e.createShaderModuleChecked(`gas.render`,ie),ge=t.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),_e=t.createRenderPipeline({layout:t.createPipelineLayout({bindGroupLayouts:[ge]}),vertex:{module:he,entryPoint:`vs_main`},fragment:{module:he,entryPoint:`fs_main`,targets:[{format:e.renderTargetFormat,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:e.renderSampleCount}}),ve=t.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),ye=new ArrayBuffer(32),be=new Float32Array(ye),xe=new Uint32Array(ye);xe[0]=P,xe[1]=32,be[2]=F,be[3]=I;let z=[0,1].map(n=>t.createBindGroup({layout:ge,entries:[{binding:0,resource:{buffer:e.cameraBuffer,offset:n*e.cameraStride,size:e.cameraSize}},{binding:1,resource:{buffer:m}},{binding:2,resource:{buffer:ve}}]})),B=t.createBuffer({size:L*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),V=t.createBuffer({size:i,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),H=t.createBuffer({size:e.starCount*48,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),U=t.createBuffer({size:48,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),W=!1,Se=e=>u[e];return{count:r,bodyBytes:i,totalMass:a,prepareFrame(e,n){v.f32[0]=e,y.f32[0]=e,b.f32[0]=e,E[3]=n,le[0]=e,t.queue.writeBuffer(v.buffer,0,v.data),t.queue.writeBuffer(y.buffer,0,y.data),t.queue.writeBuffer(b.buffer,0,b.data),t.queue.writeBuffer(w,0,T),t.queue.writeBuffer(R,0,ce)},clear(e){e.clearBuffer(p)},depositInnerPm(t,n){t.setPipeline(e.pmDepositPipeline),t.setBindGroup(0,x[n]),t.dispatchWorkgroups(Math.ceil(r/256))},depositOuterPm(t,n){t.setPipeline(e.pmDepositPipeline),t.setBindGroup(0,S[n]),t.dispatchWorkgroups(Math.ceil(r/256))},depositGasAndBuildPressure(t,n){t.setPipeline(e.pmDepositPipeline),t.setBindGroup(0,C[n]),t.dispatchWorkgroups(Math.ceil(r/256)),t.setPipeline(A),t.setBindGroup(0,j),t.dispatchWorkgroups(Math.ceil(L/256))},interpolateForces(t,n){t.setPipeline(e.pmInterpolatePipeline),t.setBindGroup(0,M[n]),t.dispatchWorkgroups(Math.ceil(r/256)),t.setPipeline(ae),t.setBindGroup(0,se[n]),t.dispatchWorkgroups(Math.ceil(r/256))},integrate(e,t){e.setPipeline(pe),e.setBindGroup(0,me[t]),e.dispatchWorkgroups(Math.ceil(r/256))},render(e,n,r){be[4]=a>0?1/Math.max(g*24,1e-12):0,be[5]=r?1:0,t.queue.writeBuffer(ve,0,ye),e.setPipeline(_e),e.setBindGroup(0,z[n]),e.draw(3)},async dumpDensity(){if(W)return null;W=!0;let e=t.createCommandEncoder();e.copyBufferToBuffer(m,0,B,0,L*4),t.queue.submit([e.finish()]),await t.queue.onSubmittedWorkDone(),await B.mapAsync(GPUMapMode.READ);let n=new Float32Array(B.getMappedRange().slice(0));return B.unmap(),W=!1,n},async energyBreakdown(n,a){if(W)return null;W=!0;let o=t.createCommandEncoder();o.copyBufferToBuffer(e.starBuffers[n],0,H,0,e.starCount*48),o.copyBufferToBuffer(Se(n),0,V,0,i),o.copyBufferToBuffer(m,0,B,0,L*4),t.queue.submit([o.finish()]),await t.queue.onSubmittedWorkDone(),await H.mapAsync(GPUMapMode.READ);let s=new Float32Array(H.getMappedRange().slice(0));H.unmap(),await V.mapAsync(GPUMapMode.READ);let c=new Float32Array(V.getMappedRange().slice(0));V.unmap(),await B.mapAsync(GPUMapMode.READ);let l=new Float32Array(B.getMappedRange().slice(0));B.unmap(),W=!1;let u=0;for(let t=0;t<e.starCount;t++){let e=t*12,n=s[e+3],r=s[e+4],i=s[e+5],a=s[e+6];u+=.5*n*(r*r+i*i+a*a)}let d=0;for(let e=0;e<r;e++){let t=e*12,n=c[t+3],r=c[t+4],i=c[t+5],a=c[t+6];d+=.5*n*(r*r+i*i+a*a)}let f=a*a,p=0;for(let e=0;e<l.length;e++){let t=Math.max(l[e],_);p+=t*f*Math.log(t/g)}return{starKinetic:u,gasKinetic:d,gasInternal:p,total:u+d+p}},async wakeProbe(n,r=0){if(W)return null;W=!0;let i=Math.max(0,Math.min(e.starCount-1,Math.floor(r))),a=t.createCommandEncoder();a.copyBufferToBuffer(e.starBuffers[n],i*48,U,0,48),a.copyBufferToBuffer(m,0,B,0,L*4),t.queue.submit([a.finish()]),await t.queue.onSubmittedWorkDone(),await U.mapAsync(GPUMapMode.READ);let o=new Float32Array(U.getMappedRange().slice(0));U.unmap(),await B.mapAsync(GPUMapMode.READ);let s=new Float32Array(B.getMappedRange().slice(0));B.unmap(),W=!1;let c=Math.hypot(o[4],o[5],o[6]),l=c>1e-6?1/c:0,u=[o[4]*l,o[5]*l,o[6]*l],d=(e,t,n)=>{let r=Math.floor((e+F)/I),i=Math.floor((t+F)/I),a=Math.floor((n+F)/I),o=e=>(e%P+P)%P,c=o(r),l=o(i);return s[o(a)*P*P+l*P+c]},f=d(o[0]+u[0]*2,o[1]+u[1]*2,o[2]+u[2]*2),p=d(o[0]-u[0]*2,o[1]-u[1]*2,o[2]-u[2]*2);return{aheadDensity:f,behindDensity:p,asymmetry:(p-f)/(Math.abs(p)+Math.abs(f)+1e-12)}},async snapshot(e){if(W)return null;W=!0;let n=t.createCommandEncoder();n.copyBufferToBuffer(Se(e),0,V,0,i),t.queue.submit([n.finish()]),await t.queue.onSubmittedWorkDone(),await V.mapAsync(GPUMapMode.READ);let r=new Float32Array(V.getMappedRange().slice(0));return V.unmap(),W=!1,r},destroy(){c.destroy(),l.destroy(),d.destroy(),f.destroy(),p.destroy(),m.destroy(),h.destroy(),v.buffer.destroy(),y.buffer.destroy(),b.buffer.destroy(),w.destroy(),R.destroy(),ve.destroy(),B.destroy(),V.destroy(),H.destroy(),U.destroy()}}}var R={boids:{count:1e3,separationRadius:25,alignmentRadius:50,cohesionRadius:50,maxSpeed:2,maxForce:.05,visualRange:100},physics:{count:8e4,G:.3,softening:1.5,distribution:`disk`,interactionStrength:1,tidalStrength:.008,attractorDecayTime:2,gasMassFraction:.15,gasSoundSpeed:2,gasVisible:!0,haloMass:5,haloScale:2,diskMass:3,diskScaleA:1.5,diskScaleB:.3},physics_classic:{count:500,G:1,softening:.5,damping:.999,distribution:`random`},fluid:{resolution:256,viscosity:.1,diffusionRate:.001,forceStrength:100,volumeScale:1.5,dyeMode:`rainbow`,jacobiIterations:40},parametric:{shape:`torus`,scale:1,p1Min:.7,p1Max:1.3,p1Rate:.3,p2Min:.2,p2Max:.55,p2Rate:.5,p3Min:.15,p3Max:.45,p3Rate:.7,p4Min:.5,p4Max:2,p4Rate:.4,twistMin:0,twistMax:.4,twistRate:.15},reaction:{resolution:128,feed:.055,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Spots`}},ce={boids:{Default:{...R.boids},"Tight Flock":{count:3e3,separationRadius:10,alignmentRadius:30,cohesionRadius:80,maxSpeed:3,maxForce:.08,visualRange:60},Dispersed:{count:2e3,separationRadius:60,alignmentRadius:100,cohesionRadius:20,maxSpeed:1.5,maxForce:.03,visualRange:200},Massive:{count:2e4,separationRadius:15,alignmentRadius:40,cohesionRadius:40,maxSpeed:2.5,maxForce:.04,visualRange:80},"Slow Dance":{count:500,separationRadius:40,alignmentRadius:80,cohesionRadius:100,maxSpeed:.5,maxForce:.01,visualRange:150}},physics:{Default:{...R.physics},"Spiral Galaxy":{count:1e5,G:1.5,softening:.15,distribution:`spiral`,interactionStrength:1,tidalStrength:.005,haloMass:8,haloScale:2.5,diskMass:4,diskScaleA:1.2,diskScaleB:.15},"Cosmic Web":{count:8e4,G:.8,softening:2,distribution:`web`,interactionStrength:1,tidalStrength:.025,haloMass:2,haloScale:4,diskMass:0,diskScaleA:1.5,diskScaleB:.3},"Star Cluster":{count:6e4,G:.3,softening:1.2,distribution:`cluster`,interactionStrength:1,tidalStrength:.001,haloMass:3,haloScale:1.5,diskMass:0,diskScaleA:1,diskScaleB:.5},Maelstrom:{count:12e4,G:.25,softening:2.5,distribution:`maelstrom`,interactionStrength:1.5,tidalStrength:.005,haloMass:6,haloScale:1.8,diskMass:5,diskScaleA:.8,diskScaleB:.2},"Dust Cloud":{count:15e4,G:.08,softening:3.5,distribution:`dust`,interactionStrength:.5,tidalStrength:.003,haloMass:1,haloScale:5,diskMass:0,diskScaleA:2,diskScaleB:.5},Binary:{count:8e4,G:.6,softening:1,distribution:`binary`,interactionStrength:1,tidalStrength:.04,haloMass:4,haloScale:2,diskMass:2,diskScaleA:1,diskScaleB:.25}},physics_classic:{Default:{...R.physics_classic},Galaxy:{count:3e3,G:.5,softening:1,damping:.998,distribution:`disk`},Collapse:{count:2e3,G:10,softening:.1,damping:.995,distribution:`shell`},Gentle:{count:1e3,G:.1,softening:2,damping:.9999,distribution:`random`}},fluid:{Default:{...R.fluid},Thick:{resolution:256,viscosity:.8,diffusionRate:.005,forceStrength:200,volumeScale:1.8,dyeMode:`rainbow`,jacobiIterations:40},Turbulent:{resolution:512,viscosity:.01,diffusionRate:1e-4,forceStrength:300,volumeScale:1.3,dyeMode:`rainbow`,jacobiIterations:60},"Ink Drop":{resolution:256,viscosity:.3,diffusionRate:0,forceStrength:50,volumeScale:2.1,dyeMode:`single`,jacobiIterations:40}},parametric:{Default:{shape:`torus`,scale:1,p1Min:.7,p1Max:1.3,p1Rate:.3,p2Min:.2,p2Max:.55,p2Rate:.5,p3Min:.15,p3Max:.45,p3Rate:.7,p4Min:.5,p4Max:2,p4Rate:.4,twistMin:0,twistMax:.4,twistRate:.15},"Rippling Ring":{shape:`torus`,scale:1,p1Min:.5,p1Max:1.5,p1Rate:.5,p2Min:.15,p2Max:.7,p2Rate:.7,p3Min:.3,p3Max:.8,p3Rate:1,p4Min:1,p4Max:3,p4Rate:.6,twistMin:0,twistMax:1,twistRate:.2},"Wild Möbius":{shape:`mobius`,scale:1.5,p1Min:.8,p1Max:2,p1Rate:.3,p2Min:1,p2Max:3,p2Rate:.15,p3Min:.2,p3Max:.6,p3Rate:.8,p4Min:.5,p4Max:2.5,p4Rate:.5,twistMin:1,twistMax:4,twistRate:.1},"Trefoil Pulse":{shape:`trefoil`,scale:1.2,p1Min:.08,p1Max:.35,p1Rate:.9,p2Min:.25,p2Max:.55,p2Rate:.4,p3Min:.3,p3Max:.9,p3Rate:1.2,p4Min:1,p4Max:4,p4Rate:.7,twistMin:0,twistMax:.5,twistRate:.2},"Klein Chaos":{shape:`klein`,scale:1.2,p1Min:.5,p1Max:1.5,p1Rate:.4,p2Min:0,p2Max:0,p2Rate:0,p3Min:.2,p3Max:.6,p3Rate:.9,p4Min:.8,p4Max:3.5,p4Rate:.5,twistMin:0,twistMax:.8,twistRate:.15}},reaction:{Spots:{resolution:128,feed:.055,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Spots`},Mazes:{resolution:128,feed:.029,kill:.057,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Mazes`},Worms:{resolution:128,feed:.058,kill:.065,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Worms`},Mitosis:{resolution:128,feed:.0367,kill:.0649,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Mitosis`},Coral:{resolution:128,feed:.062,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Coral`}}},le={boids:[{section:`Flock`,params:[{key:`count`,label:`Count`,min:100,max:3e4,step:100,requiresReset:!0},{key:`visualRange`,label:`Visual Range`,min:10,max:500,step:5}]},{section:`Forces`,params:[{key:`separationRadius`,label:`Separation`,min:1,max:100,step:1},{key:`alignmentRadius`,label:`Alignment`,min:1,max:200,step:1},{key:`cohesionRadius`,label:`Cohesion`,min:1,max:200,step:1},{key:`maxSpeed`,label:`Max Speed`,min:.1,max:10,step:.1},{key:`maxForce`,label:`Max Force`,min:.001,max:.5,step:.001}]}],physics:[{section:`Simulation`,params:[{key:`count`,label:`Bodies`,min:10,max:15e4,step:10,requiresReset:!0},{key:`G`,label:`Gravity (G)`,min:.05,max:5,step:.01},{key:`softening`,label:`Softening`,min:.2,max:4,step:.05},{key:`interactionStrength`,label:`Interaction Pull`,min:.1,max:100,step:.01,logScale:!0},{key:`attractorDecayTime`,label:`Decay Time (s)`,min:.1,max:30,step:.1,maxLabel:`Permanent`},{key:`tidalStrength`,label:`Tidal Field`,min:0,max:.05,step:5e-4}]},{section:`Gas Reservoir`,params:[{key:`gasMassFraction`,label:`Gas Mass`,min:0,max:.5,step:.01,requiresReset:!0},{key:`gasSoundSpeed`,label:`Sound Speed`,min:.5,max:5,step:.05},{key:`gasVisible`,label:`Gas Visible`,type:`toggle`}]},{section:`Initial State`,params:[{key:`distribution`,label:`Distribution`,type:`dropdown`,options:[`random`,`disk`,`shell`]}]},{section:`Dark Matter`,params:[{key:`haloMass`,label:`Halo Mass`,min:0,max:15,step:.1},{key:`haloScale`,label:`Halo Scale`,min:.5,max:8,step:.1},{key:`diskMass`,label:`Disk Mass`,min:0,max:10,step:.1},{key:`diskScaleA`,label:`Disk Scale A`,min:.1,max:5,step:.05},{key:`diskScaleB`,label:`Disk Scale B`,min:.05,max:2,step:.01}]}],physics_classic:[{section:`Simulation`,params:[{key:`count`,label:`Bodies`,min:10,max:1e4,step:10,requiresReset:!0},{key:`G`,label:`Gravity (G)`,min:.01,max:100,step:.01},{key:`softening`,label:`Softening`,min:.01,max:10,step:.01},{key:`damping`,label:`Damping`,min:.9,max:1,step:.001}]},{section:`Initial State`,params:[{key:`distribution`,label:`Distribution`,type:`dropdown`,options:[`random`,`disk`,`shell`],requiresReset:!0}]}],fluid:[{section:`Grid`,params:[{key:`resolution`,label:`Resolution`,type:`dropdown`,options:[64,128,256,512],requiresReset:!0}]},{section:`Physics`,params:[{key:`viscosity`,label:`Viscosity`,min:0,max:1,step:.01},{key:`diffusionRate`,label:`Diffusion`,min:0,max:.01,step:1e-4},{key:`forceStrength`,label:`Force`,min:1,max:500,step:1},{key:`jacobiIterations`,label:`Iterations`,min:10,max:80,step:5}]},{section:`Appearance`,params:[{key:`volumeScale`,label:`Volume`,min:.4,max:3,step:.05},{key:`dyeMode`,label:`Dye Mode`,type:`dropdown`,options:[`rainbow`,`single`,`temperature`]}]}],parametric:[{section:`Shape`,params:[{key:`shape`,label:`Equation`,type:`dropdown`,options:[`torus`,`klein`,`mobius`,`sphere`,`trefoil`]}]},{section:`Shape Parameters`,id:`shape-params-section`,params:[],dynamic:!0},{section:`Transform`,params:[{key:`scale`,label:`Scale`,min:.1,max:5,step:.1}]},{section:`Twist`,params:[{key:`twistMin`,label:`Min`,min:0,max:12.56,step:.05},{key:`twistMax`,label:`Max`,min:0,max:12.56,step:.05},{key:`twistRate`,label:`Rate`,min:0,max:3,step:.05}]},{section:`Wave Amplitude`,params:[{key:`p3Min`,label:`Min`,min:0,max:2,step:.05},{key:`p3Max`,label:`Max`,min:0,max:2,step:.05},{key:`p3Rate`,label:`Rate`,min:0,max:3,step:.05}]},{section:`Wave Frequency`,params:[{key:`p4Min`,label:`Min`,min:0,max:5,step:.1},{key:`p4Max`,label:`Max`,min:0,max:5,step:.1},{key:`p4Rate`,label:`Rate`,min:0,max:3,step:.05}]}],reaction:[{section:`Volume`,params:[{key:`resolution`,label:`Resolution`,type:`dropdown`,options:[64,128],requiresReset:!0},{key:`stepsPerFrame`,label:`Steps/Frame`,min:1,max:12,step:1}]},{section:`Reaction`,params:[{key:`feed`,label:`Feed`,min:.01,max:.1,step:5e-4},{key:`kill`,label:`Kill`,min:.03,max:.08,step:5e-4},{key:`Du`,label:`Du`,min:.05,max:.35,step:.001},{key:`Dv`,label:`Dv`,min:.02,max:.2,step:.001}]},{section:`Render`,params:[{key:`isoThreshold`,label:`Iso Threshold`,min:.05,max:.6,step:.01}]}]},ue={Dracula:{primary:`#BD93F9`,secondary:`#FF79C6`,accent:`#50FA7B`,bg:`#282A36`,fg:`#F8F8F2`},Nord:{primary:`#88C0D0`,secondary:`#81A1C1`,accent:`#A3BE8C`,bg:`#2E3440`,fg:`#D8DEE9`},Monokai:{primary:`#AE81FF`,secondary:`#F82672`,accent:`#A5E22E`,bg:`#272822`,fg:`#D6D6D6`},"Rose Pine":{primary:`#C4A7E7`,secondary:`#EBBCBA`,accent:`#9CCFD8`,bg:`#191724`,fg:`#E0DEF4`},Gruvbox:{primary:`#85A598`,secondary:`#F9BD2F`,accent:`#B7BB26`,bg:`#282828`,fg:`#FBF1C7`},Solarized:{primary:`#268BD2`,secondary:`#2AA198`,accent:`#849900`,bg:`#002B36`,fg:`#839496`},"Tokyo Night":{primary:`#BB9AF7`,secondary:`#7AA2F7`,accent:`#9ECE6A`,bg:`#1A1B26`,fg:`#A9B1D6`},Catppuccin:{primary:`#F5C2E7`,secondary:`#CBA6F7`,accent:`#ABE9B3`,bg:`#181825`,fg:`#CDD6F4`},"Atom One":{primary:`#61AFEF`,secondary:`#C678DD`,accent:`#62F062`,bg:`#282C34`,fg:`#ABB2BF`},Flexoki:{primary:`#205EA6`,secondary:`#24837B`,accent:`#65800B`,bg:`#100F0F`,fg:`#FFFCF0`}},de=`Dracula`,fe=12e3,pe={r:.02,g:.02,b:.025,a:1},me={torus:0,klein:1,mobius:2,sphere:3,trefoil:4},he={torus:{p1:{label:`Major Radius`,animMin:.7,animMax:1.3,animRate:.3,min:.2,max:2.5,step:.05},p2:{label:`Minor Radius`,animMin:.2,animMax:.6,animRate:.5,min:.05,max:1.2,step:.05}},klein:{p1:{label:`Bulge`,animMin:.7,animMax:1.5,animRate:.4,min:.2,max:3,step:.05}},mobius:{p1:{label:`Width`,animMin:.5,animMax:1.8,animRate:.35,min:.1,max:3,step:.05},p2:{label:`Half-Twists`,animMin:1,animMax:3,animRate:.15,min:.5,max:5,step:.5}},sphere:{p1:{label:`XY Stretch`,animMin:.6,animMax:1.5,animRate:.4,min:.1,max:3,step:.05},p2:{label:`Z Stretch`,animMin:.5,animMax:1.8,animRate:.6,min:.1,max:3,step:.05}},trefoil:{p1:{label:`Tube Radius`,animMin:.08,animMax:.35,animRate:.6,min:.05,max:1,step:.05},p2:{label:`Knot Scale`,animMin:.25,animMax:.5,animRate:.35,min:.1,max:1,step:.05}}},ge=[{key:`timeScale`,label:`Time`,min:-2,max:2,step:.05},{key:`bloomIntensity`,label:`Bloom`,min:0,max:4,step:.01},{key:`bloomThreshold`,label:`Threshold`,min:0,max:8,step:.01},{key:`bloomRadius`,label:`Bloom Radius`,min:.5,max:2,step:.01},{key:`trailPersistence`,label:`Trails`,min:0,max:.995,step:.001},{key:`exposure`,label:`Exposure`,min:.2,max:4,step:.01},{key:`vignette`,label:`Vignette`,min:0,max:1.5,step:.01},{key:`chromaticAberration`,label:`Chromatic`,min:0,max:2,step:.01},{key:`grading`,label:`Color Grade`,min:0,max:1.5,step:.01}],_e={boids:`Boids`,physics:`N-Body`,physics_classic:`N-Body Classic`,fluid:`Fluid`,parametric:`Shapes`,reaction:`Reaction`};function ve(e){let t=null;function n(){t&&clearTimeout(t),t=setTimeout(()=>{t=null,e.saveStateInternal()},150)}let r={applyPreset(t,n){Object.assign(e.modeParams(t),e.presets[t][n]),e.resetCurrentSimulationInternal(),e.syncUi(),r.updateAll()},flushSaveState(){t&&=(clearTimeout(t),null),e.saveStateInternal()},resetCurrentSimulation(){e.resetCurrentSimulationInternal()},saveState(){n()},selectMode(t){e.state.mode=t,e.ensureSimulation(),e.syncUi(),r.updateAll()},setPaused(t){e.state.paused=t,t&&e.cancelDebugMovement(),e.reflectPaused()},setTheme(t){e.selectTheme(t)},updateAll(){e.updatePrompt(),e.updateStats(),e.updateShaderPanel(),n()}};return r}var ye=[`pmDepositConvert`,`outerVCycle`,`boundarySample`,`innerVCycle`,`starInterpolate`,`gasInterpolatePressure`,`starGasIntegrate`,`starsRender`,`gasRender`,`bloomComposite`];function be(){return Object.fromEntries(ye.map(e=>[e,0]))}function xe(){let e=Object.fromEntries(ye.map((e,t)=>[e,t])),t=ye.length*2,n=2e3,r=null,i=0,a=be(),o=new Set,s=!1,c=!1,l=0,u=null;return{init(e){r=e,i=0,a=be(),o=new Set,s=!1,c=!1,l=0,u=e.features.has(`timestamp-query`)?{querySet:e.createQuerySet({type:`timestamp`,count:t}),resolveBuf:e.createBuffer({size:t*8,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),stagingBuf:e.createBuffer({size:t*8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),pending:!1}:null},beginFrame(){o=new Set,s=!0},tsWrites(t){if(!u||!s)return;o.add(t);let n=e[t];return{querySet:u.querySet,beginningOfPassWriteIndex:n*2,endOfPassWriteIndex:n*2+1}},tsBegin(t){if(!(!u||!s))return o.add(t),{querySet:u.querySet,beginningOfPassWriteIndex:e[t]*2}},tsEnd(t){if(!(!u||!s))return o.add(t),{querySet:u.querySet,endOfPassWriteIndex:e[t]*2+1}},endFrame(c,d){if(s=!1,!u||u.pending||d-l<n)return;let f=Array.from(o);if(f.length===0)return;l=d,c.resolveQuerySet(u.querySet,0,t,u.resolveBuf,0),c.copyBufferToBuffer(u.resolveBuf,0,u.stagingBuf,0,t*8),u.pending=!0;let p=u,m=[...f];r?.queue.onSubmittedWorkDone().then(()=>{p.stagingBuf.mapAsync(GPUMapMode.READ).then(()=>{let t=new BigUint64Array(p.stagingBuf.getMappedRange().slice(0));p.stagingBuf.unmap(),p.pending=!1;let n=(e,t)=>t>e?Number(t-e)/1e6:0,r=be(),o=0n,s=0n;for(let i of m){let a=e[i]*2,c=t[a],l=t[a+1];r[i]=n(c,l),c>0n&&(o===0n||c<o)&&(o=c),l>s&&(s=l)}a=r,i=o>0n&&s>o?Number(s-o)/1e6:0}).catch(()=>{p.pending=!1})}).catch(()=>{p.pending=!1})},measure(e){if(u||!r||c||e-l<n)return;l=e,c=!0;let t=performance.now();r.queue.onSubmittedWorkDone().then(()=>{i=performance.now()-t,c=!1}).catch(()=>{c=!1})},getStats(){return{gpuFrameMs:i,gpuTimingDetail:a}}}}function z(e){let t=Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);return t>0?[e[0]/t,e[1]/t,e[2]/t]:[0,0,0]}function B(e,t){return[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]]}function V(e,t){return[e[0]-t[0],e[1]-t[1],e[2]-t[2]]}function H(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}var U={identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])},perspective(e,t,n,r){let i=1/Math.tan(e*.5),a=1/(n-r),o=new Float32Array(16);return o[0]=i/t,o[5]=i,o[10]=r*a,o[11]=-1,o[14]=n*r*a,o},lookAt(e,t,n){let r=z(V(e,t)),i=z(B(n,r)),a=B(r,i);return new Float32Array([i[0],a[0],r[0],0,i[1],a[1],r[1],0,i[2],a[2],r[2],0,-H(i,e),-H(a,e),-H(r,e),1])},multiply(e,t){let n=new Float32Array(16);for(let r=0;r<4;r++)for(let i=0;i<4;i++)n[i*4+r]=e[r]*t[i*4]+e[4+r]*t[i*4+1]+e[8+r]*t[i*4+2]+e[12+r]*t[i*4+3];return n},rotateX(e,t){let n=Math.cos(t),r=Math.sin(t),i=U.identity();return i[5]=n,i[6]=r,i[9]=-r,i[10]=n,U.multiply(e,i)},rotateY(e,t){let n=Math.cos(t),r=Math.sin(t),i=U.identity();return i[0]=n,i[2]=-r,i[8]=r,i[10]=n,U.multiply(e,i)},rotateZ(e,t){let n=Math.cos(t),r=Math.sin(t),i=U.identity();return i[0]=n,i[1]=r,i[4]=-r,i[5]=n,U.multiply(e,i)},translate(e,t,n,r){let i=U.identity();return i[12]=t,i[13]=n,i[14]=r,U.multiply(e,i)}},W=500;function Se(e){let t=null;return{setXrOverride(e){t=e},clearXrOverride(){t=null},getOrbitCamera(){let t=[e.distance*Math.cos(e.rotX)*Math.sin(e.rotY),e.distance*Math.sin(e.rotX),e.distance*Math.cos(e.rotX)*Math.cos(e.rotY)];return{eye:t,view:U.lookAt(t,[e.panX,e.panY,0],[0,1,0]),proj:null}},getUniformData(n,r,i){let a=new Float32Array(52);if(t)a.set(t.viewMatrix,0),a.set(t.projMatrix,16),a.set(t.eye,32);else{let t=this.getOrbitCamera(),r=e.fov*Math.PI/180,i=U.perspective(r,n,.01,W);a.set(t.view,0),a.set(i,16),a.set(t.eye,32)}return a.set(r.primary,36),a.set(r.secondary,40),a.set(r.accent,44),a[48]=i.worldX,a[49]=i.worldY,a[50]=i.worldZ,a[51]=i.down?1:0,a}}}function Ce(e){return!!e&&typeof e.getSimStep==`function`&&typeof e.getTimeDirection==`function`&&typeof e.setTimeDirection==`function`&&typeof e.setBlurTime==`function`}function we(){let e=0,t=0,n=0,r=-1;return{getCurrentFps(){return n},tick(i){let a=r>=0,o=a?i-r:16.7;r=i,e++;let s=i-t>=1e3;return s&&(n=e,e=0,t=i),{frameDeltaMs:o,fpsUpdated:s,hadPreviousTimestamp:a}},updateHud(e){let t=e.currentFps>0?(1e3/e.currentFps).toFixed(1):`--`,n=e.gpuTimingDetail,r=Object.values(n).some(e=>e>0)?` (PM:${n.pmDepositConvert.toFixed(1)} V:${(n.outerVCycle+n.innerVCycle).toFixed(1)} R:${(n.starsRender+n.gasRender).toFixed(1)} P:${n.bloomComposite.toFixed(1)})`:e.gpuFrameMs>0?` gpu:${e.gpuFrameMs.toFixed(1)}ms`:``;document.getElementById(`stat-fps`).textContent=`${e.currentFps} fps ${t}ms${r}`,document.getElementById(`stat-count`).textContent=e.isGridMode?`Grid: ${e.count}`:`Particles: ${e.count}`;let i=document.getElementById(`stat-step`);i&&(e.physicsStep!==void 0&&e.physicsDirection!==void 0?(i.style.display=``,i.textContent=`Step: ${e.physicsStep} ${e.physicsDirection<0?`◀`:`▶`}`):i.style.display=`none`)}}}function Te(e){let t=we(),n=null;function r(t,n,r){e.getPostFx().runFadePass(t,n,r,e.state.fx.trailPersistence,e.getDefaultClearColor())}let i=n=>{if(e.state.xrEnabled)return;requestAnimationFrame(i);let{frameDeltaMs:o,fpsUpdated:s,hadPreviousTimestamp:c}=t.tick(n);c&&e.updateAdaptiveChunk(o),e.refreshThemeColors(n),a.resize(),e.pruneAttractors(e.currentSimStep()),e.tickMarkers(Math.min(.05,o*.001)*e.state.fx.timeScale*e.currentTimeDirection()),s&&a.updateStats();let l=e.getCurrentSimulation();if(!l)return;let u=e.state.mode;try{e.gpuTiming.beginFrame();let t=e.getDevice().createCommandEncoder();e.runDebugCompute(l,t),e.updateDebugPanel();let i=e.getPostFx(),o=i.getSceneIndex(),s=1-o;i.setSceneIndex(s),r(t,o,s),l.render(t,i.getSceneView(s),null),a.runBloomChain(t,`bloomComposite`);let c=e.getContext().getCurrentTexture().createView();a.runComposite(t,c,e.getCanvasFormat(),null,`bloomComposite`),e.gpuTiming.endFrame(t,n),e.getDevice().queue.submit([t.finish()]),e.gpuTiming.measure(n)}catch(t){e.showSimError(u,`frame threw: ${t.message}`),e.dropSimulationIfCurrent(u,l)}},a={getCurrentFps(){return t.getCurrentFps()},getGpuStats(){return{currentFps:t.getCurrentFps(),...e.gpuTiming.getStats()}},requestFrame(){requestAnimationFrame(i)},resize(){let t=e.getCanvas(),n=e.getCanvasContainer(),r=window.devicePixelRatio||1,i=Math.floor(n.clientWidth*r),a=Math.floor(n.clientHeight*r);(t.width!==i||t.height!==a)&&(t.width=i,t.height=a),e.getPostFx().ensureHdrTargets(t.width,t.height)},runBloomChain(t,n){e.getPostFx().runBloomChain(t,e.state.fx,n?e.gpuTiming.tsBegin(n):void 0)},runComposite(t,n,r,i=null,a){e.getPostFx().runComposite(t,n,r,i,e.state.fx,e.getThemeColors(),a?e.gpuTiming.tsEnd(a):void 0)},start(){a.resize(),n?.disconnect(),n=new ResizeObserver(()=>a.resize()),n.observe(e.getCanvasContainer()),a.requestFrame()},tickFrameStats(e){return t.tick(e)},tsWrites(t){return e.gpuTiming.tsWrites(t)},updateStats(){let n=e.getCurrentSimulation(),{gpuFrameMs:r,gpuTimingDetail:i}=e.gpuTiming.getStats();t.updateHud({count:n?n.getCount():`--`,currentFps:t.getCurrentFps(),gpuFrameMs:r,gpuTimingDetail:i,isGridMode:e.state.mode===`fluid`||e.state.mode===`reaction`,physicsDirection:e.state.mode===`physics`&&Ce(n)?n.getTimeDirection():void 0,physicsStep:e.state.mode===`physics`&&Ce(n)?n.getSimStep():void 0})}};return a}var Ee=`// Final HDR composite: combine scene + bloom, ACES tone-map, color grade, vignette, chromatic aberration.

struct CompositeParams {
  bloomIntensity: f32,
  exposure: f32,
  vignette: f32,
  chromaticAberration: f32,
  grading: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
  primary: vec3f,
  _pad3: f32,
  accent: vec3f,
  _pad4: f32,
}

@group(0) @binding(0) var sceneTex: texture_2d<f32>;
@group(0) @binding(1) var bloomTex: texture_2d<f32>;
@group(0) @binding(2) var linSampler: sampler;
@group(0) @binding(3) var<uniform> params: CompositeParams;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let uv = vec2f(f32((vid << 1u) & 2u), f32(vid & 2u));
  var out: VSOut;
  out.pos = vec4f(uv * 2.0 - 1.0, 0.0, 1.0);
  out.uv = vec2f(uv.x, 1.0 - uv.y);
  return out;
}

// ACES filmic tone mapper (Narkowicz approximation).
fn aces(x: vec3f) -> vec3f {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0.0), vec3f(1.0));
}

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let sampleUV = uv;

  // Chromatic aberration: applied to dim background (grid/walls) but not bright simulation content.
  // Sample the scene at center UV first to measure brightness, then blend between CA'd and clean
  // based on luminance — bright particles stay sharp, dark surroundings get the prismatic split.
  let center = vec2f(0.5, 0.5);
  let dir = sampleUV - center;
  let dist2 = dot(dir, dir);
  let caStrength = params.chromaticAberration * 0.012;
  let caR = sampleUV + dir * dist2 * caStrength * 2.0;
  let caB = sampleUV - dir * dist2 * caStrength * 2.0;

  let sceneClean = textureSample(sceneTex, linSampler, sampleUV).rgb;
  let sceneCa = vec3f(
    textureSample(sceneTex, linSampler, caR).r,
    sceneClean.g,
    textureSample(sceneTex, linSampler, caB).b
  );

  // Bright pixels (simulation) → use clean sample. Dim pixels (grid/room) → use CA'd sample.
  let sceneLum = dot(sceneClean, vec3f(0.2126, 0.7152, 0.0722));
  let caFade = 1.0 - smoothstep(0.03, 0.25, sceneLum);
  var hdr = mix(sceneClean, sceneCa, caFade);

  // Bloom add (always clean — CA on bloom looks messy).
  let bloom = textureSample(bloomTex, linSampler, sampleUV).rgb;
  hdr = hdr + bloom * params.bloomIntensity;

  // Exposure
  hdr = hdr * params.exposure;

  // Theme color grading: lift midtones toward primary, push highlights toward accent. Pre-tonemap.
  let l = luminance(hdr);
  let midMask = smoothstep(0.05, 0.7, l) * (1.0 - smoothstep(0.7, 1.6, l));
  let highMask = smoothstep(0.6, 1.8, l);
  hdr = mix(hdr, hdr * params.primary * 1.6, midMask * params.grading * 0.4);
  hdr = mix(hdr, hdr * params.accent * 1.4, highMask * params.grading * 0.5);

  // Tone map (ACES) compresses HDR to LDR with luminous highlights instead of hard clipping.
  var ldr = aces(hdr);

  // Vignette: darken corners.
  let vDist = length(dir) * 1.4142;
  let vig = 1.0 - params.vignette * smoothstep(0.4, 1.05, vDist);
  ldr = ldr * vig;

  return vec4f(ldr, 1.0);
}
`,De=`// [LAW:one-source-of-truth] CoD-Advanced-Warfare 13-tap downsample. The first level applies a soft bright-pass.
// Sampling at half-pixel offsets relative to the SOURCE texel size to get a smooth low-pass.

struct DownParams {
  srcTexel: vec2f,    // 1.0 / sourceSize
  threshold: f32,     // bloom bright-pass; 0 disables
  isFirstLevel: f32,  // > 0.5 → apply bright-pass
}

@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var srcSampler: sampler;
@group(0) @binding(2) var<uniform> params: DownParams;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let uv = vec2f(f32((vid << 1u) & 2u), f32(vid & 2u));
  var out: VSOut;
  out.pos = vec4f(uv * 2.0 - 1.0, 0.0, 1.0);
  out.uv = vec2f(uv.x, 1.0 - uv.y);
  return out;
}

fn brightPass(c: vec3f, threshold: f32) -> vec3f {
  let luma = dot(c, vec3f(0.2126, 0.7152, 0.0722));
  let soft = max(luma - threshold, 0.0);
  let factor = soft / max(luma, 0.0001);
  return c * factor;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.srcTexel;

  // 13 tap pattern (CoD AW)
  let a = textureSample(srcTex, srcSampler, uv + t * vec2f(-2.0, -2.0)).rgb;
  let b = textureSample(srcTex, srcSampler, uv + t * vec2f( 0.0, -2.0)).rgb;
  let c = textureSample(srcTex, srcSampler, uv + t * vec2f( 2.0, -2.0)).rgb;
  let d = textureSample(srcTex, srcSampler, uv + t * vec2f(-2.0,  0.0)).rgb;
  let e = textureSample(srcTex, srcSampler, uv + t * vec2f( 0.0,  0.0)).rgb;
  let f = textureSample(srcTex, srcSampler, uv + t * vec2f( 2.0,  0.0)).rgb;
  let g = textureSample(srcTex, srcSampler, uv + t * vec2f(-2.0,  2.0)).rgb;
  let h = textureSample(srcTex, srcSampler, uv + t * vec2f( 0.0,  2.0)).rgb;
  let i = textureSample(srcTex, srcSampler, uv + t * vec2f( 2.0,  2.0)).rgb;
  let j = textureSample(srcTex, srcSampler, uv + t * vec2f(-1.0, -1.0)).rgb;
  let k = textureSample(srcTex, srcSampler, uv + t * vec2f( 1.0, -1.0)).rgb;
  let l = textureSample(srcTex, srcSampler, uv + t * vec2f(-1.0,  1.0)).rgb;
  let m = textureSample(srcTex, srcSampler, uv + t * vec2f( 1.0,  1.0)).rgb;

  // Weighted sum of 5 sub-blocks
  var sum = e * 0.125;
  sum += (a + c + g + i) * 0.03125;
  sum += (b + d + f + h) * 0.0625;
  sum += (j + k + l + m) * 0.125;

  // [LAW:dataflow-not-control-flow] Bright-pass strength is data; isFirstLevel scales mix instead of branching.
  let lit = brightPass(sum, params.threshold);
  let firstLevelMix = clamp(params.isFirstLevel, 0.0, 1.0);
  let outColor = mix(sum, lit, firstLevelMix);

  return vec4f(outColor, 1.0);
}
`,Oe=`// [LAW:dataflow-not-control-flow] Trail decay always runs in the same shape — only the persistence value varies.
// Reads the previous HDR scene texture and writes faded copy into the current scene texture.

struct FadeParams {
  persistence: f32,
  _pad: vec3f,
}

@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var srcSampler: sampler;
@group(0) @binding(2) var<uniform> params: FadeParams;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let uv = vec2f(f32((vid << 1u) & 2u), f32(vid & 2u));
  var out: VSOut;
  out.pos = vec4f(uv * 2.0 - 1.0, 0.0, 1.0);
  out.uv = vec2f(uv.x, 1.0 - uv.y);
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let prev = textureSample(srcTex, srcSampler, uv);
  return vec4f(prev.rgb * params.persistence, prev.a * params.persistence);
}
`,ke=`// 9-tap tent filter upsample. Reads from a smaller mip; output is additively blended into a larger one.

struct UpParams {
  srcTexel: vec2f,
  radius: f32,
  _pad: f32,
}

@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var srcSampler: sampler;
@group(0) @binding(2) var<uniform> params: UpParams;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let uv = vec2f(f32((vid << 1u) & 2u), f32(vid & 2u));
  var out: VSOut;
  out.pos = vec4f(uv * 2.0 - 1.0, 0.0, 1.0);
  out.uv = vec2f(uv.x, 1.0 - uv.y);
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.srcTexel * params.radius;

  let a = textureSample(srcTex, srcSampler, uv + vec2f(-t.x, -t.y)).rgb;
  let b = textureSample(srcTex, srcSampler, uv + vec2f( 0.0, -t.y)).rgb;
  let c = textureSample(srcTex, srcSampler, uv + vec2f( t.x, -t.y)).rgb;
  let d = textureSample(srcTex, srcSampler, uv + vec2f(-t.x,  0.0)).rgb;
  let e = textureSample(srcTex, srcSampler, uv + vec2f( 0.0,  0.0)).rgb;
  let f = textureSample(srcTex, srcSampler, uv + vec2f( t.x,  0.0)).rgb;
  let g = textureSample(srcTex, srcSampler, uv + vec2f(-t.x,  t.y)).rgb;
  let h = textureSample(srcTex, srcSampler, uv + vec2f( 0.0,  t.y)).rgb;
  let i = textureSample(srcTex, srcSampler, uv + vec2f( t.x,  t.y)).rgb;

  // Tent filter weights: corners 1, edges 2, center 4 → /16
  let sum = (e * 4.0 + (b + d + f + h) * 2.0 + (a + c + g + i)) * (1.0 / 16.0);
  return vec4f(sum, 1.0);
}
`,Ae=`rgba16float`,je=3;function Me(e){let t={scene:[],sceneIdx:0,depth:null,nullColor:null,nullDepth:null,nullColorView:null,nullDepthView:null,bloomMips:[],width:0,height:0,needsClear:!0,linSampler:null,fadePipeline:null,downsamplePipeline:null,upsamplePipelineAdditive:null,upsamplePipelineReplace:null,compositePipelines:new Map,fadeBGL:null,downsampleBGL:null,upsampleBGL:null,compositeBGL:null,fadeUBO:null,downsampleUBO:[],upsampleUBO:[],compositeUBO:null,sceneViews:[],bloomMipViews:[],fadeBGs:[],downsampleBGs:[],upsampleBGs:[],fadeParams:new Float32Array(4),downsampleParams:[],upsampleParams:[],compositeParams:new Float32Array(16),compositeBGs:[]};function n(n){let r=t.compositePipelines.get(n);if(r)return r;let i=e.createShaderModuleChecked(`post.composite`,Ee);return r=e.device.createRenderPipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[t.compositeBGL]}),vertex:{module:i,entryPoint:`vs_main`},fragment:{module:i,entryPoint:`fs_main`,targets:[{format:n}]},primitive:{topology:`triangle-list`}}),t.compositePipelines.set(n,r),r}return{init(){t.nullColor=e.device.createTexture({size:[1,1],format:Ae,usage:GPUTextureUsage.RENDER_ATTACHMENT}),t.nullDepth=e.device.createTexture({size:[1,1],format:`depth24plus`,usage:GPUTextureUsage.RENDER_ATTACHMENT}),t.nullColorView=t.nullColor.createView(),t.nullDepthView=t.nullDepth.createView(),t.linSampler=e.device.createSampler({magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`}),t.fadeBGL=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),t.downsampleBGL=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),t.upsampleBGL=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),t.compositeBGL=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]});let n=e.createShaderModuleChecked(`post.fade`,Oe),r=e.createShaderModuleChecked(`post.downsample`,De),i=e.createShaderModuleChecked(`post.upsample`,ke);t.fadePipeline=e.device.createRenderPipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[t.fadeBGL]}),vertex:{module:n,entryPoint:`vs_main`},fragment:{module:n,entryPoint:`fs_main`,targets:[{format:Ae}]},primitive:{topology:`triangle-list`}}),t.downsamplePipeline=e.device.createRenderPipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[t.downsampleBGL]}),vertex:{module:r,entryPoint:`vs_main`},fragment:{module:r,entryPoint:`fs_main`,targets:[{format:Ae}]},primitive:{topology:`triangle-list`}}),t.upsamplePipelineAdditive=e.device.createRenderPipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[t.upsampleBGL]}),vertex:{module:i,entryPoint:`vs_main`},fragment:{module:i,entryPoint:`fs_main`,targets:[{format:Ae,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`}}),t.upsamplePipelineReplace=e.device.createRenderPipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[t.upsampleBGL]}),vertex:{module:i,entryPoint:`vs_main`},fragment:{module:i,entryPoint:`fs_main`,targets:[{format:Ae}]},primitive:{topology:`triangle-list`}}),t.fadeUBO=e.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),t.downsampleUBO=[],t.upsampleUBO=[];for(let n=0;n<je;n++)t.downsampleUBO.push(e.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})),t.upsampleUBO.push(e.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));t.compositeUBO=e.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),t.fadeParams=new Float32Array(4),t.compositeParams=new Float32Array(16),t.downsampleParams=[],t.upsampleParams=[];for(let e=0;e<je;e++)t.downsampleParams.push(new Float32Array(4)),t.upsampleParams.push(new Float32Array(4))},ensureHdrTargets(n,r){if(t.width===n&&t.height===r&&t.scene.length===2)return;for(let e of t.scene)e.destroy();for(let e of t.bloomMips)e.destroy();t.depth?.destroy(),t.scene=[],t.bloomMips=[],t.width=n,t.height=r;for(let i=0;i<2;i++)t.scene.push(e.device.createTexture({size:[n,r],format:Ae,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));t.depth=e.device.createTexture({size:[n,r],format:`depth24plus`,usage:GPUTextureUsage.RENDER_ATTACHMENT});let i=Math.max(1,Math.floor(n/2)),a=Math.max(1,Math.floor(r/2));for(let n=0;n<je;n++)t.bloomMips.push(e.device.createTexture({size:[i,a],format:Ae,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING})),i=Math.max(1,Math.floor(i/2)),a=Math.max(1,Math.floor(a/2));t.needsClear=!0,t.sceneViews=t.scene.map(e=>e.createView()),t.bloomMipViews=t.bloomMips.map(e=>e.createView()),t.fadeBGs=t.sceneViews.map(n=>e.device.createBindGroup({layout:t.fadeBGL,entries:[{binding:0,resource:n},{binding:1,resource:t.linSampler},{binding:2,resource:{buffer:t.fadeUBO}}]})),t.downsampleBGs=[];for(let n=0;n<2;n++)t.downsampleBGs.push(e.device.createBindGroup({layout:t.downsampleBGL,entries:[{binding:0,resource:t.sceneViews[n]},{binding:1,resource:t.linSampler},{binding:2,resource:{buffer:t.downsampleUBO[0]}}]}));for(let n=1;n<je;n++)t.downsampleBGs.push(e.device.createBindGroup({layout:t.downsampleBGL,entries:[{binding:0,resource:t.bloomMipViews[n-1]},{binding:1,resource:t.linSampler},{binding:2,resource:{buffer:t.downsampleUBO[n]}}]}));t.upsampleBGs=t.bloomMipViews.map((n,r)=>e.device.createBindGroup({layout:t.upsampleBGL,entries:[{binding:0,resource:n},{binding:1,resource:t.linSampler},{binding:2,resource:{buffer:t.upsampleUBO[r]}}]})),t.compositeBGs=t.sceneViews.map(n=>e.device.createBindGroup({layout:t.compositeBGL,entries:[{binding:0,resource:n},{binding:1,resource:t.bloomMipViews[0]},{binding:2,resource:t.linSampler},{binding:3,resource:{buffer:t.compositeUBO}}]}))},markNeedsClear(){t.needsClear=!0},getSceneIndex(){return t.sceneIdx},setSceneIndex(e){t.sceneIdx=e},getSceneView(e){return t.sceneViews[e]},getSceneFormat(e){return t.scene[e].format},getCurrentSceneView(){return t.scene[t.sceneIdx].createView()},getColorAttachment(e,n,r,i,a){let o=i>.001&&!t.needsClear;return{view:this.getCurrentSceneView(),clearValue:a,loadOp:o?`load`:`clear`,storeOp:`store`}},getDepthAttachment(e,n,r){return{view:r??t.depth.createView(),depthClearValue:1,depthLoadOp:`clear`,depthStoreOp:`store`}},getDepthView(){return t.depth.createView()},getNullColorView(){return t.nullColorView},getNullDepthView(){return t.nullDepthView},runFadePass(n,r,i,a,o){if(t.needsClear||a<.001)return;t.fadeParams[0]=a,e.device.queue.writeBuffer(t.fadeUBO,0,t.fadeParams);let s=n.beginRenderPass({colorAttachments:[{view:t.sceneViews[i],clearValue:o,loadOp:`clear`,storeOp:`store`}]});s.setPipeline(t.fadePipeline),s.setBindGroup(0,t.fadeBGs[r]),s.draw(3),s.end()},runBloomChain(n,r,i){let a=t.sceneIdx;for(let o=0;o<je;o++){let s=o===0?t.scene[a]:t.bloomMips[o-1],c=t.downsampleParams[o];c[0]=1/s.width,c[1]=1/s.height,c[2]=r.bloomThreshold,c[3]=o===0?1:0,e.device.queue.writeBuffer(t.downsampleUBO[o],0,c);let l=t.downsampleBGs[o===0?a:o+1],u=n.beginRenderPass({colorAttachments:[{view:t.bloomMipViews[o],clearValue:{r:0,g:0,b:0,a:1},loadOp:`clear`,storeOp:`store`}],...i&&o===0?{timestampWrites:i}:{}});u.setPipeline(t.downsamplePipeline),u.setBindGroup(0,l),u.draw(3),u.end()}for(let i=je-1;i>0;i--){let a=t.bloomMips[i],o=t.upsampleParams[i];o[0]=1/a.width,o[1]=1/a.height,o[2]=r.bloomRadius,e.device.queue.writeBuffer(t.upsampleUBO[i],0,o);let s=n.beginRenderPass({colorAttachments:[{view:t.bloomMipViews[i-1],clearValue:{r:0,g:0,b:0,a:1},loadOp:`load`,storeOp:`store`}]});s.setPipeline(t.upsamplePipelineAdditive),s.setBindGroup(0,t.upsampleBGs[i]),s.draw(3),s.end()}},runComposite(r,i,a,o,s,c,l){let u=t.compositeParams;u[0]=s.bloomIntensity,u[1]=s.exposure,u[2]=s.vignette,u[3]=s.chromaticAberration,u[4]=s.grading,u[8]=c.primary[0],u[9]=c.primary[1],u[10]=c.primary[2],u[12]=c.accent[0],u[13]=c.accent[1],u[14]=c.accent[2],e.device.queue.writeBuffer(t.compositeUBO,0,u);let d=n(a),f=t.compositeBGs[t.sceneIdx],p=r.beginRenderPass({colorAttachments:[{view:i,clearValue:{r:0,g:0,b:0,a:1},loadOp:`clear`,storeOp:`store`}],...l?{timestampWrites:l}:{}});o&&p.setViewport(o[0],o[1],o[2],o[3],0,1),p.setPipeline(d),p.setBindGroup(0,f),p.draw(3),p.end(),t.needsClear=!1}}}var Ne=`rgba16float`,Pe=1;function Fe(e){let t=document.getElementById(`fallback`);t.querySelector(`p`).textContent=e,t.classList.add(`visible`)}async function Ie(e){if(!navigator.gpu)return Fe(`navigator.gpu not found. This browser may not support WebGPU, or it may need to be enabled in settings.`),null;let t;try{t=await navigator.gpu.requestAdapter({powerPreference:`high-performance`,xrCompatible:!0})}catch(e){return Fe(`requestAdapter() failed: ${e.message}`),null}if(!t)return Fe(`requestAdapter() returned null. WebGPU may be available but no suitable GPU adapter was found.`),null;let n;try{let e=t.features.has(`timestamp-query`)?[`timestamp-query`]:[];n=await t.requestDevice({requiredFeatures:e})}catch(e){return Fe(`requestDevice() failed: ${e.message}`),null}let r=xe();r.init(n),n.lost.then(t=>{e.logError(`webgpu:device-lost`,Error(t.message),`reason=${t.reason}`),t.reason!==`destroyed`&&e.restoreAfterDeviceLoss().catch(t=>e.logError(`webgpu:device-restore`,t))}),n.onuncapturederror=t=>{e.logError(`webgpu:uncaptured`,t.error)};let i=document.getElementById(`gpu-canvas`),a=i.getContext(`webgpu`),o=navigator.gpu.getPreferredCanvasFormat();a.configure({device:n,format:o,alphaMode:`opaque`});let s=Se(e.state.camera),c=Me({createShaderModuleChecked:(t,r)=>e.createShaderModuleChecked(n,t,r),device:n,renderSampleCount:Pe});c.init();let l={cameraSystem:s,canvas:i,canvasFormat:o,context:a,device:n,postFx:c,renderSampleCount:Pe,renderTargetFormat:Ne,timing:r},u=Te({currentSimStep:e.currentSimStep,currentTimeDirection:e.currentTimeDirection,dropSimulationIfCurrent:e.dropSimulationIfCurrent,getCanvas:()=>l.canvas,getCanvasContainer:e.getCanvasContainer,getCanvasFormat:()=>l.canvasFormat,getContext:()=>l.context,getCurrentSimulation:e.getCurrentSimulation,getDefaultClearColor:e.getDefaultClearColor,getDevice:()=>l.device,getPostFx:()=>l.postFx,getThemeColors:e.getThemeColors,gpuTiming:l.timing,pruneAttractors:e.pruneAttractors,refreshThemeColors:e.refreshThemeColors,runDebugCompute:e.runDebugCompute,showSimError:e.showSimError,state:e.state,tickMarkers:e.tickMarkers,updateAdaptiveChunk:e.updateAdaptiveChunk,updateDebugPanel:e.updateDebugPanel});return{...l,frameRuntime:u}}function Le(e){return{mode:`physics`,colorTheme:`Dracula`,xrEnabled:!1,paused:!1,boids:{...e.boids},physics:{...e.physics},physics_classic:{...e.physics_classic},fluid:{...e.fluid},parametric:{...e.parametric},reaction:{...e.reaction},camera:{distance:5,fov:60,rotX:.3,rotY:0,panX:0,panY:0},mouse:{down:!1,x:0,y:0,dx:0,dy:0,worldX:0,worldY:0,worldZ:0},attractors:[],markers:[],pointerToAttractor:new Map,fx:{bloomIntensity:.7,bloomThreshold:4,bloomRadius:1,trailPersistence:0,exposure:1,vignette:.35,chromaticAberration:.25,grading:.5,timeScale:1},debug:{xrLog:!1}}}function Re(e){for(let t of Object.keys(e.paramDefs))for(let n of e.paramDefs[t])if(!n.dynamic)for(let r of n.params)r.type===`dropdown`?e.registry.register({kind:`enum`,id:`${t}.${r.key}`,label:r.label,group:t,get:()=>String(e.modeParams(t)[r.key]),set:n=>{let i=e.modeParams(t),a=i[r.key];i[r.key]=typeof a==`number`?Number(n):n},options:(r.options??[]).map(e=>({value:String(e),label:String(e)}))}):r.type===`toggle`?e.registry.register({kind:`toggle`,id:`${t}.${r.key}`,label:r.label,group:t,get:()=>!!e.modeParams(t)[r.key],set:n=>{e.modeParams(t)[r.key]=n}}):r.min!==void 0&&r.max!==void 0&&e.registry.register({kind:`continuous`,id:`${t}.${r.key}`,label:r.label,group:t,get:()=>Number(e.modeParams(t)[r.key]),set:n=>{e.modeParams(t)[r.key]=n},range:{min:r.min,max:r.max},step:r.step,scale:r.logScale?`log`:`linear`});for(let t of Object.keys(e.presets))for(let n of Object.keys(e.presets[t]))e.registry.register({kind:`action`,id:`preset.${t}.${n}`,label:n,group:`presets`,invoke:()=>e.actions.applyPreset(t,n)});e.registry.register({kind:`enum`,id:`app.mode`,label:`Mode`,group:`app`,get:()=>e.state.mode,set:t=>e.actions.selectMode(t),options:Object.keys(e.modeTabLabels).map(t=>({value:t,label:e.modeTabLabels[t]}))}),e.registry.register({kind:`enum`,id:`app.theme`,label:`Theme`,group:`app`,get:()=>e.state.colorTheme,set:t=>e.actions.setTheme(t),options:Object.keys(e.themes).map(e=>({value:e,label:e}))}),e.registry.register({kind:`toggle`,id:`app.paused`,label:`Pause`,group:`app`,get:()=>e.state.paused,set:t=>e.actions.setPaused(t)})}var ze=1e3;function Be(e){let{config:t,state:n}=e;function r(e){let r=t.shapeParams[e]??{},i=n.parametric;r.p1?(i.p1Min=r.p1.animMin,i.p1Max=r.p1.animMax,i.p1Rate=r.p1.animRate):(i.p1Min=0,i.p1Max=0,i.p1Rate=0),r.p2?(i.p2Min=r.p2.animMin,i.p2Max=r.p2.animMax,i.p2Rate=r.p2.animRate):(i.p2Min=0,i.p2Max=0,i.p2Rate=0)}function i(e,n){for(let r of t.paramDefs[e])for(let e of r.params)if(e.key===n)return e;return null}function a(e,t){if(t>=1)return String(Math.round(e));let n=Math.max(0,-Math.floor(Math.log10(t)));return e.toFixed(n)}function o(e,t){let n=t?.step??.01;return t?.maxLabel!==void 0&&t.max!==void 0&&e>=t.max-n/2?t.maxLabel:a(e,n)}function s(e,t,n){let r=(Math.log(e)-Math.log(t))/(Math.log(n)-Math.log(t));return Math.round(ze*Math.max(0,Math.min(1,r)))}function c(e,t,n){let r=e/ze;return Math.exp(Math.log(t)+r*(Math.log(n)-Math.log(t)))}function l(r){let i=document.createElement(`div`);i.className=`param-section`;let o=document.createElement(`div`);o.className=`param-section-title`,o.textContent=`Visual FX`,i.appendChild(o);for(let r of t.fxParamDefs){let t=document.createElement(`div`);t.className=`control-row`;let o=document.createElement(`span`);o.className=`control-label`,o.textContent=r.label,t.appendChild(o);let s=document.createElement(`input`);s.type=`range`,s.min=String(r.min),s.max=String(r.max),s.step=String(r.step),s.value=String(n.fx[r.key]);let c=document.createElement(`span`);c.className=`control-value`,c.textContent=a(n.fx[r.key],r.step),s.addEventListener(`input`,()=>{let t=Number(s.value);n.fx[r.key]=t,c.textContent=a(t,r.step),e.actions.saveState()}),s.addEventListener(`change`,()=>e.actions.flushSaveState()),t.appendChild(s),t.appendChild(c),i.appendChild(t)}r.appendChild(i)}function u(t,n,i){let a=document.createElement(`div`);a.className=`control-row`;let l=document.createElement(`span`);if(l.className=`control-label`,l.textContent=i.label,a.appendChild(l),i.type===`dropdown`){let t=document.createElement(`select`);t.dataset.mode=n,t.dataset.key=i.key;for(let e of i.options??[]){let n=document.createElement(`option`);n.value=String(e),n.textContent=String(e),t.appendChild(n)}t.value=String(e.modeParams(n)[i.key]),t.addEventListener(`change`,()=>{let a=Number.isNaN(Number(t.value))?t.value:Number(t.value);e.modeParams(n)[i.key]=a,i.requiresReset&&e.actions.resetCurrentSimulation(),i.key===`shape`&&(r(String(a)),d()),e.actions.updateAll(),e.actions.flushSaveState()}),a.appendChild(t)}else if(i.type===`toggle`){let t=document.createElement(`input`);t.type=`checkbox`,t.checked=!!e.modeParams(n)[i.key],t.dataset.mode=n,t.dataset.key=i.key,t.addEventListener(`change`,()=>{e.modeParams(n)[i.key]=t.checked,i.requiresReset&&e.actions.resetCurrentSimulation(),e.actions.updateAll(),e.actions.flushSaveState()}),a.appendChild(t)}else{let t=document.createElement(`input`);t.type=`range`,i.logScale&&i.min!==void 0&&i.max!==void 0?(t.min=`0`,t.max=String(ze),t.step=`1`,t.value=String(s(Number(e.modeParams(n)[i.key]),i.min,i.max)),t.dataset.logScale=`1`):(t.min=String(i.min),t.max=String(i.max),t.step=String(i.step),t.value=String(e.modeParams(n)[i.key])),t.dataset.mode=n,t.dataset.key=i.key;let r=document.createElement(`span`);r.className=`control-value`,r.textContent=o(Number(e.modeParams(n)[i.key]),i),t.addEventListener(`input`,()=>{let a=i.logScale&&i.min!==void 0&&i.max!==void 0?c(Number(t.value),i.min,i.max):Number(t.value);e.modeParams(n)[i.key]=a,r.textContent=o(a,i),i.requiresReset&&(t.dataset.needsReset=`1`),e.actions.updateAll()}),t.addEventListener(`change`,()=>{t.dataset.needsReset===`1`&&(t.dataset.needsReset=`0`,e.actions.resetCurrentSimulation()),e.actions.flushSaveState()}),a.appendChild(t),a.appendChild(r)}t.appendChild(a)}function d(){let e=document.getElementById(`shape-params-section`);if(!e)return;for(;e.children.length>1;)e.removeChild(e.lastChild);let r=n.parametric.shape,i=t.shapeParams[r]??{};for(let[t,n]of Object.entries(i)){let r=document.createElement(`div`);r.className=`anim-param-label`,r.textContent=n.label,e.appendChild(r),u(e,`parametric`,{key:`${t}Min`,label:`Min`,min:n.min,max:n.max,step:n.step}),u(e,`parametric`,{key:`${t}Max`,label:`Max`,min:n.min,max:n.max,step:n.step}),u(e,`parametric`,{key:`${t}Rate`,label:`Rate`,min:0,max:3,step:.05})}}function f(e){document.querySelectorAll(`.mode-tab`).forEach(t=>t.classList.toggle(`active`,t.dataset.mode===e)),document.querySelectorAll(`.param-group`).forEach(t=>t.classList.toggle(`active`,t.dataset.mode===e)),document.querySelectorAll(`.debug-panel`).forEach(t=>t.classList.toggle(`active`,t.dataset.mode===e));let n=document.getElementById(`mode-stepper-label`);n&&(n.textContent=t.modeTabLabels[e])}function p(){let e=document.getElementById(`btn-pause`);e&&(e.textContent=n.paused?`Resume`:`Pause`,e.classList.toggle(`active`,n.paused));let t=document.getElementById(`fab-pause`);t&&(t.textContent=n.paused?`▶`:`⏸`,t.classList.toggle(`active`,n.paused))}function m(t){e.actions.setPaused(t)}function h(n,r){let i=e.modeParams(n),a=t.presets[n][r];return Object.entries(a).every(([e,t])=>i[e]===t)}function g(e){let t=document.getElementById(`params-${e}`);t&&t.querySelectorAll(`.preset-btn`).forEach(t=>{let n=t.dataset.preset;t.classList.toggle(`active`,!!n&&h(e,n))})}function _(t,n){e.actions.applyPreset(t,n),e.actions.flushSaveState()}function v(){for(let[e,n]of Object.entries(t.paramDefs)){let r=e,i=document.getElementById(`params-${r}`),a=document.createElement(`div`);a.className=`presets`;for(let e of Object.keys(t.presets[r])){let t=document.createElement(`button`);t.className=`preset-btn`+(e===`Default`?` active`:``),t.textContent=e,t.dataset.preset=e,t.dataset.mode=r,t.addEventListener(`click`,()=>_(r,e)),a.appendChild(t)}i.appendChild(a);for(let e of n){let t=document.createElement(`div`);t.className=`param-section`;let n=document.createElement(`div`);if(n.className=`param-section-title`,n.textContent=e.section,t.appendChild(n),e.dynamic){t.id=e.id??``,i.appendChild(t);continue}for(let n of e.params)u(t,r,n);i.appendChild(t)}l(i)}}function y(t){e.actions.selectMode(t),f(t)}function b(){document.querySelectorAll(`.mode-tab`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.mode;y(t)})})}function x(){document.getElementById(`btn-pause`).addEventListener(`click`,()=>{m(!n.paused)}),document.getElementById(`btn-reset`).addEventListener(`click`,()=>{e.actions.resetCurrentSimulation()}),document.getElementById(`copy-btn`).addEventListener(`click`,()=>{let e=document.getElementById(`prompt-text`).textContent??``;navigator.clipboard.writeText(e).then(()=>{let e=document.getElementById(`copy-btn`);e.textContent=`Copied!`,setTimeout(()=>{e.textContent=`Copy`},1500)})}),document.getElementById(`btn-reset-all`).addEventListener(`click`,()=>{localStorage.removeItem(e.storageKey),location.reload()}),e.setupRecordButton();let t=document.getElementById(`toggle-xr-log`);t.addEventListener(`change`,()=>{n.debug.xrLog=t.checked,e.setXrDebugLogging(n.debug.xrLog),e.actions.flushSaveState()}),e.setupXRButton()}function S(){f(n.mode);for(let n of Object.keys(t.paramDefs)){let t=n,r=document.getElementById(`params-${t}`),a=e.modeParams(t);r.querySelectorAll(`input[type="range"]`).forEach(e=>{let n=e.dataset.key;if(n&&n in a){let r=i(t,n),c=Number(a[n]);e.value=r?.logScale&&r.min!==void 0&&r.max!==void 0?String(s(c,r.min,r.max)):String(a[n]);let l=e.parentElement?.querySelector(`.control-value`);l&&(l.textContent=o(c,r))}}),r.querySelectorAll(`select`).forEach(e=>{let t=e.dataset.key;t&&t in a&&(e.value=String(a[t]))}),r.querySelectorAll(`input[type="checkbox"]`).forEach(e=>{let t=e.dataset.key;t&&t in a&&(e.checked=!!a[t])}),g(t)}e.syncThemeButtons(n.colorTheme);let r=document.getElementById(`toggle-xr-log`);r&&(r.checked=n.debug.xrLog),e.setXrDebugLogging(n.debug.xrLog),d(),p()}return{buildControls:v,setupGlobalControls:x,setupTabs:b,syncPauseButtons:p,syncUiFromState:S}}var Ve=20,He=14,Ue=1.3,We=.7,Ge=1,Ke=5e3;function qe(e){let t={skipTarget:null,targetStepsPerSec:6e3,adaptiveChunk:8,breakAtStep:null,manualStepsRemaining:0,manualDirection:1,lastSkipDispatches:0};function n(){let e=document.getElementById(`debug-break-status`),n=document.getElementById(`debug-break-val`);!e||!n||(t.breakAtStep===null?e.style.display=`none`:(n.textContent=String(t.breakAtStep),e.style.display=``))}function r(){t.skipTarget=null,t.manualStepsRemaining=0,t.lastSkipDispatches=0}return{cancelMovement:r,updateAdaptiveChunk(e){if(t.lastSkipDispatches<=0)return;let n=Math.max(1,Math.ceil(t.targetStepsPerSec/60));e>Ve?t.adaptiveChunk=Math.max(Ge,Math.floor(t.adaptiveChunk*We)):e<He&&t.adaptiveChunk<n&&(t.adaptiveChunk=Math.min(Ke,Math.ceil(t.adaptiveChunk*Ue)))},runCompute(i,a){let o=e.state.mode===`physics`?e.getPhysicsSimulation():null;if(!o||i!==o){t.lastSkipDispatches=0,e.state.paused||i.compute(a);return}let s=0,c=null,l=!1;if(t.skipTarget!==null){let n=t.skipTarget-o.getSimStep();if(n===0){t.skipTarget=null,t.lastSkipDispatches=0,o.setBlurTime(0),e.state.paused=!0,e.syncPauseButtons();return}c=n>0?1:-1;let r=Math.max(1,Math.ceil(t.targetStepsPerSec/60));s=Math.min(r,t.adaptiveChunk,Math.abs(n)),l=!0}else t.manualStepsRemaining>0?(c=t.manualDirection,s=Math.min(t.adaptiveChunk,t.manualStepsRemaining),t.manualStepsRemaining-=s):e.state.paused||(s=1);if(s===0){o.setBlurTime(0),t.lastSkipDispatches=0;return}let u=o.getTimeDirection(),d=c!==null&&c!==u;d&&o.setTimeDirection(c);let f=c===null?u:c,p=.016*e.state.fx.timeScale;o.setBlurTime(l?s*p*f:0),t.lastSkipDispatches=l?s:0;for(let i=0;i<s;i++){o.compute(a);let i=o.getSimStep();if(t.breakAtStep!==null&&i===t.breakAtStep){t.breakAtStep=null,r(),e.state.paused=!0,e.syncPauseButtons(),n(),o.setBlurTime(0);break}if(t.skipTarget!==null&&i===t.skipTarget){t.skipTarget=null,e.state.paused=!0,e.syncPauseButtons(),o.setBlurTime(0),t.lastSkipDispatches=0;break}}d&&o.setTimeDirection(u)},setupControls(){let i=e=>document.getElementById(e),a=(n,i)=>{r(),e.state.paused=!0,e.syncPauseButtons(),t.manualStepsRemaining=n,t.manualDirection=i};i(`debug-rev60`)?.addEventListener(`click`,()=>a(60,-1)),i(`debug-rev10`)?.addEventListener(`click`,()=>a(10,-1)),i(`debug-rev1`)?.addEventListener(`click`,()=>a(1,-1)),i(`debug-fwd1`)?.addEventListener(`click`,()=>a(1,1)),i(`debug-fwd10`)?.addEventListener(`click`,()=>a(10,1)),i(`debug-fwd60`)?.addEventListener(`click`,()=>a(60,1));let o=i(`debug-skip-chunk`);if(o){let e=parseInt(o.value,10);Number.isFinite(e)&&e>0&&(t.targetStepsPerSec=e),o.addEventListener(`change`,()=>{let e=parseInt(o.value,10);Number.isFinite(e)&&e>0&&(t.targetStepsPerSec=e)})}let s=n=>{n<0||(r(),e.state.paused=!0,e.syncPauseButtons(),t.skipTarget=n)},c=i(`debug-skip-target`);i(`debug-skip-btn`)?.addEventListener(`click`,()=>{let e=parseInt(c?.value??``,10);Number.isFinite(e)&&s(e)}),c?.addEventListener(`keydown`,e=>{if(e.key!==`Enter`)return;let t=parseInt(c.value,10);Number.isFinite(t)&&s(t)});let l=i(`debug-break-step`);i(`debug-break-btn`)?.addEventListener(`click`,()=>{let e=parseInt(l?.value??``,10);Number.isFinite(e)&&e>=0&&(t.breakAtStep=e,n())}),l?.addEventListener(`keydown`,e=>{if(e.key!==`Enter`)return;let r=parseInt(l.value,10);Number.isFinite(r)&&r>=0&&(t.breakAtStep=r,n())}),i(`debug-break-clear`)?.addEventListener(`click`,()=>{t.breakAtStep=null,n()});let u=i(`debug-scrub`);u?.addEventListener(`change`,()=>{let e=parseInt(u.value,10);Number.isFinite(e)&&s(e)}),i(`debug-screenshot`)?.addEventListener(`click`,()=>{let t=e.getPhysicsSimulation(),n=t?t.getSimStep():0;e.canvas.toBlob(e=>{if(!e)return;let t=URL.createObjectURL(e),r=document.createElement(`a`);r.href=t,r.download=`shader-playground-step-${n}.png`,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(t)},`image/png`)})},updatePanel(){let t=e.getPhysicsSimulation();if(e.state.mode!==`physics`||!t)return;let n=t.getSimStep(),r=t.getTimeDirection(),i=t.getJournalHighWater(),a=document.getElementById(`debug-step-num`);a&&(a.textContent=String(n));let o=document.getElementById(`debug-step-dir`);o&&(o.textContent=r<0?`◀`:`▶`);let s=document.getElementById(`debug-scrub`),c=document.getElementById(`debug-scrub-high`);if(s&&c){let e=Math.max(i,n);s.max!==String(e)&&(s.max=String(e)),document.activeElement!==s&&(s.value=String(n)),c.textContent=String(e)}}}}function Je(e){let t=!1,n=null,r=null,i={},a={};function o(){n&&(i[n]=document.getElementById(`shader-editor`).value)}function s(){let e=document.getElementById(`shader-editor`),t=document.getElementById(`shader-status`);e.value=n&&i[n]||``,t.textContent=``,t.className=`shader-success`}function c(){let t=e.getShaderSources(e.state.mode);a={...t},r!==e.state.mode&&(r=e.state.mode,i={...t});let c=document.getElementById(`shader-tabs`);c.innerHTML=``;let l=Object.keys(t);n=n&&l.includes(n)?n:l[0]??null;for(let e of l){let t=document.createElement(`button`);t.className=`shader-tab${e===n?` active`:``}`,t.textContent=e,t.addEventListener(`click`,()=>{o(),n=e,c.querySelectorAll(`.shader-tab`).forEach(t=>{t.classList.toggle(`active`,t.textContent===e)}),s()}),c.appendChild(t)}s()}function l(){if(o(),!n)return;let t=n,r=i[t],a=document.getElementById(`shader-status`);try{e.createShaderModule(r).getCompilationInfo().then(n=>{let i=n.messages.filter(e=>e.type===`error`);if(i.length>0){a.className=`shader-error`,a.textContent=i.map(e=>`Line ${e.lineNum}: ${e.message}`).join(`; `),a.title=i.map(e=>`Line ${e.lineNum}: ${e.message}`).join(`
`);return}if(!e.applyShaderEdit(e.state.mode,t,r)){a.className=`shader-error`,a.textContent=`Shader tab "${t}" is not editable from this panel`,a.title=a.textContent;return}a.className=`shader-success`,a.textContent=`Compiled OK - reset simulation to apply`,a.title=``})}catch(e){a.className=`shader-error`,a.textContent=e.message,a.title=e.message}}function u(){if(!n||!a[n])return;let t=e.resetShaderEdit(e.state.mode,n);if(t===null){let e=document.getElementById(`shader-status`);e.className=`shader-error`,e.textContent=`Shader tab "${n}" is not editable from this panel`,e.title=e.textContent;return}i[n]=t,s();let r=document.getElementById(`shader-status`);r.className=`shader-success`,r.textContent=`Shader reset to original`}return{setup(){let e=document.getElementById(`shader-toggle`),n=document.getElementById(`shader-panel`);e.addEventListener(`click`,()=>{t=!t,n.classList.toggle(`open`,t),e.classList.toggle(`active`,t),t&&c()}),document.getElementById(`shader-compile`).addEventListener(`click`,l),document.getElementById(`shader-reset`).addEventListener(`click`,u),document.getElementById(`shader-editor`).addEventListener(`keydown`,e=>{if(e.key!==`Tab`)return;e.preventDefault();let t=e.target,n=t.selectionStart;t.value=t.value.substring(0,n)+`  `+t.value.substring(t.selectionEnd),t.selectionStart=n+2,t.selectionEnd=n+2})},update(){t&&r!==e.state.mode&&c()}}}function Ye(e){let t=parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function Xe(e,t,n){return e.map((e,r)=>e+(t[r]-e)*n)}function Ze(e){function t(t){let n=e.themes[t]||e.themes[e.defaultTheme];return{primary:Ye(n.primary),secondary:Ye(n.secondary),accent:Ye(n.accent),bg:Ye(n.bg),fg:Ye(n.fg),clearColor:{r:Ye(n.bg)[0],g:Ye(n.bg)[1],b:Ye(n.bg)[2],a:1}}}function n(e,t,n){let r=Xe(e.bg,t.bg,n);return{primary:Xe(e.primary,t.primary,n),secondary:Xe(e.secondary,t.secondary,n),accent:Xe(e.accent,t.accent,n),bg:r,fg:Xe(e.fg,t.fg,n),clearColor:{r:r[0],g:r[1],b:r[2],a:1}}}let r={from:t(e.defaultTheme),to:t(e.defaultTheme),startedAtMs:0},i=t(e.defaultTheme);function a(t){let i=e.fadeMs<=0?1:Math.max(0,Math.min(1,(t-r.startedAtMs)/e.fadeMs));return n(r.from,r.to,i)}function o(){return i}function s(e){i=a(e)}function c(e){document.querySelectorAll(`#theme-presets .preset-btn`).forEach(t=>t.classList.toggle(`active`,t.dataset.theme===e))}function l(e){let n=t(e);r.from=n,r.to=n,r.startedAtMs=0,i=n,c(e)}function u(e,n=performance.now()){let o=t(e),s=a(n);r.from=s,r.to=o,r.startedAtMs=n,i=s,c(e)}function d(t,n=performance.now()){e.state.colorTheme!==t&&(e.state.colorTheme=t,u(t,n),e.onThemeSelected())}function f(){let t=document.getElementById(`theme-presets`);for(let n of Object.keys(e.themes)){let r=e.themes[n],i=document.createElement(`button`);i.className=`preset-btn`+(n===e.state.colorTheme?` active`:``),i.textContent=n,i.dataset.theme=n,i.style.borderLeftWidth=`3px`,i.style.borderLeftColor=r.primary,i.addEventListener(`click`,()=>{d(n)}),t.appendChild(i)}}return{buildThemeSelector:f,getThemeColors:o,refreshThemeColors:s,selectTheme:d,startThemeTransition:u,syncThemeButtons:c,syncThemeTransition:l}}var Qe={boids:`boids/flocking`,physics:`N-body gravitational`,physics_classic:`classic N-body (vintage shader)`,fluid:`fluid dynamics`,parametric:`parametric shape`,reaction:`Gray-Scott reaction-diffusion (3D)`};function $e(e,t,n,r){let i=e.mode,a=n(i),o=t[i],s=[];for(let[e,t]of Object.entries(a))t!==o[e]&&s.push(et(e,t));let c=`WebGPU ${Qe[i]} simulation`;e.colorTheme!==r&&(c+=` (${e.colorTheme} theme)`),s.length>0&&(c+=` with ${s.filter(Boolean).join(`, `)}`),c+=`.`,document.getElementById(`prompt-text`).textContent=c}function et(e,t){let n=Number(t),r={count:()=>`${t} particles`,separationRadius:()=>n<15?`tight separation (${t})`:n>50?`wide separation (${t})`:`separation radius ${t}`,alignmentRadius:()=>`alignment range ${t}`,cohesionRadius:()=>n>80?`strong cohesion (${t})`:`cohesion range ${t}`,maxSpeed:()=>n>4?`high speed (${t})`:n<1?`slow movement (${t})`:`speed ${t}`,maxForce:()=>n>.1?`strong steering (${t})`:`steering force ${t}`,visualRange:()=>`visual range ${t}`,G:()=>n>5?`strong gravity (G=${t})`:n<.5?`weak gravity (G=${t})`:`G=${t}`,softening:()=>`softening ${t}`,damping:()=>n<.995?`high damping (${t})`:`damping ${t}`,haloMass:()=>n>8?`heavy halo (${t})`:n<2?`light halo (${t})`:`halo mass ${t}`,haloScale:()=>`halo scale ${t}`,diskMass:()=>n<.1?`no disk potential`:`disk mass ${t}`,diskScaleA:()=>`disk scale A ${t}`,diskScaleB:()=>`disk scale B ${t}`,gasMassFraction:()=>n<.01?`no gas reservoir`:`gas mass fraction ${t}`,gasSoundSpeed:()=>`gas sound speed ${t}`,gasVisible:()=>t?null:`gas hidden`,distribution:()=>`${t} distribution`,resolution:()=>`${t}x${t} grid`,viscosity:()=>n>.5?`thick fluid (viscosity ${t})`:n<.05?`thin fluid (viscosity ${t})`:`viscosity ${t}`,diffusionRate:()=>`diffusion ${t}`,forceStrength:()=>n>200?`strong forces (${t})`:`force strength ${t}`,volumeScale:()=>n>2?`large volume (${t})`:n<1?`compact volume (${t})`:`volume scale ${t}`,dyeMode:()=>`${t} dye`,jacobiIterations:()=>`${t} solver iterations`,shape:()=>`${t} shape`,scale:()=>n===1?null:`scale ${t}`,p1Min:()=>null,p1Max:()=>null,p1Rate:()=>null,p2Min:()=>null,p2Max:()=>null,p2Rate:()=>null,p3Min:()=>null,p3Max:()=>null,p3Rate:()=>null,p4Min:()=>null,p4Max:()=>null,p4Rate:()=>null,twistMin:()=>null,twistMax:()=>null,twistRate:()=>null}[e];return r?r():`${e}: ${t}`}function tt(e){let{state:t,catalog:n,modeParams:r}=e,i=null,a,o=Ze({defaultTheme:n.defaultTheme,fadeMs:n.themeFadeMs,onThemeSelected:()=>e.getActions().updateAll(),state:t,themes:n.themes}),s=qe({canvas:e.getCanvas(),getPhysicsSimulation:e.getPhysicsSimulation,state:t,syncPauseButtons:()=>a.syncPauseButtons()}),c=Je({applyShaderEdit:e.applyShaderEdit,createShaderModule:e.createShaderModule,getShaderSources:e.getShaderSources,resetShaderEdit:e.resetShaderEdit,state:t});function l(){return i||(i=Be({actions:e.getActions(),config:{fxParamDefs:n.fxParamDefs,modeTabLabels:n.modeTabLabels,paramDefs:n.paramDefs,presets:n.presets,shapeParams:n.shapeParams},modeParams:r,setXrDebugLogging:e.setXrDebugLogging,setupRecordButton:d,setupXRButton:u,state:t,storageKey:e.storageKey,syncThemeButtons:e=>o.syncThemeButtons(e)}),i)}function u(){let t=document.getElementById(`btn-xr`);if(!navigator.xr){t.textContent=`VR Not Available`;return}navigator.xr.isSessionSupported(`immersive-vr`).then(n=>{n?(t.disabled=!1,t.addEventListener(`click`,()=>{e.toggleXr()})):t.textContent=`VR Not Supported`}).catch(()=>{t.textContent=`VR Check Failed`})}function d(){let t=document.getElementById(`btn-xr-record`);if(!t)return;let n=()=>{let r=e.metrics.status(),i=e.getXrSession();if(r.phase===`idle`){t.textContent=`Record XR Session`,t.disabled=!!i;return}t.textContent=`Recording — exit XR to stop`,t.disabled=!0,requestAnimationFrame(n)};t.addEventListener(`click`,async()=>{if(e.metrics.status().phase!==`idle`||e.getXrSession())return;e.metrics.record({}).then(e=>{window.__xrLastRecording=e;let t={};for(let n of e)t[n.channel]=(t[n.channel]??0)+1;let n=Object.entries(t).map(([e,t])=>`${e}: ${t}`).join(`, `);console.group(`[xr] recording — ${e.length} samples (${n})`);for(let t of e){if(t.channel===`xr.snap`||t.channel===`xr.gesture`&&t.payload.gesture.kind===`pinch-hold`)continue;let e=t.channel;if(t.channel===`xr.gesture`){let n=t.payload;e=`xr.gesture:${n.gesture.kind}${n.hand?`(${n.hand})`:``}`}else if(t.channel===`xr.state`){let n=t.payload;e=`xr.state:${n.hand} ${n.from}→${n.to}`}console.log(`[t=${t.t.toFixed(0).padStart(5)}ms] ${e}`,t.payload)}console.groupEnd()}),requestAnimationFrame(n),await e.toggleXr();let t=e.getXrSession();if(!t){e.metrics.stop();return}t.addEventListener(`end`,()=>e.metrics.stop(),{once:!0})})}function f(){let n=n=>{let r=e.getActiveSimulation();Ce(r)&&(r.setTimeDirection(n?-1:1),!n&&t.paused&&(t.paused=!1))};document.addEventListener(`keydown`,e=>{if(e.key!==`r`&&e.key!==`R`||e.repeat)return;let t=e.target?.tagName;t===`INPUT`||t===`TEXTAREA`||t===`SELECT`||n(!0)}),document.addEventListener(`keyup`,e=>{(e.key===`r`||e.key===`R`)&&n(!1)});let r=document.getElementById(`fab-rewind`);r&&(r.addEventListener(`pointerdown`,()=>n(!0)),r.addEventListener(`pointerup`,()=>n(!1)),r.addEventListener(`pointercancel`,()=>n(!1)),r.addEventListener(`pointerleave`,()=>n(!1)))}return a={init(){let e=l();e.buildControls(),o.buildThemeSelector(),e.setupTabs(),e.setupGlobalControls(),c.setup(),f(),s.setupControls()},getThemeColors:()=>o.getThemeColors(),refreshThemeColors:e=>o.refreshThemeColors(e),syncThemeTransition:e=>o.syncThemeTransition(e),selectTheme:e=>o.selectTheme(e),syncPauseButtons:()=>l().syncPauseButtons(),syncUiFromState:()=>l().syncUiFromState(),updatePrompt:()=>$e(t,n.defaults,r,n.defaultTheme),updateShaderPanel:()=>c.update(),cancelDebugMovement:()=>s.cancelMovement(),runDebugCompute:(e,t)=>s.runCompute(e,t),updateAdaptiveChunk:e=>s.updateAdaptiveChunk(e),updateDebugPanel:()=>s.updatePanel()},a}var nt=`shader-playground-state`;function rt(e){return!!e&&typeof e==`object`&&!Array.isArray(e)}function it(e,t,n){try{let r={};for(let e of Object.keys(t))r[e]=n(e);let i={mode:e.mode,colorTheme:e.colorTheme,camera:e.camera,fx:e.fx,debug:e.debug,...r};localStorage.setItem(nt,JSON.stringify(i))}catch{}}function at(e,t,n,r,i){try{let a=localStorage.getItem(nt);if(!a)return;let o=JSON.parse(a);typeof o.mode==`string`&&o.mode in t&&(e.mode=o.mode),typeof o.colorTheme==`string`&&n[o.colorTheme]&&(e.colorTheme=o.colorTheme);for(let e of Object.keys(t))rt(o[e])&&Object.assign(r(e),o[e]);rt(o.camera)&&Object.assign(e.camera,o.camera),rt(o.fx)&&Object.assign(e.fx,o.fx),rt(o.debug)&&Object.assign(e.debug,o.debug),i(e.colorTheme)}catch{}}var ot=`struct Particle {
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
`,st=`struct Camera {
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

  // [LAW:dataflow-not-control-flow] Constant-pixel-size triangle: scale local offsets by view-space depth so the
  // perspective divide produces a fixed NDC offset. Boids stay tight darts regardless of camera distance.
  let viewPos = camera.view * vec4f(p.pos, 1.0);
  let depth = max(abs(viewPos.z), 0.05);
  let size = 0.0035 * depth;
  var localPos: vec3f;
  switch (vid) {
    case 0u: { localPos = dir * size * 2.0; }            // tip
    case 1u: { localPos = -dir * size + right * size; }  // left
    case 2u: { localPos = -dir * size - right * size; }  // right
    default: { localPos = vec3f(0.0); }
  }

  let worldPos = p.pos + localPos;
  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);

  // Color by speed: primary (slow) → accent (fast); fast boids shift toward white-hot.
  let t = clamp(speed / 4.0, 0.0, 1.0);
  let base = mix(camera.primary, camera.accent, t);
  out.color = mix(base, vec3f(1.0), t * 0.45);
  return out;
}

@fragment
fn fs_main(@location(0) color: vec3f) -> @location(0) vec4f {
  // HDR boost: triangles are tiny, so a flat ~5x multiplier reads through bloom as luminous flecks.
  return vec4f(color * 5.0, 1.0);
}
`,ct=`// [LAW:one-source-of-truth] DKD leapfrog integrator with ALL conservative forces.
// Time-reversible: negating params.dt produces the exact inverse trajectory.
//
// The integration scheme per step:
//   1. Half-drift: posHalf = pos + vel * dt/2
//   2. Forces: acc = F(posHalf)                       (PM gravity + dark matter + attractors + tidal + boundary)
//   3. Kick: velNew = vel + acc * dt                  (full velocity update)
//   4. Half-drift: posNew = posHalf + velNew * dt/2   (complete the position step)
//
// Gravity is computed via Particle-Mesh: pmForce[idx] is populated by
// pm.interpolate.wgsl earlier in the frame from the Poisson-solved potential.
// The old source/tracer tile-pair loop is gone — every particle contributes
// mass to the density grid and reads force from it uniformly.
//
// Reversibility proof: forces at the half-step position are identical in forward and reverse
// because posHalf is reached by the same half-drift from either direction. Under dt → -dt,
// step 1 traces back instead of forward, hitting the same midpoint → same forces → exact inverse.

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  _unused: vec3f,  // available for future use (was \`home\`); body stays 48 bytes for layout compatibility
  _pad2: f32,
}

// [LAW:one-source-of-truth] Attractor is the canonical per-interaction force-generator.
// strength=0 makes all per-attractor terms zero without any branching (dataflow-not-control-flow).
struct Attractor {
  pos: vec3f,
  strength: f32,
}

struct Params {
  dt: f32,
  G: f32,
  softening: f32,     // unused by PM gravity; reserved for future per-particle softening
  haloMass: f32,      // Plummer halo gravitational mass
  count: u32,
  _pad_sourceCount_removed: u32,  // was sourceCount (tile-pair gravity removed in .6)
  haloScale: f32,     // Plummer halo softening radius
  time: f32,
  attractorCount: u32,
  _pad_a: u32,
  _pad_b: u32,
  _pad_c: u32,
  diskNormal: vec3f,
  _pad4: f32,
  diskMass: f32,      // Miyamoto-Nagai disk mass
  diskScaleA: f32,    // MN radial scale length
  diskScaleB: f32,    // MN vertical scale height
  _pad_pmBlend_removed: f32,      // was pmBlend (tile-pair gravity removed in .6)
  _pad_f: f32,
  _pad_d: f32,
  _pad_g: f32,
  tidalStrength: f32,
  // Attractor array at offset 96 (16-aligned). CPU packing must match.
  attractors: array<Attractor, 32>,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;
// Per-particle PM force (CIC-interpolated gradient of the Poisson potential).
// Populated each frame by pm.interpolate.wgsl before this shader runs.
// [LAW:single-enforcer] Sole source of gravity in this shader — no tile-pair
// fallback, no blend knob.
@group(0) @binding(3) var<storage, read> pmForce: array<vec4f>;

// [LAW:one-source-of-truth] All forces are conservative (position-only, derivable from a potential).
// No velocity-dependent terms exist in this shader. Time-reversibility follows directly.

// Soft outer boundary — conservative containment (quadratic potential for r > R_outer).
// [LAW:one-source-of-truth] Sized to the visual room (grid.wgsl ROOM_HALF_WIDTH=72)
// so containment happens near the walls the user sees, not in a tiny central box.
const N_BODY_OUTER_RADIUS = 60.0;
const N_BODY_BOUNDARY_PULL = 0.01;

// Periodic domain (3-torus). Particles leaving any face reappear on the
// opposite face with the same velocity. Authoritative extent for downstream
// PM-grid work. [LAW:one-source-of-truth] Single constant shared by the
// integrator's wrap and the PM grid allocation. Sized to the visual room
// (grid.wgsl ROOM_HALF_WIDTH=72) so the periodic cube fills the space, not a
// 32³ box floating in the middle of a 144-wide room.
const DOMAIN_SIZE = 128.0;    // cube edge length
const DOMAIN_HALF = 64.0;     // = DOMAIN_SIZE / 2

// Per-attractor conservative force constants.
const INTERACTION_WELL_STRENGTH = 12.0;
const INTERACTION_WELL_SOFTENING = 0.25;
const INTERACTION_CORE_RADIUS = 0.3;
const INTERACTION_CORE_PRESSURE = 16.0;

// Maps each component into [-DOMAIN_HALF, +DOMAIN_HALF) via a reversible mod.
// The + DOMAIN_HALF shift handles negative values cleanly (WGSL's % can return
// negative results for negative operands, so we use floor() instead).
// [LAW:dataflow-not-control-flow] Pure function of position — no history, no
// velocity, no branching. Commutes with dt-reversal so DKD stays exactly
// reversible across wraps.
fn wrapPeriodic(p: vec3f) -> vec3f {
  let shifted = p + vec3f(DOMAIN_HALF);
  return shifted - floor(shifted / DOMAIN_SIZE) * DOMAIN_SIZE - vec3f(DOMAIN_HALF);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodiesIn[idx];
  let halfDt = params.dt * 0.5;

  // ── DKD STEP 1: Half-drift ──────────────────────────────────────────────────
  let posHalf = me.pos + me.vel * halfDt;

  // ── FORCE ACCUMULATION at posHalf ───────────────────────────────────────────
  // PM is the sole pair-gravity source. [LAW:one-source-of-truth] pmForce was
  // computed by pm.interpolate.wgsl earlier this frame from the Poisson-solved
  // potential — it IS the gravitational acceleration at posHalf. Analytic
  // forces (attractors, halo, disk, boundary, tidal) add to it below.
  var acc = pmForce[idx].xyz;

  let countScale = sqrt(f32(params.count) / 1000.0);

  // ── ATTRACTOR WELLS (conservative only) ─────────────────────────────────────
  // [LAW:dataflow-not-control-flow] strength=0 zeroes every term — no "active?" branch.
  for (var i = 0u; i < params.attractorCount; i++) {
    let a = params.attractors[i];
    let s = a.strength;
    let toA = a.pos - posHalf;
    let d2 = dot(toA, toA);
    let d = sqrt(d2 + 0.0001);
    let dir = toA / d;

    // 1/r² attractive well with softening (conservative: derived from -GM/r potential).
    acc += dir * (s * INTERACTION_WELL_STRENGTH * countScale / (d2 + INTERACTION_WELL_SOFTENING));

    // Repulsive core (conservative: derived from linear penalty potential inside core radius).
    let corePush = max(0.0, INTERACTION_CORE_RADIUS - d);
    acc -= dir * (corePush * s * INTERACTION_CORE_PRESSURE * countScale);
  }

  // ── DARK MATTER: Plummer halo (conservative) ───────────────────────────────
  // Spherical potential: φ = -M_halo / sqrt(r² + a²)
  // Force: F = -M_halo * r / (r² + a²)^(3/2)
  // haloMass is a GM-equivalent parameter (gravitational constant rolled in),
  // decoupled from params.G — the two were tuned independently historically
  // and that calibration is preserved.
  let haloR2 = dot(posHalf, posHalf);
  let haloD2 = haloR2 + params.haloScale * params.haloScale;
  let haloInv3 = 1.0 / (haloD2 * sqrt(haloD2));
  acc -= posHalf * (params.haloMass * haloInv3);

  // ── DARK MATTER: Miyamoto-Nagai disk (conservative) ────────────────────────
  // Flattened axisymmetric potential: φ = -M_disk / sqrt(R² + (a + sqrt(z² + b²))²)
  // where R = cylindrical radius, z = height above disk plane.
  // Force in Cartesian: F = -M / D³ * (R_vec + n * z * a / B)
  // diskMass is GM-equivalent (same reasoning as haloMass above).
  let n = params.diskNormal;
  let zDisk = dot(posHalf, n);
  let B = sqrt(zDisk * zDisk + params.diskScaleB * params.diskScaleB);
  let A = params.diskScaleA + B;
  let R2 = haloR2 - zDisk * zDisk;  // reuse |posHalf|² from halo calc
  let D2 = R2 + A * A;
  let diskInv3 = 1.0 / (D2 * sqrt(D2));
  let Rvec = posHalf - zDisk * n;
  acc -= (Rvec + n * (zDisk * params.diskScaleA / B)) * (params.diskMass * diskInv3);

  // ── SOFT OUTER BOUNDARY (conservative) ──────────────────────────────────────
  let dist = sqrt(haloR2 + 0.0001);
  let boundaryExcess = max(0.0, dist - N_BODY_OUTER_RADIUS);
  acc -= (posHalf / dist) * (boundaryExcess * N_BODY_BOUNDARY_PULL);

  // ── TIDAL QUADRUPOLE (conservative) ─────────────────────────────────────────
  // Slowly rotating quadrupole seeds spiral arms via differential rotation.
  let tidalAngle = params.time * 0.15;
  let tidalCos = cos(tidalAngle);
  let tidalSin = sin(tidalAngle);
  let axisA = vec3f(tidalCos, 0.0, tidalSin);
  let axisB = vec3f(-tidalSin, 0.0, tidalCos);
  acc += params.tidalStrength * (axisA * dot(posHalf, axisA) - axisB * dot(posHalf, axisB));

  // ── DKD STEP 2: Kick (full step) ───────────────────────────────────────────
  let velNew = me.vel + acc * params.dt;

  // ── DKD STEP 3: Second half-drift + periodic wrap ──────────────────────────
  // Wrap only the FINAL position. Wrapping posHalf mid-integrator would break
  // DKD symmetry because the force evaluation assumes posHalf is the midpoint
  // between in/out positions; a wrap jump there would desynchronize pairs.
  let posNewRaw = posHalf + velNew * halfDt;
  let posNew = wrapPeriodic(posNewRaw);

  bodiesOut[idx] = Body(posNew, me.mass, velNew, 0.0, vec3f(0.0), 0.0);
}
`,lt=`// [LAW:one-source-of-truth] System-wide statistics computed in one reduction pass.
// Single-workgroup reduction: 64 threads cooperatively sum over all bodies.
// Output struct provides KE, PE estimate, rmsRadius, rmsHeight, angular momentum for
// CPU-side dynamic equilibrium control (virial ratio targeting).

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

struct StatsParams {
  count: u32,
  sourceCount: u32,
  softeningSq: f32,
  G: f32,
}

// Output: 8 floats = 32 bytes
// [0] totalKE           — sum of 0.5 * m * |v|²
// [1] totalPE           — estimated from sum of -G * m * M_enclosed(r) / r
// [2] sumR2             — sum of |pos|² (for rmsRadius = sqrt(sumR2 / count))
// [3] sumH2             — sum of (pos · diskNormal)² (for rmsHeight)
// [4-6] angularMomentum — sum of cross(pos, vel) * mass
// [7] totalMass         — sum of mass
struct StatsOutput {
  data: array<f32, 8>,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<storage, read_write> out: StatsOutput;
@group(0) @binding(2) var<uniform> params: StatsParams;

// Per-thread partial sums: 8 floats each
var<workgroup> partials: array<array<f32, 8>, 64>;

@compute @workgroup_size(64)
fn main(@builtin(local_invocation_id) lid: vec3u) {
  var ke: f32 = 0.0;
  var pe: f32 = 0.0;
  var r2sum: f32 = 0.0;
  var h2sum: f32 = 0.0;
  var lx: f32 = 0.0;
  var ly: f32 = 0.0;
  var lz: f32 = 0.0;
  var msum: f32 = 0.0;

  let n = params.count;
  let sc = params.sourceCount;
  let softSq = params.softeningSq;
  let G = params.G;

  // Precompute cumulative mass profile for PE estimation.
  // Approximate: enclosed mass at radius r ≈ (sourceCount * avgMass) * (r/rMax)^2 for uniform-ish halo.
  // This avoids O(N²) pairwise computation. The PE per particle is then -G * M_enc(r) * m / r.

  var i = lid.x;
  loop {
    if (i >= n) { break; }
    let b = bodies[i];
    let m = b.mass;
    let v2 = dot(b.vel, b.vel);
    let r2 = dot(b.pos, b.pos);
    let r = sqrt(r2 + 0.0001);

    // Kinetic energy — use actual mass, not clamped, so zero-mass tracers don't inflate KE
    ke += 0.5 * m * v2;

    // Potential energy: PE_i = -G_raw * M_enclosed(r) * m_i / sqrt(r² + ε²)
    // M_enclosed uses the exponential profile integral: (-1/λ)*exp(-λ*r/scale) + 1/λ
    // normalized by the integral at the full scale.
    let lambda = 5.0;
    let scale = 3.5;
    let intR = (-1.0/lambda) * exp(-lambda * r / scale) + (1.0/lambda);
    let intMax = (-1.0/lambda) * exp(-lambda) + (1.0/lambda);
    let encFrac = clamp(intR / intMax, 0.0, 1.0);
    // Average source body mass ≈ 0.9 (midpoint of big 0.8-1.8 and medium 0.3-0.9 ranges)
    let totalSourceMass = f32(sc) * 0.9;
    pe -= G * encFrac * totalSourceMass * m * inverseSqrt(r2 + softSq);

    // Radius squared
    r2sum += r2;

    // Height above y=0 plane (approximate disk normal as y-axis for reduction)
    // The CPU-side normal rotation handles the actual disk plane.
    h2sum += b.pos.y * b.pos.y;

    // Angular momentum: L = r × (m*v)
    let mv = max(m, 0.001);
    lx += (b.pos.y * b.vel.z - b.pos.z * b.vel.y) * mv;
    ly += (b.pos.z * b.vel.x - b.pos.x * b.vel.z) * mv;
    lz += (b.pos.x * b.vel.y - b.pos.y * b.vel.x) * mv;

    msum += m;

    i += 64u;
  }

  partials[lid.x] = array<f32, 8>(ke, pe, r2sum, h2sum, lx, ly, lz, msum);
  workgroupBarrier();

  // Thread 0 reduces all partials
  if (lid.x == 0u) {
    var totals = array<f32, 8>(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    for (var k = 0u; k < 64u; k++) {
      for (var j = 0u; j < 8u; j++) {
        totals[j] += partials[k][j];
      }
    }
    out.data = totals;
  }
}
`,ut=`struct Camera {
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
  interactPos: vec3f,
  interactActive: f32,
}

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

// [LAW:one-source-of-truth] blurTime is sim-step-width × baseDt — the world-space time span a single
// display frame represents. 0 for live play or manual stepping (particle renders as a circle).
// Non-zero during skip: particle renders as a velocity-aligned capsule spanning (pos - vel*blurTime, pos).
struct BlurParams {
  blurTime: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
}

// [LAW:one-source-of-truth] World-space attractor field for render-time HDR boost and color tint.
// Packed CPU-side each frame; count u32 in the header, 32 attractor slots, strength already log-normalized
// to [0,1] so the shader just does a linear gaussian sum.
struct FieldAttractor {
  pos: vec3f,
  strengthNorm: f32,
}
struct AttractorField {
  count: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
  attractors: array<FieldAttractor, 32>,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> blurParams: BlurParams;
@group(0) @binding(3) var<uniform> field: AttractorField;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
  @location(2) speed: f32,
  @location(3) interactProximity: f32,
  // headU: fraction along the along-axis (uv.x space [-1,1]) where the particle's current position
  // sits. At blurTime=0 this is 0 (center) and the quad shades as the original symmetric billboard.
  // During skip this is >0 so intensity peaks at the head and fades toward the tail.
  @location(4) headU: f32,
}

// [LAW:dataflow-not-control-flow] Per-particle hash gives deterministic visual jitter without storing extra data.
fn pcgHash(input: u32) -> f32 {
  var state = input * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return f32((word >> 22u) ^ word) / 4294967295.0;
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let body = bodies[iid];

  let quadPos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  let headView = camera.view * vec4f(body.pos, 1.0);
  let tailView = camera.view * vec4f(body.pos - body.vel * blurParams.blurTime, 1.0);

  // [LAW:single-enforcer] Mass-to-appearance compression is owned here so physics mass stays authoritative while visuals remain legible.
  let massVisual = clamp(sqrt(max(body.mass, 0.02)) / 1.8, 0.08, 1.0);
  let speed = length(body.vel);

  // Particle radius in view space — scales with depth so on-screen pixel size stays consistent.
  let depth = min(max(abs(headView.z), 0.05), 30.0);
  let pixelScale = 0.0055 * depth * mix(0.6, 3.0, massVisual);

  // Capsule geometry: quad aligned from tail to head in view space, padded by pixelScale on each end
  // (so the rounded caps show up). When tail == head (blurTime=0 or stationary), this collapses to
  // a symmetric 2*pixelScale square — the original billboard.
  let streakView = headView.xy - tailView.xy;
  let streakLen = length(streakView);
  // Small-ε guard so the normalize is stable at zero velocity; the resulting \`along\` only drives
  // elongation, which is already ~0 in that case.
  let along = select(vec2f(1.0, 0.0), streakView / max(streakLen, 0.0001), streakLen > 0.0001);
  let across = vec2f(-along.y, along.x);

  let centerView = (headView.xy + tailView.xy) * 0.5;
  let halfLength = streakLen * 0.5 + pixelScale;
  let halfWidth = pixelScale;

  let q = quadPos[vid];
  let offsetXY = along * (q.x * halfLength) + across * (q.y * halfWidth);
  // Use head's z/w so depth-sorting of the capsule is consistent with a point at head position.
  let billboarded = vec4f(centerView + offsetXY, headView.z, headView.w);

  var out: VSOut;
  out.pos = camera.proj * billboarded;
  out.uv = q;
  // Head's along-axis position within the quad's [-1,1] uv space. halfLength includes pixelScale padding,
  // so at blurTime=0 the head is at 0 (center). At high blurTime, head approaches +1 (far end).
  out.headU = (streakLen * 0.5) / halfLength;

  // Per-particle hashes for visual variety — deterministic, no extra storage.
  let hash0 = pcgHash(iid);
  let hash1 = pcgHash(iid + 7919u);  // second hash for independent variation

  // Rich stellar palette — 10 hues, no greens, continuously interpolated for smooth variety.
  let palette = array<vec3f, 10>(
    vec3f(1.0, 0.85, 0.5),    // warm gold
    vec3f(1.0, 0.6, 0.35),    // deep amber
    vec3f(1.0, 0.4, 0.4),     // soft red
    vec3f(1.0, 0.45, 0.6),    // warm rose
    vec3f(0.95, 0.4, 0.75),   // magenta-pink
    vec3f(0.75, 0.4, 0.95),   // orchid
    vec3f(0.55, 0.4, 1.0),    // violet
    vec3f(0.4, 0.5, 1.0),     // periwinkle
    vec3f(0.4, 0.65, 0.95),   // steel blue
    vec3f(0.85, 0.7, 1.0),    // lavender
  );

  // Continuous palette interpolation — hash picks a position along the 10-color ramp and lerps between neighbors.
  let palettePos = hash1 * 9.0;
  let paletteIdx = u32(palettePos);
  let paletteFrac = fract(palettePos);
  let stellarCol = mix(palette[paletteIdx], palette[min(paletteIdx + 1u, 9u)], paletteFrac);

  // ~50% of particles use pure stellar palette, rest blend with theme for cohesion.
  let massTint = clamp(pow(massVisual, 0.7), 0.0, 1.0);
  let jitteredTint = clamp(massTint + (hash0 - 0.5) * 0.3, 0.0, 1.0);
  let themeBase = mix(camera.primary, camera.secondary, jitteredTint);
  let useTheme = hash0 > 0.5;
  var col = select(stellarCol, mix(themeBase, stellarCol, 0.5), useTheme);

  // Heavy bodies pick up accent with hash-varied threshold.
  let heavyThreshold = 0.5 + hash0 * 0.3;
  let heavyTint = smoothstep(heavyThreshold, heavyThreshold + 0.2, massVisual);
  col = mix(col, mix(col, camera.accent, 0.55), heavyTint);

  // Velocity color shift: fast particles warm toward rose/amber, giving visual energy.
  let speedTint = smoothstep(0.5, 2.5, speed) * 0.2;
  col = mix(col, col * vec3f(1.0, 0.75, 0.4), speedTint);

  // [LAW:dataflow-not-control-flow] Attractor-field glow: sum a gaussian contribution from every active
  // attractor. Replaces the legacy single-point interactPos path. Zero-strength attractors naturally
  // contribute zero — no branching. Gaussian radius r0 is in world units.
  let r0 = 1.8;
  let invR2 = 1.0 / (r0 * r0);
  var fieldBoost = 0.0;
  for (var i = 0u; i < field.count; i++) {
    let a = field.attractors[i];
    let d = body.pos - a.pos;
    let g = a.strengthNorm * exp(-dot(d, d) * invR2);
    fieldBoost = fieldBoost + g;
  }
  let proximity = clamp(fieldBoost, 0.0, 1.5);
  col = mix(col, camera.accent * 1.6, clamp(proximity * 0.55, 0.0, 0.8));

  out.color = col;
  out.speed = speed;
  out.interactProximity = proximity;
  return out;
}

@fragment
fn fs_main(
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
  @location(2) speed: f32,
  @location(3) interactProximity: f32,
  @location(4) headU: f32,
) -> @location(0) vec4f {
  // Distance from the current particle "head" along the streak axis. For static particles (headU=0)
  // this is just |uv.x|, so combined with |uv.y| it recovers the original radial distance and the
  // original exp(-dist*22) core + exp(-dist*5) halo fall naturally out of the formulas below.
  let dx = uv.x - headU;
  // Along-axis distance: same magnitude past the head (stretch-direction) as away from it on the tail side.
  // On the tail side, dx is negative; we compress by 0.5 so the trail extends visibly.
  let dAlong = select(abs(dx), -dx * 0.5, dx < 0.0);
  let dist = sqrt(dAlong * dAlong + uv.y * uv.y);

  if (dist > 1.0) { discard; }
  let core = exp(-dist * 22.0) * 1.8;
  let halo = exp(-dist * 5.0) * 0.45;
  let intensity = core + halo;
  let whiteShift = clamp(core * 0.06, 0.0, 0.3);
  let tinted = mix(color, vec3f(1.0), whiteShift);

  // Velocity-dependent interaction flare: fast particles near any attractor glow brighter in accent,
  // producing visible tendrils of infalling material. Adds HDR brightness that feeds the bloom pass
  // naturally — no composite overlay required.
  let speedGlow = smoothstep(0.5, 2.5, speed) * interactProximity * 0.45;
  let fieldBrightness = 1.0 + interactProximity * 1.1;

  return vec4f(tinted * (intensity * fieldBrightness + speedGlow), 1.0);
}
`,dt=`// Marker particles: small bright tracers orbiting each active attractor. Shares the same HDR scene
// target as the main N-body render so they feed the bloom pass naturally — no overlay, no reticle.

struct Camera {
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
  interactPos: vec3f,
  interactActive: f32,
}

// Per-marker payload written by CPU each frame. strengthNorm drives brightness/size; it's the parent
// attractor's log-normalized strength so a maxed-ceiling attractor makes its swarm pop.
struct Marker {
  pos: vec3f,
  strengthNorm: f32,
  tint: vec3f,
  seed: f32,
}

@group(0) @binding(0) var<storage, read> markers: array<Marker>;
@group(0) @binding(1) var<uniform> camera: Camera;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
  @location(2) brightness: f32,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let m = markers[iid];

  let quadPos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  let view = camera.view * vec4f(m.pos, 1.0);
  let depth = min(max(abs(view.z), 0.05), 30.0);
  // Size grows gently with strength so dormant wands show a faint dusting and charged ones burn bright.
  let sizeScale = 0.0040 * depth * (0.7 + 0.9 * m.strengthNorm);
  let q = quadPos[vid];
  let billboarded = vec4f(view.xy + q * sizeScale, view.z, view.w);

  var out: VSOut;
  out.pos = camera.proj * billboarded;
  out.uv = q;
  out.color = mix(camera.accent, m.tint, 0.35);
  out.brightness = 0.6 + 1.6 * m.strengthNorm;
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f, @location(1) color: vec3f, @location(2) brightness: f32) -> @location(0) vec4f {
  let d = length(uv);
  if (d > 1.0) { discard; }
  // Soft gaussian falloff — reads as a floating dust mote / spark, feeds bloom without hard edges.
  let core = exp(-d * 4.5) * 1.3;
  let halo = exp(-d * 1.8) * 0.35;
  let intensity = (core + halo) * brightness;
  return vec4f(color * intensity, 1.0);
}
`,ft=`// Classic n-body compute — preserved verbatim from the original shader-playground for A/B comparison.
// Body is 32 bytes (no \`home\` field). Attractor lives inside Params (no separate uniform here).

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
}

struct Params {
  dt: f32,
  G: f32,
  softening: f32,
  damping: f32,
  count: u32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
  attractorX: f32,
  attractorY: f32,
  attractorZ: f32,
  attractorActive: f32,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodiesIn[idx];
  var acc = vec3f(0.0);

  for (var i = 0u; i < params.count; i++) {
    if (i == idx) { continue; }
    let other = bodiesIn[i];
    let diff = other.pos - me.pos;
    let dist2 = dot(diff, diff) + params.softening * params.softening;
    let inv = 1.0 / sqrt(dist2);
    let inv3 = inv * inv * inv;
    acc += diff * (params.G * other.mass * inv3);
  }

  // Attractor from ctrl+click — behaves like a massive body
  if (params.attractorActive > 0.5) {
    let aPos = vec3f(params.attractorX, params.attractorY, params.attractorZ);
    let diff = aPos - me.pos;
    let dist2 = dot(diff, diff) + params.softening * params.softening;
    let inv = 1.0 / sqrt(dist2);
    let inv3 = inv * inv * inv;
    acc += diff * (params.G * 200.0 * inv3);
  }

  // Gentle drift toward center when no attractor active — prevents bodies from escaping
  let toCenter = -me.pos;
  let centerDist = length(toCenter);
  if (centerDist > 1.0) {
    acc += toCenter * (0.001 * (centerDist - 1.0));
  }

  var vel = (me.vel + acc * params.dt) * params.damping;
  let pos = me.pos + vel * params.dt;

  bodiesOut[idx] = Body(pos, me.mass, vel, 0.0);
}
`,pt=`// PM CIC (cloud-in-cell) deposition. Each particle scatters its mass into
// the 8 surrounding grid cells with trilinear weights. Mass is pre-multiplied
// by PM_FIXED_POINT_SCALE so atomicAdd<u32> can accumulate fractional values
// without losing precision. [LAW:single-enforcer] This shader is the sole
// writer of pmDensityU32Buffer.
//
// Reversibility: the particle is half-drifted to posHalf so deposition matches
// the force-evaluation position used by the main compute shader. Wrapping to
// a different position would desynchronize PM gravity from the tile-pair sum.

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  _unused: vec3f,
  _pad2: f32,
}

// Shared layout with pm.density_convert.wgsl / pm.interpolate_nested.wgsl.
// Only this shader reads \`filterOutOfDomain\`; the other shaders ignore it.
//
// filterOutOfDomain semantics (data-driven per-grid behavior):
//   0 → full periodic deposit. wrapIdx below scatters mass across the grid's
//       periodic boundary correctly. Right for the outer 3-torus grid, where
//       the periodic domain IS the physical domain.
//   1 → subdomain filter. Particles outside ±domainHalf return early without
//       depositing. Right for the inner subdomain grid (±16) — without this
//       filter, a particle at world x=20 would wrap-pollute cells near x=-12
//       via the periodic index wrap, creating phantom density.
//
// Why not a single threshold? The outer grid's \`domainHalf\` equals the
// periodic-wrap radius (64), but \`posHalf = pos + vel*halfDt\` is computed
// BEFORE \`nbody.compute.wgsl\`'s end-of-step periodic wrap. A fast particle
// near +64 can have posHalf > 64 for one step. Filtering on \`domainHalf\`
// for the outer grid would silently drop that particle's mass — breaking
// density conservation. The flag makes the filter strictly about subdomain
// containment, not about periodic wrap.
struct Params {
  dt: f32,
  count: u32,
  gridRes: u32,
  domainHalf: f32,
  cellSize: f32,
  fixedPointScale: f32,
  cellCount: u32,
  filterOutOfDomain: u32,  // 0 = periodic grid (no filter), 1 = subdomain grid (filter)
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<storage, read_write> density: array<atomic<u32>>;
@group(0) @binding(2) var<uniform> params: Params;

// Floor-mod in signed int. WGSL's % has sign-of-dividend semantics, so naive
// negative indices wrap wrong; ((i%n)+n)%n is the canonical fix.
fn wrapIdx(i: i32, n: i32) -> u32 {
  let m = ((i % n) + n) % n;
  return u32(m);
}

fn cellIndex(ix: i32, iy: i32, iz: i32, gridRes: i32) -> u32 {
  let x = wrapIdx(ix, gridRes);
  let y = wrapIdx(iy, gridRes);
  let z = wrapIdx(iz, gridRes);
  let n = u32(gridRes);
  return z * n * n + y * n + x;
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodies[idx];
  let halfDt = params.dt * 0.5;
  // [LAW:one-source-of-truth] Deposition happens at the DKD half-step position,
  // matching the force evaluation in nbody.compute.wgsl.
  let posHalf = me.pos + me.vel * halfDt;

  // Subdomain filter (gated by the per-grid filterOutOfDomain flag).
  // See the Params struct header for the full rationale — the short version:
  // outer grid = 3-torus, wants periodic wrap (filter OFF); inner grid =
  // ±16 subdomain, wants strict containment (filter ON).
  let outOfDomain = abs(posHalf.x) > params.domainHalf
                 || abs(posHalf.y) > params.domainHalf
                 || abs(posHalf.z) > params.domainHalf;
  if (outOfDomain && params.filterOutOfDomain != 0u) { return; }

  // World → fractional grid coords. Grid spans [-domainHalf, +domainHalf);
  // cell centers are at (cell_i + 0.5) * cellSize - domainHalf.
  let fgrid = (posHalf + vec3f(params.domainHalf)) / params.cellSize - vec3f(0.5);
  let i0 = vec3i(floor(fgrid));
  let f  = fgrid - vec3f(i0);  // fractional, in [0, 1)
  let g  = vec3f(1.0) - f;

  let m = me.mass * params.fixedPointScale;
  let gr = i32(params.gridRes);

  // 8-corner CIC kernel. Weights sum to exactly 1.0.
  atomicAdd(&density[cellIndex(i0.x,     i0.y,     i0.z,     gr)], u32(m * g.x * g.y * g.z));
  atomicAdd(&density[cellIndex(i0.x + 1, i0.y,     i0.z,     gr)], u32(m * f.x * g.y * g.z));
  atomicAdd(&density[cellIndex(i0.x,     i0.y + 1, i0.z,     gr)], u32(m * g.x * f.y * g.z));
  atomicAdd(&density[cellIndex(i0.x + 1, i0.y + 1, i0.z,     gr)], u32(m * f.x * f.y * g.z));
  atomicAdd(&density[cellIndex(i0.x,     i0.y,     i0.z + 1, gr)], u32(m * g.x * g.y * f.z));
  atomicAdd(&density[cellIndex(i0.x + 1, i0.y,     i0.z + 1, gr)], u32(m * f.x * g.y * f.z));
  atomicAdd(&density[cellIndex(i0.x,     i0.y + 1, i0.z + 1, gr)], u32(m * g.x * f.y * f.z));
  atomicAdd(&density[cellIndex(i0.x + 1, i0.y + 1, i0.z + 1, gr)], u32(m * f.x * f.y * f.z));
}
`,mt=`// PM density post-processing. Two entry points share one bind group layout:
//   reduce  — sum densityU32 (fixed-point) into meanScratch[0]
//   convert — for each cell: load u32, convert to f32, subtract mean, write f32
//
// The periodic Poisson solver in ticket .4 requires a mean-zero density. This
// shader's sole job is to produce that. densityU32 is NOT zeroed here — the
// host (main.ts) zeroes it with encoder.clearBuffer at the top of each frame
// so both this shader's final value and the next frame's fresh deposit start
// from a known-zero buffer.

// Shares layout with pm.deposit.wgsl Params so one host-side uniform buffer
// serves both pipelines. Only fixedPointScale and cellCount are read here.
struct Params {
  dt: f32,
  count: u32,
  gridRes: u32,
  domainHalf: f32,
  cellSize: f32,
  fixedPointScale: f32,
  cellCount: u32,         // = gridRes³
  _pad: u32,
}

@group(0) @binding(0) var<storage, read_write> densityU32: array<atomic<u32>>;
@group(0) @binding(1) var<storage, read_write> densityF32: array<f32>;
@group(0) @binding(2) var<storage, read_write> meanScratch: array<atomic<u32>>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(256)
fn reduce(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.cellCount) { return; }
  // [LAW:dataflow-not-control-flow] Every in-range thread contributes its one
  // cell to the global sum. Workgroup-local reduction would cut atomic traffic
  // ~256×; keeping it simple here and letting the hardware arbitrate.
  let v = atomicLoad(&densityU32[idx]);
  atomicAdd(&meanScratch[0], v);
}

@compute @workgroup_size(256)
fn convert(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.cellCount) { return; }
  // meanScratch[0] holds the total fixed-point density (sum over all cells).
  // Dividing by cellCount and by scale gives the per-cell mean density in f32.
  let sumRaw = atomicLoad(&meanScratch[0]);
  let mean = f32(sumRaw) / (f32(params.cellCount) * params.fixedPointScale);
  let cellRaw = atomicLoad(&densityU32[idx]);
  let cellDensity = f32(cellRaw) / params.fixedPointScale;
  densityF32[idx] = cellDensity - mean;
}
`,ht=`// Red-black Gauss-Seidel smoother for the multigrid V-cycle.
// Dispatched twice per sweep: once with colorParity=0 (red), once with 1 (black).
// Within one dispatch, every thread of the matching parity updates its cell
// in-place using neighbor values — neighbors are the opposite color so no
// intra-dispatch read/write race.
//
// Update rule derived from the 7-point Laplacian:
//   (neighbor_sum - 6φ) / h² = 4πG ρ
//   → φ = (neighbor_sum - h² · 4πG ρ) / 6
//
// Boundary modes (selected per-dispatch via uniform):
//   dirichletBoundary = 0 → periodic wrap, all cells update (outer grid / 3-torus).
//   dirichletBoundary = 1 → wrap stays (for neighbor reads that never reach a
//     face cell from an interior update anyway) but face cells themselves are
//     frozen — they hold the BC that pm.boundary_sample wrote at the start of
//     the cycle. Interior cells' neighbor reads landing on a face cell see the
//     BC value, which is the finite-difference encoding of Dirichlet BC.

struct Params {
  gridRes: u32,
  colorParity: u32,   // 0 = red, 1 = black
  hSquared: f32,
  fourPiG: f32,
  dirichletBoundary: u32,  // 0 = periodic, 1 = freeze face cells
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
}

@group(0) @binding(0) var<storage, read_write> phi: array<f32>;
@group(0) @binding(1) var<storage, read> rho: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

fn wrapIdx(i: i32, n: u32) -> u32 {
  let ni = i32(n);
  return u32(((i % ni) + ni) % ni);
}

fn idx(ix: i32, iy: i32, iz: i32, n: u32) -> u32 {
  let x = wrapIdx(ix, n);
  let y = wrapIdx(iy, n);
  let z = wrapIdx(iz, n);
  return z * n * n + y * n + x;
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let n = params.gridRes;
  if (gid.x >= n || gid.y >= n || gid.z >= n) { return; }

  // Skip cells not matching this dispatch's color parity. One thread per cell;
  // the half of lanes in each workgroup whose parity mismatches return early.
  let parity = (gid.x + gid.y + gid.z) & 1u;
  if (parity != params.colorParity) { return; }

  let ix = i32(gid.x);
  let iy = i32(gid.y);
  let iz = i32(gid.z);

  let neighborSum =
      phi[idx(ix + 1, iy,     iz,     n)]
    + phi[idx(ix - 1, iy,     iz,     n)]
    + phi[idx(ix,     iy + 1, iz,     n)]
    + phi[idx(ix,     iy - 1, iz,     n)]
    + phi[idx(ix,     iy,     iz + 1, n)]
    + phi[idx(ix,     iy,     iz - 1, n)];

  let me = idx(ix, iy, iz, n);
  let newPhi = (neighborSum - params.hSquared * params.fourPiG * rho[me]) / 6.0;

  // [LAW:dataflow-not-control-flow] Always compute newPhi; the frozen-vs-update
  // decision lives in the value stored, not in whether the code runs.
  let nm1 = n - 1u;
  let atBoundary = gid.x == 0u || gid.x == nm1
                || gid.y == 0u || gid.y == nm1
                || gid.z == 0u || gid.z == nm1;
  let freeze = atBoundary && params.dirichletBoundary != 0u;
  phi[me] = select(newPhi, phi[me], freeze);
}
`,gt=`// Compute residual r = 4πGρ - ∇²φ with the same 7-point stencil + periodic
// wrap used by the smoother. Run once per level between pre-smoothing and
// restriction: the residual is what gets coarsened and solved more cheaply
// on the smaller grid, then interpolated back as a correction.
//
// For Dirichlet boundaries: residual at face cells = 0 regardless of the
// stencil (the "equation" there is φ = g, not ∇²φ = 4πGρ, so its residual is
// exactly 0 once the BC is satisfied). Zeroing face residuals here prevents
// garbage from polluting the restricted RHS at the next coarser level.

struct Params {
  gridRes: u32,
  _pad: u32,
  hSquared: f32,
  fourPiG: f32,
  dirichletBoundary: u32,  // 0 = periodic (include boundary in residual), 1 = zero boundary residual
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
}

@group(0) @binding(0) var<storage, read> phi: array<f32>;
@group(0) @binding(1) var<storage, read> rho: array<f32>;
@group(0) @binding(2) var<storage, read_write> residual: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

fn wrapIdx(i: i32, n: u32) -> u32 {
  let ni = i32(n);
  return u32(((i % ni) + ni) % ni);
}

fn idx(ix: i32, iy: i32, iz: i32, n: u32) -> u32 {
  let x = wrapIdx(ix, n);
  let y = wrapIdx(iy, n);
  let z = wrapIdx(iz, n);
  return z * n * n + y * n + x;
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let n = params.gridRes;
  if (gid.x >= n || gid.y >= n || gid.z >= n) { return; }

  let ix = i32(gid.x);
  let iy = i32(gid.y);
  let iz = i32(gid.z);
  let me = idx(ix, iy, iz, n);

  let laplacian = (
      phi[idx(ix + 1, iy,     iz,     n)]
    + phi[idx(ix - 1, iy,     iz,     n)]
    + phi[idx(ix,     iy + 1, iz,     n)]
    + phi[idx(ix,     iy - 1, iz,     n)]
    + phi[idx(ix,     iy,     iz + 1, n)]
    + phi[idx(ix,     iy,     iz - 1, n)]
    - 6.0 * phi[me]
  ) / params.hSquared;

  let r = params.fourPiG * rho[me] - laplacian;
  let nm1 = n - 1u;
  let atBoundary = gid.x == 0u || gid.x == nm1
                || gid.y == 0u || gid.y == nm1
                || gid.z == 0u || gid.z == nm1;
  let freeze = atBoundary && params.dirichletBoundary != 0u;
  residual[me] = select(r, 0.0, freeze);
}
`,_t=`// Restriction (fine → coarse) for the multigrid V-cycle. Each coarse cell
// is the straight average of its 8 overlapping fine cells (2×2×2 block).
// Dispatched at coarse-level workgroup counts; fine index computed from
// coarse index as 2*cx + dx.
//
// No periodic wrap needed: the 2×2×2 source block is always within the fine
// domain because coarse_i * 2 + {0,1} stays in [0, fineGridRes).

struct Params {
  coarseGridRes: u32,   // fineGridRes = 2 * coarseGridRes
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
}

@group(0) @binding(0) var<storage, read> fine: array<f32>;
@group(0) @binding(1) var<storage, read_write> coarse: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let nC = params.coarseGridRes;
  if (gid.x >= nC || gid.y >= nC || gid.z >= nC) { return; }

  let nF = 2u * nC;
  let cx = gid.x;
  let cy = gid.y;
  let cz = gid.z;

  var sum = 0.0;
  for (var dz = 0u; dz < 2u; dz = dz + 1u) {
    for (var dy = 0u; dy < 2u; dy = dy + 1u) {
      for (var dx = 0u; dx < 2u; dx = dx + 1u) {
        let fx = 2u * cx + dx;
        let fy = 2u * cy + dy;
        let fz = 2u * cz + dz;
        sum = sum + fine[fz * nF * nF + fy * nF + fx];
      }
    }
  }
  coarse[cz * nC * nC + cy * nC + cx] = sum * 0.125;
}
`,vt=`// Prolongation (coarse → fine) for the multigrid V-cycle. Each fine cell is
// trilinearly interpolated from the 8 surrounding coarse cells, and the
// interpolated value is ADDED to the fine buffer (it's a correction to the
// existing potential, not a replacement).
//
// Periodic wrap on coarse indices handles cells near the domain faces.

struct Params {
  fineGridRes: u32,   // coarseGridRes = fineGridRes / 2
  dirichletBoundary: u32,  // 0 = periodic (add correction everywhere), 1 = skip fine face cells
  _pad1: u32,
  _pad2: u32,
}

@group(0) @binding(0) var<storage, read> coarse: array<f32>;
@group(0) @binding(1) var<storage, read_write> fine: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

fn wrapIdx(i: i32, n: u32) -> u32 {
  let ni = i32(n);
  return u32(((i % ni) + ni) % ni);
}

fn cidx(ix: i32, iy: i32, iz: i32, n: u32) -> u32 {
  let x = wrapIdx(ix, n);
  let y = wrapIdx(iy, n);
  let z = wrapIdx(iz, n);
  return z * n * n + y * n + x;
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let nF = params.fineGridRes;
  if (gid.x >= nF || gid.y >= nF || gid.z >= nF) { return; }

  let nC = nF / 2u;

  // Coarse-coordinate position of this fine cell's center. The cell-center
  // offset of 0.25 aligns coarse cells to lie midway between fine cells.
  let fx = f32(gid.x) * 0.5 - 0.25;
  let fy = f32(gid.y) * 0.5 - 0.25;
  let fz = f32(gid.z) * 0.5 - 0.25;
  let i0 = vec3i(floor(vec3f(fx, fy, fz)));
  let frac = vec3f(fx, fy, fz) - vec3f(i0);
  let g = vec3f(1.0) - frac;

  let sum =
      coarse[cidx(i0.x,     i0.y,     i0.z,     nC)] * g.x * g.y * g.z
    + coarse[cidx(i0.x + 1, i0.y,     i0.z,     nC)] * frac.x * g.y * g.z
    + coarse[cidx(i0.x,     i0.y + 1, i0.z,     nC)] * g.x * frac.y * g.z
    + coarse[cidx(i0.x + 1, i0.y + 1, i0.z,     nC)] * frac.x * frac.y * g.z
    + coarse[cidx(i0.x,     i0.y,     i0.z + 1, nC)] * g.x * g.y * frac.z
    + coarse[cidx(i0.x + 1, i0.y,     i0.z + 1, nC)] * frac.x * g.y * frac.z
    + coarse[cidx(i0.x,     i0.y + 1, i0.z + 1, nC)] * g.x * frac.y * frac.z
    + coarse[cidx(i0.x + 1, i0.y + 1, i0.z + 1, nC)] * frac.x * frac.y * frac.z;

  // [LAW:dataflow-not-control-flow] For Dirichlet BC, fine face cells must
  // stay at their held value (BC at level 0, zero at coarser correction
  // levels). Compute the new value then select old-vs-new by face mask.
  let me = gid.z * nF * nF + gid.y * nF + gid.x;
  let nm1 = nF - 1u;
  let atBoundary = gid.x == 0u || gid.x == nm1
                || gid.y == 0u || gid.y == nm1
                || gid.z == 0u || gid.z == nm1;
  let freeze = atBoundary && params.dirichletBoundary != 0u;
  let oldFine = fine[me];
  fine[me] = select(oldFine + sum, oldFine, freeze);
}
`,yt=`// PM force interpolation (CIC-weighted). For each particle, read the
// potential's central-difference gradient at the 8 surrounding cell centers,
// then CIC-weight those cell-center forces to get the particle's PM
// acceleration. One vec4 result per particle (xyz = force, w = 0 pad).
//
// Using the SAME CIC kernel here as in deposition is required for momentum
// conservation: the interpolation kernel is the transpose of the deposition
// kernel, so the force that particle i feels from particle j under PM equals
// the force j feels from i — Newton's 3rd law preserved.

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  _unused: vec3f,
  _pad2: f32,
}

// Shared layout with pm.deposit.wgsl / pm.density_convert.wgsl. Only dt,
// count, gridRes, domainHalf, cellSize are read here.
struct Params {
  dt: f32,
  count: u32,
  gridRes: u32,
  domainHalf: f32,
  cellSize: f32,
  fixedPointScale: f32,
  cellCount: u32,
  _pad: u32,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<storage, read> phi: array<f32>;
@group(0) @binding(2) var<storage, read_write> forceOut: array<vec4f>;
@group(0) @binding(3) var<uniform> params: Params;

fn wrapIdx(i: i32, n: i32) -> u32 {
  return u32(((i % n) + n) % n);
}

fn cellIdx(ix: i32, iy: i32, iz: i32, n: i32) -> u32 {
  let x = wrapIdx(ix, n);
  let y = wrapIdx(iy, n);
  let z = wrapIdx(iz, n);
  let nu = u32(n);
  return u32(z) * nu * nu + u32(y) * nu + u32(x);
}

// Force at a cell center = -∇φ via central differences. Periodic wrap on
// indices so domain-face cells produce correct cross-boundary gradients.
fn forceAtCell(ix: i32, iy: i32, iz: i32, n: i32, h: f32) -> vec3f {
  let fx = -(phi[cellIdx(ix + 1, iy,     iz,     n)] - phi[cellIdx(ix - 1, iy,     iz,     n)]) / (2.0 * h);
  let fy = -(phi[cellIdx(ix,     iy + 1, iz,     n)] - phi[cellIdx(ix,     iy - 1, iz,     n)]) / (2.0 * h);
  let fz = -(phi[cellIdx(ix,     iy,     iz + 1, n)] - phi[cellIdx(ix,     iy,     iz - 1, n)]) / (2.0 * h);
  return vec3f(fx, fy, fz);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodies[idx];
  let halfDt = params.dt * 0.5;
  // [LAW:one-source-of-truth] Sample at posHalf to match the DKD midpoint
  // used for force evaluation throughout the N-body step.
  let posHalf = me.pos + me.vel * halfDt;

  // World → fractional grid coords. Matches the deposition kernel exactly.
  let fgrid = (posHalf + vec3f(params.domainHalf)) / params.cellSize - vec3f(0.5);
  let i0 = vec3i(floor(fgrid));
  let f = fgrid - vec3f(i0);
  let g = vec3f(1.0) - f;
  let n = i32(params.gridRes);
  let h = params.cellSize;

  // CIC-weighted sum of 8 cell-center forces.
  var acc = vec3f(0.0);
  acc = acc + forceAtCell(i0.x,     i0.y,     i0.z,     n, h) * g.x * g.y * g.z;
  acc = acc + forceAtCell(i0.x + 1, i0.y,     i0.z,     n, h) * f.x * g.y * g.z;
  acc = acc + forceAtCell(i0.x,     i0.y + 1, i0.z,     n, h) * g.x * f.y * g.z;
  acc = acc + forceAtCell(i0.x + 1, i0.y + 1, i0.z,     n, h) * f.x * f.y * g.z;
  acc = acc + forceAtCell(i0.x,     i0.y,     i0.z + 1, n, h) * g.x * g.y * f.z;
  acc = acc + forceAtCell(i0.x + 1, i0.y,     i0.z + 1, n, h) * f.x * g.y * f.z;
  acc = acc + forceAtCell(i0.x,     i0.y + 1, i0.z + 1, n, h) * g.x * f.y * f.z;
  acc = acc + forceAtCell(i0.x + 1, i0.y + 1, i0.z + 1, n, h) * f.x * f.y * f.z;

  forceOut[idx] = vec4f(acc, 0.0);
}
`,bt=`// Classic n-body render — preserved verbatim for A/B comparison. World-space billboards, soft fuzzy falloff.
// The output is multiplied by a small HDR factor at the end so the bloom/composite stage can lift it; the
// underlying shape and gradient are otherwise identical to the original.

struct Camera {
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
}

struct Attractor {
  // 'enabled' instead of 'active' because WGSL reserves \`active\` as a keyword
  // and would reject \`active: f32\` with "Expected Identifier, got ReservedWord".
  x: f32, y: f32, z: f32, enabled: f32,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> attractor: Attractor;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
  @location(2) glow: f32,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let body = bodies[iid];

  let quadPos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  // Attractor influence: bodies closer to attractor get bigger and shift color
  var attractInfluence = 0.0;
  if (attractor.enabled > 0.5) {
    let aPos = vec3f(attractor.x, attractor.y, attractor.z);
    let toDist = length(aPos - body.pos);
    attractInfluence = clamp(1.0 / (toDist * toDist + 0.1), 0.0, 1.0);
  }

  let viewPos = camera.view * vec4f(body.pos, 1.0);
  let baseSize = 0.04 * (0.5 + body.mass * 0.5);
  let size = baseSize * (1.0 + attractInfluence * 1.5); // swell near attractor
  let offset = quadPos[vid] * size;
  let billboarded = viewPos + vec4f(offset, 0.0, 0.0);

  var out: VSOut;
  out.pos = camera.proj * billboarded;
  out.uv = quadPos[vid];
  out.glow = attractInfluence;

  // Color: primary → secondary by mass, shifts to accent near attractor
  let massTint = clamp(body.mass / 3.0, 0.0, 1.0);
  let baseColor = mix(camera.primary, camera.secondary, massTint);
  let attractColor = camera.accent;
  out.color = mix(baseColor, attractColor, attractInfluence);
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f, @location(1) color: vec3f, @location(2) glow: f32) -> @location(0) vec4f {
  let dist = length(uv);
  // smoothstep requires edge0 <= edge1 in WGSL (undefined behavior otherwise),
  // so we compute the standard form and invert. Result: alpha = 1 at center,
  // 0 at the outer edge, smoothly fading between dist=0.3 and dist=1.0.
  let alpha = 1.0 - smoothstep(0.3, 1.0, dist);
  if (alpha < 0.01) { discard; }
  let g = exp(-dist * 2.0);
  // Extra glow ring when under attractor influence
  let extraGlow = glow * exp(-dist * 1.0) * 0.5;
  // Modest HDR multiplier so the classic look reads through tone mapping without overhauling its character.
  return vec4f(color * (0.5 + g * 0.5 + extraGlow) * 2.5, alpha);
}
`,xt=`struct Params {
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
`,St=`struct Params {
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
`,Ct=`struct Params {
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
`,wt=`struct Params {
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
`,Tt=`struct Params {
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
`,Et=`struct Camera {
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

fn fetchDye(x: i32, y: i32, res: i32) -> vec4f {
  let cx = clamp(x, 0, res - 1);
  let cy = clamp(y, 0, res - 1);
  return dye[cy * res + cx];
}

// Catmull-Rom cubic weights — C1 continuous interpolation, no overshoot tuning
// needed and the 1D weights sum to 1. Used in 2D as a separable 4×4 sample.
fn catmullRom(t: f32) -> vec4f {
  let t2 = t * t;
  let t3 = t2 * t;
  return vec4f(
    -0.5 * t3 +       t2 - 0.5 * t,
     1.5 * t3 - 2.5 * t2 + 1.0,
    -1.5 * t3 + 2.0 * t2 + 0.5 * t,
     0.5 * t3 - 0.5 * t2
  );
}

// Bicubic sample of the dye field. The sim grid (simRes²) is denser than the
// render grid (gridRes²) but the render samples between sim cells. Bilinear is
// only C0 continuous, so the kinks at sim-cell boundaries become visible as
// faint contour bands once the density goes through pow() and Phong lighting.
// Catmull-Rom is C1 continuous → bands disappear.
fn sampleDye(u: f32, v: f32) -> vec4f {
  let res = i32(params.simRes);
  let fx = u * f32(res) - 0.5;
  let fy = v * f32(res) - 0.5;
  let x1 = i32(floor(fx));
  let y1 = i32(floor(fy));
  let tx = fx - f32(x1);
  let ty = fy - f32(y1);
  let wx = catmullRom(tx);
  let wy = catmullRom(ty);

  var rows: array<vec4f, 4>;
  for (var j = 0; j < 4; j = j + 1) {
    let row = fetchDye(x1 - 1, y1 - 1 + j, res) * wx.x
            + fetchDye(x1,     y1 - 1 + j, res) * wx.y
            + fetchDye(x1 + 1, y1 - 1 + j, res) * wx.z
            + fetchDye(x1 + 2, y1 - 1 + j, res) * wx.w;
    rows[j] = row;
  }
  let result = rows[0] * wy.x + rows[1] * wy.y + rows[2] * wy.z + rows[3] * wy.w;
  // Catmull-Rom can ring slightly negative on sharp edges; clamp non-negative
  // since dye density and color are physically non-negative.
  return max(result, vec4f(0.0));
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

// [LAW:one-source-of-truth] Single function maps a density scalar to surface
// height. Used for both top corners and side-wall top edges so adjacent cells
// share heights exactly along their shared edges.
fn heightFromDensity(density: f32) -> f32 {
  let liftedDensity = pow(density, 0.58);
  return 0.14 + liftedDensity * params.heightScale * 2.6;
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

// Each cell instance draws a 36-vert prism: 6 top + 6 bottom + 4 side quads of
// 6 verts each. prismVert encodes per-vertex (corner_x, corner_z, isTop) where
// corner_{x,z} ∈ {0,1} pick which of the 4 cell corners and isTop ∈ {0,1}
// picks top vs bottom edge of that corner column.
fn prismVert(vid: u32) -> vec3f {
  let table = array<vec3f, 36>(
    // Top quad (y = surface, two triangles, CCW from +y)
    vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0),
    vec3f(0.0, 1.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(1.0, 1.0, 1.0),
    // Bottom quad (y = 0, CCW from -y)
    vec3f(0.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0),
    vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
    // -X side (cornerX=0)
    vec3f(0.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0),
    vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0),
    // +X side (cornerX=1)
    vec3f(1.0, 0.0, 0.0), vec3f(1.0, 1.0, 0.0), vec3f(1.0, 0.0, 1.0),
    vec3f(1.0, 0.0, 1.0), vec3f(1.0, 1.0, 0.0), vec3f(1.0, 1.0, 1.0),
    // -Z side (cornerZ=0)
    vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0),
    vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 0.0), vec3f(1.0, 0.0, 1.0),
    // +Z side (cornerZ=1)
    vec3f(0.0, 1.0, 0.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 0.0),
    vec3f(1.0, 1.0, 0.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0)
  );
  return table[vid];
}

// Static face normals for non-top verts (top normals come from density derivatives)
fn faceNormal(vid: u32) -> vec3f {
  if (vid < 6u) { return vec3f(0.0, 1.0, 0.0); }
  if (vid < 12u) { return vec3f(0.0, -1.0, 0.0); }
  if (vid < 18u) { return vec3f(-1.0, 0.0, 0.0); }
  if (vid < 24u) { return vec3f(1.0, 0.0, 0.0); }
  if (vid < 30u) { return vec3f(0.0, 0.0, -1.0); }
  return vec3f(0.0, 0.0, 1.0);
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let gr = u32(params.gridRes);
  let cx = iid % gr;
  let cy = iid / gr;

  let local = prismVert(vid);
  let cornerX = local.x;
  let cornerZ = local.y;
  let isTop = local.z;

  // Corner (u,v) — corners are at integer cell boundaries so adjacent cells
  // sample the same point and produce shared heights along shared edges.
  let u = (f32(cx) + cornerX) / f32(gr);
  let v = (f32(cy) + cornerZ) / f32(gr);

  let density = sampleDensity(u, v);
  let topY = heightFromDensity(density);
  let worldY = isTop * topY;

  let worldX = (u - 0.5) * params.worldSize;
  let worldZ = (v - 0.5) * params.worldSize;
  var worldPos = vec3f(worldX, worldY, worldZ);

  // Collapse interior side walls to a degenerate point. Adjacent cells produce
  // exact-coincident opposite-facing wall quads which z-fight (both draw at the
  // same depth), so only world-boundary cells should emit their outward sides.
  // [LAW:dataflow-not-control-flow] Every vertex still runs the same path; the
  // boundary check just supplies a degenerate position for non-boundary side verts.
  let lastCell = gr - 1u;
  let isMinX = vid >= 12u && vid < 18u && cx != 0u;
  let isMaxX = vid >= 18u && vid < 24u && cx != lastCell;
  let isMinZ = vid >= 24u && vid < 30u && cy != 0u;
  let isMaxZ = vid >= 30u && vid < 36u && cy != lastCell;
  if (isMinX || isMaxX || isMinZ || isMaxZ) {
    worldPos = vec3f(0.0);
  }

  // Top normals from finite differences of the density field — produces smooth
  // Phong shading instead of cube facets. Side/bottom verts use static face normals.
  var normal = faceNormal(vid);
  if (vid < 6u) {
    let eps = 1.0 / f32(gr);
    let hL = heightFromDensity(sampleDensity(u - eps, v));
    let hR = heightFromDensity(sampleDensity(u + eps, v));
    let hD = heightFromDensity(sampleDensity(u, v - eps));
    let hU = heightFromDensity(sampleDensity(u, v + eps));
    let dx = (hR - hL) / (2.0 * eps * params.worldSize);
    let dz = (hU - hD) / (2.0 * eps * params.worldSize);
    normal = normalize(vec3f(-dx, 1.0, -dz));
  }

  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);
  // Pass per-vertex corner uv (not cell-center) so the fragment uv interpolates
  // smoothly across the entire surface. Cell-center uv was constant per-cell,
  // which made spectralThemeColor produce a different color per cell — visible
  // as concentric contour bands.
  out.uv = vec2f(u, v);
  out.normal = normal;
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
`,Dt=`struct Params {
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
`,Ot=`struct Camera {
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

  // HDR boost: rim and emission carry more punch since bloom captures their spillover.
  let composed = shadedColor + rimGlow * 2.5 + emission * 3.0;
  return vec4f(composed * 3.2, 1.0);
}
`,kt=`// Gray-Scott reaction-diffusion on a 3D volume.
// State texture is rgba16float: r = u concentration, g = v concentration.
// 7-point Laplacian stencil, unconditional loads with clamped coords.
// [LAW:dataflow-not-control-flow] Same operations run every cell; boundaries
// are handled by clamping coords, not by branching.

struct Params {
  feed: f32,
  kill: f32,
  Du: f32,
  Dv: f32,
  dt: f32,
  N: f32,
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var uvIn: texture_3d<f32>;
@group(0) @binding(1) var uvOut: texture_storage_3d<rgba16float, write>;
@group(0) @binding(2) var<uniform> params: Params;

fn fetch(p: vec3<i32>, maxIdx: i32) -> vec2f {
  let c = clamp(p, vec3<i32>(0), vec3<i32>(maxIdx));
  return textureLoad(uvIn, c, 0).rg;
}

@compute @workgroup_size(8, 8, 4)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let N = i32(params.N);
  let maxIdx = N - 1;
  let ix = i32(gid.x);
  let iy = i32(gid.y);
  let iz = i32(gid.z);
  if (ix >= N || iy >= N || iz >= N) {
    return;
  }
  let p = vec3<i32>(ix, iy, iz);

  let c = fetch(p, maxIdx);
  let xm = fetch(p + vec3<i32>(-1,  0,  0), maxIdx);
  let xp = fetch(p + vec3<i32>( 1,  0,  0), maxIdx);
  let ym = fetch(p + vec3<i32>( 0, -1,  0), maxIdx);
  let yp = fetch(p + vec3<i32>( 0,  1,  0), maxIdx);
  let zm = fetch(p + vec3<i32>( 0,  0, -1), maxIdx);
  let zp = fetch(p + vec3<i32>( 0,  0,  1), maxIdx);

  // Unit-weight 7-point Laplacian: sum of neighbors minus 6× center, NO division.
  // The canonical Gray-Scott atlas values (Du≈0.2097, Dv≈0.105, feed/kill ≈ 0.05)
  // assume this form. Dividing by 6 effectively runs diffusion at 1/6 strength
  // and most presets visibly freeze because the reaction term can't compete.
  let lap = xm + xp + ym + yp + zm + zp - 6.0 * c;

  let u = c.r;
  let v = c.g;
  let uvv = u * v * v;
  let du = params.Du * lap.r - uvv + params.feed * (1.0 - u);
  let dv = params.Dv * lap.g + uvv - (params.feed + params.kill) * v;

  // dt of 1.0 is on the stability edge for Du=0.21 (limit ~1/6Du ≈ 0.79). A dt
  // of ~0.7 gives comfortable headroom; timeScale can push it higher if desired.
  var next = c + vec2f(du, dv) * params.dt;
  next = clamp(next, vec2f(0.0), vec2f(1.0));

  // [LAW:dataflow-not-control-flow] Dirichlet boundary condition on a smooth
  // band near the volume edge. Every cell blends toward (u=1, v=0) by an amount
  // that's zero in the interior and 1 at the outermost face. Patterns can never
  // escape the interior or reflect off the clamped-coord boundary, which was
  // what made them pile up against the "invisible cube".
  let fN = params.N;
  let fp = vec3f(f32(p.x), f32(p.y), f32(p.z));
  // Distance from the volume center, normalized so edge = 1.
  let r = max(abs(fp.x - (fN - 1.0) * 0.5),
          max(abs(fp.y - (fN - 1.0) * 0.5),
              abs(fp.z - (fN - 1.0) * 0.5))) / ((fN - 1.0) * 0.5);
  // Smoothstep from 0.80 (fully free interior) to 1.0 (fully clamped).
  let boundary = smoothstep(0.80, 1.0, r);
  let reservoir = vec2f(1.0, 0.0);
  next = mix(next, reservoir, boundary);

  textureStore(uvOut, p, vec4f(next, 0.0, 0.0));
}
`,At=`// Raymarched volume render of the Gray-Scott v-field.
// Fullscreen triangle → per-pixel ray → march through a unit cube → isosurface on v.
// [LAW:dataflow-not-control-flow] Fixed step count. The march always runs the same
// number of iterations; hit detection is a value inside a vec4 accumulator.

struct Camera {
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

struct RenderParams {
  N: f32,
  isoThreshold: f32,
  worldSize: f32,
  stepCount: f32,
}

@group(0) @binding(0) var volTex: texture_3d<f32>;
@group(0) @binding(1) var volSampler: sampler;
@group(0) @binding(2) var<uniform> camera: Camera;
@group(0) @binding(3) var<uniform> rparams: RenderParams;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) ndc: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  // Oversized triangle covering the viewport.
  var p = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0),
  );
  var out: VSOut;
  out.pos = vec4f(p[vid], 0.0, 1.0);
  out.ndc = p[vid];
  return out;
}

// Slab intersection with the axis-aligned cube [-hs, hs]³.
fn intersectBox(ro: vec3f, rd: vec3f, hs: f32) -> vec2f {
  let invD = 1.0 / rd;
  let t0 = (vec3f(-hs) - ro) * invD;
  let t1 = (vec3f( hs) - ro) * invD;
  let tmin = min(t0, t1);
  let tmax = max(t0, t1);
  let tNear = max(max(tmin.x, tmin.y), tmin.z);
  let tFar  = min(min(tmax.x, tmax.y), tmax.z);
  return vec2f(tNear, tFar);
}

fn sampleV(worldPos: vec3f) -> f32 {
  let hs = rparams.worldSize * 0.5;
  let uvw = (worldPos + vec3f(hs)) / rparams.worldSize;
  return textureSampleLevel(volTex, volSampler, uvw, 0.0).g;
}

fn sampleU(worldPos: vec3f) -> f32 {
  let hs = rparams.worldSize * 0.5;
  let uvw = (worldPos + vec3f(hs)) / rparams.worldSize;
  return textureSampleLevel(volTex, volSampler, uvw, 0.0).r;
}

fn gradientV(p: vec3f) -> vec3f {
  let eps = rparams.worldSize / rparams.N;
  let dx = sampleV(p + vec3f(eps, 0.0, 0.0)) - sampleV(p - vec3f(eps, 0.0, 0.0));
  let dy = sampleV(p + vec3f(0.0, eps, 0.0)) - sampleV(p - vec3f(0.0, eps, 0.0));
  let dz = sampleV(p + vec3f(0.0, 0.0, eps)) - sampleV(p - vec3f(0.0, 0.0, eps));
  return vec3f(dx, dy, dz);
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4f {
  // Build world-space ray from NDC via inverse(view)*inverse(proj).
  // Simpler: invert view * proj combined — but WGSL has no inverse().
  // Use eye + approximate direction from view matrix rows.
  // View matrix stores world→view; its first 3 rows give view-space basis in world coords.
  let invViewX = vec3f(camera.view[0][0], camera.view[1][0], camera.view[2][0]);
  let invViewY = vec3f(camera.view[0][1], camera.view[1][1], camera.view[2][1]);
  let invViewZ = vec3f(camera.view[0][2], camera.view[1][2], camera.view[2][2]);

  // Reconstruct a view-space direction from NDC using the projection matrix diagonals.
  // proj[0][0] = f/aspect, proj[1][1] = f. So viewDir.xy = ndc.xy * (1/proj[ii][ii]).
  let vx = in.ndc.x / camera.proj[0][0];
  let vy = in.ndc.y / camera.proj[1][1];
  let viewDir = normalize(vec3f(vx, vy, -1.0));
  // Rotate view dir into world space using inverse view rotation (transpose of upper 3x3).
  let rd = normalize(viewDir.x * invViewX + viewDir.y * invViewY + viewDir.z * invViewZ);
  let ro = camera.eye;

  let hs = rparams.worldSize * 0.5;
  let hit = intersectBox(ro, rd, hs);
  let tNear = max(hit.x, 0.0);
  let tFar  = hit.y;

  // Background = transparent (grid drawn underneath).
  if (tFar <= tNear) {
    return vec4f(0.0);
  }

  let steps = i32(rparams.stepCount);
  let tSpan = tFar - tNear;
  let dt = tSpan / f32(steps);
  let iso = rparams.isoThreshold;

  // [LAW:dataflow-not-control-flow] Per-pixel hash jitter on the start offset.
  // Without this, the fixed-stride march aligns to the voxel grid and produces
  // visible "ribs" that shift as the camera orbits. With jitter, the aliasing
  // becomes smooth noise that bloom/trails easily absorb.
  let jitter = fract(sin(dot(in.pos.xy, vec2f(12.9898, 78.233))) * 43758.5453);

  // Accumulator: rgb = premultiplied color, a = alpha.
  var accum = vec4f(0.0);
  var t = tNear + dt * jitter;

  for (var i = 0; i < 512; i = i + 1) {
    if (i >= steps) { break; }
    let p = ro + rd * t;
    let v = sampleV(p);
    let u = sampleU(p);

    // [LAW:dataflow-not-control-flow] Spherical alpha falloff so no visible cube.
    // Every sample multiplies by a radial mask that is 1 in the interior and 0
    // outside — there's no "cube edge", only a soft sphere of visibility.
    // Center of the cube is the origin; half-size = worldSize/2.
    let rel = length(p) / (rparams.worldSize * 0.5);
    let cubeFade = 1.0 - smoothstep(0.78, 0.95, rel);

    // Soft density: wider band than before so sub-texel surfaces don't pop.
    let soft = smoothstep(iso - 0.08, iso + 0.08, v) * cubeFade;
    // Thickness along this step → alpha. Scaled so doubling step count
    // yields roughly the same total opacity through a region.
    let alpha = 1.0 - exp(-soft * 10.0 * dt);

    // Shading: gradient-based normal, Phong with theme colors.
    let grad = gradientV(p);
    let gl = length(grad);
    let n = select(vec3f(0.0, 1.0, 0.0), -grad / max(gl, 1e-5), gl > 1e-5);
    let lightDir = normalize(vec3f(0.6, 0.8, 0.4));
    let diffuse = max(dot(n, lightDir), 0.0);
    let viewDirW = normalize(camera.eye - p);
    let rim = pow(1.0 - max(dot(n, viewDirW), 0.0), 2.5);
    let spec = pow(max(dot(n, normalize(lightDir + viewDirW)), 0.0), 24.0);

    // Color: mix primary↔secondary by u (the substrate), add accent on rim.
    let baseMix = clamp(u, 0.0, 1.0);
    let base = mix(camera.primary, camera.secondary, baseMix);
    let lit = base * (0.18 + diffuse * 0.82) + camera.accent * rim * 0.35 + vec3f(1.0) * spec * 0.25;

    // Front-to-back compositing.
    let src = vec4f(lit * alpha, alpha);
    accum = accum + (1.0 - accum.a) * src;

    if (accum.a > 0.98) { break; }
    t = t + dt;
  }

  return accum;
}
`,jt=`struct Camera {
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

  return vec4f(color * 1.6, totalAlpha);
}
`,Mt={"boids.compute":ot,"boids.render":st,"nbody.compute":ct,"nbody.stats":lt,"nbody.render":ut,"markers.render":dt,"nbody.classic.compute":ft,"nbody.classic.render":bt,"pm.deposit":pt,"pm.density_convert":mt,"pm.smooth":ht,"pm.residual":gt,"pm.restrict":_t,"pm.prolong":vt,"pm.interpolate":yt,"fluid.forces":xt,"fluid.diffuse":St,"fluid.pressure":Ct,"fluid.divergence":wt,"fluid.gradient":Tt,"fluid.render":Et,"parametric.compute":Dt,"parametric.render":Ot,"reaction.compute":kt,"reaction.render":At,grid:jt,"post.fade":Oe,"post.downsample":De,"post.upsample":ke,"post.composite":Ee},Nt=new Map,Pt={boids:{"Compute (Flocking)":`boids.compute`,"Render (Vert+Frag)":`boids.render`},physics:{"Compute (Gravity)":`nbody.compute`,"Render (Vert+Frag)":`nbody.render`},physics_classic:{"Compute (Classic)":`nbody.classic.compute`,"Render (Classic)":`nbody.classic.render`},fluid:{"Forces + Advect":`fluid.forces`,Diffuse:`fluid.diffuse`,Divergence:`fluid.divergence`,"Pressure Solve":`fluid.pressure`,"Gradient Sub":`fluid.gradient`,Render:`fluid.render`},parametric:{"Compute (All Shapes)":`parametric.compute`,"Render (Phong)":`parametric.render`},reaction:{"Compute (Gray-Scott)":`reaction.compute`,"Render (Raymarch)":`reaction.render`}};function G(e){return Nt.get(e)??Mt[e]}function Ft(e){let t=Pt[e];return Object.fromEntries(Object.entries(t).map(([e,t])=>[e,G(t)]))}function It(e,t,n){let r=Pt[e][t];return r?(Nt.set(r,n),!0):!1}function Lt(e,t){let n=Pt[e][t];return n?(Nt.delete(n),Mt[n]):null}function Rt(e){let t=e.state.boids.count,n=t*32,r=new Float32Array(t*8);for(let e=0;e<t;e++){let t=e*8;r[t]=(Math.random()-.5)*2*2,r[t+1]=(Math.random()-.5)*2*2,r[t+2]=(Math.random()-.5)*2*2,r[t+4]=(Math.random()-.5)*.5,r[t+5]=(Math.random()-.5)*.5,r[t+6]=(Math.random()-.5)*.5}let i=e.device.createBuffer({size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(i.getMappedRange()).set(r),i.unmap();let a=e.device.createBuffer({size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),o=e.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),s=e.device.createBuffer({size:e.cameraStride*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),c=e.createShaderModuleChecked(`boids.compute`,G(`boids.compute`)),l=e.createShaderModuleChecked(`boids.render`,G(`boids.render`)),u=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),d=e.device.createComputePipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[u]}),compute:{module:c,entryPoint:`main`}}),f=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),p=e.device.createRenderPipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[f]}),vertex:{module:l,entryPoint:`vs_main`},fragment:{module:l,entryPoint:`fs_main`,targets:[{format:e.renderTargetFormat}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:e.renderSampleCount}}),m=[e.device.createBindGroup({layout:u,entries:[{binding:0,resource:{buffer:i}},{binding:1,resource:{buffer:a}},{binding:2,resource:{buffer:o}}]}),e.device.createBindGroup({layout:u,entries:[{binding:0,resource:{buffer:a}},{binding:1,resource:{buffer:i}},{binding:2,resource:{buffer:o}}]})],h=[0,1].map(t=>[i,a].map(n=>e.device.createBindGroup({layout:f,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:s,offset:t*e.cameraStride,size:e.cameraSize}}]}))),g=0,_={};return{compute(n){let r=e.state.boids,i=e.state.mouse,a=new Float32Array(16);a[0]=.016*e.state.fx.timeScale,a[1]=r.separationRadius/50,a[2]=r.alignmentRadius/50,a[3]=r.cohesionRadius/50,a[4]=r.maxSpeed,a[5]=r.maxForce,a[6]=r.visualRange/50,a[8]=2,a[9]=i.worldX,a[10]=i.worldY,a[11]=i.worldZ,a[12]=i.down?1:0,new Uint32Array(a.buffer)[7]=t,e.device.queue.writeBuffer(o,0,a);let s=n.beginComputePass();s.setPipeline(d),s.setBindGroup(0,m[g]),s.dispatchWorkgroups(Math.ceil(t/64)),s.end(),g=1-g},render(n,r,i,a=0){let o=i?i[2]/i[3]:e.getDefaultAspect();e.device.queue.writeBuffer(s,a*e.cameraStride,e.getCameraUniformData(o));let c=n.beginRenderPass({colorAttachments:[e.getColorAttachment(_,r,i)],depthStencilAttachment:e.getDepthAttachment(_,i)}),l=e.getRenderViewport(i);l&&c.setViewport(l[0],l[1],l[2],l[3],0,1),e.renderGrid(c,o,a),c.setPipeline(p),c.setBindGroup(0,h[a][g]),c.draw(3,t),c.end()},getCount(){return t},destroy(){i.destroy(),a.destroy(),o.destroy(),s.destroy(),e.destroyDepthRef(_)}}}function zt(e){let t=e.state.fluid.resolution,n=t*t,r=n*8,i=n*4,a=n*16,o=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,s=e.device.createBuffer({size:r,usage:o}),c=e.device.createBuffer({size:r,usage:o}),l=e.device.createBuffer({size:i,usage:o}),u=e.device.createBuffer({size:i,usage:o}),d=e.device.createBuffer({size:i,usage:o}),f=e.device.createBuffer({size:a,usage:o}),p=e.device.createBuffer({size:a,usage:o}),m=e.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),h=e.device.createBuffer({size:e.cameraStride*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),g=new Float32Array(n*4),_=new Float32Array(n*2);for(let e=0;e<t;e++)for(let n=0;n<t;n++){let r=e*t+n,i=n/t,a=e/t,o=i-.5,s=a-.5;_[r*2]=-s*3,_[r*2+1]=o*3}e.device.queue.writeBuffer(f,0,g),e.device.queue.writeBuffer(s,0,_);let v=e.createShaderModuleChecked(`fluid.forces`,G(`fluid.forces`)),y=e.createShaderModuleChecked(`fluid.diffuse`,G(`fluid.diffuse`)),b=e.createShaderModuleChecked(`fluid.pressure`,G(`fluid.pressure`)),x=e.createShaderModuleChecked(`fluid.divergence`,G(`fluid.divergence`)),S=e.createShaderModuleChecked(`fluid.gradient`,G(`fluid.gradient`)),C=e.createShaderModuleChecked(`fluid.render`,G(`fluid.render`)),w=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),T=e.device.createComputePipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[w]}),compute:{module:v,entryPoint:`main`}}),E=e.device.createBindGroup({layout:w,entries:[{binding:0,resource:{buffer:s}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:f}},{binding:3,resource:{buffer:p}},{binding:4,resource:{buffer:m}}]}),D=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),O=e.device.createComputePipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[D]}),compute:{module:y,entryPoint:`main`}}),k=[e.device.createBindGroup({layout:D,entries:[{binding:0,resource:{buffer:s}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:m}}]}),e.device.createBindGroup({layout:D,entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:m}}]})],A=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),j=e.device.createComputePipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[A]}),compute:{module:x,entryPoint:`main`}}),M=e.device.createBindGroup({layout:A,entries:[{binding:0,resource:{buffer:s}},{binding:1,resource:{buffer:d}},{binding:2,resource:{buffer:m}}]}),ee=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),te=e.device.createComputePipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[ee]}),compute:{module:b,entryPoint:`main`}}),N=[e.device.createBindGroup({layout:ee,entries:[{binding:0,resource:{buffer:l}},{binding:1,resource:{buffer:u}},{binding:2,resource:{buffer:d}},{binding:3,resource:{buffer:m}}]}),e.device.createBindGroup({layout:ee,entries:[{binding:0,resource:{buffer:u}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:d}},{binding:3,resource:{buffer:m}}]})],ne=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),re=e.device.createComputePipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[ne]}),compute:{module:S,entryPoint:`main`}}),ie=e.device.createBindGroup({layout:ne,entries:[{binding:0,resource:{buffer:s}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:l}},{binding:3,resource:{buffer:m}}]}),ae=e.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.device.queue.writeBuffer(ae,0,new Float32Array([t,e.fluidGridResolution,e.state.fluid.volumeScale,e.fluidWorldSize]));let P=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),F=e.device.createRenderPipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[P]}),vertex:{module:C,entryPoint:`vs_main`},fragment:{module:C,entryPoint:`fs_main`,targets:[{format:e.renderTargetFormat}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:e.renderSampleCount}}),I=[0,1].map(t=>e.device.createBindGroup({layout:P,entries:[{binding:0,resource:{buffer:f}},{binding:1,resource:{buffer:ae}},{binding:2,resource:{buffer:h,offset:t*e.cameraStride,size:e.cameraSize}}]})),L=Math.ceil(t/8),oe={},se=0;return{compute(n){let o=e.state.fluid,d=o.dyeMode===`rainbow`?0:o.dyeMode===`single`?1:2;se+=.016*e.state.fx.timeScale;let h=new Float32Array([.22*e.state.fx.timeScale,o.viscosity,o.diffusionRate,o.forceStrength,t,e.state.mouse.x,e.state.mouse.y,e.state.mouse.dx,e.state.mouse.dy,e.state.mouse.down?1:0,d,se]);e.device.queue.writeBuffer(m,0,h);{let e=n.beginComputePass();e.setPipeline(T),e.setBindGroup(0,E),e.dispatchWorkgroups(L,L),e.end()}n.copyBufferToBuffer(c,0,s,0,r),n.copyBufferToBuffer(p,0,f,0,a);let g=0;for(let e=0;e<o.jacobiIterations;e++){let e=n.beginComputePass();e.setPipeline(O),e.setBindGroup(0,k[g]),e.dispatchWorkgroups(L,L),e.end(),g=1-g}g===1&&n.copyBufferToBuffer(c,0,s,0,r);{let e=n.beginComputePass();e.setPipeline(j),e.setBindGroup(0,M),e.dispatchWorkgroups(L,L),e.end()}let _=0;for(let e=0;e<o.jacobiIterations;e++){let e=n.beginComputePass();e.setPipeline(te),e.setBindGroup(0,N[_]),e.dispatchWorkgroups(L,L),e.end(),_=1-_}_===1&&n.copyBufferToBuffer(u,0,l,0,i);{let e=n.beginComputePass();e.setPipeline(re),e.setBindGroup(0,ie),e.dispatchWorkgroups(L,L),e.end()}n.copyBufferToBuffer(c,0,s,0,r)},render(n,r,i,a=0){let o=i?i[2]/i[3]:e.getDefaultAspect();e.device.queue.writeBuffer(h,a*e.cameraStride,e.getCameraUniformData(o)),e.device.queue.writeBuffer(ae,0,new Float32Array([t,e.fluidGridResolution,e.state.fluid.volumeScale,e.fluidWorldSize]));let s=n.beginRenderPass({colorAttachments:[e.getColorAttachment(oe,r,i)],depthStencilAttachment:e.getDepthAttachment(oe,i)}),c=e.getRenderViewport(i);c&&s.setViewport(c[0],c[1],c[2],c[3],0,1),e.renderGrid(s,o,a),s.setPipeline(F),s.setBindGroup(0,I[a]),s.draw(36,e.fluidGridResolution*e.fluidGridResolution),s.end()},getCount(){return`${t}x${t}`},destroy(){s.destroy(),c.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),m.destroy(),ae.destroy(),h.destroy(),e.destroyDepthRef(oe)}}}function Bt(e){let t=65025*6,n=e.device.createBuffer({size:2097152,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.VERTEX}),r=e.device.createBuffer({size:t*4,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});{let n=new Uint32Array(t),i=0;for(let e=0;e<255;e++)for(let t=0;t<255;t++){let r=e*256+t,a=r+1,o=(e+1)*256+t,s=o+1;n[i++]=r,n[i++]=o,n[i++]=a,n[i++]=a,n[i++]=o,n[i++]=s}e.device.queue.writeBuffer(r,0,n)}let i=e.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),a=e.device.createBuffer({size:e.cameraStride*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),o=e.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),s=0,c=0,l=e.createShaderModuleChecked(`parametric.compute`,G(`parametric.compute`)),u=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),d=e.device.createComputePipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[u]}),compute:{module:l,entryPoint:`main`}}),f=e.device.createBindGroup({layout:u,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:i}}]}),p=e.createShaderModuleChecked(`parametric.render`,G(`parametric.render`)),m=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),h=e.device.createRenderPipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[m]}),vertex:{module:p,entryPoint:`vs_main`},fragment:{module:p,entryPoint:`fs_main`,targets:[{format:e.renderTargetFormat}]},primitive:{topology:`triangle-list`,cullMode:`none`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:e.renderSampleCount}}),g=[0,1].map(t=>e.device.createBindGroup({layout:m,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:a,offset:t*e.cameraStride,size:e.cameraSize}},{binding:2,resource:{buffer:o}}]})),_={};return{compute(t){let n=e.state.parametric;s+=.016*e.state.fx.timeScale;let r=Math.max(n.p1Rate,n.p2Rate,n.p3Rate,n.p4Rate,n.twistRate);c+=.016*e.state.fx.timeScale*(r>0?1:0);let a=(e,t,n,r)=>e+(t-e)*(.5+.5*Math.sin(s*n+r)),o=a(n.p1Min,n.p1Max,n.p1Rate,0),l=a(n.p2Min,n.p2Max,n.p2Rate,Math.PI*.7),u=a(n.p3Min,n.p3Max,n.p3Rate,Math.PI*1.3),p=a(n.p4Min,n.p4Max,n.p4Rate,Math.PI*.4),m=a(n.twistMin,n.twistMax,n.twistRate,Math.PI*.9),h=e.state.mouse,g=new ArrayBuffer(64),_=new Uint32Array(g),v=new Float32Array(g);_[0]=256,_[1]=256,v[2]=n.scale,v[3]=m,v[4]=c,_[5]=e.shapeIds[n.shape]||0,v[6]=o,v[7]=l,v[8]=u,v[9]=p,v[10]=h.worldX,v[11]=h.worldY,v[12]=h.worldZ,v[13]=h.down?1:0,e.device.queue.writeBuffer(i,0,new Uint8Array(g));let y=t.beginComputePass();y.setPipeline(d),y.setBindGroup(0,f),y.dispatchWorkgroups(32,32),y.end()},render(n,i,s,l=0){let u=s?s[2]/s[3]:e.getDefaultAspect();e.device.queue.writeBuffer(a,l*e.cameraStride,e.getCameraUniformData(u));let d=U.rotateX(U.rotateY(U.identity(),c*.1),c*.03);e.device.queue.writeBuffer(o,0,d);let f=n.beginRenderPass({colorAttachments:[e.getColorAttachment(_,i,s)],depthStencilAttachment:e.getDepthAttachment(_,s)}),p=e.getRenderViewport(s);p&&f.setViewport(p[0],p[1],p[2],p[3],0,1),e.renderGrid(f,u,l),f.setPipeline(h),f.setBindGroup(0,g[l]),f.setIndexBuffer(r,`uint32`),f.drawIndexed(t),f.end()},getCount(){return`256×256 (${e.state.parametric.shape})`},destroy(){n.destroy(),r.destroy(),i.destroy(),a.destroy(),o.destroy(),e.destroyDepthRef(_)}}}function Vt(e,t){let n=t.levels-1;for(let n=1;n<t.levels;n++)e.clearBuffer(t.potential[n]);let r=e.beginComputePass(t.timestampWrites?{timestampWrites:t.timestampWrites}:void 0);for(let e=0;e<n;e++){let n=t.wgCount[e];r.setPipeline(t.pipelines.smooth);for(let i=0;i<t.preSmooth;i++)r.setBindGroup(0,t.smoothBG[e][0]),r.dispatchWorkgroups(n,n,n),r.setBindGroup(0,t.smoothBG[e][1]),r.dispatchWorkgroups(n,n,n);r.setPipeline(t.pipelines.residual),r.setBindGroup(0,t.residualBG[e]),r.dispatchWorkgroups(n,n,n),r.setPipeline(t.pipelines.restrict),r.setBindGroup(0,t.restrictBG[e]);let i=t.wgCount[e+1];r.dispatchWorkgroups(i,i,i)}{let e=t.wgCount[n];r.setPipeline(t.pipelines.smooth);for(let i=0;i<t.coarsestSweeps;i++)r.setBindGroup(0,t.smoothBG[n][0]),r.dispatchWorkgroups(e,e,e),r.setBindGroup(0,t.smoothBG[n][1]),r.dispatchWorkgroups(e,e,e)}for(let e=n-1;e>=0;e--){let n=t.wgCount[e];r.setPipeline(t.pipelines.prolong),r.setBindGroup(0,t.prolongBG[e]),r.dispatchWorkgroups(n,n,n),r.setPipeline(t.pipelines.smooth);for(let i=0;i<t.postSmooth;i++)r.setBindGroup(0,t.smoothBG[e][0]),r.dispatchWorkgroups(n,n,n),r.setBindGroup(0,t.smoothBG[e][1]),r.dispatchWorkgroups(n,n,n)}r.end()}function Ht(e){let{bodyBuffers:t,count:n,createShaderModuleChecked:r,device:i,paramsBuffer:a,particleMesh:o,physicsStats:s,softeningDefault:c,stepController:l,tsWrites:u}=e,d=o.inner.force,f=r(`nbody.compute`,G(`nbody.compute`)),p=i.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}}]}),m=i.createComputePipeline({layout:i.createPipelineLayout({bindGroupLayouts:[p]}),compute:{module:f,entryPoint:`main`}}),h=t.map((e,n)=>i.createBindGroup({layout:p,entries:[{binding:0,resource:{buffer:e}},{binding:1,resource:{buffer:t[1-n]}},{binding:2,resource:{buffer:a}},{binding:3,resource:{buffer:d}}]})),g=0;return{compute(e){let t=l.prepareComputeStep();if(!t)return;let{dt:r,physics:i}=t;o.prepareFrame(r,i.gasSoundSpeed??2),o.depositAndConvert(e,g,u(`pmDepositConvert`)),Vt(e,{levels:o.outer.levels,pipelines:{prolong:o.prolongPipeline,residual:o.residualPipeline,restrict:o.restrictPipeline,smooth:o.smoothPipeline},wgCount:o.outer.wgCount,potential:o.outer.potential,smoothBG:o.outer.smoothBG,residualBG:o.outer.residualBG,restrictBG:o.outer.restrictBG,prolongBG:o.outer.prolongBG,preSmooth:1,postSmooth:1,coarsestSweeps:16,timestampWrites:u(`outerVCycle`)});{let t=e.beginComputePass(u(`boundarySample`)?{timestampWrites:u(`boundarySample`)}:void 0);t.setPipeline(o.boundarySamplePipeline),t.setBindGroup(0,o.boundarySampleBG),t.dispatchWorkgroups(o.boundarySampleWg,o.boundarySampleWg,o.boundarySampleWg),t.end()}Vt(e,{levels:o.inner.levels,pipelines:{prolong:o.prolongPipeline,residual:o.residualPipeline,restrict:o.restrictPipeline,smooth:o.smoothPipeline},wgCount:o.inner.wgCount,potential:o.inner.potential,smoothBG:o.inner.smoothBG,residualBG:o.inner.residualBG,restrictBG:o.inner.restrictBG,prolongBG:o.inner.prolongBG,preSmooth:1,postSmooth:1,coarsestSweeps:16,timestampWrites:u(`innerVCycle`)}),o.interpolateForces(e,n,g,u(`starInterpolate`),u(`gasInterpolatePressure`));let a=e.beginComputePass(u(`starGasIntegrate`)?{timestampWrites:u(`starGasIntegrate`)}:void 0);o.gas.integrate(a,g),a.setPipeline(m),a.setBindGroup(0,h[g]),a.dispatchWorkgroups(Math.ceil(n/256)),a.end(),s.schedule(e,n,(i.G??.3)*.001,performance.now(),g,i.softening??c),g=1-g},getPingPong(){return g}}}function Ut(e){return{getStats(){return e.getLastStats()},async diagnose(){if(e.getPmDiagPending())return{error:1};e.setPmDiagPending(!0);let t=Math.min(e.count,e.diagSample),n=Math.floor(t/8),r=Math.floor(e.count/8),i=e.getPingPong()===0?e.bufferA:e.bufferB,a=e.device.createCommandEncoder();for(let t=0;t<8;t++){let o=t*r;a.copyBufferToBuffer(i,o*48,e.diagStaging,t*n*48,n*48)}e.device.queue.submit([a.finish()]),await e.device.queue.onSubmittedWorkDone(),await e.diagStaging.mapAsync(GPUMapMode.READ);let o=new Float32Array(e.diagStaging.getMappedRange().slice(0));e.diagStaging.unmap(),e.setPmDiagPending(!1);let s=e.diskNormal,c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=new Float64Array(10),y=new Float64Array(12);for(let n=0;n<t;n++){let t=n*12,r=o[t],i=o[t+1],a=o[t+2],b=o[t+3],x=o[t+4],S=o[t+5],C=o[t+6];c+=r,l+=i,u+=a,m+=b;let w=Math.sqrt(r*r+i*i+a*a);w>h&&(h=w),f+=w*w;let T=r*s[0]+i*s[1]+a*s[2];d+=T*T;let E=Math.sqrt(x*x+S*S+C*C);if(p+=E*E,w>.1){let e=r-T*s[0],t=i-T*s[1],n=a-T*s[2],o=Math.sqrt(e*e+t*t+n*n);if(o>.05){let r=e/o,i=t/o,a=n/o,c=s[1]*a-s[2]*i,l=s[2]*r-s[0]*a,u=s[0]*i-s[1]*r,d=Math.sqrt(c*c+l*l+u*u)||1,f=c/d,p=l/d,m=u/d,h=x*f+S*p+C*m;g+=Math.abs(h)/(E+.001),_++}}let D=Math.min(9,Math.floor(w*2));v[D]++;let O=r-T*s[0],k=i-T*s[1],A=a-T*s[2],j=Math.atan2(O*e.orbitalBitangent[0]+k*e.orbitalBitangent[1]+A*e.orbitalBitangent[2],O*e.orbitalTangent[0]+k*e.orbitalTangent[1]+A*e.orbitalTangent[2]),M=Math.floor((j+Math.PI)/(2*Math.PI)*12)%12;y[M]++}let b=1/t,x=Array.from(y),S=x.reduce((e,t)=>e+t,0)/12,C=x.reduce((e,t)=>e+(t-S)**2,0)/12;return{armContrast:S>0?Math.sqrt(C)/S:0,angularProfile:x,comX:c*b,comY:l*b,comZ:u*b,count:e.count,diskNormalX:s[0],diskNormalY:s[1],diskNormalZ:s[2],maxRadius:h,radialProfile:Array.from(v),rmsHeight:Math.sqrt(d*b),rmsRadius:Math.sqrt(f*b),rmsSpeed:Math.sqrt(p*b),sampleCount:t,tangentialFraction:_>0?g/_:0,totalMass:m*(e.count/t)}},async dumpDensity(){if(e.getPmDiagPending())return null;e.setPmDiagPending(!0);let t=e.device.createCommandEncoder();t.copyBufferToBuffer(e.pmDensityF32,0,e.pmDensityStaging,0,e.pmLevel0Cells*4),e.device.queue.submit([t.finish()]),await e.device.queue.onSubmittedWorkDone(),await e.pmDensityStaging.mapAsync(GPUMapMode.READ);let n=new Float32Array(e.pmDensityStaging.getMappedRange().slice(0));return e.pmDensityStaging.unmap(),e.setPmDiagPending(!1),n},async dumpPotential(){if(e.getPmDiagPending())return null;e.setPmDiagPending(!0);let t=e.device.createCommandEncoder();t.copyBufferToBuffer(e.pmPotential,0,e.pmDensityStaging,0,e.pmLevel0Cells*4),e.device.queue.submit([t.finish()]),await e.device.queue.onSubmittedWorkDone(),await e.pmDensityStaging.mapAsync(GPUMapMode.READ);let n=new Float32Array(e.pmDensityStaging.getMappedRange().slice(0));return e.pmDensityStaging.unmap(),e.setPmDiagPending(!1),n},async maxResidual(){if(e.getPmDiagPending()||e.getPmOuterDiagPending())return null;e.setPmDiagPending(!0),e.setPmOuterDiagPending(!0);let t=e.device.createCommandEncoder();t.copyBufferToBuffer(e.pmResidual,0,e.pmDensityStaging,0,e.pmLevel0Cells*4),t.copyBufferToBuffer(e.pmOuterResidual,0,e.pmOuterDensityStaging,0,e.pmOuterLevel0Cells*4),e.device.queue.submit([t.finish()]),await e.device.queue.onSubmittedWorkDone(),await e.pmDensityStaging.mapAsync(GPUMapMode.READ);let n=new Float32Array(e.pmDensityStaging.getMappedRange()),r=0;for(let e=0;e<n.length;e++){let t=Math.abs(n[e]);t>r&&(r=t)}e.pmDensityStaging.unmap(),e.setPmDiagPending(!1),await e.pmOuterDensityStaging.mapAsync(GPUMapMode.READ);let i=new Float32Array(e.pmOuterDensityStaging.getMappedRange()),a=0;for(let e=0;e<i.length;e++){let t=Math.abs(i[e]);t>a&&(a=t)}return e.pmOuterDensityStaging.unmap(),e.setPmOuterDiagPending(!1),{inner:r,outer:a}},async dumpOuterDensity(){if(e.getPmOuterDiagPending())return null;e.setPmOuterDiagPending(!0);let t=e.device.createCommandEncoder();t.copyBufferToBuffer(e.pmOuterDensityF32,0,e.pmOuterDensityStaging,0,e.pmOuterLevel0Cells*4),e.device.queue.submit([t.finish()]),await e.device.queue.onSubmittedWorkDone(),await e.pmOuterDensityStaging.mapAsync(GPUMapMode.READ);let n=new Float32Array(e.pmOuterDensityStaging.getMappedRange().slice(0));return e.pmOuterDensityStaging.unmap(),e.setPmOuterDiagPending(!1),n},async dumpOuterPotential(){if(e.getPmOuterDiagPending())return null;e.setPmOuterDiagPending(!0);let t=e.device.createCommandEncoder();t.copyBufferToBuffer(e.pmOuterPotential,0,e.pmOuterDensityStaging,0,e.pmOuterLevel0Cells*4),e.device.queue.submit([t.finish()]),await e.device.queue.onSubmittedWorkDone(),await e.pmOuterDensityStaging.mapAsync(GPUMapMode.READ);let n=new Float32Array(e.pmOuterDensityStaging.getMappedRange().slice(0));return e.pmOuterDensityStaging.unmap(),e.setPmOuterDiagPending(!1),n},gasDumpDensity:()=>e.gas.dumpDensity(),gasEnergyBreakdown:()=>e.gas.energyBreakdown(e.getPingPong(),e.state.physics.gasSoundSpeed??2),gasWakeProbe:(t=0)=>e.gas.wakeProbe(e.getPingPong(),t),async gasReversibilityTest(t){let n=e.state.paused,r=e.getTimeDirection();e.setPaused(!0);let i=await e.gas.snapshot(e.getPingPong());if(!i)return e.setTimeDirection(r),e.setPaused(n),null;e.setTimeDirection(1);for(let n=0;n<t;n++){let t=e.device.createCommandEncoder();e.computeStep(t),e.device.queue.submit([t.finish()])}e.setTimeDirection(-1);for(let n=0;n<t;n++){let t=e.device.createCommandEncoder();e.computeStep(t),e.device.queue.submit([t.finish()])}e.setTimeDirection(r),e.setPaused(n);let a=await e.gas.snapshot(e.getPingPong());if(!a)return null;let o=0,s=0;for(let t=0;t<e.gas.count;t++){let e=t*12,n=Math.hypot(a[e]-i[e],a[e+1]-i[e+1],a[e+2]-i[e+2]),r=Math.hypot(a[e+4]-i[e+4],a[e+5]-i[e+5],a[e+6]-i[e+6]);n>o&&(o=n),r>s&&(s=r)}return{maxPosErr:o,maxVelErr:s,count:e.gas.count}},async reversibilityTest(t){if(e.getPmDiagPending())return null;let n=e.count*48;if(n>e.pmDensityStaging.size)return null;e.setPmDiagPending(!0);let r=e.state.paused,i=e.getTimeDirection();e.setPaused(!0);let a=async()=>{let t=e.device.createCommandEncoder(),r=e.getPingPong()===0?e.bufferA:e.bufferB;t.copyBufferToBuffer(r,0,e.pmDensityStaging,0,n),e.device.queue.submit([t.finish()]),await e.device.queue.onSubmittedWorkDone(),await e.pmDensityStaging.mapAsync(GPUMapMode.READ);let i=new Float32Array(e.pmDensityStaging.getMappedRange(0,n).slice(0));return e.pmDensityStaging.unmap(),i},o=await a();e.setTimeDirection(1);for(let n=0;n<t;n++){let t=e.device.createCommandEncoder();e.computeStep(t),e.device.queue.submit([t.finish()])}e.setTimeDirection(-1);for(let n=0;n<t;n++){let t=e.device.createCommandEncoder();e.computeStep(t),e.device.queue.submit([t.finish()])}e.setTimeDirection(i),e.setPaused(r);let s=await a(),c=0,l=0;for(let t=0;t<e.count;t++){let e=t*12,n=s[e]-o[e],r=s[e+1]-o[e+1],i=s[e+2]-o[e+2],a=Math.sqrt(n*n+r*r+i*i);a>c&&(c=a),l+=a}return e.setPmDiagPending(!1),{maxErr:c,meanErr:l/e.count,count:e.count}}}}function K(e,t){return[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]]}function q(e){let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]}function Wt(e,t){let n=.2,r=.18,i=t.haloMass??5,a=t.haloScale??2,o=t.diskMass??3,s=t.diskScaleA??1.5,c=t.diskScaleB??.3;function l(e){let t=e*e,n=t+a*a,r=i*t/(n*Math.sqrt(n)),l=s+c,u=t+l*l;return r+o*t/(u*Math.sqrt(u))}let u=q([.18,1,-.12]),d=q(K([0,1,0],u)),f=K(u,d),p=new Float32Array(e*12),m=0,h=1/e;for(let i=0;i<e;i++){let a=i*12,o,s,c,g=0,_=0,v=0,y=h,b=i/e;if(t.distribution===`spiral`){let e=3.5;if(b<.04){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=.3+Math.random()**.5*4;o=n*Math.sin(t)*Math.cos(e),s=n*Math.sin(t)*Math.sin(e),c=n*Math.cos(t);let r=.12+Math.random()*.1,i=q(K(q([o,s,c]),[.3,1,-.2]));g=i[0]*r,_=i[1]*r,v=i[2]*r,y=.01+Math.random()*.05}else{let n=Math.exp(-5*Math.random())*e,r=Math.random()*Math.PI*2,i=(-1/5*Math.exp(-5*n/e)+1/5)/(-1/5*Math.exp(-5)+1/5)*1,a=(t.G??.3)*.001,p=Math.sqrt(Math.max(.001,a*i/Math.max(n,.05)+l(n))),m=(Math.random()-.5)*(.25+n*.05);o=d[0]*Math.cos(r)*n+f[0]*Math.sin(r)*n+u[0]*m,s=d[1]*Math.cos(r)*n+f[1]*Math.sin(r)*n+u[1]*m,c=d[2]*Math.cos(r)*n+f[2]*Math.sin(r)*n+u[2]*m,g=(-Math.sin(r)*d[0]+Math.cos(r)*f[0])*p,_=(-Math.sin(r)*d[1]+Math.cos(r)*f[1])*p,v=(-Math.sin(r)*d[2]+Math.cos(r)*f[2])*p,y=Math.random()**2*.8}}else if(t.distribution===`disk`){let e=Math.random()*Math.PI*2,t=Math.sqrt(Math.random())*4.5;if(y=Math.random()**3*.8,b<.03){let r=(Math.random()-.5)*n*.5;o=d[0]*Math.cos(e)*t+f[0]*Math.sin(e)*t+u[0]*r,s=d[1]*Math.cos(e)*t+f[1]*Math.sin(e)*t+u[1]*r,c=d[2]*Math.cos(e)*t+f[2]*Math.sin(e)*t+u[2]*r;let i=Math.sqrt(Math.max(.001,l(t)));g=(Math.sin(e)*d[0]-Math.cos(e)*f[0])*i,_=(Math.sin(e)*d[1]-Math.cos(e)*f[1])*i,v=(Math.sin(e)*d[2]-Math.cos(e)*f[2])*i,y=.1+Math.random()*.3}else if(b<.12){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=.5+Math.sqrt(Math.random())*3.5;o=n*Math.sin(t)*Math.cos(e),s=n*Math.sin(t)*Math.sin(e),c=n*Math.cos(t);let r=.15+Math.random()*.15,i=q(K(q([o,s,c]),[.3,1,-.2]));g=i[0]*r,_=i[1]*r,v=i[2]*r,y=.02+Math.random()*.1}else{let i=(Math.random()-.5)*n*(.35+t*.4);o=d[0]*Math.cos(e)*t+f[0]*Math.sin(e)*t+u[0]*i,s=d[1]*Math.cos(e)*t+f[1]*Math.sin(e)*t+u[1]*i,c=d[2]*Math.cos(e)*t+f[2]*Math.sin(e)*t+u[2]*i;let a=Math.sqrt(Math.max(.001,l(t)));g=(-Math.sin(e)*d[0]+Math.cos(e)*f[0])*a+u[0]*i*r,_=(-Math.sin(e)*d[1]+Math.cos(e)*f[1])*a+u[1]*i*r,v=(-Math.sin(e)*d[2]+Math.cos(e)*f[2])*a+u[2]*i*r}}else if(t.distribution===`web`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=3+(Math.random()-.5)*1.5;o=n*Math.sin(t)*Math.cos(e),s=n*Math.sin(t)*Math.sin(e),c=n*Math.cos(t);let r=2.5,i=Math.round(o/r)*r,a=Math.round(s/r)*r,l=Math.round(c/r)*r,u=.15+Math.random()*.1;o+=(i-o)*u,s+=(a-s)*u,c+=(l-c)*u;let d=q([o,s,c]),f=.02+Math.random()*.03;g=-d[0]*f,_=-d[1]*f,v=-d[2]*f,y=Math.random()**2*.6}else if(t.distribution===`cluster`){let e=i%5,t=e/5*Math.PI*2+.7,n=1.2+e*.3,r=Math.cos(t)*n,a=(e-2)*.4,l=Math.sin(t)*n,u=Math.random(),d=.6*u**.33/(1-u*u+.01)**.25,f=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1);o=r+d*Math.sin(p)*Math.cos(f),s=a+d*Math.sin(p)*Math.sin(f),c=l+d*Math.cos(p);let m=.1+Math.random()*.12,h=q(K(q([o-r,s-a,c-l]),[.2,1,-.3]));g=h[0]*m,_=h[1]*m,v=h[2]*m,y=Math.random()**2.5*1}else if(t.distribution===`maelstrom`){let e=i%4,t=1+e*1.2+(Math.random()-.5)*.4,n=(e-1.5)*.35,r=q([Math.sin(n*1.3),Math.cos(n),Math.sin(n*.7)]),a=q(K([0,1,0],r)),l=K(r,a),u=Math.random()*Math.PI*2,d=(Math.random()-.5)*.15;o=a[0]*Math.cos(u)*t+l[0]*Math.sin(u)*t+r[0]*d,s=a[1]*Math.cos(u)*t+l[1]*Math.sin(u)*t+r[1]*d,c=a[2]*Math.cos(u)*t+l[2]*Math.sin(u)*t+r[2]*d;let f=(e%2==0?1:-1)*(1.2+e*.3)/Math.sqrt(t+.1);g=(-Math.sin(u)*a[0]+Math.cos(u)*l[0])*f,_=(-Math.sin(u)*a[1]+Math.cos(u)*l[1])*f,v=(-Math.sin(u)*a[2]+Math.cos(u)*l[2])*f,y=Math.random()**3*.5}else if(t.distribution===`dust`){o=(Math.random()-.5)*6,s=(Math.random()-.5)*6,c=(Math.random()-.5)*6;let e=.8,t=.08;g=Math.sin(s*e+1.3)*Math.cos(c*e+.7)*t,_=Math.sin(c*e+2.1)*Math.cos(o*e+1.1)*t,v=Math.sin(o*e+.5)*Math.cos(s*e+2.5)*t,y=Math.random()**4*.4}else if(t.distribution===`binary`){let e=Math.random()<.45,t=Math.sqrt(Math.random())*2.2,n=Math.random()*Math.PI*2,r=e?.25:-.15,i=q([r,1,r*.5]),a=q(K([0,1,0],i)),l=K(i,a),u=(Math.random()-.5)*.15;o=a[0]*Math.cos(n)*t+l[0]*Math.sin(n)*t+i[0]*u+(e?1.8:-1.8),s=a[1]*Math.cos(n)*t+l[1]*Math.sin(n)*t+i[1]*u+(e?.3:-.3),c=a[2]*Math.cos(n)*t+l[2]*Math.sin(n)*t+i[2]*u;let d=.7/Math.sqrt(t+.15),f=e?.12:-.12;if(g=(-Math.sin(n)*a[0]+Math.cos(n)*l[0])*d+f*.3,_=(-Math.sin(n)*a[1]+Math.cos(n)*l[1])*d,v=(-Math.sin(n)*a[2]+Math.cos(n)*l[2])*d+f,Math.random()<.1){let e=Math.random();o=-1.8+e*3.6+(Math.random()-.5)*.8,s=-.3+e*.6+(Math.random()-.5)*.5,c=(Math.random()-.5)*.6,g=(Math.random()-.5)*.1,_=(Math.random()-.5)*.05,v=(Math.random()-.5)*.1}y=Math.random()**2.5*.7}else if(t.distribution===`shell`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=1.5+Math.random()*.1;o=n*Math.sin(t)*Math.cos(e),s=n*Math.sin(t)*Math.sin(e),c=n*Math.cos(t);let r=q([o,s,c]),i=q(K(r,[.3,1,-.2])),a=K(r,i),l=.18+Math.random()*.08;g=(i[0]+a[0]*.35)*l,_=(i[1]+a[1]*.35)*l,v=(i[2]+a[2]*.35)*l,y=Math.random()**3*.8}else o=(Math.random()-.5)*4,s=(Math.random()-.5)*4,c=(Math.random()-.5)*4,g=(Math.random()-.5)*.12,_=(Math.random()-.5)*.12,v=(Math.random()-.5)*.12,y=Math.random()**3*.8;p[a]=o,p[a+1]=s,p[a+2]=c,p[a+3]=y,p[a+4]=g,p[a+5]=_,p[a+6]=v,p[a+8]=0,p[a+9]=0,p[a+10]=0,m+=y}return{initData:p,orbitalBasis:{bitangent:f,normal:u,tangent:d},totalStarMass:m}}var Gt=`// Nested PM force interpolation (CIC-weighted). For each particle, sample
// force from the INNER grid if it's inside the inner domain and from the
// OUTER grid if it's outside, with a C¹ smoothstep blend in the transition
// shell [innerBlendStart, innerBlendEnd]. Writes one vec4 force per particle
// into forceOut; the downstream nbody.compute reads it as its sole source of
// pair gravity.
//
// Both grids use the same CIC kernel as pm.deposit.wgsl, which keeps force
// interpolation consistent with deposition on each grid individually (per-grid
// CIC is its own transpose, so per-grid momentum conservation holds). This
// shader then blends the two per-grid forces with a particle-position-dependent
// weight \`t\`, which does NOT by itself guarantee exact Newton's 3rd law or
// exact total-momentum conservation across the ±14..±16 transition shell —
// two particles in different blend regimes see effective kernels that are not
// symmetric. A rigorous conservative blend would require either a single
// unified kernel (losing the zoom-in benefit) or gradient-of-blended-potential
// with a ∇t coupling term; neither is worth the complexity for this visual
// sim, since the affected shell is narrow and the blend is C¹. [LAW:single-enforcer]
// This is the only force-interpolation shader used by the physics sim.
//
// Design: inner spans ±innerHalf, outer spans ±outerHalf. Particle at posHalf
// computes d = max(|x|,|y|,|z|) (infinity norm — matches the cubical grid).
//   d <= innerBlendStart                  → pure inner force
//   innerBlendStart < d < innerBlendEnd   → smoothstep blend
//   d >= innerBlendEnd                    → pure outer force
// Outside the inner domain, sampleInner still runs but reads wrap-polluted
// cells; those values are multiplied by (1 - t) == 0 and drop out of the sum.
// [LAW:dataflow-not-control-flow] No branch, no seam, no race.

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  _unused: vec3f,
  _pad2: f32,
}

// Same 32-byte struct as pm.deposit.wgsl / pm.interpolate.wgsl.
struct GridParams {
  dt: f32,
  count: u32,
  gridRes: u32,
  domainHalf: f32,
  cellSize: f32,
  fixedPointScale: f32,
  cellCount: u32,
  _pad: u32,
}

// Blend-shell params (constant across frames, packed into a tiny uniform).
struct BlendParams {
  innerBlendStart: f32,   // radius where inner→outer blend begins
  innerBlendEnd: f32,     // radius where blend completes (≥ innerBlendStart)
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<storage, read> innerPhi: array<f32>;
@group(0) @binding(2) var<storage, read> outerPhi: array<f32>;
@group(0) @binding(3) var<storage, read_write> forceOut: array<vec4f>;
@group(0) @binding(4) var<uniform> innerParams: GridParams;
@group(0) @binding(5) var<uniform> outerParams: GridParams;
@group(0) @binding(6) var<uniform> blend: BlendParams;

fn wrapIdx(i: i32, n: i32) -> u32 {
  return u32(((i % n) + n) % n);
}

fn cellIdx(ix: i32, iy: i32, iz: i32, n: i32) -> u32 {
  let x = wrapIdx(ix, n);
  let y = wrapIdx(iy, n);
  let z = wrapIdx(iz, n);
  let nu = u32(n);
  return u32(z) * nu * nu + u32(y) * nu + u32(x);
}

fn innerForceAtCell(ix: i32, iy: i32, iz: i32, n: i32, h: f32) -> vec3f {
  let fx = -(innerPhi[cellIdx(ix + 1, iy,     iz,     n)] - innerPhi[cellIdx(ix - 1, iy,     iz,     n)]) / (2.0 * h);
  let fy = -(innerPhi[cellIdx(ix,     iy + 1, iz,     n)] - innerPhi[cellIdx(ix,     iy - 1, iz,     n)]) / (2.0 * h);
  let fz = -(innerPhi[cellIdx(ix,     iy,     iz + 1, n)] - innerPhi[cellIdx(ix,     iy,     iz - 1, n)]) / (2.0 * h);
  return vec3f(fx, fy, fz);
}

fn outerForceAtCell(ix: i32, iy: i32, iz: i32, n: i32, h: f32) -> vec3f {
  let fx = -(outerPhi[cellIdx(ix + 1, iy,     iz,     n)] - outerPhi[cellIdx(ix - 1, iy,     iz,     n)]) / (2.0 * h);
  let fy = -(outerPhi[cellIdx(ix,     iy + 1, iz,     n)] - outerPhi[cellIdx(ix,     iy - 1, iz,     n)]) / (2.0 * h);
  let fz = -(outerPhi[cellIdx(ix,     iy,     iz + 1, n)] - outerPhi[cellIdx(ix,     iy,     iz - 1, n)]) / (2.0 * h);
  return vec3f(fx, fy, fz);
}

fn sampleInner(posHalf: vec3f) -> vec3f {
  let fgrid = (posHalf + vec3f(innerParams.domainHalf)) / innerParams.cellSize - vec3f(0.5);
  let i0 = vec3i(floor(fgrid));
  let f = fgrid - vec3f(i0);
  let g = vec3f(1.0) - f;
  let n = i32(innerParams.gridRes);
  let h = innerParams.cellSize;
  var acc = vec3f(0.0);
  acc = acc + innerForceAtCell(i0.x,     i0.y,     i0.z,     n, h) * g.x * g.y * g.z;
  acc = acc + innerForceAtCell(i0.x + 1, i0.y,     i0.z,     n, h) * f.x * g.y * g.z;
  acc = acc + innerForceAtCell(i0.x,     i0.y + 1, i0.z,     n, h) * g.x * f.y * g.z;
  acc = acc + innerForceAtCell(i0.x + 1, i0.y + 1, i0.z,     n, h) * f.x * f.y * g.z;
  acc = acc + innerForceAtCell(i0.x,     i0.y,     i0.z + 1, n, h) * g.x * g.y * f.z;
  acc = acc + innerForceAtCell(i0.x + 1, i0.y,     i0.z + 1, n, h) * f.x * g.y * f.z;
  acc = acc + innerForceAtCell(i0.x,     i0.y + 1, i0.z + 1, n, h) * g.x * f.y * f.z;
  acc = acc + innerForceAtCell(i0.x + 1, i0.y + 1, i0.z + 1, n, h) * f.x * f.y * f.z;
  return acc;
}

fn sampleOuter(posHalf: vec3f) -> vec3f {
  let fgrid = (posHalf + vec3f(outerParams.domainHalf)) / outerParams.cellSize - vec3f(0.5);
  let i0 = vec3i(floor(fgrid));
  let f = fgrid - vec3f(i0);
  let g = vec3f(1.0) - f;
  let n = i32(outerParams.gridRes);
  let h = outerParams.cellSize;
  var acc = vec3f(0.0);
  acc = acc + outerForceAtCell(i0.x,     i0.y,     i0.z,     n, h) * g.x * g.y * g.z;
  acc = acc + outerForceAtCell(i0.x + 1, i0.y,     i0.z,     n, h) * f.x * g.y * g.z;
  acc = acc + outerForceAtCell(i0.x,     i0.y + 1, i0.z,     n, h) * g.x * f.y * g.z;
  acc = acc + outerForceAtCell(i0.x + 1, i0.y + 1, i0.z,     n, h) * f.x * f.y * g.z;
  acc = acc + outerForceAtCell(i0.x,     i0.y,     i0.z + 1, n, h) * g.x * g.y * f.z;
  acc = acc + outerForceAtCell(i0.x + 1, i0.y,     i0.z + 1, n, h) * f.x * g.y * f.z;
  acc = acc + outerForceAtCell(i0.x,     i0.y + 1, i0.z + 1, n, h) * g.x * f.y * f.z;
  acc = acc + outerForceAtCell(i0.x + 1, i0.y + 1, i0.z + 1, n, h) * f.x * f.y * f.z;
  return acc;
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= innerParams.count) { return; }

  let me = bodies[idx];
  let halfDt = innerParams.dt * 0.5;
  // [LAW:one-source-of-truth] Sample at posHalf to match the DKD midpoint
  // used for force evaluation throughout the N-body step.
  let posHalf = me.pos + me.vel * halfDt;

  // Infinity-norm distance from origin — matches the cubical inner grid's
  // face geometry so the transition shell is a cube shell, not a ball.
  let absPos = abs(posHalf);
  let d = max(max(absPos.x, absPos.y), absPos.z);

  // t ∈ [0,1]: 0 = pure inner, 1 = pure outer. smoothstep gives C¹ continuity
  // at both endpoints so force varies smoothly across the transition shell.
  let t = smoothstep(blend.innerBlendStart, blend.innerBlendEnd, d);

  let innerAcc = sampleInner(posHalf);
  let outerAcc = sampleOuter(posHalf);

  let acc = mix(innerAcc, outerAcc, t);
  forceOut[idx] = vec4f(acc, 0.0);
}
`,Kt=`// Dirichlet BC seed for the inner PM grid. Runs once per frame AFTER the outer
// V-cycle completes and BEFORE the inner V-cycle begins. For each face cell of
// the inner grid (the 6 faces of the 128³ cube), trilinearly samples the outer
// potential at that face cell's world-space center and writes the value into
// innerPhi[0]. The inner V-cycle smoother then treats those face cells as
// frozen (Dirichlet) for the rest of the cycle.
//
// [LAW:one-source-of-truth] Only this shader writes the outer→inner BC values.
// The smoother/residual/prolong kernels never read the outer grid directly.
// [LAW:single-enforcer] This is the single bridge between the two nested grids
// during the inner solve. Changing how the BC is computed happens here or
// nowhere.
// [LAW:dataflow-not-control-flow] Dispatched over the full 128³ inner grid.
// Every thread samples outer, then \`select\` picks sampled-at-boundary vs.
// warm-start-at-interior. No early return, no branch on boundary status.

struct Params {
  innerGridRes: u32,
  _pad0: u32,
  innerDomainHalf: f32,
  innerCellSize: f32,
  outerGridRes: u32,
  _pad1: u32,
  outerDomainHalf: f32,
  outerCellSize: f32,
}

@group(0) @binding(0) var<storage, read> outerPhi: array<f32>;
@group(0) @binding(1) var<storage, read_write> innerPhi: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

fn wrapIdx(i: i32, n: i32) -> u32 {
  return u32(((i % n) + n) % n);
}

fn outerCell(ix: i32, iy: i32, iz: i32, n: i32) -> u32 {
  let x = wrapIdx(ix, n);
  let y = wrapIdx(iy, n);
  let z = wrapIdx(iz, n);
  let nu = u32(n);
  return u32(z) * nu * nu + u32(y) * nu + u32(x);
}

// Trilinear sample of outerPhi at a world-space position. Matches the CIC
// kernel used by pm.deposit / pm.interpolate_nested — same cell-center
// convention (center at (i + 0.5) * cellSize - domainHalf).
fn sampleOuterAt(world: vec3f) -> f32 {
  let fgrid = (world + vec3f(params.outerDomainHalf)) / params.outerCellSize - vec3f(0.5);
  let i0 = vec3i(floor(fgrid));
  let f = fgrid - vec3f(i0);
  let g = vec3f(1.0) - f;
  let n = i32(params.outerGridRes);
  return
      outerPhi[outerCell(i0.x,     i0.y,     i0.z,     n)] * g.x * g.y * g.z
    + outerPhi[outerCell(i0.x + 1, i0.y,     i0.z,     n)] * f.x * g.y * g.z
    + outerPhi[outerCell(i0.x,     i0.y + 1, i0.z,     n)] * g.x * f.y * g.z
    + outerPhi[outerCell(i0.x + 1, i0.y + 1, i0.z,     n)] * f.x * f.y * g.z
    + outerPhi[outerCell(i0.x,     i0.y,     i0.z + 1, n)] * g.x * g.y * f.z
    + outerPhi[outerCell(i0.x + 1, i0.y,     i0.z + 1, n)] * f.x * g.y * f.z
    + outerPhi[outerCell(i0.x,     i0.y + 1, i0.z + 1, n)] * g.x * f.y * f.z
    + outerPhi[outerCell(i0.x + 1, i0.y + 1, i0.z + 1, n)] * f.x * f.y * f.z;
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let n = params.innerGridRes;
  if (gid.x >= n || gid.y >= n || gid.z >= n) { return; }

  // World position of this inner cell's center. Matches the deposit kernel's
  // world→cell mapping so the BC lands on the same lattice the smoother sees.
  let cellIdx = vec3f(f32(gid.x), f32(gid.y), f32(gid.z));
  let world = (cellIdx + vec3f(0.5)) * params.innerCellSize - vec3f(params.innerDomainHalf);

  let sampled = sampleOuterAt(world);
  let me = gid.z * n * n + gid.y * n + gid.x;

  // select(f, t, cond): returns t when cond is true. Write the outer sample
  // into face cells only; interior cells keep their warm-start value.
  let atBoundary = gid.x == 0u || gid.x == (n - 1u)
                || gid.y == 0u || gid.y == (n - 1u)
                || gid.z == 0u || gid.z == (n - 1u);
  innerPhi[me] = select(innerPhi[me], sampled, atBoundary);
}
`;function qt(e,t){let n=t(`pm.deposit`,pt),r=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),i=e.createComputePipeline({layout:e.createPipelineLayout({bindGroupLayouts:[r]}),compute:{module:n,entryPoint:`main`}}),a=t(`pm.density_convert`,mt),o=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),s=e.createPipelineLayout({bindGroupLayouts:[o]}),c=e.createComputePipeline({layout:s,compute:{module:a,entryPoint:`reduce`}}),l=e.createComputePipeline({layout:s,compute:{module:a,entryPoint:`convert`}}),u=t(`pm.smooth`,ht),d=t(`pm.residual`,gt),f=t(`pm.restrict`,_t),p=t(`pm.prolong`,vt),m=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),h=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),g=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),_=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),v=e.createComputePipeline({layout:e.createPipelineLayout({bindGroupLayouts:[m]}),compute:{module:u,entryPoint:`main`}}),y=e.createComputePipeline({layout:e.createPipelineLayout({bindGroupLayouts:[h]}),compute:{module:d,entryPoint:`main`}}),b=e.createComputePipeline({layout:e.createPipelineLayout({bindGroupLayouts:[g]}),compute:{module:f,entryPoint:`main`}}),x=e.createComputePipeline({layout:e.createPipelineLayout({bindGroupLayouts:[_]}),compute:{module:p,entryPoint:`main`}}),S=t(`pm.interpolate_nested`,Gt),C=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}},{binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]});return{convertBGL:o,convertPipeline:l,depositBGL:r,depositPipeline:i,interpolateBGL:C,interpolatePipeline:e.createComputePipeline({layout:e.createPipelineLayout({bindGroupLayouts:[C]}),compute:{module:S,entryPoint:`main`}}),prolongBGL:_,prolongPipeline:x,reducePipeline:c,residualBGL:h,residualPipeline:y,restrictBGL:g,restrictPipeline:b,smoothBGL:m,smoothPipeline:v}}function Jt(e,t,n,r,i,a,o,s){let c=s.gridRes*s.gridRes*s.gridRes,l=r.createBuffer({size:c*4,usage:o}),u=r.createBuffer({size:c*4,usage:o}),d=[],f=[];for(let e=0;e<s.levels;e++){let t=s.gridRes>>e,n=t*t*t*4;d.push(r.createBuffer({size:n,usage:o})),f.push(r.createBuffer({size:n,usage:o}))}let p=r.createBuffer({size:16,usage:o}),m=[u];for(let e=1;e<s.levels;e++){let t=s.gridRes>>e;m.push(r.createBuffer({size:t*t*t*4,usage:o}))}let h=r.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),g=new ArrayBuffer(32),_=new Float32Array(g),v=new Uint32Array(g);v[1]=n,v[2]=s.gridRes,_[3]=s.domainHalf,_[4]=s.cellSize,_[5]=i,v[6]=c,v[7]=s.filterOutOfDomain;let y=r.createBindGroup({layout:e.convertBGL,entries:[{binding:0,resource:{buffer:l}},{binding:1,resource:{buffer:u}},{binding:2,resource:{buffer:p}},{binding:3,resource:{buffer:h}}]}),b=t.map(t=>r.createBindGroup({layout:e.depositBGL,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:h}}]})),x=[],S=[],C=[],w=[];for(let e=0;e<s.levels;e++){let t=s.gridRes>>e,n=s.cellSize*s.cellSize*(1<<2*e);x.push([0,1].map(e=>{let i=r.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),o=new ArrayBuffer(32);return new Uint32Array(o,0,2).set([t,e]),new Float32Array(o,8,2).set([n,a]),new Uint32Array(o,16,1).set([s.dirichletBoundary]),r.queue.writeBuffer(i,0,o),i}));let i=r.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),o=new ArrayBuffer(32);if(new Uint32Array(o,0,2).set([t,0]),new Float32Array(o,8,2).set([n,a]),new Uint32Array(o,16,1).set([s.dirichletBoundary]),r.queue.writeBuffer(i,0,o),S.push(i),e+1<s.levels){let n=s.gridRes>>e+1,i=r.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),a=new ArrayBuffer(16);new Uint32Array(a,0,1).set([n]),r.queue.writeBuffer(i,0,a),C.push(i);let o=r.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),c=new ArrayBuffer(16);new Uint32Array(c,0,2).set([t,s.dirichletBoundary]),r.queue.writeBuffer(o,0,c),w.push(o)}}let T=[],E=[],D=[],O=[];for(let t=0;t<s.levels;t++)T.push([0,1].map(n=>r.createBindGroup({layout:e.smoothBGL,entries:[{binding:0,resource:{buffer:d[t]}},{binding:1,resource:{buffer:m[t]}},{binding:2,resource:{buffer:x[t][n]}}]}))),E.push(r.createBindGroup({layout:e.residualBGL,entries:[{binding:0,resource:{buffer:d[t]}},{binding:1,resource:{buffer:m[t]}},{binding:2,resource:{buffer:f[t]}},{binding:3,resource:{buffer:S[t]}}]})),t+1<s.levels&&(D.push(r.createBindGroup({layout:e.restrictBGL,entries:[{binding:0,resource:{buffer:f[t]}},{binding:1,resource:{buffer:m[t+1]}},{binding:2,resource:{buffer:C[t]}}]})),O.push(r.createBindGroup({layout:e.prolongBGL,entries:[{binding:0,resource:{buffer:d[t+1]}},{binding:1,resource:{buffer:d[t]}},{binding:2,resource:{buffer:w[t]}}]})));let k=Array.from({length:s.levels},(e,t)=>Math.max(1,(s.gridRes>>t)/4)),A=r.createBuffer({size:c*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),j=!1;return{convertBG:y,densityF32:u,densityStaging:A,densityU32:l,getDiagPending:()=>j,level0Cells:c,levels:s.levels,meanScratch:p,paramsBuffer:h,paramsF32:_,potential:d,prolongBG:O,prolongUniform:w,residual:f,residualBG:E,residualUniform:S,restrictBG:D,restrictUniform:C,rho:m,setDiagPending:e=>{j=e},smoothBG:T,smoothUniform:x,wgCount:k,depositBG:b}}function Yt(e){let{bodyBuffers:t,cameraBuffer:n,cameraSize:r,cameraStride:i,count:a,createShaderModuleChecked:o,device:s,gasMassFraction:c,gravityScale:l,innerGrid:u,renderSampleCount:d,renderTargetFormat:f,totalStarMass:p}=e,m=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,h=4*Math.PI*l,g=qt(s,o),_=Jt(g,t,a,s,u.fixedPointScale,h,m,{cellSize:u.cellSize,dirichletBoundary:1,domainHalf:u.domainHalf,filterOutOfDomain:u.filterOutOfDomain,gridRes:u.gridRes,levels:u.levels});_.force=s.createBuffer({size:a*16,usage:m});let v=Jt(g,t,a,s,u.fixedPointScale,h,m,{cellSize:2,dirichletBoundary:0,domainHalf:64,filterOutOfDomain:0,gridRes:64,levels:5}),y=s.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});{let e=new ArrayBuffer(16);new Float32Array(e,0,2).set([u.domainHalf-2,u.domainHalf]),s.queue.writeBuffer(y,0,e)}let b=o(`pm.boundary_sample`,Kt),x=s.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),S=s.createComputePipeline({layout:s.createPipelineLayout({bindGroupLayouts:[x]}),compute:{module:b,entryPoint:`main`}}),C=s.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});{let e=new ArrayBuffer(32),t=new Uint32Array(e),n=new Float32Array(e);t[0]=u.gridRes,n[2]=u.domainHalf,n[3]=u.cellSize,t[4]=64,n[6]=64,n[7]=2,s.queue.writeBuffer(C,0,e)}let w=s.createBindGroup({layout:x,entries:[{binding:0,resource:{buffer:v.potential[0]}},{binding:1,resource:{buffer:_.potential[0]}},{binding:2,resource:{buffer:C}}]}),T=t.map(e=>s.createBindGroup({layout:g.interpolateBGL,entries:[{binding:0,resource:{buffer:e}},{binding:1,resource:{buffer:_.potential[0]}},{binding:2,resource:{buffer:v.potential[0]}},{binding:3,resource:{buffer:_.force}},{binding:4,resource:{buffer:_.paramsBuffer}},{binding:5,resource:{buffer:v.paramsBuffer}},{binding:6,resource:{buffer:y}}]})),E=se({cameraBuffer:n,cameraSize:r,cameraStride:i,createShaderModuleChecked:o,device:s,fixedPointScale:u.fixedPointScale,gasMassFraction:c,innerDensityU32:_.densityU32,innerParams:{cellCount:_.level0Cells,cellSize:u.cellSize,domainHalf:u.domainHalf,filterOutOfDomain:u.filterOutOfDomain,gridRes:u.gridRes},innerPotential:_.potential[0],outerDensityU32:v.densityU32,outerParams:{cellCount:v.level0Cells,cellSize:2,domainHalf:64,filterOutOfDomain:0,gridRes:64},outerPotential:v.potential[0],pmBlendBuffer:y,pmBufUsage:m,pmDepositBGL:g.depositBGL,pmDepositPipeline:g.depositPipeline,pmInterpolateBGL:g.interpolateBGL,pmInterpolatePipeline:g.interpolatePipeline,renderSampleCount:d,renderTargetFormat:f,starBuffers:t,starCount:a,totalStarMass:p});return{boundarySampleBG:w,boundarySamplePipeline:S,boundarySampleWg:_.wgCount[0],gas:E,inner:_,outer:v,prolongPipeline:g.prolongPipeline,residualPipeline:g.residualPipeline,restrictPipeline:g.restrictPipeline,smoothPipeline:g.smoothPipeline,depositAndConvert(e,t,n){e.clearBuffer(_.densityU32),e.clearBuffer(_.meanScratch),e.clearBuffer(v.densityU32),e.clearBuffer(v.meanScratch),E.clear(e);let r=e.beginComputePass(n?{timestampWrites:n}:void 0);r.setPipeline(g.depositPipeline),r.setBindGroup(0,_.depositBG[t]),r.dispatchWorkgroups(Math.ceil(a/256)),E.depositInnerPm(r,t),r.setPipeline(g.reducePipeline),r.setBindGroup(0,_.convertBG),r.dispatchWorkgroups(Math.ceil(_.level0Cells/256)),r.setPipeline(g.convertPipeline),r.dispatchWorkgroups(Math.ceil(_.level0Cells/256)),r.setPipeline(g.depositPipeline),r.setBindGroup(0,v.depositBG[t]),r.dispatchWorkgroups(Math.ceil(a/256)),E.depositOuterPm(r,t),r.setPipeline(g.reducePipeline),r.setBindGroup(0,v.convertBG),r.dispatchWorkgroups(Math.ceil(v.level0Cells/256)),r.setPipeline(g.convertPipeline),r.dispatchWorkgroups(Math.ceil(v.level0Cells/256)),E.depositGasAndBuildPressure(r,t),r.end()},destroy(){E.destroy(),_.force?.destroy(),C.destroy(),y.destroy();for(let e of[_,v]){e.densityU32.destroy(),e.densityF32.destroy(),e.meanScratch.destroy(),e.paramsBuffer.destroy(),e.densityStaging.destroy();for(let t of e.potential)t.destroy();for(let t of e.residual)t.destroy();for(let t=1;t<e.rho.length;t++)e.rho[t].destroy();for(let t of e.smoothUniform)for(let e of t)e.destroy();for(let t of e.residualUniform)t.destroy();for(let t of e.restrictUniform)t.destroy();for(let t of e.prolongUniform)t.destroy()}},interpolateForces(e,t,n,r,i){let a=e.beginComputePass(r?{timestampWrites:r}:void 0);a.setPipeline(g.interpolatePipeline),a.setBindGroup(0,T[n]),a.dispatchWorkgroups(Math.ceil(t/256)),a.end();let o=e.beginComputePass(i?{timestampWrites:i}:void 0);E.interpolateForces(o,n),o.end()},prepareFrame(e,t){_.paramsF32[0]=e,s.queue.writeBuffer(_.paramsBuffer,0,_.paramsF32.buffer),v.paramsF32[0]=e,s.queue.writeBuffer(v.paramsBuffer,0,v.paramsF32.buffer),E.prepareFrame(e,t)}}}function Xt(e){let{attractorMax:t,baseDt:n,count:r,device:i,diskNormal:a,getAttractorStrength:o,journalCapacity:s=18e3,state:c}=e,l=i.createBuffer({size:608,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),u=i.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),d=new Float32Array(4);i.queue.writeBuffer(u,0,d);let f=1+t*4,p=new Float32Array(s*f),m=0,h=0,g=1,_=new ArrayBuffer(608),v=new Float32Array(_),y=new Uint32Array(_),b=new Uint8Array(_);function x(){if(g<0&&h<=0)return c.paused=!0,null;g<0&&h--;let e=c.physics,u=n*c.fx.timeScale,d=u*g;if(v[0]=d,v[1]=e.G*.001,v[2]=e.softening,v[3]=e.haloMass??5,y[4]=r,y[5]=0,v[6]=e.haloScale??2,v[7]=h*u,v[12]=a[0],v[13]=a[1],v[14]=a[2],v[16]=e.diskMass??3,v[17]=e.diskScaleA??1.5,v[18]=e.diskScaleB??.3,v[19]=0,v[20]=0,v[21]=0,v[22]=0,v[23]=e.tidalStrength??.005,g>0){let n=e.interactionStrength??1,r=c.attractors,i=Math.min(r.length,t);y[8]=i,y[9]=0,y[10]=0,y[11]=0;for(let e=0;e<i;e++){let t=r[e],i=24+e*4;v[i]=t.x,v[i+1]=t.y,v[i+2]=t.z,v[i+3]=o(t,h,n)}for(let e=i;e<t;e++){let t=24+e*4;v[t]=0,v[t+1]=0,v[t+2]=0,v[t+3]=0}let a=h%s*f;p[a]=i;for(let e=0;e<t*4;e++)p[a+1+e]=v[24+e];m=Math.max(m,h),h++}else{let e=h%s*f;y[8]=p[e],y[9]=0,y[10]=0,y[11]=0;for(let n=0;n<t*4;n++)v[24+n]=p[e+1+n]}return i.queue.writeBuffer(l,0,b),{dt:d,physics:e}}return{blurBuffer:u,destroy(){l.destroy(),u.destroy()},getJournalCapacity(){return s},getJournalHighWater(){return m},getSimStep(){return h},getTimeDirection(){return g},paramsBuffer:l,prepareComputeStep:x,setBlurTime(e){d[0]=e,d[1]=0,d[2]=0,d[3]=0,i.queue.writeBuffer(u,0,d)},setTimeDirection(e){g=e}}}function Zt(e){let{attractorMax:t,cameraBuffer:n,cameraSize:r,cameraStride:i,createShaderModuleChecked:a,device:o,getAttractorStrength:s,getSimStep:c,markersPerAttractor:l,renderSampleCount:u,renderTargetFormat:d,state:f}=e,p=o.createBuffer({size:528,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),m=new ArrayBuffer(528),h=new Float32Array(m),g=new Uint32Array(m),_=t*l,v=o.createBuffer({size:_*32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),y=new Float32Array(_*8),b=a(`markers.render`,dt),x=o.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),S=o.createRenderPipeline({layout:o.createPipelineLayout({bindGroupLayouts:[x]}),vertex:{module:b,entryPoint:`vs_main`},fragment:{module:b,entryPoint:`fs_main`,targets:[{format:d,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:u}}),C=[0,1].map(e=>o.createBindGroup({layout:x,entries:[{binding:0,resource:{buffer:v}},{binding:1,resource:{buffer:n,offset:e*i,size:r}}]}));function w(){let e=f.physics.interactionStrength??1,n=c(),r=f.attractors,i=Math.min(r.length,t),a=1/Math.log(1+Math.max(e,1));g[0]=i,g[1]=0,g[2]=0,g[3]=0;for(let t=0;t<i;t++){let i=r[t],o=s(i,n,e),c=4+t*4;h[c]=i.x,h[c+1]=i.y,h[c+2]=i.z,h[c+3]=Math.max(0,Math.min(1,Math.log(1+o)*a))}for(let e=i;e<t;e++){let t=4+e*4;h[t]=0,h[t+1]=0,h[t+2]=0,h[t+3]=0}o.queue.writeBuffer(p,0,m)}function T(e,t){let n=f.markers,r=Math.min(n.length,_);if(r===0)return;let i=f.physics.interactionStrength??1,a=c(),l=1/Math.log(1+Math.max(i,1));for(let e=0;e<r;e++){let t=n[e],r=f.attractors[t.attractorIdx],o=r?s(r,a,i):0,c=Math.max(0,Math.min(1,Math.log(1+o)*l)),u=e*8;y[u]=t.x,y[u+1]=t.y,y[u+2]=t.z,y[u+3]=c,y[u+4]=t.tintR,y[u+5]=t.tintG,y[u+6]=t.tintB,y[u+7]=t.seed}o.queue.writeBuffer(v,0,y.buffer,0,r*32),e.setPipeline(S),e.setBindGroup(0,C[t]),e.draw(6,r)}return{attractorFieldBuffer:p,syncAttractorField:w,renderMarkers:T,destroy(){p.destroy(),v.destroy()}}}function Qt(e){let{attractorMax:t,bodyBuffers:n,cameraBuffer:r,cameraSize:i,cameraStride:a,clearColor:o,count:s,createShaderModuleChecked:c,device:l,gas:u,getAttractorStrength:d,getCameraUniformData:f,getColorAttachment:p,getCurrentSceneView:m,getDefaultAspect:h,getDepthAttachment:g,getRenderViewport:_,getSimStep:v,getXrDepthOverride:y,markersPerAttractor:b,nullColorView:x,nullDepthView:S,postFxDepthView:C,renderGrid:w,renderSampleCount:T,renderTargetFormat:E,state:D,trailBlurBuffer:O}=e,k=c(`nbody.render`,G(`nbody.render`)),A=l.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}},{binding:3,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),j=l.createRenderPipeline({layout:l.createPipelineLayout({bindGroupLayouts:[A]}),vertex:{module:k,entryPoint:`vs_main`},fragment:{module:k,entryPoint:`fs_main`,targets:[{format:E,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:T}}),M=Zt({attractorMax:t,cameraBuffer:r,cameraSize:i,cameraStride:a,createShaderModuleChecked:c,device:l,getAttractorStrength:d,getSimStep:v,markersPerAttractor:b,renderSampleCount:T,renderTargetFormat:E,state:D}),ee=[0,1].map(e=>n.map(t=>l.createBindGroup({layout:A,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:r,offset:e*a,size:i}},{binding:2,resource:{buffer:O}},{binding:3,resource:{buffer:M.attractorFieldBuffer}}]})));return{destroy(){M.destroy()},render(e,t,n,i,c,d,v){let b=n?n[2]/n[3]:h();l.queue.writeBuffer(r,i*a,f(b)),M.syncAttractorField();let T=e.beginRenderPass({colorAttachments:[p(d,t,n)],depthStencilAttachment:g(d,n),...v.starsRender?{timestampWrites:v.starsRender}:{}}),E=_(n);E&&T.setViewport(E[0],E[1],E[2],E[3],0,1),w(T,b,i),T.setPipeline(j),T.setBindGroup(0,ee[i][c]),T.draw(6,s),M.renderMarkers(T,i),T.end();let O=D.physics.gasVisible,k=O?m():x,A=y(),te=O?A??C():S,N=e.beginRenderPass({colorAttachments:[{view:k,clearValue:o,loadOp:`load`,storeOp:`store`}],depthStencilAttachment:{view:te,depthClearValue:1,depthLoadOp:`load`,depthStoreOp:`store`},...v.gasRender?{timestampWrites:v.gasRender}:{}});O&&E&&N.setViewport(E[0],E[1],E[2],E[3],0,1),u.render(N,i,O),N.end()}}}function $t(e){let{buffers:t,createShaderModuleChecked:n,device:r,intervalMs:i=1e3}=e,a=n(`nbody.stats`,lt),o=r.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),s=r.createComputePipeline({layout:r.createPipelineLayout({bindGroupLayouts:[o]}),compute:{module:a,entryPoint:`main`}}),c=r.createBuffer({size:32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),l=r.createBuffer({size:32,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),u=r.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),d=[r.createBindGroup({layout:o,entries:[{binding:0,resource:{buffer:t[1]}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:u}}]}),r.createBindGroup({layout:o,entries:[{binding:0,resource:{buffer:t[0]}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:u}}]})],f=!1,p=0,m={ke:0,pe:0,virial:0,rmsR:0,rmsH:0};return{destroy(){c.destroy(),l.destroy(),u.destroy()},getLastStats(){return m},schedule(e,t,n,a,o,h){if(f||a-p<=i)return;p=a;let g=new Float32Array(4),_=new Uint32Array(g.buffer);_[0]=t,_[1]=t,g[2]=h*h,g[3]=n,r.queue.writeBuffer(u,0,g);let v=e.beginComputePass();v.setPipeline(s),v.setBindGroup(0,d[1-o]),v.dispatchWorkgroups(1),v.end(),e.copyBufferToBuffer(c,0,l,0,32),f=!0,r.queue.onSubmittedWorkDone().then(()=>{l.mapAsync(GPUMapMode.READ).then(()=>{let e=new Float32Array(l.getMappedRange().slice(0));l.unmap(),f=!1;let n=e[0],r=e[1];m={ke:n,pe:r,virial:Math.abs(r)>.001?2*n/Math.abs(r):1,rmsR:Math.sqrt(e[2]/Math.max(t,1)),rmsH:Math.sqrt(e[3]/Math.max(t,1))}}).catch(()=>{f=!1})})}}}function en(e){let t=e.state.physics.count,n=t*48,r=Math.max(0,Math.min(.5,e.state.physics.gasMassFraction??.15)),{initData:i,orbitalBasis:a,totalStarMass:o}=Wt(t,e.state.physics),s=a.tangent,c=a.bitangent,l=[0,1,0],u=e.device.createBuffer({size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,mappedAtCreation:!0});new Float32Array(u.getMappedRange()).set(i),u.unmap();let d=e.device.createBuffer({size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC}),f=e.device.createBuffer({size:e.cameraStride*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),p=Xt({attractorMax:e.attractorMax,baseDt:e.baseDt,count:t,device:e.device,diskNormal:l,getAttractorStrength:e.getAttractorStrength,state:e.state}),{blurBuffer:m,paramsBuffer:h}=p,g=Yt({bodyBuffers:[u,d],cameraBuffer:f,cameraSize:e.cameraSize,cameraStride:e.cameraStride,count:t,createShaderModuleChecked:e.createShaderModuleChecked,device:e.device,gasMassFraction:r,gravityScale:(e.state.physics.G??.3)*.001,innerGrid:{cellSize:.25,domainHalf:16,filterOutOfDomain:1,fixedPointScale:65536,gridRes:128,levels:6},renderSampleCount:e.renderSampleCount,renderTargetFormat:e.renderTargetFormat,totalStarMass:o}),{gas:_,inner:{densityF32:v,densityStaging:y,densityU32:b,getDiagPending:x,level0Cells:S,meanScratch:C,potential:w,residual:T,setDiagPending:E},outer:{densityF32:D,densityStaging:O,getDiagPending:k,level0Cells:A,potential:j,residual:M,setDiagPending:ee}}=g,te=g.inner.force,N=$t({buffers:[u,d],createShaderModuleChecked:e.createShaderModuleChecked,device:e.device}),ne=Ht({bodyBuffers:[u,d],count:t,createShaderModuleChecked:e.createShaderModuleChecked,device:e.device,paramsBuffer:h,particleMesh:g,physicsStats:N,softeningDefault:.15,stepController:p,tsWrites:e.tsWrites}),re=Qt({attractorMax:e.attractorMax,bodyBuffers:[u,d],cameraBuffer:f,cameraSize:e.cameraSize,cameraStride:e.cameraStride,clearColor:e.clearColor,count:t,createShaderModuleChecked:e.createShaderModuleChecked,device:e.device,gas:_,getAttractorStrength:e.getAttractorStrength,getCameraUniformData:e.getCameraUniformData,getColorAttachment:e.getColorAttachment,getCurrentSceneView:e.getCurrentSceneView,getDefaultAspect:e.getDefaultAspect,getDepthAttachment:e.getDepthAttachment,getRenderViewport:e.getRenderViewport,getSimStep:()=>p.getSimStep(),getXrDepthOverride:e.getXrDepthOverride,markersPerAttractor:e.markersPerAttractor,nullColorView:e.nullColorView,nullDepthView:e.nullDepthView,postFxDepthView:e.postFxDepthView,renderGrid:e.renderGrid,renderSampleCount:e.renderSampleCount,renderTargetFormat:e.renderTargetFormat,state:e.state,trailBlurBuffer:m}),ie=2048,ae=Math.min(t,ie)*48,P=e.device.createBuffer({size:ae,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),F={},I=null,L={setTimeDirection(e){p.setTimeDirection(e)},getSimStep(){return p.getSimStep()},getTimeDirection(){return p.getTimeDirection()},setBlurTime(e){p.setBlurTime(e)},getJournalCapacity(){return p.getJournalCapacity()},getJournalHighWater(){return p.getJournalHighWater()},compute(e){ne.compute(e)},render(t,n,r,i=0){re.render(t,n,r,i,ne.getPingPong(),F,{gasRender:e.tsWrites(`gasRender`),starsRender:e.tsWrites(`starsRender`)})},getCount(){return t},...Ut({bufferA:u,bufferB:d,computeStep:e=>{I&&I(e)},count:t,device:e.device,diagSample:ie,diagStaging:P,diskNormal:l,gas:_,getLastStats:()=>N.getLastStats(),getPingPong:()=>ne.getPingPong(),getPmDiagPending:x,getPmOuterDiagPending:k,getTimeDirection:()=>p.getTimeDirection(),orbitalBitangent:c,orbitalTangent:s,pmDensityF32:v,pmDensityStaging:y,pmLevel0Cells:S,pmOuterDensityF32:D,pmOuterDensityStaging:O,pmOuterLevel0Cells:A,pmOuterPotential:j[0],pmOuterResidual:M[0],pmPotential:w[0],pmResidual:T[0],setPmDiagPending:E,setPmOuterDiagPending:ee,setPaused:t=>{e.state.paused=t},setTimeDirection:e=>{p.setTimeDirection(e)},state:e.state}),destroy(){u.destroy(),d.destroy(),p.destroy(),f.destroy(),re.destroy(),N.destroy(),P.destroy(),g.destroy(),e.destroyDepthRef(F)},pmDensityU32:b,pmDensityF32:v,pmPotential:w,pmResidual:T,pmForce:te,pmMeanScratch:C};return I=L.compute.bind(L),L}function tn(e){let t=e.state.physics_classic.count,n=t*32,r=new Float32Array(t*8),i=e.state.physics_classic.distribution;for(let e=0;e<t;e++){let t=e*8,n,a,o,s=0,c=0;if(i===`disk`){let e=Math.random()*Math.PI*2,t=Math.random()*2;n=Math.cos(e)*t,a=(Math.random()-.5)*.1,o=Math.sin(e)*t;let r=.5/Math.sqrt(t+.1);s=-Math.sin(e)*r,c=Math.cos(e)*r}else if(i===`shell`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),r=1.5+Math.random()*.1;n=r*Math.sin(t)*Math.cos(e),a=r*Math.sin(t)*Math.sin(e),o=r*Math.cos(t)}else n=(Math.random()-.5)*4,a=(Math.random()-.5)*4,o=(Math.random()-.5)*4;r[t]=n,r[t+1]=a,r[t+2]=o,r[t+3]=.5+Math.random()*2,r[t+4]=s,r[t+5]=0,r[t+6]=c}let a=e.device.createBuffer({size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(a.getMappedRange()).set(r),a.unmap();let o=e.device.createBuffer({size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),s=e.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),c=e.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),l=e.device.createBuffer({size:e.cameraStride*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),u=e.createShaderModuleChecked(`nbody.classic.compute`,G(`nbody.classic.compute`)),d=e.createShaderModuleChecked(`nbody.classic.render`,G(`nbody.classic.render`)),f=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),p=e.device.createComputePipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[f]}),compute:{module:u,entryPoint:`main`}}),m=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),h=e.device.createRenderPipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[m]}),vertex:{module:d,entryPoint:`vs_main`},fragment:{module:d,entryPoint:`fs_main`,targets:[{format:e.renderTargetFormat,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:e.renderSampleCount}}),g=[e.device.createBindGroup({layout:f,entries:[{binding:0,resource:{buffer:a}},{binding:1,resource:{buffer:o}},{binding:2,resource:{buffer:s}}]}),e.device.createBindGroup({layout:f,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:a}},{binding:2,resource:{buffer:s}}]})],_=[0,1].map(t=>[a,o].map(n=>e.device.createBindGroup({layout:m,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:l,offset:t*e.cameraStride,size:e.cameraSize}},{binding:2,resource:{buffer:c}}]}))),v=0,y={};return{compute(n){let r=e.state.physics_classic,i=e.state.mouse,a=new ArrayBuffer(48),o=new Float32Array(a),l=new Uint32Array(a);o[0]=.016*e.state.fx.timeScale,o[1]=r.G*.001,o[2]=r.softening,o[3]=r.damping,l[4]=t,o[8]=i.down?i.worldX:0,o[9]=i.down?i.worldY:0,o[10]=i.down?i.worldZ:0,o[11]=i.down?1:0,e.device.queue.writeBuffer(s,0,new Uint8Array(a)),e.device.queue.writeBuffer(c,0,new Float32Array([i.down?i.worldX:0,i.down?i.worldY:0,i.down?i.worldZ:0,i.down?1:0]));let u=n.beginComputePass();u.setPipeline(p),u.setBindGroup(0,g[v]),u.dispatchWorkgroups(Math.ceil(t/64)),u.end(),v=1-v},render(n,r,i,a=0){let o=i?i[2]/i[3]:e.getDefaultAspect();e.device.queue.writeBuffer(l,a*e.cameraStride,e.getCameraUniformData(o));let s=n.beginRenderPass({colorAttachments:[e.getColorAttachment(y,r,i)],depthStencilAttachment:e.getDepthAttachment(y,i)}),c=e.getRenderViewport(i);c&&s.setViewport(c[0],c[1],c[2],c[3],0,1),e.renderGrid(s,o,a),s.setPipeline(h),s.setBindGroup(0,_[a][v]),s.draw(6,t),s.end()},getCount(){return t},destroy(){a.destroy(),o.destroy(),s.destroy(),c.destroy(),l.destroy(),e.destroyDepthRef(y)}}}function nn(e){let t=new Float32Array(1),n=new Int32Array(t.buffer);t[0]=e;let r=n[0],i=r>>16&32768,a=(r>>23&255)-112,o=r&8388607;return a<=0?i:a>=31?i|31744:i|a<<10|o>>13}function rn(e){let t=e.state.reaction.resolution,n={size:[t,t,t],dimension:`3d`,format:`rgba16float`,usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST},r=e.device.createTexture(n),i=e.device.createTexture(n),a=new Uint16Array(t*t*t*4),o=nn(1),s=nn(0),c=nn(.5);for(let e=0;e<t;e++)for(let n=0;n<t;n++)for(let r=0;r<t;r++){let i=(e*t*t+n*t+r)*4;a[i]=o,a[i+1]=s,a[i+2]=s,a[i+3]=s}let l=.3,u=.7;for(let e=0;e<80;e++){let e=Math.floor(t*(l+Math.random()*(u-l))),n=Math.floor(t*(l+Math.random()*(u-l))),r=Math.floor(t*(l+Math.random()*(u-l))),i=Math.random()<.5?1:2;for(let o=-i;o<=i;o++)for(let s=-i;s<=i;s++)for(let l=-i;l<=i;l++){if(l*l+s*s+o*o>i*i)continue;let u=e+l,d=n+s,f=r+o;if(u<0||d<0||f<0||u>=t||d>=t||f>=t)continue;let p=(f*t*t+d*t+u)*4;a[p]=c,a[p+1]=c}}e.device.queue.writeTexture({texture:r},a.buffer,{bytesPerRow:t*8,rowsPerImage:t},[t,t,t]),e.device.queue.writeTexture({texture:i},a.buffer,{bytesPerRow:t*8,rowsPerImage:t},[t,t,t]);let d=e.createShaderModuleChecked(`reaction.compute`,G(`reaction.compute`)),f=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:`float`,viewDimension:`3d`}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:`write-only`,format:`rgba16float`,viewDimension:`3d`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),p=e.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),m=e.device.createComputePipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[f]}),compute:{module:d,entryPoint:`main`}}),h=[e.device.createBindGroup({layout:f,entries:[{binding:0,resource:r.createView({dimension:`3d`})},{binding:1,resource:i.createView({dimension:`3d`})},{binding:2,resource:{buffer:p}}]}),e.device.createBindGroup({layout:f,entries:[{binding:0,resource:i.createView({dimension:`3d`})},{binding:1,resource:r.createView({dimension:`3d`})},{binding:2,resource:{buffer:p}}]})],g=e.createShaderModuleChecked(`reaction.render`,G(`reaction.render`)),_=e.device.createSampler({magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`,addressModeW:`clamp-to-edge`}),v=e.device.createBuffer({size:e.cameraStride*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),y=e.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),b=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`,viewDimension:`3d`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),x=e.device.createRenderPipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[b]}),vertex:{module:g,entryPoint:`vs_main`},fragment:{module:g,entryPoint:`fs_main`,targets:[{format:e.renderTargetFormat,blend:{color:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`less`},multisample:{count:e.renderSampleCount}}),S=[0,1].map(t=>[0,1].map(n=>e.device.createBindGroup({layout:b,entries:[{binding:0,resource:(n===0?r:i).createView({dimension:`3d`})},{binding:1,resource:_},{binding:2,resource:{buffer:v,offset:t*e.cameraStride,size:e.cameraSize}},{binding:3,resource:{buffer:y}}]}))),C=Math.ceil(t/8),w=Math.ceil(t/8),T=Math.ceil(t/4),E={},D=0;return{compute(n){let r=e.state.reaction,i=Math.max(1,Math.floor(r.stepsPerFrame)),a=Math.max(0,e.state.fx.timeScale),o=Math.max(0,Math.round(i*a));e.device.queue.writeBuffer(p,0,new Float32Array([r.feed,r.kill,r.Du,r.Dv,.65,t,0,0]));for(let e=0;e<o;e++){let e=n.beginComputePass();e.setPipeline(m),e.setBindGroup(0,h[D]),e.dispatchWorkgroups(C,w,T),e.end(),D=1-D}},render(n,r,i,a=0){let o=i?i[2]/i[3]:e.getDefaultAspect();e.device.queue.writeBuffer(v,a*e.cameraStride,e.getCameraUniformData(o)),e.device.queue.writeBuffer(y,0,new Float32Array([t,e.state.reaction.isoThreshold,3,256]));let s=n.beginRenderPass({colorAttachments:[e.getColorAttachment(E,r,i)],depthStencilAttachment:e.getDepthAttachment(E,i)}),c=e.getRenderViewport(i);c&&s.setViewport(c[0],c[1],c[2],c[3],0,1),e.renderGrid(s,o,a),s.setPipeline(x),s.setBindGroup(0,S[a][1-D]),s.draw(3),s.end()},getCount(){return`${t}³`},destroy(){r.destroy(),i.destroy(),p.destroy(),v.destroy(),y.destroy(),e.destroyDepthRef(E)}}}var an={boids:Rt,physics:en,physics_classic:tn,fluid:zt,parametric:Bt,reaction:rn};function on(e){return Object.fromEntries(Object.keys(an).map(t=>[t,()=>an[t](e)]))}function sn(e){let t={};function n(e){return t[e]}function r(n){let r=t[n];if(r)return r;e.device.pushErrorScope(`validation`),e.device.pushErrorScope(`internal`),e.device.pushErrorScope(`out-of-memory`);let i=null;try{i=e.factories[n]()}catch(t){e.reportError(n,`factory threw: ${t.message}`)}let a=i,o=n,s=n=>{if(e.reportError(o,n),a&&t[o]===a){try{a.destroy()}catch{}delete t[o]}};return e.device.popErrorScope().then(e=>{e&&s(`OOM: ${e.message}`)}),e.device.popErrorScope().then(e=>{e&&s(`internal: ${e.message}`)}),e.device.popErrorScope().then(e=>{e&&s(`validation: ${e.message}`)}),i&&(t[n]=i),i}function i(e){let n=t[e];return n&&(n.destroy(),delete t[e]),r(e)}function a(e,n){if(t[e]===n){try{n.destroy()}catch{}delete t[e]}}return{dropIfCurrent:a,ensure:r,get:n,reset:i}}function cn(e){let t=window;t.__simDiagnose=()=>{let t=e.getCurrentSimulation();return t?.diagnose?t.diagnose():Promise.resolve({error:1,msg:`no diagnose on this sim`})},t.__simPreset=e=>{let t=document.querySelectorAll(`button`);for(let n of t)if(n.textContent?.trim()===e)return n.click(),`ok`;return`preset not found`},t.__simState=()=>{let t=e.getGpuStats();return{mode:e.state.mode,...e.state[e.state.mode],fps:t.currentFps,gpuMs:t.gpuFrameMs,gpuDetail:t.gpuTimingDetail}},t.__pmDumpDensity=()=>{let t=e.getCurrentSimulation();return t?.dumpDensity?t.dumpDensity():Promise.resolve(null)},t.__pmDumpPotential=()=>{let t=e.getCurrentSimulation();return t?.dumpPotential?t.dumpPotential():Promise.resolve(null)},t.__pmDumpOuterDensity=()=>{let t=e.getCurrentSimulation();return t?.dumpOuterDensity?t.dumpOuterDensity():Promise.resolve(null)},t.__pmDumpOuterPotential=()=>{let t=e.getCurrentSimulation();return t?.dumpOuterPotential?t.dumpOuterPotential():Promise.resolve(null)},t.__pmMaxResidual=()=>{let t=e.getCurrentSimulation();return t?.maxResidual?t.maxResidual():Promise.resolve(null)},t.__pmReversibilityTest=(t=1e3)=>{let n=e.getCurrentSimulation();return n?.reversibilityTest?n.reversibilityTest(t):Promise.resolve(null)},t.__gasDumpDensity=()=>{let t=e.getCurrentSimulation();return t?.gasDumpDensity?t.gasDumpDensity():Promise.resolve(null)},t.__gasEnergyBreakdown=()=>{let t=e.getCurrentSimulation();return t?.gasEnergyBreakdown?t.gasEnergyBreakdown():Promise.resolve(null)},t.__gasWakeProbe=(t=0)=>{let n=e.getCurrentSimulation();return n?.gasWakeProbe?n.gasWakeProbe(t):Promise.resolve(null)},t.__gasReversibilityTest=(t=1e3)=>{let n=e.getCurrentSimulation();return n?.gasReversibilityTest?n.gasReversibilityTest(t):Promise.resolve(null)},t.__bindings=e.bindings,t.__anchors=e.anchors,t.__xrUi=e.xrUi,t.__simStats=()=>{let t=e.getCurrentSimulation(),n=t&&`getStats`in t&&typeof t.getStats==`function`?t.getStats():{error:`no stats on this sim`},r=e.getGpuStats();return{...n,gpuMs:r.gpuFrameMs,gpuDetail:r.gpuTimingDetail}}}var ln=200;function un(e){let t=document.getElementById(`gpu-error-overlay`);t||(t=document.createElement(`div`),t.id=`gpu-error-overlay`,t.style.cssText=`position:fixed;top:60px;left:10px;right:10px;max-height:60vh;overflow:auto;background:rgba(20,0,0,0.92);color:#ff8080;font:11px monospace;padding:10px;border:1px solid #ff4040;border-radius:4px;z-index:9999;white-space:pre-wrap;`,document.body.appendChild(t));let n=new Date().toLocaleTimeString();t.textContent=`[${n}] ${e}\n\n`+t.textContent}function dn(e){let t=[],n=!1,r=(n,r,i)=>{let a=r instanceof Error?r:Error(typeof r==`string`?r:JSON.stringify(r)),o=e.getPhase(),s=i?`${i}: ${a.message}`:a.message,c={t:performance.now(),kind:n,phase:o,msg:s,stack:a.stack};t.push(c),t.length>ln&&t.splice(0,t.length-ln),console.error(`[${n}] (phase=${o})`,s,a.stack||``),un(`[${n}] (phase=${o}) ${s}`)},i=(t,n,...r)=>{console.info(`[${t}] (phase=${e.getPhase()})`,n,...r)},a=()=>{n||(n=!0,globalThis.__errorLog=()=>t.slice(),globalThis.__gpuPhase=e.getPhase,window.addEventListener(`error`,e=>{r(`window.error`,e.error??e.message,`at ${e.filename}:${e.lineno}:${e.colno}`)}),window.addEventListener(`unhandledrejection`,e=>{r(`unhandledrejection`,e.reason)}))},o=(e,t,n)=>{let a=e.createShaderModule({label:t,code:n});return a.getCompilationInfo().then(e=>{if(e.messages.length===0)return;let a=n.split(`
`),o=!1;for(let n of e.messages){let e=(a[n.lineNum-1]||``).trimEnd(),i=` `.repeat(Math.max(0,n.linePos-1))+`^`,s=`[shader:${t}] ${n.type.toUpperCase()} line ${n.lineNum}:${n.linePos} ${n.message}\n  ${e}\n  ${i}`;n.type===`error`?(o=!0,r(`shader:${t}`,Error(s))):n.type===`warning`?console.warn(s):console.info(s)}o||i(`shader:${t}`,`compiled with ${e.messages.length} non-error messages`)}).catch(e=>r(`shader:${t}:compilationInfo`,e)),a};return{createShaderModuleChecked:(t,n)=>o(e.getDevice(),t,n),createShaderModuleCheckedForDevice:o,installGlobalHandlers:a,logError:r,logInfo:i,showSimError:(e,t)=>{console.error(`[sim:${e}]`,t),un(`[sim:${e}] ${t}`)}}}var fn=new Map,J={phase:`idle`,phaseDeadline:0,bounded:!1,samples:[],startedAt:0,unsubs:[],preDelayTimer:null,stopTimer:null,resolve:null},pn={channel(e){let t=fn.get(e);if(t)return t;let n={name:e,subscribers:new Set};return fn.set(e,n),n},subscribe(e,t){return e.subscribers.add(t),()=>{e.subscribers.delete(t)}},emit(e,t){for(let n of e.subscribers)n(t)},record(e){if(J.phase!==`idle`)return Promise.reject(Error(`metrics.record: recording already in progress`));let t=e.preDelayMs??0;return J.samples=[],J.bounded=e.durationMs!==void 0,new Promise(n=>{J.resolve=n;let r=()=>{let t=e.channels??Array.from(fn.values());J.startedAt=performance.now(),J.phase=`recording`,J.phaseDeadline=e.durationMs===void 0?0:J.startedAt+e.durationMs,J.preDelayTimer=null;for(let e of t){let t=e.name;J.unsubs.push(pn.subscribe(e,e=>{J.samples.push({t:performance.now()-J.startedAt,channel:t,payload:e})}))}e.durationMs!==void 0&&(J.stopTimer=setTimeout(()=>pn.stop(),e.durationMs))};t>0?(J.phase=`pre-delay`,J.phaseDeadline=performance.now()+t,J.preDelayTimer=setTimeout(r,t)):r()})},stop(){if(J.phase===`idle`)return;J.preDelayTimer&&=(clearTimeout(J.preDelayTimer),null),J.stopTimer&&=(clearTimeout(J.stopTimer),null);for(let e of J.unsubs)e();J.unsubs=[];let e=J.samples;J.samples=[],J.phase=`idle`,J.phaseDeadline=0,J.bounded=!1;let t=J.resolve;J.resolve=null,t&&t(e)},status(){return J.phase===`idle`?{phase:`idle`,remainingMs:0,bounded:!1}:{phase:J.phase,remainingMs:J.phaseDeadline===0?0:Math.max(0,J.phaseDeadline-performance.now()),bounded:J.bounded}}},mn=.016,hn=1/mn,gn=90,_n=3,vn=30,yn=.22,bn=1.1;function xn(e){function t(){return e.getCurrentPhysicsStep()}function n(){return e.getCurrentTimeDirection()}function r(t){let n=e.state.physics.attractorDecayTime??2;return n>=vn?1/0:Math.max(_n,n*hn)}function i(e,t){return e.releaseStep<0?!1:t-e.releaseStep>=r(e)}function a(t){let n=[];for(let r of e.state.markers){let e=t.get(r.attractorIdx);e!==void 0&&(r.attractorIdx=e,n.push(r))}e.state.markers=n}function o(t,n,r,i){let a=e.getThemeColors();for(let o=0;o<36;o++){let o=Math.random()*2-1,s=Math.random()*Math.PI*2,c=Math.sqrt(1-o*o),l=c*Math.cos(s),u=o,d=c*Math.sin(s),f=yn*(.6+Math.random()*.8),p=-d,m=0,h=l,g=Math.hypot(p,m,h)||1;p/=g,m/=g,h/=g;let _=Math.random()<.5?-1:1,v=bn*(.7+Math.random()*.6)*_;e.state.markers.push({x:n+l*f,y:r+u*f,z:i+d*f,vx:p*v,vy:m*v,vz:h*v,tintR:a.accent[0],tintG:a.accent[1],tintB:a.accent[2],seed:Math.random(),attractorIdx:t})}}return{currentSimStep:t,currentTimeDirection:n,attractorStrength(e,t,n){if(e.releaseStep<0||t<e.releaseStep){let r=Math.max(0,t-e.chargeStep),i=Math.min(1,r/gn);return i*i*n}let i=Math.min(1,e.holdSteps/gn),a=i*i*n,o=t-e.releaseStep,s=r(e);if(o>=s)return 0;let c=1-o/s;return a*c*c},prune(t){if(n()<0)return;let r=[],o=new Map;for(let n=0;n<e.state.attractors.length;n++){let a=e.state.attractors[n];i(a,t)||(o.set(n,r.length),r.push(a))}e.state.attractors=r;let s=new Map;e.state.pointerToAttractor.forEach((e,t)=>{let n=o.get(e);n!==void 0&&s.set(t,n)}),e.state.pointerToAttractor=s,a(o)},create(r,i){if(n()<0)return;if(e.state.attractors.length>=32){e.state.attractors.shift();let t=new Map;e.state.pointerToAttractor.forEach((e,n)=>{e>0&&t.set(n,e-1)}),e.state.pointerToAttractor=t;let n=[];for(let t of e.state.markers)t.attractorIdx>0&&(--t.attractorIdx,n.push(t));e.state.markers=n}let a=t();e.state.attractors.push({x:i[0],y:i[1],z:i[2],chargeStep:a,releaseStep:-1,holdSteps:-1});let s=e.state.attractors.length-1;e.state.pointerToAttractor.set(r,s),o(s,i[0],i[1],i[2])},move(t,n){let r=e.state.pointerToAttractor.get(t);if(r===void 0)return;let i=e.state.attractors[r];!i||i.releaseStep>=0||(i.x=n[0],i.y=n[1],i.z=n[2])},release(n){let r=e.state.pointerToAttractor.get(n);if(r===void 0)return;e.state.pointerToAttractor.delete(n);let i=e.state.attractors[r];if(!i||i.releaseStep>=0)return;let a=t();i.releaseStep=a,i.holdSteps=Math.max(1,a-i.chargeStep)},tickMarkers(t){if(e.state.markers.length===0)return;let n=e.state.attractors,r=Math.exp(-.6*Math.abs(t));for(let i of e.state.markers){let e=n[i.attractorIdx];if(!e)continue;let a=e.x-i.x,o=e.y-i.y,s=e.z-i.z,c=a*a+o*o+s*s+.04,l=1/Math.sqrt(c),u=3*l*l;i.vx+=a*l*u*t,i.vy+=o*l*u*t,i.vz+=s*l*u*t,i.vx*=r,i.vy*=r,i.vz*=r,i.x+=i.vx*t,i.y+=i.vy*t,i.z+=i.vz*t}}}}function Sn(e){function t(){let t=e.state.camera,n=Math.cos(t.rotX),r=Math.sin(t.rotX),i=Math.cos(t.rotY),a=Math.sin(t.rotY),o=[t.distance*n*a,t.distance*r,t.distance*n*i],s=z(V([0,0,0],o)),c=z(B(s,[0,1,0]));return{eye:o,forward:s,right:c,up:B(c,s)}}function n(n,r){let i=e.getCanvas(),a=e.state.camera.fov*Math.PI/180,o=i.width/i.height,{eye:s,forward:c,right:l,up:u}=t(),d=Math.tan(a*.5),f=(n*2-1)*d*o,p=(r*2-1)*d;return{eye:s,dir:z([c[0]+l[0]*f+u[0]*p,c[1]+l[1]*f+u[1]*p,c[2]+l[2]*f+u[2]*p])}}function r(){e.state.mouse.down=!1,e.state.mouse.dx=0,e.state.mouse.dy=0}function i(e,t){let n=H(t,t)||1,r=Math.max(0,-H(e,t)/n);return[e[0]+t[0]*r,e[1]+t[1]*r,e[2]+t[2]*r]}function a(e,t,n){if(Math.abs(t[1])<1e-4)return null;let r=(n-e[1])/t[1];return r<0?null:[e[0]+t[0]*r,e[1]+t[1]*r,e[2]+t[2]*r]}function o(t,r){let{dir:i}=n(t,r),a=e.state.camera.distance*.5;return[i[0]*a,i[1]*a,i[2]*a]}function s(e,t){let{eye:r,dir:a}=n(e,t),o=z(r),s=H(a,o);if(Math.abs(s)<1e-4)return i(r,a);let c=-H(r,o)/s;return[r[0]+a[0]*c,r[1]+a[1]*c,r[2]+a[2]*c]}function c(t,r){let{eye:i,dir:a}=n(t,r);if(Math.abs(a[1])<1e-4)return null;let o=-i[1]/a[1];if(o<0)return null;let s=i[0]+a[0]*o,c=i[2]+a[2]*o,l=e.fluidWorldSize*.5;return Math.abs(s)>l||Math.abs(c)>l?null:[(s+l)/e.fluidWorldSize,(c+l)/e.fluidWorldSize]}function l(t){let n=e.fluidWorldSize*.5;return Math.abs(t[0])>n||Math.abs(t[2])>n?null:[(t[0]+n)/e.fluidWorldSize,(t[2]+n)/e.fluidWorldSize]}function u(t,n,i,a){if(e.state.mode===`fluid`){let t=c(n,i);if(!t)r();else{e.state.mouse.down=!0;let r=o(n,i);e.state.mouse.worldX=r[0],e.state.mouse.worldY=r[1],e.state.mouse.worldZ=r[2],e.state.mouse.dx=a?(t[0]-e.state.mouse.x)*10:0,e.state.mouse.dy=a?(t[1]-e.state.mouse.y)*10:0,e.state.mouse.x=t[0],e.state.mouse.y=t[1]}return}let l=s(n,i);e.state.mouse.down=!0,e.state.mouse.worldX=l[0],e.state.mouse.worldY=l[1],e.state.mouse.worldZ=l[2],e.state.mouse.dx=a?(n-e.state.mouse.x)*10:0,e.state.mouse.dy=a?(i-e.state.mouse.y)*10:0,e.state.mouse.x=n,e.state.mouse.y=i,e.state.mode===`physics`&&(a?e.onMoveAttractor(t,l):e.onCreateAttractor(t,l))}function d(t){e.state.mouse.down=!1,e.state.mouse.dx=0,e.state.mouse.dy=0,e.onReleaseAttractor(t)}return{applySimulationInteraction:u,closestPointOnRayToOrigin:i,intersectRayWithPlane:a,releasePointerInteraction:d,screenToFluidUV:c,screenToSimPlane:s,screenToWorld:o,setSimulationInteractionInactive:r,setupMouseControls(){let t=e.getCanvas(),n=!1,r=!1;t.addEventListener(`pointerdown`,i=>{if(e.state.xrEnabled)return;n=!0,r=!(i.ctrlKey||i.metaKey);let a=t.getBoundingClientRect(),o=(i.clientX-a.left)/a.width,s=1-(i.clientY-a.top)/a.height;e.state.mouse.dx=0,e.state.mouse.dy=0,r?u(i.pointerId,o,s,!1):(e.state.mouse.x=o,e.state.mouse.y=s),i.preventDefault()}),t.addEventListener(`pointermove`,i=>{if(e.state.xrEnabled||!n)return;let a=t.getBoundingClientRect(),o=(i.clientX-a.left)/a.width,s=1-(i.clientY-a.top)/a.height;r?u(i.pointerId,o,s,!0):(e.state.camera.rotY+=i.movementX*.005,e.state.camera.rotX+=i.movementY*.005,e.state.camera.rotX=Math.max(-Math.PI*.45,Math.min(Math.PI*.45,e.state.camera.rotX)),e.state.mouse.down=!1)});let i=t=>{e.state.xrEnabled||(n=!1,r=!1,d(t.pointerId))};t.addEventListener(`pointerup`,i),t.addEventListener(`pointercancel`,i),t.addEventListener(`pointerleave`,i),t.addEventListener(`contextmenu`,e=>e.preventDefault()),t.addEventListener(`wheel`,t=>{e.state.xrEnabled||(e.state.camera.distance*=1+t.deltaY*.001,e.state.camera.distance=Math.max(.5,Math.min(200,e.state.camera.distance)),t.preventDefault())},{passive:!1})},worldToFluidUV:l}}var Cn=[`physics`,`boids`,`physics_classic`,`fluid`,`parametric`,`reaction`];function wn(e){return{applyMobileDefaults(){localStorage.getItem(e.storageKey)||(e.state.boids.count=500,e.state.physics.count=2e3,e.state.physics_classic.count=200,e.state.reaction.resolution=64)},setupTouchControls(){let t=e.getCanvas(),n=new Map,r=0,i=0,a=0;t.addEventListener(`pointerdown`,o=>{if(!e.state.xrEnabled){if(o.preventDefault(),n.set(o.pointerId,{x:o.clientX,y:o.clientY}),n.size===1){let n=t.getBoundingClientRect(),r=(o.clientX-n.left)/n.width,i=1-(o.clientY-n.top)/n.height;e.state.mouse.dx=0,e.state.mouse.dy=0,e.applySimulationInteraction(o.pointerId,r,i,!1)}if(n.size===2){e.setSimulationInteractionInactive(),n.forEach((t,n)=>e.releasePointerInteraction(n));let t=[...n.values()];i=(t[0].x+t[1].x)/2,a=(t[0].y+t[1].y)/2,r=Math.hypot(t[0].x-t[1].x,t[0].y-t[1].y)}}},{passive:!1}),t.addEventListener(`pointermove`,o=>{if(e.state.xrEnabled||!n.has(o.pointerId))return;if(o.preventDefault(),n.set(o.pointerId,{x:o.clientX,y:o.clientY}),n.size===1){let n=t.getBoundingClientRect(),r=(o.clientX-n.left)/n.width,i=1-(o.clientY-n.top)/n.height;e.applySimulationInteraction(o.pointerId,r,i,!0);return}if(n.size!==2)return;let s=[...n.values()],c=(s[0].x+s[1].x)/2,l=(s[0].y+s[1].y)/2,u=Math.hypot(s[0].x-s[1].x,s[0].y-s[1].y);e.state.camera.rotY+=(c-i)*.005,e.state.camera.rotX+=(l-a)*.005,e.state.camera.rotX=Math.max(-Math.PI*.45,Math.min(Math.PI*.45,e.state.camera.rotX)),r>0&&(e.state.camera.distance*=r/u,e.state.camera.distance=Math.max(.5,Math.min(200,e.state.camera.distance))),i=c,a=l,r=u,e.state.mouse.down=!1},{passive:!1});let o=i=>{if(n.delete(i.pointerId),e.releasePointerInteraction(i.pointerId),n.size===0&&(e.state.mouse.down=!1,e.state.mouse.dx=0,e.state.mouse.dy=0,r=0),n.size===1){let[r,i]=[...n.entries()][0],a=t.getBoundingClientRect(),o=(i.x-a.left)/a.width,s=1-(i.y-a.top)/a.height;e.state.mouse.dx=0,e.state.mouse.dy=0,e.applySimulationInteraction(r,o,s,!1)}};t.addEventListener(`pointerup`,o),t.addEventListener(`pointercancel`,o),t.addEventListener(`contextmenu`,e=>e.preventDefault())},setupFab(){document.getElementById(`fab-pause`).addEventListener(`click`,()=>{e.actions.setPaused(!e.state.paused)}),document.getElementById(`fab-reset`).addEventListener(`click`,()=>{e.actions.resetCurrentSimulation()});let t=t=>{let n=Cn[(Cn.indexOf(e.state.mode)+t+Cn.length)%Cn.length];e.actions.selectMode(n)};document.getElementById(`mode-prev`).addEventListener(`click`,()=>t(-1)),document.getElementById(`mode-next`).addEventListener(`click`,()=>t(1)),document.getElementById(`mode-stepper-label`).textContent=e.modeTabLabels[e.state.mode]},setupBottomSheet(){let t=e.getCanvas(),n=document.getElementById(`controls`),r=0,i=0,a=!1;n.addEventListener(`touchstart`,e=>{r=e.touches[0].clientY,i=n.scrollTop,a=!n.classList.contains(`mobile-expanded`)||i<=0},{passive:!0}),n.addEventListener(`touchmove`,e=>{if(!a)return;let t=e.touches[0].clientY-r,o=n.classList.contains(`mobile-expanded`);!o&&t<0&&e.preventDefault(),o&&i<=0&&t>0&&e.preventDefault()},{passive:!1}),n.addEventListener(`touchend`,e=>{if(!a)return;a=!1;let t=e.changedTouches[0].clientY-r,o=n.classList.contains(`mobile-expanded`);if(!o&&t<-30)n.classList.add(`mobile-expanded`);else if(o&&i<=0&&t>30)n.classList.remove(`mobile-expanded`);else if(Math.abs(t)<10){let t=n.querySelector(`.mobile-drag-handle`).getBoundingClientRect();e.changedTouches[0].clientY>=t.top&&e.changedTouches[0].clientY<=t.bottom&&n.classList.toggle(`mobile-expanded`)}}),t.addEventListener(`pointerdown`,()=>{n.classList.remove(`mobile-expanded`)},{capture:!0})}}}function Tn(e){let t=e.device.createBuffer({size:e.cameraStride*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),n=e.device.createBuffer({size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),r=new Float32Array(1),i=e.createShaderModuleChecked(`grid`,jt),a=e.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),o=e.device.createRenderPipeline({layout:e.device.createPipelineLayout({bindGroupLayouts:[a]}),vertex:{module:i,entryPoint:`vs_main`},fragment:{module:i,entryPoint:`fs_main`,targets:[{format:e.renderTargetFormat,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:e.renderSampleCount}}),s=[0,1].map(r=>e.device.createBindGroup({layout:a,entries:[{binding:0,resource:{buffer:t,offset:r*e.cameraStride,size:e.cameraSize}},{binding:1,resource:{buffer:n}}]})),c=0;return{destroy(){t.destroy(),n.destroy()},render(i,a,l=0){c+=.016,r[0]=c,e.device.queue.writeBuffer(t,l*e.cameraStride,e.getCameraUniformData(a)),e.device.queue.writeBuffer(n,0,r),i.setPipeline(o),i.setBindGroup(0,s[l]),i.draw(30)}}}var En=[`wrist`,`thumb-metacarpal`,`thumb-phalanx-proximal`,`thumb-phalanx-distal`,`thumb-tip`,`index-finger-metacarpal`,`index-finger-phalanx-proximal`,`index-finger-phalanx-intermediate`,`index-finger-phalanx-distal`,`index-finger-tip`,`middle-finger-metacarpal`,`middle-finger-phalanx-proximal`,`middle-finger-phalanx-intermediate`,`middle-finger-phalanx-distal`,`middle-finger-tip`,`ring-finger-metacarpal`,`ring-finger-phalanx-proximal`,`ring-finger-phalanx-intermediate`,`ring-finger-phalanx-distal`,`ring-finger-tip`,`pinky-finger-metacarpal`,`pinky-finger-phalanx-proximal`,`pinky-finger-phalanx-intermediate`,`pinky-finger-phalanx-distal`,`pinky-finger-tip`];function Dn(e){return{hand:e,tracked:!1,source:null,pinch:{active:!1,startTime:0,origin:[0,0,0],current:[0,0,0]},gazeRay:null,currentRay:null,ray:null,palmNormal:null,joints:null,grip:null}}function On(){return{fineModifier:!1,palmUp:!1,wristOrient:null,wristTime:0,flickArmed:!1,lastFlickAt:0}}var kn=.7,An=.4,jn=4,Mn=300,Nn=200,Pn=.03,Fn=Pn*Pn,In=150,Ln={left:-1,right:-2};function Rn(e){return[-e[0],-e[1],-e[2],e[3]]}function zn(e,t){return[e[3]*t[0]+e[0]*t[3]+e[1]*t[2]-e[2]*t[1],e[3]*t[1]-e[0]*t[2]+e[1]*t[3]+e[2]*t[0],e[3]*t[2]+e[0]*t[1]-e[1]*t[0]+e[2]*t[3],e[3]*t[3]-e[0]*t[0]-e[1]*t[1]-e[2]*t[2]]}function Bn(e){let t=null,n=null,r={left:Dn(`left`),right:Dn(`right`)},i={left:{kind:`idle`},right:{kind:`idle`}},a=[],o={gainMultiplier:1},s={bindings:e.bindings,layouts:new Map,activeLayoutId:null},c=w(),l=[],u={left:!1,right:!1},d={x:0,y:0,z:-5},f=0,p={startDistance:0,startOffset:{x:0,y:0,z:0}},m={left:!1,right:!1},h={left:On(),right:On()},g=e.metrics.channel(`xr.gesture`),_=e.metrics.channel(`xr.state`),v=e.metrics.channel(`xr.snap`),y={unsubs:[],lastSnapMs:{left:0,right:0}};function b(t){for(let e of y.unsubs)e();y.unsubs.length=0,y.lastSnapMs.left=0,y.lastSnapMs.right=0,t&&(y.unsubs.push(e.metrics.subscribe(g,e=>{if(e.gesture.kind===`pinch-hold`)return;let t=e.hand?`(${e.hand})`:``;console.log(`[xr] gesture:${e.gesture.kind}${t}`,e.gesture)})),y.unsubs.push(e.metrics.subscribe(_,e=>{console.log(`[xr] state:${e.hand} ${e.from}→${e.to}`)})),y.unsubs.push(e.metrics.subscribe(v,e=>{let t=performance.now();if(t-y.lastSnapMs[e.hand]<Nn)return;y.lastSnapMs[e.hand]=t;let n=e.palmDot===null?`—`:e.palmDot.toFixed(2);console.log(`[xr] snap:${e.hand} tracked=${e.handTracked} pinch=${e.pinching} palm=${n} palmUp=${e.palmUp} fine=${e.fineModifier} flick=${e.flickSpeed.toFixed(2)}`)})))}function x(t,n){let r=i[t];i[t]=n,_.subscribers.size>0&&r.kind!==n.kind&&e.metrics.emit(_,{hand:t,from:r.kind,to:n.kind})}function S(e){let t=e.matrix;return z([-t[8],-t[9],-t[10]])}function C(e,n){if(!t)return null;let r=e.getPose(n.targetRaySpace,t);if(!r)return null;let i=r.transform.position;return{origin:[i.x,i.y,i.z],dir:S(r.transform)}}function T(e,n){if(!t)return null;let r=e.getPose(n.gripSpace||n.targetRaySpace,t);if(!r)return null;let i=r.transform.position;return[i.x,i.y,i.z]}function k(e){let t=!r.left.source,n=!r.right.source;return e.handedness===`left`&&t?`left`:e.handedness===`right`&&n?`right`:t?`left`:n?`right`:null}function A(e){return r.left.source===e?`left`:r.right.source===e?`right`:null}function j(e,t,n){let r={};for(let i of En){let a=t.get(i),o=a?e.getJointPose(a,n):null;if(!o){r[i]=null;continue}let s=o.transform.position,c=o.transform.orientation;r[i]={position:[s.x,s.y,s.z],orientation:[c.x,c.y,c.z,c.w],radius:o.radius}}return r}function M(e,t){let n=e.wrist,r=e[`index-finger-metacarpal`],i=e[`pinky-finger-metacarpal`];if(!n||!r||!i)return null;let a=V(r.position,n.position),o=V(i.position,n.position),s=t===`right`?B(o,a):B(a,o);return s[0]*s[0]+s[1]*s[1]+s[2]*s[2]<1e-12?null:z(s)}function ee(e){let t=e[`thumb-tip`];if(!t)return null;let n=e=>{if(!e)return null;let n=V(e.position,t.position);return H(n,n)<=Fn};return{thumbIndex:n(e[`index-finger-tip`]),thumbMiddle:n(e[`middle-finger-tip`]),thumbRing:n(e[`ring-finger-tip`]),thumbPinky:n(e[`pinky-finger-tip`])}}function te(e){let t=e.wrist,n=e[`index-finger-metacarpal`];if(!t||!n)return null;let r=z(V(n.position,t.position));return r[0]===0&&r[1]===0&&r[2]===0?null:{origin:[...n.position],dir:r}}function N(){if(!n)return;let e=globalThis.XRRigidTransform;t=n.getOffsetReferenceSpace(new e({x:d.x,y:d.y+f,z:d.z}))}function ne(e){for(let t=a.length-1;t>=0;t--){let n=a[t],i=C(e,n);if(!i)continue;a.splice(t,1);let o=k(n);if(!o)continue;let s=T(e,n)??i.origin,c=r[o];c.tracked=!0,c.source=n,c.pinch.active=!0,c.pinch.startTime=performance.now(),c.pinch.origin=s,c.pinch.current=s,c.gazeRay={origin:[...i.origin],dir:[...i.dir]},c.currentRay=i}for(let t of[`left`,`right`]){let n=r[t];if(!n.pinch.active||!n.source)continue;let i=C(e,n.source);i&&(n.currentRay=i);let a=T(e,n.source);a&&(n.pinch.current=a)}for(let e of[`left`,`right`]){let t=r[e];t.joints=null,t.palmNormal=null,t.grip=null,t.ray=null}if(t)for(let n of e.session.inputSources){if(n.handedness===`none`||!n.hand)continue;let i=n.handedness,a=r[i],o=j(e,n.hand,t);a.joints=o,a.palmNormal=M(o,i),a.grip=ee(o),a.ray=te(o)}}function re(){let t=[],n=r.left.pinch.active,i=r.right.pinch.active,a=n&&i,o=m.left&&m.right,s=performance.now();for(let n of[`left`,`right`]){let i=r[n],a=m[n],o=i.pinch.active;o&&!a&&i.gazeRay?t.push({kind:`pinch-start`,hand:n,gazeRay:i.gazeRay}):o&&a?t.push({kind:`pinch-hold`,hand:n,dur:s-i.pinch.startTime}):!o&&a&&t.push({kind:`pinch-end`,hand:n,dur:s-i.pinch.startTime});let c=h[n];if(i.grip){let e=i.grip.thumbRing===!0;e&&!c.fineModifier?t.push({kind:`fine-modifier-on`,hand:n}):!e&&c.fineModifier&&t.push({kind:`fine-modifier-off`,hand:n}),c.fineModifier=e}if(i.palmNormal){let e=i.palmNormal[1],r=c.palmUp?e>An:e>kn;r&&!c.palmUp?t.push({kind:`palm-up`,hand:n}):!r&&c.palmUp&&t.push({kind:`palm-down`,hand:n}),c.palmUp=r}let l=i.joints?.wrist?.orientation??null,u=0;if(l&&c.wristOrient&&!i.pinch.active){let e=Math.max(.001,(s-c.wristTime)/1e3),r=zn(l,Rn(c.wristOrient)),i=Math.min(1,Math.abs(r[3])),a=2*Math.acos(i),o=Math.sqrt(Math.max(0,1-i*i)),d=r[3]<0?-1:1,f=o>1e-6?r[0]*d/o:0,p=o>1e-6?r[1]*d/o:0,m=o>1e-6?r[2]*d/o:0;u=a/e;let h=u>jn;if(h&&c.flickArmed&&s-c.lastFlickAt>Mn){let e=Math.abs(f),r=Math.abs(p),i=Math.abs(m),a=e>=r&&e>=i?`pitch`:r>=i?`yaw`:`roll`,o=(a===`pitch`?f:a===`yaw`?p:m)>=0?1:-1;t.push({kind:`wrist-flick`,hand:n,axis:a,sign:o}),c.lastFlickAt=s}c.flickArmed=h}else c.flickArmed=!1;c.wristOrient=l?[...l]:null,c.wristTime=s,v.subscribers.size>0&&e.metrics.emit(v,{hand:n,handTracked:i.joints!==null,pinching:i.pinch.active,palmDot:i.palmNormal?i.palmNormal[1]:null,palmUp:c.palmUp,fineModifier:c.fineModifier,flickSpeed:u,grip:i.grip})}if(a&&!o?t.push({kind:`two-hand-pinch-start`}):!a&&o&&t.push({kind:`two-hand-pinch-end`}),m.left=n,m.right=i,g.subscribers.size>0)for(let n of t)e.metrics.emit(g,{hand:`hand`in n?n.hand:null,gesture:n});return t}function ie(t){switch(i[t].kind){case`dragging`:e.setSimulationInteractionInactive(),e.releaseAttractor(Ln[t]);break;case`pending`:case`two-hand-scale`:case`idle`:break}x(t,{kind:`idle`});let n=r[t];n.pinch.active||(n.source=null,n.gazeRay=null,n.currentRay=null)}function ae(e){for(let t of e)switch(t.kind){case`pinch-start`:x(t.hand,{kind:`pending`,deadline:performance.now()+In});break;case`two-hand-pinch-start`:if(i.left.kind===`pending`&&i.right.kind===`pending`){let e=V(r.left.pinch.current,r.right.pinch.current);p.startDistance=Math.max(.01,Math.sqrt(H(e,e))),p.startOffset={...d},x(`left`,{kind:`two-hand-scale`}),x(`right`,{kind:`two-hand-scale`})}break;case`two-hand-pinch-end`:i.left.kind===`two-hand-scale`&&x(`left`,{kind:`idle`}),i.right.kind===`two-hand-scale`&&x(`right`,{kind:`idle`});break;case`pinch-end`:ie(t.hand);break;case`pinch-hold`:break;case`fine-modifier-on`:o.gainMultiplier=.1;break;case`fine-modifier-off`:o.gainMultiplier=1;break;case`palm-up`:case`palm-down`:case`wrist-flick`:break}let t=performance.now();for(let e of[`left`,`right`]){let n=i[e];n.kind===`pending`&&t>=n.deadline&&(u[e]?x(e,{kind:`idle`}):x(e,{kind:`dragging`,handOrigin:[...r[e].pinch.origin],hasSample:!1}))}}function P(){if(i.left.kind===`two-hand-scale`&&i.right.kind===`two-hand-scale`){let e=V(r.left.pinch.current,r.right.pinch.current),t=Math.sqrt(H(e,e));if(p.startDistance>=.01){let e=t/p.startDistance;d.z=Math.max(-200,Math.min(-1,p.startOffset.z/e)),N()}return}let t=!1;for(let n of[`left`,`right`]){let a=i[n],o=r[n];if(a.kind!==`dragging`||!o.source)continue;let s=o.currentRay;if(!s)continue;t=!0;let c=e.state.mode===`fluid`?e.intersectRayWithPlane(s.origin,s.dir,0):e.closestPointOnRayToOrigin(s.origin,s.dir);if(!c){e.setSimulationInteractionInactive(),a.hasSample=!1;continue}if(e.state.mouse.down=!0,e.state.mouse.worldX=c[0],e.state.mouse.worldY=c[1],e.state.mouse.worldZ=c[2],e.state.mode===`fluid`){let t=e.worldToFluidUV(c);if(!t){e.setSimulationInteractionInactive(),a.hasSample=!1;continue}e.state.mouse.dx=a.hasSample?(t[0]-e.state.mouse.x)*10:0,e.state.mouse.dy=a.hasSample?(t[1]-e.state.mouse.y)*10:0,e.state.mouse.x=t[0],e.state.mouse.y=t[1]}else e.state.mouse.dx=0,e.state.mouse.dy=0,e.state.mouse.x=c[0],e.state.mouse.y=c[1];if(e.state.mode===`physics`){let t=Ln[n];e.state.pointerToAttractor.has(t)?e.moveAttractor(t,c):e.createAttractor(t,c)}a.hasSample=!0}!t&&e.state.xrEnabled&&e.state.mouse.down&&e.setSimulationInteractionInactive()}function F(e){if(!t)return null;let n=e.getViewerPose(t);if(!n)return null;let r=n.transform;return{position:[r.position.x,r.position.y,r.position.z],orientation:[r.orientation.x,r.orientation.y,r.orientation.z,r.orientation.w]}}return{clearReferenceSpace(){t=null,n=null},getClaimed(){return{...u}},getHandFrames(){return r},getPrev(){return c},getRefSpace(){return t},getRenderList(){return l},getUiRegistry(){return s},initializeReferenceSpace(e,r){t=e,n=e,f=r?1.6:0,d.x=0,d.y=0,d.z=-5,N()},inputStep(e){ne(e);let t=F(e),n=E(s,r,c,{hands:r,headPose:t},o,16);O(n.sideEffects,s),c=n.next,l=n.renderList,u.left=D(n.next.states.left),u.right=D(n.next.states.right),ae(re()),P()},onSelectEnd(e){let t=A(e);if(t){let e=r[t];e.pinch.active=!1,e.tracked=!1}let n=a.indexOf(e);n>=0&&a.splice(n,1)},queuePendingSource(e){a.push(e)},reset(){a.length=0,r.left=Dn(`left`),r.right=Dn(`right`),x(`left`,{kind:`idle`}),x(`right`,{kind:`idle`}),m.left=!1,m.right=!1,h.left=On(),h.right=On(),o.gainMultiplier=1,c=w(),l=[],u.left=!1,u.right=!1,e.setSimulationInteractionInactive(),e.releaseAttractor(Ln.left),e.releaseAttractor(Ln.right)},setDebugLogging:b}}var Vn=`// XR widget renderer.
// One instanced draw call covers every widget in the active layout's render
// list. Vertex shader generates a quad from instance pose + half-extent;
// fragment renders an SDF rounded rectangle and branches on \`kind\` for
// kind-specific fills (slider track, dial arc, toggle knob, etc.).
//
// Label atlas: instance.labelStripIndex selects a 64-pixel-tall strip in the
// 512x4096 atlas texture; instance.hasLabel gates the lookup. CPU side
// (renderer.ts) re-rasterizes a strip when the binding's text changes.
//
// Kind codes — keep in sync with renderer.ts KIND map and step.ts widget union:
//   0 slider         5 stepper
//   1 button         6 enum-chips
//   2 readout        7 preset-tile
//   3 dial           8 category-tile
//   4 toggle

struct Camera {
  view: mat4x4<f32>,
  proj: mat4x4<f32>,
  eye: vec3<f32>,    _p0: f32,
  primary: vec3<f32>,   _p1: f32,
  secondary: vec3<f32>, _p2: f32,
  accent: vec3<f32>,    _p3: f32,
};

struct Instance {
  position: vec3<f32>,
  halfExtentX: f32,
  orientation: vec4<f32>,
  halfExtentY: f32,
  kind: u32,
  flags: u32,
  value: f32,
  labelStripIndex: u32,
  hasLabel: u32,
  _pad0: u32,
  _pad1: u32,
};

const ATLAS_W: f32 = 512.0;
const ATLAS_H: f32 = 4096.0;
const STRIP_H: f32 = 64.0;
const STRIP_V_FRAC: f32 = STRIP_H / ATLAS_H; // 1/64

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<storage, read> instances: array<Instance>;
@group(0) @binding(2) var atlas: texture_2d<f32>;
@group(0) @binding(3) var atlasSampler: sampler;

struct VsOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) @interpolate(flat) kind: u32,
  @location(2) @interpolate(flat) flags: u32,
  @location(3) @interpolate(flat) value: f32,
  @location(4) @interpolate(flat) stripIndex: u32,
  @location(5) @interpolate(flat) hasLabel: u32,
  @location(6) @interpolate(flat) halfX: f32,
  @location(7) @interpolate(flat) halfY: f32,
};

fn qrot(q: vec4<f32>, v: vec3<f32>) -> vec3<f32> {
  let u = q.xyz;
  let c1 = cross(u, v) + q.w * v;
  return v + 2.0 * cross(u, c1);
}

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VsOut {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>( 1.0, -1.0), vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0), vec2<f32>( 1.0, -1.0), vec2<f32>( 1.0,  1.0),
  );
  let uv = pos[vi];
  let inst = instances[ii];
  let local = vec3<f32>(uv.x * inst.halfExtentX, uv.y * inst.halfExtentY, 0.0);
  let world = inst.position + qrot(inst.orientation, local);
  var out: VsOut;
  out.clip = camera.proj * camera.view * vec4<f32>(world, 1.0);
  out.uv = uv;
  out.kind = inst.kind;
  out.flags = inst.flags;
  out.value = inst.value;
  out.stripIndex = inst.labelStripIndex;
  out.hasLabel = inst.hasLabel;
  out.halfX = inst.halfExtentX;
  out.halfY = inst.halfExtentY;
  return out;
}

// Rounded-box SDF in [-1,1]² with radius r in same units. Negative inside.
fn sdRoundedBox(p: vec2<f32>, r: f32) -> f32 {
  let q = abs(p) - vec2<f32>(1.0 - r, 1.0 - r);
  return length(max(q, vec2<f32>(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

// Filled circle SDF at center, radius r. Negative inside.
fn sdCircle(p: vec2<f32>, c: vec2<f32>, r: f32) -> f32 {
  return length(p - c) - r;
}

// Equilateral triangle pointing in direction (sign of x). Used for chevrons.
fn sdTriangleX(p: vec2<f32>, c: vec2<f32>, h: f32, dir: f32) -> f32 {
  let q = vec2<f32>((p.x - c.x) * dir, p.y - c.y);
  let d = max(q.x - h, abs(q.y) - (h - q.x));
  return d;
}

@fragment
fn fs(in: VsOut) -> @location(0) vec4<f32> {
  let hover    = (in.flags & 1u) != 0u;
  let pressed  = (in.flags & 2u) != 0u;
  let dragging = (in.flags & 4u) != 0u;

  let d = sdRoundedBox(in.uv, 0.25);
  let aa = fwidth(d) * 1.5;
  let plate = 1.0 - smoothstep(-aa, aa, d);
  if (plate < 0.01) { discard; }

  let baseAccent = camera.accent;
  let basePri    = camera.primary;
  let baseSec    = camera.secondary;
  var bg = mix(vec3<f32>(0.08, 0.08, 0.10), baseSec * 0.4, 0.6);
  if (hover)   { bg = mix(bg, basePri, 0.25); }
  if (pressed) { bg = bg * 0.7; }

  var fill = bg;
  // Some kinds want their label centered, others top-aligned (preset/category
  // tiles draw text in the lower band so the preview can occupy the upper
  // band). Default = centered.
  var labelCenterY: f32 = 0.0;

  if (in.kind == 0u) {
    // SLIDER. Track + filled portion + circular thumb at value position.
    let cx = -1.0 + 2.0 * clamp(in.value, 0.0, 1.0);
    let thumbR = 0.18;
    let thumb = 1.0 - smoothstep(thumbR - aa, thumbR + aa,
      length(vec2<f32>(in.uv.x - cx, in.uv.y)));
    let isFilled = step(in.uv.x, cx);
    fill = mix(bg, baseAccent, isFilled * 0.7);
    fill = mix(fill, basePri, thumb);
    if (dragging) { fill = mix(fill, basePri * 1.2, 0.3); }
    labelCenterY = -0.55;
  } else if (in.kind == 1u) {
    // BUTTON. Solid accent fill; hover brightens; pressed darkens.
    fill = baseAccent;
    if (hover)   { fill = fill * 1.2; }
    if (pressed) { fill = fill * 0.6; }
  } else if (in.kind == 2u) {
    // READOUT. Plate only — label drawn below.
    fill = bg;
  } else if (in.kind == 3u) {
    // DIAL. Outer ring + filled arc up to angle = value*2π.
    // Circle in unit square — assume widget is ~square; ring radius 0.85.
    let r = length(in.uv);
    let ringMask = 1.0 - smoothstep(0.06 - aa, 0.06 + aa, abs(r - 0.7));
    fill = mix(bg, baseSec * 0.5, ringMask);
    // Filled arc: angle 0 at top (uv.y=1), sweeping clockwise.
    let theta = atan2(in.uv.x, in.uv.y);                 // 0 at top, +x right
    let thetaPos = select(theta + 6.2831853, theta, theta >= 0.0);
    let arcEnd = clamp(in.value, 0.0, 1.0) * 6.2831853;
    let inArc = step(thetaPos, arcEnd) * step(0.55, r) * step(r, 0.85);
    fill = mix(fill, baseAccent, inArc);
    // Center dot.
    let dot = 1.0 - smoothstep(0.08 - aa, 0.08 + aa, r);
    fill = mix(fill, basePri, dot);
    labelCenterY = 0.0;
  } else if (in.kind == 4u) {
    // TOGGLE (switch). Track in upper band, knob slid by value (0 or 1).
    // Treat in.value > 0.5 as on. Knob centered on track at left/right.
    let on = step(0.5, in.value);
    let knobCx = -0.4 + 0.8 * on;
    let track = 1.0 - smoothstep(0.40 - aa, 0.40 + aa,
      max(abs(in.uv.x) - 0.55, abs(in.uv.y - 0.0) - 0.25));
    fill = mix(bg, mix(baseSec * 0.5, baseAccent, on), track * 0.8);
    let knob = 1.0 - smoothstep(0.22 - aa, 0.22 + aa,
      length(vec2<f32>(in.uv.x - knobCx, in.uv.y)));
    fill = mix(fill, basePri, knob);
    labelCenterY = -0.6;
  } else if (in.kind == 5u) {
    // STEPPER. Plate + ◀ ▶ chevrons on edges. Chevrons brighten on hover.
    let chevColor = mix(basePri, baseAccent, select(0.0, 1.0, hover));
    let leftDist  = sdTriangleX(in.uv, vec2<f32>(-0.75, 0.0), 0.18, -1.0);
    let rightDist = sdTriangleX(in.uv, vec2<f32>( 0.75, 0.0), 0.18,  1.0);
    let leftMask  = 1.0 - smoothstep(0.0 - aa, 0.0 + aa, leftDist);
    let rightMask = 1.0 - smoothstep(0.0 - aa, 0.0 + aa, rightDist);
    fill = mix(bg, chevColor, max(leftMask, rightMask));
    labelCenterY = 0.0;
  } else if (in.kind == 6u) {
    // ENUM-CHIPS. Bg plate with the active value's label centered. Real
    // multi-chip rendering is a future polish; this MVP shows current value.
    fill = mix(bg, baseSec * 0.4, 0.5);
    if (hover) { fill = mix(fill, basePri, 0.2); }
  } else if (in.kind == 7u) {
    // PRESET-TILE. Larger preview blob in the upper band, label below.
    fill = bg;
    let blobC = vec2<f32>(0.0, 0.35);
    let blob = 1.0 - smoothstep(0.45 - aa, 0.45 + aa, length(in.uv - blobC));
    fill = mix(fill, mix(baseAccent, basePri, 0.5), blob * 0.9);
    if (hover) { fill = mix(fill, basePri, 0.2); }
    if (pressed) { fill = fill * 0.7; }
    labelCenterY = -0.55;
  } else {
    // CATEGORY-TILE (8) and any future-added kind. Bigger plate + chevron right.
    fill = mix(bg, basePri * 0.4, 0.5);
    let chev = sdTriangleX(in.uv, vec2<f32>(0.78, 0.0), 0.14, 1.0);
    let chevMask = 1.0 - smoothstep(0.0 - aa, 0.0 + aa, chev);
    fill = mix(fill, baseAccent, chevMask);
    if (hover) { fill = mix(fill, basePri, 0.2); }
  }

  // ── LABEL OVERLAY ───────────────────────────────────────────────────────
  // Aspect-correct atlas sampling. Atlas strip is 8:1 wide; widget text region
  // is (2*halfX) : (V_BAND * 2*halfY). Map widget uv.x to a sub-range of atlas
  // u so glyphs render at their natural aspect — full atlas width across a
  // wide widget would stretch text 2x+ horizontally; sub-range keeps glyphs
  // shaped like the canvas drew them.
  if (in.hasLabel != 0u) {
    let CANVAS_ASPECT = ATLAS_W / STRIP_H;        // 8.0
    let V_BAND = 0.45;                             // strip occupies ±V_BAND in widget uv
    let widgetTextAspect = in.halfX / max(V_BAND * in.halfY, 0.001);
    // Floor uHalf at 0.1 so very narrow widgets still show readable text
    // (cropping a few glyphs is preferable to invisible text).
    let uHalf = clamp(widgetTextAspect / CANVAS_ASPECT * 0.5, 0.1, 0.5);
    let labelU = 0.5 + in.uv.x * uHalf;
    let labelLocalV = (in.uv.y - labelCenterY) / V_BAND; // -1..1 inside the strip
    let stripV0 = f32(in.stripIndex) * STRIP_V_FRAC;
    let labelV = stripV0 + (labelLocalV * 0.5 + 0.5) * STRIP_V_FRAC;
    if (labelU >= 0.0 && labelU <= 1.0 && labelLocalV >= -1.0 && labelLocalV <= 1.0) {
      // textureSampleLevel (explicit LOD 0) avoids implicit-derivative
      // uniform-control-flow violations: this branch depends on per-fragment
      // varyings and runs after a discard, so textureSample would be UB.
      let glyph = textureSampleLevel(atlas, atlasSampler, vec2<f32>(labelU, labelV), 0.0);
      fill = mix(fill, vec3<f32>(0.97, 0.97, 0.97), glyph.a);
    }
  }

  return vec4<f32>(fill, plate);
}
`,Hn=64,Un=64,Wn=208,Gn=256,Kn=512,qn=64,Jn=Hn,Yn=qn*Jn,Xn={slider:0,button:1,readout:2,dial:3,toggle:4,stepper:5,"enum-chips":6,"preset-tile":7,"category-tile":8};function Zn(e,t,n){let r=e.createShaderModule({code:Vn,label:`xr-widgets`}),i=e.createBindGroupLayout({label:`xr-widgets-bgl`,entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,sampler:{}}]}),a=e.createPipelineLayout({bindGroupLayouts:[i]}),o=e.createBuffer({label:`xr-widgets-instances`,size:Un*Hn,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),s=new ArrayBuffer(Un*Hn),c=new Float32Array(s),l=new Uint32Array(s),u=document.createElement(`canvas`);u.width=Kn,u.height=Yn;let d=u.getContext(`2d`);if(!d)throw Error(`xr-widgets: 2D canvas context unavailable`);let f=d;f.font=`600 40px system-ui, -apple-system, sans-serif`,f.textAlign=`center`,f.textBaseline=`middle`;let p=e.createTexture({label:`xr-widgets-label-atlas`,size:[Kn,Yn,1],format:`rgba8unorm`,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),m=p.createView(),h=e.createSampler({label:`xr-widgets-atlas-sampler`,magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`}),g=Array(Jn).fill(``);function _(t,n){if(g[t]===n)return t;g[t]=n;let r=t*qn;return f.clearRect(0,r,Kn,qn),f.fillStyle=`rgba(255, 255, 255, 1)`,f.fillText(n,Kn/2,r+qn/2),e.queue.copyExternalImageToTexture({source:u,origin:{x:0,y:r}},{texture:p,origin:{x:0,y:r}},[Kn,qn,1]),t}let v=[];for(let n=0;n<2;n++)v.push(e.createBindGroup({label:`xr-widgets-bg-eye${n}`,layout:i,entries:[{binding:0,resource:{buffer:t,offset:n*Gn,size:Wn}},{binding:1,resource:{buffer:o}},{binding:2,resource:m},{binding:3,resource:h}]}));let y=new Map;function b(t){let n=y.get(t);return n||(n=e.createRenderPipeline({label:`xr-widgets-pipeline-${t}`,layout:a,vertex:{module:r,entryPoint:`vs`},fragment:{module:r,entryPoint:`fs`,targets:[{format:t,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`}}),y.set(t,n),n)}function x(e){let t=Math.min(e.length,Hn);for(let n=0;n<t;n++){let t=e[n],r=Un/4*n;c[r+0]=t.pose.position[0],c[r+1]=t.pose.position[1],c[r+2]=t.pose.position[2],c[r+3]=t.visualHalfExtent.x,c[r+4]=t.pose.orientation[0],c[r+5]=t.pose.orientation[1],c[r+6]=t.pose.orientation[2],c[r+7]=t.pose.orientation[3],c[r+8]=t.visualHalfExtent.y,l[r+9]=Xn[t.kind]??0;let i=(t.state.hover?1:0)|(t.state.pressed?2:0)|(t.state.dragging?4:0);l[r+10]=i>>>0,c[r+11]=t.state.value??0;let a=t.label!=null&&t.label.length>0?_(n,t.label):-1;l[r+12]=a>=0?a>>>0:0,l[r+13]=a>=0?1:0,l[r+14]=0,l[r+15]=0}return t}return{draw(r,i,a,c,l){e.queue.writeBuffer(t,c*Gn,n(c));let u=x(l);u>0&&e.queue.writeBuffer(o,0,s,0,u*Un);let d=r.beginRenderPass({label:`xr-widgets-pass-eye${c}`,colorAttachments:[{view:i,loadOp:`load`,storeOp:`store`}]});u>0&&(d.setPipeline(b(a)),d.setBindGroup(0,v[c]),d.draw(6,u)),d.end()},destroy(){o.destroy(),p.destroy()}}}function Qn(e){let t=null,n=null,r=null,i=null,a=null,o=null,s=0,c=(l,u)=>{if(!t)return;t.requestAnimationFrame(c),e.refreshThemeColors(l);let d=s<3;d&&e.logInfo(`xr:frame`,`xrFrame #${s} entered`,{mode:e.state.mode}),e.pruneAttractors(e.currentSimStep());let{frameDeltaMs:f,fpsUpdated:p}=e.tickFrameStats(l);e.tickMarkers(Math.min(.05,f*.001)*e.state.fx.timeScale*e.currentTimeDirection()),p&&e.updateStats(),e.setCurrentPhase(`xr:frame:${s}:pre-encode`),e.device.pushErrorScope(`validation`);try{let t=e.getRefSpace();if(!t){e.logError(`xr:frame`,Error(`XR reference space unavailable during frame`));return}let c=u.getViewerPose(t);if(!c){d&&e.logInfo(`xr:frame`,`no viewer pose yet`);return}let l=e.getCurrentSimulation();if(!l){e.logError(`xr:frame`,Error(`simulation for mode=${e.state.mode} is not initialized`));return}e.inputStep(u),e.setCurrentPhase(`xr:frame:${s}:createCommandEncoder`);let f=e.device.createCommandEncoder({label:`xr-frame-${s}`});e.state.paused||(e.setCurrentPhase(`xr:frame:${s}:sim.compute(${e.state.mode})`),l.compute(f)),d&&e.logInfo(`xr:frame`,`pose has ${c.views.length} views`);for(let t=0;t<c.views.length;t++){let u=c.views[t];e.setCurrentPhase(`xr:frame:${s}:getViewSubImage(eye=${t})`);let p=n,m=p.getViewSubImage?p.getViewSubImage(r,u):p.getSubImage(r,u);if(!m){e.logError(`xr:frame`,Error(`subImage null for eye ${t}`));continue}d&&t===0&&e.logInfo(`xr:frame`,`subImage`,{viewport:m.viewport,colorFormat:m.colorTexture.format,hasDepth:!!m.depthStencilTexture}),e.setCurrentPhase(`xr:frame:${s}:createView(color,eye=${t})`);let h=m.getViewDescriptor?m.getViewDescriptor():{},g=m.colorTexture.createView(h);e.setCurrentPhase(`xr:frame:${s}:createView(depth,eye=${t})`);let _=(r.textureArrayLength??1)>1,v=m.depthStencilTexture;o=v&&_?v.createView(h):null;let y=u.transform.position;e.cameraSystem.setXrOverride({viewMatrix:new Float32Array(u.transform.inverse.matrix),projMatrix:new Float32Array(u.projectionMatrix),eye:[y.x,y.y,y.z]});let{x:b,y:x,width:S,height:C}=m.viewport;e.setCurrentPhase(`xr:frame:${s}:ensureHdrTargets(${S}x${C})`),e.ensureHdrTargets(S,C),e.markPostFxNeedsClear();let w=e.getPostFxSceneIndex();e.setCurrentPhase(`xr:frame:${s}:sim.render(${e.state.mode},eye=${t})`);let T=e.getPostFxSceneView(w);l.render(f,T,null,t),i||=(a=e.device.createBuffer({label:`xr-widgets-camera`,size:e.cameraStride*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),Zn(e.device,a,()=>{let t=S/C;return e.getCameraUniformData(t)})),e.setCurrentPhase(`xr:frame:${s}:xr-widgets(eye=${t})`),i.draw(f,T,e.getPostFxSceneFormat(w),t,e.getUiRenderList()),e.setCurrentPhase(`xr:frame:${s}:bloom(eye=${t})`),e.postFxRunBloomChain(f),e.setCurrentPhase(`xr:frame:${s}:composite(eye=${t})`);let E=m.colorTexture.format;e.postFxRunComposite(f,g,E,[b,x,S,C])}e.setCurrentPhase(`xr:frame:${s}:submit`),e.device.queue.submit([f.finish()]),d&&e.logInfo(`xr:frame`,`frame #${s} submitted OK`)}catch(t){e.logError(`xr:frame`,t,`frame #${s} threw synchronously`)}finally{e.cameraSystem.clearXrOverride(),o=null,e.device.popErrorScope().then(t=>{t&&e.logError(`xr:frame:validation`,t,`frame #${s}`)}).catch(t=>e.logError(`xr:frame:popScope`,t)),s++}};return{getDepthOverride(){return o},getSession(){return t},async toggle(){if(t){e.logInfo(`xr`,`ending session on toggle`),t.end();return}if(!navigator.xr){e.logError(`xr`,Error(`WebXR not supported (navigator.xr missing)`));return}let i=document.getElementById(`btn-xr`);e.setCurrentPhase(`xr:requestSession`);try{t=await navigator.xr.requestSession(`immersive-vr`,{requiredFeatures:[`webgpu`],optionalFeatures:[`layers`,`local-floor`,`hand-tracking`]});let a=t.enabledFeatures,o=a?.includes(`hand-tracking`)??!1;e.setHandTrackingAvailable(o),e.logInfo(`xr`,`session acquired`,{enabledFeatures:a?Array.from(a):[],environmentBlendMode:t.environmentBlendMode,interactionMode:t.interactionMode,visibilityState:t.visibilityState,handTracking:o}),e.setCurrentPhase(`xr:requestReferenceSpace(local-floor)`);let l,u=!1;try{l=await t.requestReferenceSpace(`local-floor`),u=!0,e.logInfo(`xr`,`using local-floor reference space`)}catch(n){e.logInfo(`xr`,`local-floor unavailable, falling back to local`,n.message),e.setCurrentPhase(`xr:requestReferenceSpace(local)`),l=await t.requestReferenceSpace(`local`)}e.initializeReferenceSpace(l,u),e.setCurrentPhase(`xr:createBinding`),n=new XRGPUBinding(t,e.device);let f=n.getPreferredColorFormat(),p=n.nativeProjectionScaleFactor;e.logInfo(`xr`,`projection preferences`,{preferredFormat:f,nativeProjectionScaleFactor:p}),e.syncRenderConfig(f,1);let m=[{colorFormat:f,depthStencilFormat:`depth24plus`,scaleFactor:p,textureType:`texture-array`},{colorFormat:f,depthStencilFormat:`depth24plus`,textureType:`texture-array`},{colorFormat:f,scaleFactor:p,textureType:`texture-array`},{colorFormat:f,textureType:`texture-array`},{colorFormat:f,scaleFactor:p},{colorFormat:f}];e.setCurrentPhase(`xr:createProjectionLayer`);let h=null,g=[];for(let t of m)try{r=n.createProjectionLayer(t),h=t;break}catch(n){let i=n.message;g.push({config:t,error:i}),e.logInfo(`xr`,`projection layer config rejected`,{config:t,error:i}),r=null}if(!r)throw Error(`All projection layer configurations failed. Attempts: ${JSON.stringify(g)}`);e.logInfo(`xr`,`projection layer created`,{config:h,textureWidth:r.textureWidth,textureHeight:r.textureHeight,textureArrayLength:r.textureArrayLength,ignoreDepthValues:r.ignoreDepthValues});try{r.fixedFoveation=0,e.logInfo(`xr`,`fixedFoveation set to 0`)}catch(t){e.logInfo(`xr`,`fixedFoveation unsupported on this platform`,t.message)}e.setCurrentPhase(`xr:updateRenderState`),t.updateRenderState({layers:[r]}),e.logInfo(`xr`,`render state updated with projection layer`),t.addEventListener(`selectstart`,t=>{e.queuePendingSource(t.inputSource)}),t.addEventListener(`selectend`,t=>{e.onSelectEnd(t.inputSource)}),i.textContent=`Exit VR`,e.state.xrEnabled=!0,e.setCurrentPhase(`xr:awaiting first frame`);let _=[0,0,0,1],v={x:.16,y:.06},y={x:.02,y:.02};e.uiRegistry.layouts.set(`debug`,{id:`debug-panel`,kind:`panel`,anchor:{kind:`head-hud`,distance:.7,offset:{position:[0,-.15,0],orientation:_}},size:{x:1.1,y:.5},children:[{id:`debug-row-1`,kind:`group`,layout:`row`,children:[{id:`debug-s1`,kind:`slider`,binding:`physics.G`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:v,hitPadding:y},{id:`debug-b1`,kind:`button`,binding:`preset.physics.Default`,style:`primary`,visualSize:v,hitPadding:y},{id:`debug-r1`,kind:`readout`,binding:`physics.G`,visualSize:v,hitPadding:y},{id:`debug-d1`,kind:`dial`,binding:`physics.softening`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:v,hitPadding:y}]},{id:`debug-row-2`,kind:`group`,layout:`row`,children:[{id:`debug-tg1`,kind:`toggle`,binding:`app.paused`,style:`switch`,visualSize:v,hitPadding:y},{id:`debug-st1`,kind:`stepper`,binding:`physics.count`,step:1e3,visualSize:v,hitPadding:y},{id:`debug-en1`,kind:`enum-chips`,binding:`physics.distribution`,visualSize:v,hitPadding:y},{id:`debug-pt1`,kind:`preset-tile`,binding:`preset.physics.Spiral Galaxy`,visualSize:v,hitPadding:y},{id:`debug-ct1`,kind:`category-tile`,targetTabId:`physics`,summary:{},visualSize:v,hitPadding:y}]}]});let b={kind:`held`,hand:`left`,offset:{position:[0,.15,-.1],orientation:[Math.sin(Math.PI*.33),0,0,Math.cos(Math.PI*.33)]}},x={x:.17,y:.03};e.uiRegistry.layouts.set(`clipboard`,{id:`clipboard-panel`,kind:`panel`,anchor:b,size:{x:.2,y:.28},children:[{id:`clipboard-col`,kind:`group`,layout:`column`,gap:.015,children:[{id:`clipboard-title`,kind:`readout`,binding:`physics.G`,visualSize:{x:.18,y:.025},hitPadding:{x:0,y:0}},{id:`clipboard-G`,kind:`slider`,binding:`physics.G`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:x,hitPadding:d.defaultHitPadding},{id:`clipboard-soft`,kind:`slider`,binding:`physics.softening`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:x,hitPadding:d.defaultHitPadding},{id:`clipboard-int`,kind:`slider`,binding:`physics.interactionStrength`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:x,hitPadding:d.defaultHitPadding}]}]}),e.uiRegistry.activeLayoutId=`clipboard`,t.addEventListener(`visibilitychange`,()=>{e.logInfo(`xr`,`visibilitychange`,{visibilityState:t?.visibilityState})}),t.requestAnimationFrame(c),e.logInfo(`xr`,`first frame requested; waiting for xrFrame callback`),t.addEventListener(`end`,()=>{e.logInfo(`xr`,`session ended`,{finalPhase:e.getCurrentPhase(),framesRendered:s}),t=null,n=null,r=null,e.clearReferenceSpace(),e.setHandTrackingAvailable(!1),e.state.xrEnabled=!1,s=0,e.setCurrentPhase(`desktop`),e.syncRenderConfig(e.canvasFormat(),1),e.resetInputState(),i.textContent=`Enter VR`,e.requestDesktopFrame()})}catch(n){if(e.logError(`xr:toggle`,n,`session failed to start (phase=${e.getCurrentPhase()})`),i.textContent=`XR Error: ${n.message}`,t)try{t.end()}catch(t){e.logError(`xr:cleanup-end`,t)}t=null,e.clearReferenceSpace(),e.setHandTrackingAvailable(!1),e.setCurrentPhase(`desktop`),setTimeout(()=>{i.textContent=`Enter VR`},4e3)}}}}var Y,$n=`boot`,er=dn({getDevice:()=>Y.device,getPhase:()=>$n});er.installGlobalHandlers();var{createShaderModuleChecked:tr,createShaderModuleCheckedForDevice:nr,logError:rr,logInfo:ir,showSimError:ar}=er,X=Le(R),or,Z;function sr(e){return X[e]}var Q;function cr(){return Q.currentSimStep()}function lr(){return Q.currentTimeDirection()}function ur(e,t,n){return Q.attractorStrength(e,t,n)}function dr(e){Q.prune(e)}function fr(e,t){Q.create(e,t)}function pr(e,t){Q.move(e,t)}function mr(e){Q.release(e)}function hr(e){Q.tickMarkers(e)}var gr=96,_r=4,vr=208,yr=256,br=null,$;function xr(e,t){Y.postFx.ensureHdrTargets(e,t)}function Sr(){return Y.postFx.getCurrentSceneView()}function Cr(e,t,n){return Y.postFx.getColorAttachment(e,t,n,X.fx.trailPersistence,pe)}function wr(e,t){return Y.postFx.getDepthAttachment(e,t,br?.getDepthOverride()??null)}function Tr(e){return e}function Er(e){}function Dr(e){return Y.cameraSystem.getUniformData(e,Z.getThemeColors(),X.mouse)}function Or(){return{createShaderModuleChecked:nr,currentSimStep:cr,currentTimeDirection:lr,dropSimulationIfCurrent:zr,getCanvasContainer:()=>document.getElementById(`canvas-container`),getCurrentSimulation:()=>Ir[X.mode],getDefaultClearColor:()=>pe,getThemeColors:()=>Z.getThemeColors(),logError:rr,pruneAttractors:dr,refreshThemeColors:e=>Z.refreshThemeColors(e),restoreAfterDeviceLoss:kr,runDebugCompute:(e,t)=>Z.runDebugCompute(e,t),showSimError:ar,state:X,tickMarkers:hr,updateAdaptiveChunk:e=>Z.updateAdaptiveChunk(e),updateDebugPanel:()=>Z.updateDebugPanel()}}async function kr(){let e=await Ie(Or());e&&(Y=e,Pr(),ii(),Y.frameRuntime.requestFrame())}function Ar(){let e=Ir.physics;return Ce(e)?e:null}function jr(){Q=xn({getCurrentPhysicsStep:()=>Ar()?.getSimStep()??0,getCurrentTimeDirection:()=>Ar()?.getTimeDirection()??1,getThemeColors:()=>Z.getThemeColors(),state:X}),Hr=Sn({fluidWorldSize:_r,getCanvas:()=>Y.canvas,onCreateAttractor:fr,onMoveAttractor:pr,onReleaseAttractor:mr,state:X}),Ur=wn({actions:or,applySimulationInteraction:(e,t,n,r)=>Hr.applySimulationInteraction(e,t,n,r),getCanvas:()=>Y.canvas,modeTabLabels:_e,releasePointerInteraction:e=>Hr.releasePointerInteraction(e),setSimulationInteractionInactive:qr,state:X,storageKey:nt}),$=Bn({bindings:e,closestPointOnRayToOrigin:Kr,createAttractor:fr,intersectRayWithPlane:Gr,metrics:pn,moveAttractor:pr,releaseAttractor:mr,setSimulationInteractionInactive:qr,state:X,worldToFluidUV:Wr})}function Mr(e,t){Y.postFx.markNeedsClear()}var Nr=null;function Pr(){Nr?.destroy(),Nr=Tn({cameraSize:vr,cameraStride:yr,createShaderModuleChecked:tr,device:Y.device,getCameraUniformData:Dr,renderSampleCount:Y.renderSampleCount,renderTargetFormat:Y.renderTargetFormat})}function Fr(e,t,n=0){Nr?.render(e,t,n)}var Ir={},Lr=null;function Rr(e){let t=Lr?.get(e);t?Ir[e]=t:delete Ir[e]}function zr(e,t){Lr?.dropIfCurrent(e,t),Rr(e)}function Br(){return{attractorMax:32,baseDt:mn,cameraSize:vr,cameraStride:yr,clearColor:pe,createShaderModuleChecked:tr,destroyDepthRef:Er,device:Y.device,fluidGridResolution:gr,fluidWorldSize:_r,getAttractorStrength:ur,getCameraUniformData:Dr,getColorAttachment:Cr,getCurrentSceneView:Sr,getDefaultAspect:()=>Y.canvas.width/Y.canvas.height,getDepthAttachment:wr,getRenderViewport:Tr,getXrDepthOverride:()=>br?.getDepthOverride()??null,markersPerAttractor:36,nullColorView:Y.postFx.getNullColorView(),nullDepthView:Y.postFx.getNullDepthView(),postFxDepthView:()=>Y.postFx.getDepthView(),renderGrid:Fr,renderSampleCount:Y.renderSampleCount,renderTargetFormat:Y.renderTargetFormat,shapeIds:me,state:X,tsWrites:ri}}function Vr(){Lr=sn({device:Y.device,factories:on(Br()),reportError:(e,t)=>{ar(e,t),delete Ir[e]}})}var Hr,Ur;function Wr(e){return Hr.worldToFluidUV(e)}function Gr(e,t,n){return Hr.intersectRayWithPlane(e,t,n)}function Kr(e,t){return Hr.closestPointOnRayToOrigin(e,t)}function qr(){Hr.setSimulationInteractionInactive()}var Jr=matchMedia(`(max-width: 768px)`),Yr=Jr.matches;function Xr(){Hr.setupMouseControls()}function Zr(){Ur.setupTouchControls()}function Qr(){Ur.setupFab()}function $r(){Ur.setupBottomSheet()}function ei(){Ur.applyMobileDefaults()}function ti(e){return e===`physics`?{...Ft(e),...ae}:Ft(e)}async function ni(){await br?.toggle()}function ri(e){return Y.frameRuntime.tsWrites(e)}function ii(){let e=X.mode;Lr||Vr(),Lr?.ensure(e),Rr(e)}function ai(){let e=X.mode;Lr||Vr(),Lr?.reset(e),Rr(e)}function oi(){Y.frameRuntime.updateStats()}function si(){Y.frameRuntime.resize()}function ci(e,t){Y.frameRuntime.runBloomChain(e,t)}function li(e,t,n,r=null,i){Y.frameRuntime.runComposite(e,t,n,r,i)}function ui(){it(X,R,sr)}function di(){at(X,R,ue,sr,e=>Z.syncThemeTransition(e))}function fi(){Re({actions:or,modeParams:sr,modeTabLabels:_e,paramDefs:le,presets:ce,registry:e,state:X,themes:ue})}async function pi(){let t=await Ie(Or());t&&(Y=t,Z=tt({state:X,storageKey:nt,modeParams:sr,catalog:{defaults:R,defaultTheme:de,themeFadeMs:fe,themes:ue,fxParamDefs:ge,modeTabLabels:_e,paramDefs:le,presets:ce,shapeParams:he},getActions:()=>or,getCanvas:()=>Y.canvas,getPhysicsSimulation:Ar,getActiveSimulation:()=>Ir[X.mode],getXrSession:()=>br?.getSession()??null,toggleXr:ni,setXrDebugLogging:e=>$.setDebugLogging(e),createShaderModule:e=>Y.device.createShaderModule({code:e}),applyShaderEdit:It,resetShaderEdit:Lt,getShaderSources:ti,metrics:pn}),or=ve({cancelDebugMovement:()=>Z.cancelDebugMovement(),ensureSimulation:ii,modeParams:sr,presets:ce,reflectPaused:()=>Z.syncPauseButtons(),resetCurrentSimulationInternal:ai,saveStateInternal:ui,selectTheme:e=>Z.selectTheme(e),state:X,syncUi:()=>Z.syncUiFromState(),updatePrompt:()=>Z.updatePrompt(),updateShaderPanel:()=>Z.updateShaderPanel(),updateStats:oi}),jr(),Vr(),br=Qn({cameraStride:yr,cameraSystem:Y.cameraSystem,canvasFormat:()=>Y.canvasFormat,currentSimStep:cr,currentTimeDirection:lr,device:Y.device,ensureHdrTargets:xr,getCameraUniformData:Dr,getCurrentPhase:()=>$n,getCurrentSimulation:()=>Ir[X.mode],getPostFxSceneFormat:e=>Y.postFx.getSceneFormat(e),getPostFxSceneIndex:()=>Y.postFx.getSceneIndex(),getPostFxSceneView:e=>Y.postFx.getSceneView(e),getRefSpace:()=>$.getRefSpace(),getUiRenderList:()=>$.getRenderList(),initializeReferenceSpace:(e,t)=>$.initializeReferenceSpace(e,t),inputStep:e=>$.inputStep(e),logError:rr,logInfo:ir,markPostFxNeedsClear:()=>Y.postFx.markNeedsClear(),onSelectEnd:e=>$.onSelectEnd(e),postFxRunBloomChain:ci,postFxRunComposite:li,pruneAttractors:dr,queuePendingSource:e=>{$.queuePendingSource(e)},refreshThemeColors:e=>Z.refreshThemeColors(e),requestDesktopFrame:()=>Y.frameRuntime.requestFrame(),resetInputState:()=>$.reset(),clearReferenceSpace:()=>$.clearReferenceSpace(),setCurrentPhase:e=>{$n=e},setHandTrackingAvailable:()=>{},state:X,syncRenderConfig:Mr,tickFrameStats:e=>Y.frameRuntime.tickFrameStats(e),tickMarkers:hr,uiRegistry:$.getUiRegistry(),updateStats:oi}),Yr=Jr.matches,document.body.classList.toggle(`mobile`,Yr),Jr.addEventListener(`change`,e=>{let t=e.matches;t!==Yr&&(Yr=t,document.body.classList.toggle(`mobile`,Yr),window.location.reload())}),Pr(),di(),Yr&&ei(),Z.syncThemeTransition(X.colorTheme),fi(),Z.init(),Yr?(Zr(),Qr(),$r()):Xr(),Z.syncUiFromState(),si(),ii(),or.updateAll(),Y.frameRuntime.start(),cn({state:X,getCurrentSimulation:()=>Ir[X.mode],getGpuStats:()=>Y.frameRuntime.getGpuStats(),bindings:e,anchors:{evaluateAnchor:r,handFrames:$.getHandFrames()},xrUi:{layout:m,hitTestWidgets:S,step:E,applyEffects:O,registry:$.getUiRegistry(),makeIdlePrev:w,getRenderList:()=>$.getRenderList(),getPrev:()=>$.getPrev(),getClaimed:()=>$.getClaimed()}}))}var mi=pi;async function hi(){await mi()}hi();