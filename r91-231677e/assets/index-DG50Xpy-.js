(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=new class{map=new Map;register(e){if(this.map.has(e.id))throw Error(`BindingRegistry: id "${e.id}" already registered`);this.map.set(e.id,e)}get(e){return this.map.get(e)}list(){return Array.from(this.map.values())}filterByGroup(e){return this.list().filter(t=>t.group===e)}},t=[0,0,0,1];function n(e){return[-e[0],-e[1],-e[2],e[3]]}function r(e,n){switch(e.kind){case`world`:return e.pose;case`wrist`:case`held`:{let t=n.hands[e.hand].joints?.wrist??null;return t?s(i(t),e.offset):null}case`palm`:{let t=n.hands[e.hand],r=t.joints?.wrist??null,i=t.palmNormal;return!r||!i?null:s({position:a(r.position),orientation:u([0,0,1],a(i))},e.offset)}case`head-hud`:return n.headPose?s(s(n.headPose,{position:[0,0,-e.distance],orientation:t}),e.offset):null}}function i(e){return{position:a(e.position),orientation:o(e.orientation)}}function a(e){return[e[0],e[1],e[2]]}function o(e){return[e[0],e[1],e[2],e[3]]}function s(e,t){let n=l(e.orientation,t.position);return{position:[e.position[0]+n[0],e.position[1]+n[1],e.position[2]+n[2]],orientation:c(e.orientation,t.orientation)}}function c(e,t){return[e[3]*t[0]+e[0]*t[3]+e[1]*t[2]-e[2]*t[1],e[3]*t[1]-e[0]*t[2]+e[1]*t[3]+e[2]*t[0],e[3]*t[2]+e[0]*t[1]-e[1]*t[0]+e[2]*t[3],e[3]*t[3]-e[0]*t[0]-e[1]*t[1]-e[2]*t[2]]}function l(e,t){let n=e[0],r=e[1],i=e[2],a=e[3],o=r*t[2]-i*t[1],s=i*t[0]-n*t[2],c=n*t[1]-r*t[0],l=o+a*t[0],u=s+a*t[1],d=c+a*t[2];return[t[0]+2*(r*d-i*u),t[1]+2*(i*l-n*d),t[2]+2*(n*u-r*l)]}function u(e,t){let n=e[0],r=e[1],i=e[2],a=t[0],o=t[1],s=t[2],c=n*a+r*o+i*s;if(c>.999999)return[0,0,0,1];if(c<-.999999){let e=Math.abs(n)<.9?[1,0,0]:[0,1,0],t=r*e[2]-i*e[1],a=i*e[0]-n*e[2],o=n*e[1]-r*e[0],s=Math.hypot(t,a,o)||1;return[t/s,a/s,o/s,0]}let l=n+a,u=r+o,d=i+s,f=Math.hypot(l,u,d),p=l/f,m=u/f,h=d/f;return[r*h-i*m,i*p-n*h,n*m-r*p,n*p+r*m+i*h]}var d=Object.freeze({minHitHalfExtent:Object.freeze({x:.06,y:.06}),defaultHitPadding:Object.freeze({x:.02,y:.02}),minNeighborHitGap:.02}),f=new Set([`slider`,`dial`,`toggle`,`stepper`,`enum-chips`,`button`,`preset-tile`,`category-tile`,`readout`]);function p(e){return f.has(e.kind)}function m(e,t){let n=r(e.anchor,t);if(!n)return null;let i=new Map,a=[];return g(e.children,n,{x:0,y:0},e.id,i,a),i.set(e.id,{pose:n,visualRect:{halfExtent:b(e.size)},hitRect:{halfExtent:b(e.size)},widget:null,containerKind:`panel`,childrenIds:a}),i}function h(e,t,n,r,i,a){if(p(e)){let o=v(e);i.set(e.id,{pose:x(t,n),visualRect:{halfExtent:o.visualHalf},hitRect:{halfExtent:o.hitHalf},widget:e,parentId:r,childrenIds:[]}),a.push(e.id);return}switch(e.kind){case`group`:_(e,t,n,r,i,a);return;case`tabs`:{let o=e.tabs.find(t=>t.id===e.activeTabId);o&&h(o.body,t,n,r,i,a);return}case`focus-view`:{if(e.focused==null)return;let o=e.children.find(t=>t.id===e.focused);o&&h(o,t,n,r,i,a);return}case`panel`:return}}function g(e,t,n,r,i,a){let o=e.map(v),s=d.minNeighborHitGap,c=y(o,`y`,s)/2;for(let l=0;l<e.length;l++){let u=o[l],d=c-u.hitHalf.y;h(e[l],t,{x:n.x,y:n.y+d},r,i,a),c-=u.hitHalf.y*2+s}}function _(e,t,n,r,i,a){let o=Math.max(e.gap??0,d.minNeighborHitGap),s=e.children.map(v);if(e.layout===`row`){let c=-y(s,`x`,o)/2;for(let l=0;l<e.children.length;l++){let u=s[l],d=c+u.hitHalf.x;h(e.children[l],t,{x:n.x+d,y:n.y},r,i,a),c+=u.hitHalf.x*2+o}return}if(e.layout===`column`){let c=y(s,`y`,o)/2;for(let l=0;l<e.children.length;l++){let u=s[l],d=c-u.hitHalf.y;h(e.children[l],t,{x:n.x,y:n.y+d},r,i,a),c-=u.hitHalf.y*2+o}return}let c=Math.max(1,e.columns??1),l=Math.max(0,...s.map(e=>e.hitHalf.x)),u=Math.max(0,...s.map(e=>e.hitHalf.y)),f=Math.ceil(e.children.length/c),p=c*l*2+Math.max(0,c-1)*o,m=f*u*2+Math.max(0,f-1)*o;for(let s=0;s<e.children.length;s++){let d=Math.floor(s/c),f=s%c,g=-p/2+f*(l*2+o)+l,_=m/2-d*(u*2+o)-u;h(e.children[s],t,{x:n.x+g,y:n.y+_},r,i,a)}}function v(e){if(p(e)){let t=b(e.visualSize);return{hitHalf:{x:Math.max(t.x+e.hitPadding.x,d.minHitHalfExtent.x),y:Math.max(t.y+e.hitPadding.y,d.minHitHalfExtent.y)},visualHalf:t}}switch(e.kind){case`panel`:return{hitHalf:b(e.size),visualHalf:b(e.size)};case`group`:{let t=Math.max(e.gap??0,d.minNeighborHitGap),n=e.children.map(v);if(e.layout===`row`){let e=y(n,`x`,t),r=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.y*2));return{hitHalf:{x:e/2,y:r/2},visualHalf:{x:e/2,y:r/2}}}if(e.layout===`column`){let e=y(n,`y`,t),r=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.x*2));return{hitHalf:{x:r/2,y:e/2},visualHalf:{x:r/2,y:e/2}}}let r=Math.max(1,e.columns??1),i=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.x)),a=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.y)),o=Math.ceil(e.children.length/r),s=r*i*2+Math.max(0,r-1)*t,c=o*a*2+Math.max(0,o-1)*t;return{hitHalf:{x:s/2,y:c/2},visualHalf:{x:s/2,y:c/2}}}case`tabs`:{let t=e.tabs.find(t=>t.id===e.activeTabId);return t?v(t.body):{hitHalf:{x:0,y:0},visualHalf:{x:0,y:0}}}case`focus-view`:{if(e.focused==null)return{hitHalf:{x:0,y:0},visualHalf:{x:0,y:0}};let t=e.children.find(t=>t.id===e.focused);return t?v(t):{hitHalf:{x:0,y:0},visualHalf:{x:0,y:0}}}}}function y(e,t,n){let r=0;for(let i=0;i<e.length;i++)r+=(t===`x`?e[i].hitHalf.x:e[i].hitHalf.y)*2,i>0&&(r+=n);return r}function b(e){return{x:e.x/2,y:e.y/2}}function x(e,t){return s(e,{position:[t.x,t.y,0],orientation:[0,0,0,1]})}function ee(e,t){let n=null,r=1/0;for(let[i,a]of e){if(!a.widget)continue;let e=te(t,a.pose,a.hitRect.halfExtent);e!==null&&e<r&&(r=e,n=i)}return n}function te(e,t,r){let i=n(t.orientation),a=l(i,[e.origin[0]-t.position[0],e.origin[1]-t.position[1],e.origin[2]-t.position[2]]),o=l(i,[e.dir[0],e.dir[1],e.dir[2]]);if(Math.abs(o[2])<1e-9)return null;let s=-a[2]/o[2];if(s<=0)return null;let c=a[0]+s*o[0],u=a[1]+s*o[1];return Math.abs(c)>r.x||Math.abs(u)>r.y?null:s}function S(){return{states:{left:{kind:`idle`},right:{kind:`idle`}},pinches:{left:!1,right:!1}}}var C=[`left`,`right`];function w(e,t,n,r,i,a){let o=[],s=[],c={states:{left:n.states.left,right:n.states.right},pinches:{left:t.left.pinch.active,right:t.right.pinch.active}},l=e.activeLayoutId==null?void 0:e.layouts.get(e.activeLayoutId);if(!l)return c.states.left={kind:`idle`},c.states.right={kind:`idle`},{next:c,sideEffects:o,renderList:s};let u=m(l,r);if(!u)return c.states.left={kind:`idle`},c.states.right={kind:`idle`},{next:c,sideEffects:o,renderList:s};for(let r of C){let a=t[r],s=n.pinches[r],l=a.pinch.active,d=n.states[r],f=d;if(l&&!s){let t=a.gazeRay?ee(u,a.gazeRay):null,n=t?u.get(t)??null:null,r=n?.widget??null;f=r&&t&&n?oe(r,t,n.pose,e.bindings,a):{kind:`idle`}}else if(!l&&s){if(d.kind===`pressing`&&!d.cancelPending){let e=d.commit;if(e.kind===`invoke`)o.push({kind:`binding-invoke`,bindingId:d.bindingId});else if(e.kind===`toggle`)o.push({kind:`binding-set`,bindingId:d.bindingId,value:!e.valueAtOrigin});else{let t=Math.max(e.min,Math.min(e.max,e.valueAtOrigin+e.step));o.push({kind:`binding-set`,bindingId:d.bindingId,value:t})}}f={kind:`idle`}}else if(l&&s){if(d.kind===`dragging`){let t=e.bindings.get(d.bindingId);if(t&&t.kind===`continuous`){let e=se(d,a,t,i.gainMultiplier);o.push({kind:`binding-set`,bindingId:d.bindingId,value:e})}f=d}else if(d.kind===`pressing`){let e=!!a.currentRay&&ee(u,a.currentRay)===d.widgetId;f={...d,cancelPending:!e}}}else{let e=a.ray?ee(u,a.ray):null;f=e?{kind:`hovering`,widgetId:e}:{kind:`idle`}}c.states[r]=f}for(let[t,n]of u){if(!n.widget)continue;let r=n.widget,i=re(c.states,e=>e.kind===`hovering`&&e.widgetId===t),a=re(c.states,e=>e.kind===`pressing`&&e.widgetId===t),o=re(c.states,e=>e.kind===`dragging`&&e.widgetId===t);s.push({widgetId:t,pose:n.pose,visualHalfExtent:n.visualRect.halfExtent,kind:r.kind,state:{hover:i,pressed:a,dragging:o,value:ae(r,e.bindings)},label:E(r,e.bindings)})}return{next:c,sideEffects:o,renderList:s}}function T(e){return e.kind===`pressing`||e.kind===`dragging`}function ne(e,t){for(let n of e){if(n.kind===`tab-switch`)continue;let e=t.bindings.get(n.bindingId);if(e){if(n.kind===`binding-invoke`&&e.kind===`action`){e.invoke();continue}n.kind===`binding-set`&&(e.kind===`continuous`&&typeof n.value==`number`||e.kind===`toggle`&&typeof n.value==`boolean`||e.kind===`enum`&&typeof n.value==`string`)&&e.set(n.value)}}}function re(e,t){return t(e.left)||t(e.right)}function E(e,t){if(e.kind===`category-tile`)return;let n=t.get(e.binding);if(n){if(e.kind===`slider`||e.kind===`dial`||e.kind===`readout`||e.kind===`stepper`){if(n.kind!==`continuous`)return n.label;let e=n.get();return n.format?n.format(e):ie(e)}if(e.kind===`toggle`)return n.kind===`toggle`?n.get()?`On`:`Off`:n.label;if(e.kind===`enum-chips`)return n.kind===`enum`?n.get():n.label;if(e.kind===`button`||e.kind===`preset-tile`)return n.label}}function ie(e){if(Number.isInteger(e))return String(e);let t=Math.abs(e);return t>=100?e.toFixed(0):t>=10?e.toFixed(1):t>=1?e.toFixed(2):e.toFixed(3)}function ae(e,t){if(e.kind!==`slider`&&e.kind!==`dial`&&e.kind!==`readout`)return;let n=t.get(e.binding);if(!n||n.kind!==`continuous`)return;let r=n.range.max-n.range.min;return r<=0?0:(n.get()-n.range.min)/r}function oe(e,t,n,r,i){if(e.kind===`button`||e.kind===`preset-tile`){let n=r.get(e.binding);return!n||n.kind!==`action`?{kind:`idle`}:{kind:`pressing`,widgetId:t,bindingId:n.id,startedAt:i.pinch.startTime,cancelPending:!1,commit:{kind:`invoke`}}}if(e.kind===`toggle`){let n=r.get(e.binding);return!n||n.kind!==`toggle`?{kind:`idle`}:{kind:`pressing`,widgetId:t,bindingId:n.id,startedAt:i.pinch.startTime,cancelPending:!1,commit:{kind:`toggle`,valueAtOrigin:n.get()}}}if(e.kind===`stepper`){let n=r.get(e.binding);return!n||n.kind!==`continuous`?{kind:`idle`}:{kind:`pressing`,widgetId:t,bindingId:n.id,startedAt:i.pinch.startTime,cancelPending:!1,commit:{kind:`increment`,valueAtOrigin:n.get(),step:e.step,min:n.range.min,max:n.range.max}}}if(e.kind===`slider`||e.kind===`dial`){let a=r.get(e.binding);return!a||a.kind!==`continuous`?{kind:`idle`}:{kind:`dragging`,widgetId:t,bindingId:a.id,handOriginPos:[...i.pinch.origin],widgetOrientationAtOrigin:[n.orientation[0],n.orientation[1],n.orientation[2],n.orientation[3]],valueAtOrigin:a.get(),interaction:e.interaction,cancelPending:!1}}return{kind:`idle`}}function se(e,t,r,i){let a=[t.pinch.current[0]-e.handOriginPos[0],t.pinch.current[1]-e.handOriginPos[1],t.pinch.current[2]-e.handOriginPos[2]],o=l(n(e.widgetOrientationAtOrigin),a),s=o[0],c=o[1],u=o[2],d=r.range.max-r.range.min,f=e=>{switch(e.kind){case`direct-drag`:return(e.axis===`x`?s:c)*d;case`pinch-pull`:{let t=e.axis;return(t===`forward`?-u:t===`up`?c:s)*e.unitsPerMeter}case`pinch-twist`:return 0;case`expand-to-focus`:return f(e.underlying)}},p=f(e.interaction),m=e.valueAtOrigin+p*i;return Math.max(r.range.min,Math.min(r.range.max,m))}var ce=`// XR widget renderer.
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
`,le=64,ue=64,de=208,fe=256,pe=512,me=64,D=le,he=me*D,ge={slider:0,button:1,readout:2,dial:3,toggle:4,stepper:5,"enum-chips":6,"preset-tile":7,"category-tile":8};function _e(e,t,n){let r=e.createShaderModule({code:ce,label:`xr-widgets`}),i=e.createBindGroupLayout({label:`xr-widgets-bgl`,entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,sampler:{}}]}),a=e.createPipelineLayout({bindGroupLayouts:[i]}),o=e.createBuffer({label:`xr-widgets-instances`,size:ue*le,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),s=new ArrayBuffer(ue*le),c=new Float32Array(s),l=new Uint32Array(s),u=document.createElement(`canvas`);u.width=pe,u.height=he;let d=u.getContext(`2d`);if(!d)throw Error(`xr-widgets: 2D canvas context unavailable`);let f=d;f.font=`600 40px system-ui, -apple-system, sans-serif`,f.textAlign=`center`,f.textBaseline=`middle`;let p=e.createTexture({label:`xr-widgets-label-atlas`,size:[pe,he,1],format:`rgba8unorm`,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),m=p.createView(),h=e.createSampler({label:`xr-widgets-atlas-sampler`,magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`}),g=Array(D).fill(``);function _(t,n){if(g[t]===n)return t;g[t]=n;let r=t*me;return f.clearRect(0,r,pe,me),f.fillStyle=`rgba(255, 255, 255, 1)`,f.fillText(n,pe/2,r+me/2),e.queue.copyExternalImageToTexture({source:u,origin:{x:0,y:r}},{texture:p,origin:{x:0,y:r}},[pe,me,1]),t}let v=[];for(let n=0;n<2;n++)v.push(e.createBindGroup({label:`xr-widgets-bg-eye${n}`,layout:i,entries:[{binding:0,resource:{buffer:t,offset:n*fe,size:de}},{binding:1,resource:{buffer:o}},{binding:2,resource:m},{binding:3,resource:h}]}));let y=new Map;function b(t){let n=y.get(t);return n||(n=e.createRenderPipeline({label:`xr-widgets-pipeline-${t}`,layout:a,vertex:{module:r,entryPoint:`vs`},fragment:{module:r,entryPoint:`fs`,targets:[{format:t,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`}}),y.set(t,n),n)}function x(e){let t=Math.min(e.length,le);for(let n=0;n<t;n++){let t=e[n],r=ue/4*n;c[r+0]=t.pose.position[0],c[r+1]=t.pose.position[1],c[r+2]=t.pose.position[2],c[r+3]=t.visualHalfExtent.x,c[r+4]=t.pose.orientation[0],c[r+5]=t.pose.orientation[1],c[r+6]=t.pose.orientation[2],c[r+7]=t.pose.orientation[3],c[r+8]=t.visualHalfExtent.y,l[r+9]=ge[t.kind]??0;let i=(t.state.hover?1:0)|(t.state.pressed?2:0)|(t.state.dragging?4:0);l[r+10]=i>>>0,c[r+11]=t.state.value??0;let a=t.label!=null&&t.label.length>0?_(n,t.label):-1;l[r+12]=a>=0?a>>>0:0,l[r+13]=a>=0?1:0,l[r+14]=0,l[r+15]=0}return t}return{draw(r,i,a,c,l){e.queue.writeBuffer(t,c*fe,n(c));let u=x(l);u>0&&e.queue.writeBuffer(o,0,s,0,u*ue);let d=r.beginRenderPass({label:`xr-widgets-pass-eye${c}`,colorAttachments:[{view:i,loadOp:`load`,storeOp:`store`}]});u>0&&(d.setPipeline(b(a)),d.setBindGroup(0,v[c]),d.draw(6,u)),d.end()},destroy(){o.destroy(),p.destroy()}}}var ve=`// Gas pressure potential construction.
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
`,ye=`// Gas pressure force interpolation.
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
`,be=`// Gas DKD leapfrog integrator.
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
`,O=`struct Camera {
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
`,xe={"Gas χ":ve,"Gas Pressure":ye,"Gas Compute":be,"Gas Render":O},Se=128,Ce=64,we=Ce*2/Se,Te=Se*Se*Se;function Ee(e,t,n,r,i,a,o,s){let c=e.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),l=new ArrayBuffer(32),u=new Float32Array(l),d=new Uint32Array(l);return d[1]=t,d[2]=n,u[3]=r,u[4]=i,u[5]=a,d[6]=o,d[7]=s,{buffer:c,data:l,f32:u,u32:d}}function De(e){let{device:t}=e,n=Math.max(0,Math.min(.5,e.gasMassFraction)),r=Math.max(1,Math.min(2e5,Math.round(e.starCount*2.5))),i=r*48,a=e.totalStarMass*n,o=a/r,s=new Float32Array(r*12);for(let e=0;e<r;e++){let t=e*12;s[t]=(Math.random()-.5)*60,s[t+1]=(Math.random()-.5)*60,s[t+2]=(Math.random()-.5)*60,s[t+3]=o}let c=t.createBuffer({size:i,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,mappedAtCreation:!0});new Float32Array(c.getMappedRange()).set(s),c.unmap();let l=t.createBuffer({size:i,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC}),u=[c,l],d=t.createBuffer({size:r*16,usage:e.pmBufUsage}),f=t.createBuffer({size:r*16,usage:e.pmBufUsage}),p=t.createBuffer({size:Te*4,usage:e.pmBufUsage}),m=t.createBuffer({size:Te*4,usage:e.pmBufUsage}),h=t.createBuffer({size:Te*4,usage:e.pmBufUsage}),g=Math.max(a/Te,1e-12),_=Math.max(g*1e-6,1e-12),v=Ee(t,r,e.innerParams.gridRes,e.innerParams.domainHalf,e.innerParams.cellSize,e.fixedPointScale,e.innerParams.cellCount,e.innerParams.filterOutOfDomain),y=Ee(t,r,e.outerParams.gridRes,e.outerParams.domainHalf,e.outerParams.cellSize,e.fixedPointScale,e.outerParams.cellCount,e.outerParams.filterOutOfDomain),b=Ee(t,r,Se,Ce,we,e.fixedPointScale,Te,0),x=u.map(n=>t.createBindGroup({layout:e.pmDepositBGL,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:e.innerDensityU32}},{binding:2,resource:{buffer:v.buffer}}]})),ee=u.map(n=>t.createBindGroup({layout:e.pmDepositBGL,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:e.outerDensityU32}},{binding:2,resource:{buffer:y.buffer}}]})),te=u.map(n=>t.createBindGroup({layout:e.pmDepositBGL,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:p}},{binding:2,resource:{buffer:b.buffer}}]})),S=t.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),C=new ArrayBuffer(32),w=new Float32Array(C),T=new Uint32Array(C);T[0]=Se,T[1]=Te,w[2]=e.fixedPointScale,w[4]=_,w[5]=g,w[6]=Ce,w[7]=we;let ne=e.createShaderModuleChecked(`gas.chi`,ve),re=t.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),E=t.createComputePipeline({layout:t.createPipelineLayout({bindGroupLayouts:[re]}),compute:{module:ne,entryPoint:`main`}}),ie=t.createBindGroup({layout:re,entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:m}},{binding:2,resource:{buffer:h}},{binding:3,resource:{buffer:S}}]}),ae=u.map(n=>t.createBindGroup({layout:e.pmInterpolateBGL,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:e.innerPotential}},{binding:2,resource:{buffer:e.outerPotential}},{binding:3,resource:{buffer:d}},{binding:4,resource:{buffer:v.buffer}},{binding:5,resource:{buffer:y.buffer}},{binding:6,resource:{buffer:e.pmBlendBuffer}}]})),oe=e.createShaderModuleChecked(`gas.pressure_interpolate`,ye),se=t.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),ce=t.createComputePipeline({layout:t.createPipelineLayout({bindGroupLayouts:[se]}),compute:{module:oe,entryPoint:`main`}}),le=u.map(e=>t.createBindGroup({layout:se,entries:[{binding:0,resource:{buffer:e}},{binding:1,resource:{buffer:h}},{binding:2,resource:{buffer:f}},{binding:3,resource:{buffer:b.buffer}}]})),ue=t.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),de=new ArrayBuffer(16),fe=new Float32Array(de),pe=new Uint32Array(de);pe[1]=r,fe[2]=Ce;let me=e.createShaderModuleChecked(`gas.compute`,be),D=t.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),he=t.createComputePipeline({layout:t.createPipelineLayout({bindGroupLayouts:[D]}),compute:{module:me,entryPoint:`main`}}),ge=[t.createBindGroup({layout:D,entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:d}},{binding:3,resource:{buffer:f}},{binding:4,resource:{buffer:ue}}]}),t.createBindGroup({layout:D,entries:[{binding:0,resource:{buffer:l}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:d}},{binding:3,resource:{buffer:f}},{binding:4,resource:{buffer:ue}}]})],_e=e.createShaderModuleChecked(`gas.render`,O),xe=t.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),De=t.createRenderPipeline({layout:t.createPipelineLayout({bindGroupLayouts:[xe]}),vertex:{module:_e,entryPoint:`vs_main`},fragment:{module:_e,entryPoint:`fs_main`,targets:[{format:e.renderTargetFormat,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:e.renderSampleCount}}),Oe=t.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),ke=new ArrayBuffer(32),Ae=new Float32Array(ke),je=new Uint32Array(ke);je[0]=Se,je[1]=32,Ae[2]=Ce,Ae[3]=we;let Me=[0,1].map(n=>t.createBindGroup({layout:xe,entries:[{binding:0,resource:{buffer:e.cameraBuffer,offset:n*e.cameraStride,size:e.cameraSize}},{binding:1,resource:{buffer:m}},{binding:2,resource:{buffer:Oe}}]})),Ne=t.createBuffer({size:Te*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),Pe=t.createBuffer({size:i,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),Fe=t.createBuffer({size:e.starCount*48,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),Ie=t.createBuffer({size:48,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),Le=!1,Re=e=>u[e];return{count:r,bodyBytes:i,totalMass:a,prepareFrame(e,n){v.f32[0]=e,y.f32[0]=e,b.f32[0]=e,w[3]=n,fe[0]=e,t.queue.writeBuffer(v.buffer,0,v.data),t.queue.writeBuffer(y.buffer,0,y.data),t.queue.writeBuffer(b.buffer,0,b.data),t.queue.writeBuffer(S,0,C),t.queue.writeBuffer(ue,0,de)},clear(e){e.clearBuffer(p)},depositInnerPm(t,n){t.setPipeline(e.pmDepositPipeline),t.setBindGroup(0,x[n]),t.dispatchWorkgroups(Math.ceil(r/256))},depositOuterPm(t,n){t.setPipeline(e.pmDepositPipeline),t.setBindGroup(0,ee[n]),t.dispatchWorkgroups(Math.ceil(r/256))},depositGasAndBuildPressure(t,n){t.setPipeline(e.pmDepositPipeline),t.setBindGroup(0,te[n]),t.dispatchWorkgroups(Math.ceil(r/256)),t.setPipeline(E),t.setBindGroup(0,ie),t.dispatchWorkgroups(Math.ceil(Te/256))},interpolateForces(t,n){t.setPipeline(e.pmInterpolatePipeline),t.setBindGroup(0,ae[n]),t.dispatchWorkgroups(Math.ceil(r/256)),t.setPipeline(ce),t.setBindGroup(0,le[n]),t.dispatchWorkgroups(Math.ceil(r/256))},integrate(e,t){e.setPipeline(he),e.setBindGroup(0,ge[t]),e.dispatchWorkgroups(Math.ceil(r/256))},render(e,n,r){Ae[4]=a>0?1/Math.max(g*24,1e-12):0,Ae[5]=r?1:0,t.queue.writeBuffer(Oe,0,ke),e.setPipeline(De),e.setBindGroup(0,Me[n]),e.draw(3)},async dumpDensity(){if(Le)return null;Le=!0;let e=t.createCommandEncoder();e.copyBufferToBuffer(m,0,Ne,0,Te*4),t.queue.submit([e.finish()]),await t.queue.onSubmittedWorkDone(),await Ne.mapAsync(GPUMapMode.READ);let n=new Float32Array(Ne.getMappedRange().slice(0));return Ne.unmap(),Le=!1,n},async energyBreakdown(n,a){if(Le)return null;Le=!0;let o=t.createCommandEncoder();o.copyBufferToBuffer(e.starBuffers[n],0,Fe,0,e.starCount*48),o.copyBufferToBuffer(Re(n),0,Pe,0,i),o.copyBufferToBuffer(m,0,Ne,0,Te*4),t.queue.submit([o.finish()]),await t.queue.onSubmittedWorkDone(),await Fe.mapAsync(GPUMapMode.READ);let s=new Float32Array(Fe.getMappedRange().slice(0));Fe.unmap(),await Pe.mapAsync(GPUMapMode.READ);let c=new Float32Array(Pe.getMappedRange().slice(0));Pe.unmap(),await Ne.mapAsync(GPUMapMode.READ);let l=new Float32Array(Ne.getMappedRange().slice(0));Ne.unmap(),Le=!1;let u=0;for(let t=0;t<e.starCount;t++){let e=t*12,n=s[e+3],r=s[e+4],i=s[e+5],a=s[e+6];u+=.5*n*(r*r+i*i+a*a)}let d=0;for(let e=0;e<r;e++){let t=e*12,n=c[t+3],r=c[t+4],i=c[t+5],a=c[t+6];d+=.5*n*(r*r+i*i+a*a)}let f=a*a,p=0;for(let e=0;e<l.length;e++){let t=Math.max(l[e],_);p+=t*f*Math.log(t/g)}return{starKinetic:u,gasKinetic:d,gasInternal:p,total:u+d+p}},async wakeProbe(n,r=0){if(Le)return null;Le=!0;let i=Math.max(0,Math.min(e.starCount-1,Math.floor(r))),a=t.createCommandEncoder();a.copyBufferToBuffer(e.starBuffers[n],i*48,Ie,0,48),a.copyBufferToBuffer(m,0,Ne,0,Te*4),t.queue.submit([a.finish()]),await t.queue.onSubmittedWorkDone(),await Ie.mapAsync(GPUMapMode.READ);let o=new Float32Array(Ie.getMappedRange().slice(0));Ie.unmap(),await Ne.mapAsync(GPUMapMode.READ);let s=new Float32Array(Ne.getMappedRange().slice(0));Ne.unmap(),Le=!1;let c=Math.hypot(o[4],o[5],o[6]),l=c>1e-6?1/c:0,u=[o[4]*l,o[5]*l,o[6]*l],d=(e,t,n)=>{let r=Math.floor((e+Ce)/we),i=Math.floor((t+Ce)/we),a=Math.floor((n+Ce)/we),o=e=>(e%Se+Se)%Se,c=o(r),l=o(i);return s[o(a)*Se*Se+l*Se+c]},f=d(o[0]+u[0]*2,o[1]+u[1]*2,o[2]+u[2]*2),p=d(o[0]-u[0]*2,o[1]-u[1]*2,o[2]-u[2]*2);return{aheadDensity:f,behindDensity:p,asymmetry:(p-f)/(Math.abs(p)+Math.abs(f)+1e-12)}},async snapshot(e){if(Le)return null;Le=!0;let n=t.createCommandEncoder();n.copyBufferToBuffer(Re(e),0,Pe,0,i),t.queue.submit([n.finish()]),await t.queue.onSubmittedWorkDone(),await Pe.mapAsync(GPUMapMode.READ);let r=new Float32Array(Pe.getMappedRange().slice(0));return Pe.unmap(),Le=!1,r},destroy(){c.destroy(),l.destroy(),d.destroy(),f.destroy(),p.destroy(),m.destroy(),h.destroy(),v.buffer.destroy(),y.buffer.destroy(),b.buffer.destroy(),S.destroy(),ue.destroy(),Oe.destroy(),Ne.destroy(),Pe.destroy(),Fe.destroy(),Ie.destroy()}}}var Oe=`// [LAW:one-source-of-truth] System-wide statistics computed in one reduction pass.
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
`,ke=`// Marker particles: small bright tracers orbiting each active attractor. Shares the same HDR scene
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
`,Ae=`// PM CIC (cloud-in-cell) deposition. Each particle scatters its mass into
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
`,je=`// PM density post-processing. Two entry points share one bind group layout:
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
`,Me=`// Red-black Gauss-Seidel smoother for the multigrid V-cycle.
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
`,Ne=`// Compute residual r = 4πGρ - ∇²φ with the same 7-point stencil + periodic
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
`,Pe=`// Restriction (fine → coarse) for the multigrid V-cycle. Each coarse cell
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
`,Fe=`// Prolongation (coarse → fine) for the multigrid V-cycle. Each fine cell is
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
`,Ie=`// Nested PM force interpolation (CIC-weighted). For each particle, sample
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
`,Le=`// Dirichlet BC seed for the inner PM grid. Runs once per frame AFTER the outer
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
`,Re=`struct Camera {
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
`,ze=`// [LAW:dataflow-not-control-flow] Trail decay always runs in the same shape — only the persistence value varies.
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
`,Be=`// [LAW:one-source-of-truth] CoD-Advanced-Warfare 13-tap downsample. The first level applies a soft bright-pass.
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
`,Ve=`// 9-tap tent filter upsample. Reads from a smaller mip; output is additively blended into a larger one.

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
`,He=`// Final HDR composite: combine scene + bloom, ACES tone-map, color grade, vignette, chromatic aberration.

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
`,Ue=200,We=[],k=`boot`;function Ge(e){let t=document.getElementById(`gpu-error-overlay`);t||(t=document.createElement(`div`),t.id=`gpu-error-overlay`,t.style.cssText=`position:fixed;top:60px;left:10px;right:10px;max-height:60vh;overflow:auto;background:rgba(20,0,0,0.92);color:#ff8080;font:11px monospace;padding:10px;border:1px solid #ff4040;border-radius:4px;z-index:9999;white-space:pre-wrap;`,document.body.appendChild(t));let n=new Date().toLocaleTimeString();t.textContent=`[${n}] ${e}\n\n`+t.textContent}function Ke(e,t,n){let r=t instanceof Error?t:Error(typeof t==`string`?t:JSON.stringify(t)),i=n?`${n}: ${r.message}`:r.message,a={t:performance.now(),kind:e,phase:k,msg:i,stack:r.stack};We.push(a),We.length>Ue&&We.splice(0,We.length-Ue),console.error(`[${e}] (phase=${k})`,i,r.stack||``),Ge(`[${e}] (phase=${k}) ${i}`)}function A(e,t,...n){console.info(`[${e}] (phase=${k})`,t,...n)}globalThis.__errorLog=()=>We.slice(),globalThis.__gpuPhase=()=>k,window.addEventListener(`error`,e=>{Ke(`window.error`,e.error??e.message,`at ${e.filename}:${e.lineno}:${e.colno}`)}),window.addEventListener(`unhandledrejection`,e=>{Ke(`unhandledrejection`,e.reason)});function j(e,t){let n=V.createShaderModule({label:e,code:t});return n.getCompilationInfo().then(n=>{if(n.messages.length===0)return;let r=t.split(`
`),i=!1;for(let t of n.messages){let n=(r[t.lineNum-1]||``).trimEnd(),a=` `.repeat(Math.max(0,t.linePos-1))+`^`,o=`[shader:${e}] ${t.type.toUpperCase()} line ${t.lineNum}:${t.linePos} ${t.message}\n  ${n}\n  ${a}`;t.type===`error`?(i=!0,Ke(`shader:${e}`,Error(o))):t.type===`warning`?console.warn(o):console.info(o)}i||A(`shader:${e}`,`compiled with ${n.messages.length} non-error messages`)}).catch(t=>Ke(`shader:${e}:compilationInfo`,t)),n}var M={boids:{count:1e3,separationRadius:25,alignmentRadius:50,cohesionRadius:50,maxSpeed:2,maxForce:.05,visualRange:100},physics:{count:8e4,G:.3,softening:1.5,distribution:`disk`,interactionStrength:1,tidalStrength:.008,attractorDecayTime:2,gasMassFraction:.15,gasSoundSpeed:2,gasVisible:!0,haloMass:5,haloScale:2,diskMass:3,diskScaleA:1.5,diskScaleB:.3},physics_classic:{count:500,G:1,softening:.5,damping:.999,distribution:`random`},fluid:{resolution:256,viscosity:.1,diffusionRate:.001,forceStrength:100,volumeScale:1.5,dyeMode:`rainbow`,jacobiIterations:40},parametric:{shape:`torus`,scale:1,p1Min:.7,p1Max:1.3,p1Rate:.3,p2Min:.2,p2Max:.55,p2Rate:.5,p3Min:.15,p3Max:.45,p3Rate:.7,p4Min:.5,p4Max:2,p4Rate:.4,twistMin:0,twistMax:.4,twistRate:.15},reaction:{resolution:128,feed:.055,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Spots`}},qe={boids:{Default:{...M.boids},"Tight Flock":{count:3e3,separationRadius:10,alignmentRadius:30,cohesionRadius:80,maxSpeed:3,maxForce:.08,visualRange:60},Dispersed:{count:2e3,separationRadius:60,alignmentRadius:100,cohesionRadius:20,maxSpeed:1.5,maxForce:.03,visualRange:200},Massive:{count:2e4,separationRadius:15,alignmentRadius:40,cohesionRadius:40,maxSpeed:2.5,maxForce:.04,visualRange:80},"Slow Dance":{count:500,separationRadius:40,alignmentRadius:80,cohesionRadius:100,maxSpeed:.5,maxForce:.01,visualRange:150}},physics:{Default:{...M.physics},"Spiral Galaxy":{count:1e5,G:1.5,softening:.15,distribution:`spiral`,interactionStrength:1,tidalStrength:.005,haloMass:8,haloScale:2.5,diskMass:4,diskScaleA:1.2,diskScaleB:.15},"Cosmic Web":{count:8e4,G:.8,softening:2,distribution:`web`,interactionStrength:1,tidalStrength:.025,haloMass:2,haloScale:4,diskMass:0,diskScaleA:1.5,diskScaleB:.3},"Star Cluster":{count:6e4,G:.3,softening:1.2,distribution:`cluster`,interactionStrength:1,tidalStrength:.001,haloMass:3,haloScale:1.5,diskMass:0,diskScaleA:1,diskScaleB:.5},Maelstrom:{count:12e4,G:.25,softening:2.5,distribution:`maelstrom`,interactionStrength:1.5,tidalStrength:.005,haloMass:6,haloScale:1.8,diskMass:5,diskScaleA:.8,diskScaleB:.2},"Dust Cloud":{count:15e4,G:.08,softening:3.5,distribution:`dust`,interactionStrength:.5,tidalStrength:.003,haloMass:1,haloScale:5,diskMass:0,diskScaleA:2,diskScaleB:.5},Binary:{count:8e4,G:.6,softening:1,distribution:`binary`,interactionStrength:1,tidalStrength:.04,haloMass:4,haloScale:2,diskMass:2,diskScaleA:1,diskScaleB:.25}},physics_classic:{Default:{...M.physics_classic},Galaxy:{count:3e3,G:.5,softening:1,damping:.998,distribution:`disk`},Collapse:{count:2e3,G:10,softening:.1,damping:.995,distribution:`shell`},Gentle:{count:1e3,G:.1,softening:2,damping:.9999,distribution:`random`}},fluid:{Default:{...M.fluid},Thick:{resolution:256,viscosity:.8,diffusionRate:.005,forceStrength:200,volumeScale:1.8,dyeMode:`rainbow`,jacobiIterations:40},Turbulent:{resolution:512,viscosity:.01,diffusionRate:1e-4,forceStrength:300,volumeScale:1.3,dyeMode:`rainbow`,jacobiIterations:60},"Ink Drop":{resolution:256,viscosity:.3,diffusionRate:0,forceStrength:50,volumeScale:2.1,dyeMode:`single`,jacobiIterations:40}},parametric:{Default:{shape:`torus`,scale:1,p1Min:.7,p1Max:1.3,p1Rate:.3,p2Min:.2,p2Max:.55,p2Rate:.5,p3Min:.15,p3Max:.45,p3Rate:.7,p4Min:.5,p4Max:2,p4Rate:.4,twistMin:0,twistMax:.4,twistRate:.15},"Rippling Ring":{shape:`torus`,scale:1,p1Min:.5,p1Max:1.5,p1Rate:.5,p2Min:.15,p2Max:.7,p2Rate:.7,p3Min:.3,p3Max:.8,p3Rate:1,p4Min:1,p4Max:3,p4Rate:.6,twistMin:0,twistMax:1,twistRate:.2},"Wild Möbius":{shape:`mobius`,scale:1.5,p1Min:.8,p1Max:2,p1Rate:.3,p2Min:1,p2Max:3,p2Rate:.15,p3Min:.2,p3Max:.6,p3Rate:.8,p4Min:.5,p4Max:2.5,p4Rate:.5,twistMin:1,twistMax:4,twistRate:.1},"Trefoil Pulse":{shape:`trefoil`,scale:1.2,p1Min:.08,p1Max:.35,p1Rate:.9,p2Min:.25,p2Max:.55,p2Rate:.4,p3Min:.3,p3Max:.9,p3Rate:1.2,p4Min:1,p4Max:4,p4Rate:.7,twistMin:0,twistMax:.5,twistRate:.2},"Klein Chaos":{shape:`klein`,scale:1.2,p1Min:.5,p1Max:1.5,p1Rate:.4,p2Min:0,p2Max:0,p2Rate:0,p3Min:.2,p3Max:.6,p3Rate:.9,p4Min:.8,p4Max:3.5,p4Rate:.5,twistMin:0,twistMax:.8,twistRate:.15}},reaction:{Spots:{resolution:128,feed:.055,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Spots`},Mazes:{resolution:128,feed:.029,kill:.057,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Mazes`},Worms:{resolution:128,feed:.058,kill:.065,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Worms`},Mitosis:{resolution:128,feed:.0367,kill:.0649,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Mitosis`},Coral:{resolution:128,feed:.062,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Coral`}}},Je={boids:[{section:`Flock`,params:[{key:`count`,label:`Count`,min:100,max:3e4,step:100,requiresReset:!0},{key:`visualRange`,label:`Visual Range`,min:10,max:500,step:5}]},{section:`Forces`,params:[{key:`separationRadius`,label:`Separation`,min:1,max:100,step:1},{key:`alignmentRadius`,label:`Alignment`,min:1,max:200,step:1},{key:`cohesionRadius`,label:`Cohesion`,min:1,max:200,step:1},{key:`maxSpeed`,label:`Max Speed`,min:.1,max:10,step:.1},{key:`maxForce`,label:`Max Force`,min:.001,max:.5,step:.001}]}],physics:[{section:`Simulation`,params:[{key:`count`,label:`Bodies`,min:10,max:15e4,step:10,requiresReset:!0},{key:`G`,label:`Gravity (G)`,min:.05,max:5,step:.01},{key:`softening`,label:`Softening`,min:.2,max:4,step:.05},{key:`interactionStrength`,label:`Interaction Pull`,min:.1,max:100,step:.01,logScale:!0},{key:`attractorDecayTime`,label:`Decay Time (s)`,min:.1,max:30,step:.1,maxLabel:`Permanent`},{key:`tidalStrength`,label:`Tidal Field`,min:0,max:.05,step:5e-4}]},{section:`Gas Reservoir`,params:[{key:`gasMassFraction`,label:`Gas Mass`,min:0,max:.5,step:.01,requiresReset:!0},{key:`gasSoundSpeed`,label:`Sound Speed`,min:.5,max:5,step:.05},{key:`gasVisible`,label:`Gas Visible`,type:`toggle`}]},{section:`Initial State`,params:[{key:`distribution`,label:`Distribution`,type:`dropdown`,options:[`random`,`disk`,`shell`]}]},{section:`Dark Matter`,params:[{key:`haloMass`,label:`Halo Mass`,min:0,max:15,step:.1},{key:`haloScale`,label:`Halo Scale`,min:.5,max:8,step:.1},{key:`diskMass`,label:`Disk Mass`,min:0,max:10,step:.1},{key:`diskScaleA`,label:`Disk Scale A`,min:.1,max:5,step:.05},{key:`diskScaleB`,label:`Disk Scale B`,min:.05,max:2,step:.01}]}],physics_classic:[{section:`Simulation`,params:[{key:`count`,label:`Bodies`,min:10,max:1e4,step:10,requiresReset:!0},{key:`G`,label:`Gravity (G)`,min:.01,max:100,step:.01},{key:`softening`,label:`Softening`,min:.01,max:10,step:.01},{key:`damping`,label:`Damping`,min:.9,max:1,step:.001}]},{section:`Initial State`,params:[{key:`distribution`,label:`Distribution`,type:`dropdown`,options:[`random`,`disk`,`shell`],requiresReset:!0}]}],fluid:[{section:`Grid`,params:[{key:`resolution`,label:`Resolution`,type:`dropdown`,options:[64,128,256,512],requiresReset:!0}]},{section:`Physics`,params:[{key:`viscosity`,label:`Viscosity`,min:0,max:1,step:.01},{key:`diffusionRate`,label:`Diffusion`,min:0,max:.01,step:1e-4},{key:`forceStrength`,label:`Force`,min:1,max:500,step:1},{key:`jacobiIterations`,label:`Iterations`,min:10,max:80,step:5}]},{section:`Appearance`,params:[{key:`volumeScale`,label:`Volume`,min:.4,max:3,step:.05},{key:`dyeMode`,label:`Dye Mode`,type:`dropdown`,options:[`rainbow`,`single`,`temperature`]}]}],parametric:[{section:`Shape`,params:[{key:`shape`,label:`Equation`,type:`dropdown`,options:[`torus`,`klein`,`mobius`,`sphere`,`trefoil`]}]},{section:`Shape Parameters`,id:`shape-params-section`,params:[],dynamic:!0},{section:`Transform`,params:[{key:`scale`,label:`Scale`,min:.1,max:5,step:.1}]},{section:`Twist`,params:[{key:`twistMin`,label:`Min`,min:0,max:12.56,step:.05},{key:`twistMax`,label:`Max`,min:0,max:12.56,step:.05},{key:`twistRate`,label:`Rate`,min:0,max:3,step:.05}]},{section:`Wave Amplitude`,params:[{key:`p3Min`,label:`Min`,min:0,max:2,step:.05},{key:`p3Max`,label:`Max`,min:0,max:2,step:.05},{key:`p3Rate`,label:`Rate`,min:0,max:3,step:.05}]},{section:`Wave Frequency`,params:[{key:`p4Min`,label:`Min`,min:0,max:5,step:.1},{key:`p4Max`,label:`Max`,min:0,max:5,step:.1},{key:`p4Rate`,label:`Rate`,min:0,max:3,step:.05}]}],reaction:[{section:`Volume`,params:[{key:`resolution`,label:`Resolution`,type:`dropdown`,options:[64,128],requiresReset:!0},{key:`stepsPerFrame`,label:`Steps/Frame`,min:1,max:12,step:1}]},{section:`Reaction`,params:[{key:`feed`,label:`Feed`,min:.01,max:.1,step:5e-4},{key:`kill`,label:`Kill`,min:.03,max:.08,step:5e-4},{key:`Du`,label:`Du`,min:.05,max:.35,step:.001},{key:`Dv`,label:`Dv`,min:.02,max:.2,step:.001}]},{section:`Render`,params:[{key:`isoThreshold`,label:`Iso Threshold`,min:.05,max:.6,step:.01}]}]},Ye={Dracula:{primary:`#BD93F9`,secondary:`#FF79C6`,accent:`#50FA7B`,bg:`#282A36`,fg:`#F8F8F2`},Nord:{primary:`#88C0D0`,secondary:`#81A1C1`,accent:`#A3BE8C`,bg:`#2E3440`,fg:`#D8DEE9`},Monokai:{primary:`#AE81FF`,secondary:`#F82672`,accent:`#A5E22E`,bg:`#272822`,fg:`#D6D6D6`},"Rose Pine":{primary:`#C4A7E7`,secondary:`#EBBCBA`,accent:`#9CCFD8`,bg:`#191724`,fg:`#E0DEF4`},Gruvbox:{primary:`#85A598`,secondary:`#F9BD2F`,accent:`#B7BB26`,bg:`#282828`,fg:`#FBF1C7`},Solarized:{primary:`#268BD2`,secondary:`#2AA198`,accent:`#849900`,bg:`#002B36`,fg:`#839496`},"Tokyo Night":{primary:`#BB9AF7`,secondary:`#7AA2F7`,accent:`#9ECE6A`,bg:`#1A1B26`,fg:`#A9B1D6`},Catppuccin:{primary:`#F5C2E7`,secondary:`#CBA6F7`,accent:`#ABE9B3`,bg:`#181825`,fg:`#CDD6F4`},"Atom One":{primary:`#61AFEF`,secondary:`#C678DD`,accent:`#62F062`,bg:`#282C34`,fg:`#ABB2BF`},Flexoki:{primary:`#205EA6`,secondary:`#24837B`,accent:`#65800B`,bg:`#100F0F`,fg:`#FFFCF0`}},Xe=`Dracula`,Ze=12e3,Qe={r:.02,g:.02,b:.025,a:1};function N(e){let t=parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function $e(e){let t=Ye[e]||Ye[Xe];return{primary:N(t.primary),secondary:N(t.secondary),accent:N(t.accent),bg:N(t.bg),fg:N(t.fg),clearColor:{r:N(t.bg)[0],g:N(t.bg)[1],b:N(t.bg)[2],a:1}}}function et(e,t,n){return e.map((e,r)=>e+(t[r]-e)*n)}function tt(e,t,n){let r=et(e.bg,t.bg,n);return{primary:et(e.primary,t.primary,n),secondary:et(e.secondary,t.secondary,n),accent:et(e.accent,t.accent,n),bg:r,fg:et(e.fg,t.fg,n),clearColor:{r:r[0],g:r[1],b:r[2],a:1}}}var nt={from:$e(Xe),to:$e(Xe),startedAtMs:0},rt=$e(Xe);function it(e){let t=Math.max(0,Math.min(1,(e-nt.startedAtMs)/Ze));return tt(nt.from,nt.to,t)}function at(){return rt}function ot(e){rt=it(e)}function st(e){let t=$e(e);nt.from=t,nt.to=t,nt.startedAtMs=0,rt=t}function ct(e,t=performance.now()){let n=$e(e),r=it(t);nt.from=r,nt.to=n,nt.startedAtMs=t,rt=r}function P(e){return F[e]}var F={mode:`physics`,colorTheme:`Dracula`,xrEnabled:!1,paused:!1,boids:{...M.boids},physics:{...M.physics},physics_classic:{...M.physics_classic},fluid:{...M.fluid},parametric:{...M.parametric},reaction:{...M.reaction},camera:{distance:5,fov:60,rotX:.3,rotY:0,panX:0,panY:0},mouse:{down:!1,x:0,y:0,dx:0,dy:0,worldX:0,worldY:0,worldZ:0},attractors:[],markers:[],pointerToAttractor:new Map,fx:{bloomIntensity:.7,bloomThreshold:4,bloomRadius:1,trailPersistence:0,exposure:1,vignette:.35,chromaticAberration:.25,grading:.5,timeScale:1},debug:{xrLog:!1}},lt=.016,ut=1/lt,dt=90,ft=32,pt=3,mt=30;function ht(){let e=U.physics;return e&&`getSimStep`in e?e.getSimStep():0}function gt(){let e=U.physics;return e&&`getTimeDirection`in e?e.getTimeDirection():1}function _t(e){let t=F.physics.attractorDecayTime??2;return t>=mt?1/0:Math.max(pt,t*ut)}function vt(e,t,n){if(e.releaseStep<0||t<e.releaseStep){let r=Math.max(0,t-e.chargeStep),i=Math.min(1,r/dt);return i*i*n}let r=Math.min(1,e.holdSteps/dt),i=r*r*n,a=t-e.releaseStep,o=_t(e);if(a>=o)return 0;let s=1-a/o;return i*s*s}function yt(e,t){return e.releaseStep<0?!1:t-e.releaseStep>=_t(e)}function bt(e){if(gt()<0)return;let t=[],n=new Map;for(let r=0;r<F.attractors.length;r++){let i=F.attractors[r];yt(i,e)||(n.set(r,t.length),t.push(i))}F.attractors=t;let r=new Map;F.pointerToAttractor.forEach((e,t)=>{let i=n.get(e);i!==void 0&&r.set(t,i)}),F.pointerToAttractor=r,Ot(n)}function xt(e,t){if(gt()<0)return;if(F.attractors.length>=ft){F.attractors.shift();let e=new Map;F.pointerToAttractor.forEach((t,n)=>{t>0&&e.set(n,t-1)}),F.pointerToAttractor=e;let t=[];for(let e of F.markers)e.attractorIdx>0&&(--e.attractorIdx,t.push(e));F.markers=t}let n=ht();F.attractors.push({x:t[0],y:t[1],z:t[2],chargeStep:n,releaseStep:-1,holdSteps:-1});let r=F.attractors.length-1;F.pointerToAttractor.set(e,r),Dt(r,t[0],t[1],t[2])}function St(e,t){let n=F.pointerToAttractor.get(e);if(n===void 0)return;let r=F.attractors[n];!r||r.releaseStep>=0||(r.x=t[0],r.y=t[1],r.z=t[2])}function Ct(e){let t=F.pointerToAttractor.get(e);if(t===void 0)return;F.pointerToAttractor.delete(e);let n=F.attractors[t];if(!n||n.releaseStep>=0)return;let r=ht();n.releaseStep=r,n.holdSteps=Math.max(1,r-n.chargeStep)}var wt=36,Tt=.22,Et=1.1;function Dt(e,t,n,r){let i=at();for(let a=0;a<wt;a++){let a=Math.random()*2-1,o=Math.random()*Math.PI*2,s=Math.sqrt(1-a*a),c=s*Math.cos(o),l=a,u=s*Math.sin(o),d=Tt*(.6+Math.random()*.8),f=-u,p=0,m=c,h=Math.hypot(f,p,m)||1;f/=h,p/=h,m/=h;let g=Math.random()<.5?-1:1,_=Et*(.7+Math.random()*.6)*g;F.markers.push({x:t+c*d,y:n+l*d,z:r+u*d,vx:f*_,vy:p*_,vz:m*_,tintR:i.accent[0],tintG:i.accent[1],tintB:i.accent[2],seed:Math.random(),attractorIdx:e})}}function Ot(e){let t=[];for(let n of F.markers){let r=e.get(n.attractorIdx);r!==void 0&&(n.attractorIdx=r,t.push(n))}F.markers=t}function kt(e){if(F.markers.length===0)return;let t=F.attractors,n=Math.exp(-.6*Math.abs(e));for(let r of F.markers){let i=t[r.attractorIdx];if(!i)continue;let a=i.x-r.x,o=i.y-r.y,s=i.z-r.z,c=a*a+o*o+s*s+.04,l=1/Math.sqrt(c),u=3*l*l;r.vx+=a*l*u*e,r.vy+=o*l*u*e,r.vz+=s*l*u*e,r.vx*=n,r.vy*=n,r.vz*=n,r.x+=r.vx*e,r.y+=r.vy*e,r.z+=r.vz*e}}var At=96,jt=4,Mt=208,I=256,L=500,Nt={torus:0,klein:1,mobius:2,sphere:3,trefoil:4},Pt={torus:{p1:{label:`Major Radius`,animMin:.7,animMax:1.3,animRate:.3,min:.2,max:2.5,step:.05},p2:{label:`Minor Radius`,animMin:.2,animMax:.6,animRate:.5,min:.05,max:1.2,step:.05}},klein:{p1:{label:`Bulge`,animMin:.7,animMax:1.5,animRate:.4,min:.2,max:3,step:.05}},mobius:{p1:{label:`Width`,animMin:.5,animMax:1.8,animRate:.35,min:.1,max:3,step:.05},p2:{label:`Half-Twists`,animMin:1,animMax:3,animRate:.15,min:.5,max:5,step:.5}},sphere:{p1:{label:`XY Stretch`,animMin:.6,animMax:1.5,animRate:.4,min:.1,max:3,step:.05},p2:{label:`Z Stretch`,animMin:.5,animMax:1.8,animRate:.6,min:.1,max:3,step:.05}},trefoil:{p1:{label:`Tube Radius`,animMin:.08,animMax:.35,animRate:.6,min:.05,max:1,step:.05},p2:{label:`Knot Scale`,animMin:.25,animMax:.5,animRate:.35,min:.1,max:1,step:.05}}},Ft={identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])},perspective(e,t,n,r){let i=1/Math.tan(e*.5),a=1/(n-r),o=new Float32Array(16);return o[0]=i/t,o[5]=i,o[10]=r*a,o[11]=-1,o[14]=n*r*a,o},lookAt(e,t,n){let r=R(It(e,t)),i=R(z(n,r)),a=z(r,i);return new Float32Array([i[0],a[0],r[0],0,i[1],a[1],r[1],0,i[2],a[2],r[2],0,-Lt(i,e),-Lt(a,e),-Lt(r,e),1])},multiply(e,t){let n=new Float32Array(16);for(let r=0;r<4;r++)for(let i=0;i<4;i++)n[i*4+r]=e[r]*t[i*4]+e[4+r]*t[i*4+1]+e[8+r]*t[i*4+2]+e[12+r]*t[i*4+3];return n},rotateX(e,t){let n=Math.cos(t),r=Math.sin(t),i=Ft.identity();return i[5]=n,i[6]=r,i[9]=-r,i[10]=n,Ft.multiply(e,i)},rotateY(e,t){let n=Math.cos(t),r=Math.sin(t),i=Ft.identity();return i[0]=n,i[2]=-r,i[8]=r,i[10]=n,Ft.multiply(e,i)},rotateZ(e,t){let n=Math.cos(t),r=Math.sin(t),i=Ft.identity();return i[0]=n,i[1]=r,i[4]=-r,i[5]=n,Ft.multiply(e,i)},translate(e,t,n,r){let i=Ft.identity();return i[12]=t,i[13]=n,i[14]=r,Ft.multiply(e,i)}};function R(e){let t=Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);return t>0?[e[0]/t,e[1]/t,e[2]/t]:[0,0,0]}function z(e,t){return[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]]}function It(e,t){return[e[0]-t[0],e[1]-t[1],e[2]-t[2]]}function Lt(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function Rt(){let e=F.camera,t=[e.distance*Math.cos(e.rotX)*Math.sin(e.rotY),e.distance*Math.sin(e.rotX),e.distance*Math.cos(e.rotX)*Math.cos(e.rotY)];return{eye:t,view:Ft.lookAt(t,[e.panX,e.panY,0],[0,1,0]),proj:null}}var zt=null,Bt=null,B={scene:[],sceneIdx:0,depth:null,nullColor:null,nullDepth:null,nullColorView:null,nullDepthView:null,bloomMips:[],width:0,height:0,needsClear:!0,linSampler:null,fadePipeline:null,downsamplePipeline:null,upsamplePipelineAdditive:null,upsamplePipelineReplace:null,compositePipelines:new Map,fadeBGL:null,downsampleBGL:null,upsampleBGL:null,compositeBGL:null,fadeUBO:null,downsampleUBO:[],upsampleUBO:[],compositeUBO:null,sceneViews:[],bloomMipViews:[],fadeBGs:[],downsampleBGs:[],upsampleBGs:[],fadeParams:new Float32Array(4),downsampleParams:[],upsampleParams:[],compositeBGs:[],compositeParams:new Float32Array(16)},Vt=`rgba16float`,Ht=3;function Ut(){B.nullColor=V.createTexture({size:[1,1],format:Vt,usage:GPUTextureUsage.RENDER_ATTACHMENT}),B.nullDepth=V.createTexture({size:[1,1],format:`depth24plus`,usage:GPUTextureUsage.RENDER_ATTACHMENT}),B.nullColorView=B.nullColor.createView(),B.nullDepthView=B.nullDepth.createView(),B.linSampler=V.createSampler({magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`}),B.fadeBGL=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),B.downsampleBGL=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),B.upsampleBGL=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),B.compositeBGL=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]});let e=j(`post.fade`,ze),t=j(`post.downsample`,Be),n=j(`post.upsample`,Ve);B.fadePipeline=V.createRenderPipeline({layout:V.createPipelineLayout({bindGroupLayouts:[B.fadeBGL]}),vertex:{module:e,entryPoint:`vs_main`},fragment:{module:e,entryPoint:`fs_main`,targets:[{format:Vt}]},primitive:{topology:`triangle-list`}}),B.downsamplePipeline=V.createRenderPipeline({layout:V.createPipelineLayout({bindGroupLayouts:[B.downsampleBGL]}),vertex:{module:t,entryPoint:`vs_main`},fragment:{module:t,entryPoint:`fs_main`,targets:[{format:Vt}]},primitive:{topology:`triangle-list`}}),B.upsamplePipelineAdditive=V.createRenderPipeline({layout:V.createPipelineLayout({bindGroupLayouts:[B.upsampleBGL]}),vertex:{module:n,entryPoint:`vs_main`},fragment:{module:n,entryPoint:`fs_main`,targets:[{format:Vt,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`}}),B.upsamplePipelineReplace=V.createRenderPipeline({layout:V.createPipelineLayout({bindGroupLayouts:[B.upsampleBGL]}),vertex:{module:n,entryPoint:`vs_main`},fragment:{module:n,entryPoint:`fs_main`,targets:[{format:Vt}]},primitive:{topology:`triangle-list`}}),B.fadeUBO=V.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),B.downsampleUBO=[],B.upsampleUBO=[];for(let e=0;e<Ht;e++)B.downsampleUBO.push(V.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})),B.upsampleUBO.push(V.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));B.compositeUBO=V.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),B.fadeParams=new Float32Array(4),B.compositeParams=new Float32Array(16),B.downsampleParams=[],B.upsampleParams=[];for(let e=0;e<Ht;e++)B.downsampleParams.push(new Float32Array(4)),B.upsampleParams.push(new Float32Array(4))}function Wt(e){let t=B.compositePipelines.get(e);if(t)return t;let n=j(`post.composite`,He);return t=V.createRenderPipeline({layout:V.createPipelineLayout({bindGroupLayouts:[B.compositeBGL]}),vertex:{module:n,entryPoint:`vs_main`},fragment:{module:n,entryPoint:`fs_main`,targets:[{format:e}]},primitive:{topology:`triangle-list`}}),B.compositePipelines.set(e,t),t}function Gt(e,t){if(B.width===e&&B.height===t&&B.scene.length===2)return;for(let e of B.scene)e.destroy();for(let e of B.bloomMips)e.destroy();B.depth?.destroy(),B.scene=[],B.bloomMips=[],B.width=e,B.height=t;for(let n=0;n<2;n++)B.scene.push(V.createTexture({size:[e,t],format:Vt,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));B.depth=V.createTexture({size:[e,t],format:`depth24plus`,usage:GPUTextureUsage.RENDER_ATTACHMENT});let n=Math.max(1,Math.floor(e/2)),r=Math.max(1,Math.floor(t/2));for(let e=0;e<Ht;e++)B.bloomMips.push(V.createTexture({size:[n,r],format:Vt,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING})),n=Math.max(1,Math.floor(n/2)),r=Math.max(1,Math.floor(r/2));B.needsClear=!0,B.sceneViews=B.scene.map(e=>e.createView()),B.bloomMipViews=B.bloomMips.map(e=>e.createView()),B.fadeBGs=B.sceneViews.map(e=>V.createBindGroup({layout:B.fadeBGL,entries:[{binding:0,resource:e},{binding:1,resource:B.linSampler},{binding:2,resource:{buffer:B.fadeUBO}}]})),B.downsampleBGs=[];for(let e=0;e<2;e++)B.downsampleBGs.push(V.createBindGroup({layout:B.downsampleBGL,entries:[{binding:0,resource:B.sceneViews[e]},{binding:1,resource:B.linSampler},{binding:2,resource:{buffer:B.downsampleUBO[0]}}]}));for(let e=1;e<Ht;e++)B.downsampleBGs.push(V.createBindGroup({layout:B.downsampleBGL,entries:[{binding:0,resource:B.bloomMipViews[e-1]},{binding:1,resource:B.linSampler},{binding:2,resource:{buffer:B.downsampleUBO[e]}}]}));B.upsampleBGs=B.bloomMipViews.map((e,t)=>V.createBindGroup({layout:B.upsampleBGL,entries:[{binding:0,resource:e},{binding:1,resource:B.linSampler},{binding:2,resource:{buffer:B.upsampleUBO[t]}}]})),B.compositeBGs=B.sceneViews.map(e=>V.createBindGroup({layout:B.compositeBGL,entries:[{binding:0,resource:e},{binding:1,resource:B.bloomMipViews[0]},{binding:2,resource:B.linSampler},{binding:3,resource:{buffer:B.compositeUBO}}]}))}function Kt(){return B.scene[B.sceneIdx].createView()}function qt(e,t,n){let r=F.fx.trailPersistence>.001&&!B.needsClear;return{view:Kt(),clearValue:Qe,loadOp:r?`load`:`clear`,storeOp:`store`}}function Jt(e,t){return{view:Bt??B.depth.createView(),depthClearValue:1,depthLoadOp:`clear`,depthStoreOp:`store`}}function Yt(e){return e}function Xt(e){let t=at(),n=new Float32Array(52);if(zt)n.set(zt.viewMatrix,0),n.set(zt.projMatrix,16),n.set(zt.eye,32);else{let t=Rt(),r=F.camera.fov*Math.PI/180,i=Ft.perspective(r,e,.01,L);n.set(t.view,0),n.set(i,16),n.set(t.eye,32)}n.set(t.primary,36),n.set(t.secondary,40),n.set(t.accent,44);let r=F.mouse;return n[48]=r.worldX,n[49]=r.worldY,n[50]=r.worldZ,n[51]=r.down?1:0,n}var V,H,Zt,Qt,$t,en=1;async function tn(){let e=document.getElementById(`fallback`),t=t=>{e.querySelector(`p`).textContent=t,e.classList.add(`visible`)};if(!navigator.gpu)return t(`navigator.gpu not found. This browser may not support WebGPU, or it may need to be enabled in settings.`),!1;let n;try{n=await navigator.gpu.requestAdapter({powerPreference:`high-performance`,xrCompatible:!0})}catch(e){return t(`requestAdapter() failed: ${e.message}`),!1}if(!n)return t(`requestAdapter() returned null. WebGPU may be available but no suitable GPU adapter was found.`),!1;try{let e=[];n.features.has(`timestamp-query`)&&e.push(`timestamp-query`),V=await n.requestDevice({requiredFeatures:e})}catch(e){return t(`requestDevice() failed: ${e.message}`),!1}return va(),V.lost.then(e=>{Ke(`webgpu:device-lost`,Error(e.message),`reason=${e.reason}`),e.reason!==`destroyed`&&tn().then(e=>{e&&(ln(),Ea(),requestAnimationFrame(Na))})}),V.onuncapturederror=e=>{Ke(`webgpu:uncaptured`,e.error)},H=document.getElementById(`gpu-canvas`),Zt=H.getContext(`webgpu`),Qt=navigator.gpu.getPreferredCanvasFormat(),$t=`rgba16float`,en=1,Zt.configure({device:V,format:Qt,alphaMode:`opaque`}),Ut(),!0}function nn(e,t){B.needsClear=!0}var rn,an,on,sn,cn=0;function ln(){on?.destroy(),sn?.destroy(),on=V.createBuffer({size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),sn=V.createBuffer({size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let e=j(`grid`,Re),t=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]});rn=V.createRenderPipeline({layout:V.createPipelineLayout({bindGroupLayouts:[t]}),vertex:{module:e,entryPoint:`vs_main`},fragment:{module:e,entryPoint:`fs_main`,targets:[{format:$t,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:en}}),an=[0,1].map(e=>V.createBindGroup({layout:t,entries:[{binding:0,resource:{buffer:on,offset:e*I,size:Mt}},{binding:1,resource:{buffer:sn}}]}))}function un(e,t,n=0){cn+=.016,V.queue.writeBuffer(on,n*I,Xt(t)),V.queue.writeBuffer(sn,0,new Float32Array([cn])),e.setPipeline(rn),e.setBindGroup(0,an[n]),e.draw(30)}var U={};function dn(){let e=F.boids.count,t=e*32,n=new Float32Array(e*8);for(let t=0;t<e;t++){let e=t*8;n[e]=(Math.random()-.5)*2*2,n[e+1]=(Math.random()-.5)*2*2,n[e+2]=(Math.random()-.5)*2*2,n[e+4]=(Math.random()-.5)*.5,n[e+5]=(Math.random()-.5)*.5,n[e+6]=(Math.random()-.5)*.5}let r=V.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(r.getMappedRange()).set(n),r.unmap();let i=V.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),a=V.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),o=V.createBuffer({size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),s=j(`boids.compute`,kr||`struct Particle {
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
`),c=j(`boids.render`,Ar||`struct Camera {
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
`),l=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),u=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[l]}),compute:{module:s,entryPoint:`main`}}),d=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),f=V.createRenderPipeline({layout:V.createPipelineLayout({bindGroupLayouts:[d]}),vertex:{module:c,entryPoint:`vs_main`},fragment:{module:c,entryPoint:`fs_main`,targets:[{format:$t}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:en}}),p=[V.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:r}},{binding:1,resource:{buffer:i}},{binding:2,resource:{buffer:a}}]}),V.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:i}},{binding:1,resource:{buffer:r}},{binding:2,resource:{buffer:a}}]})],m=[0,1].map(e=>[r,i].map(t=>V.createBindGroup({layout:d,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:o,offset:e*I,size:Mt}}]}))),h=0,g={};return{compute(t){let n=F.boids,r=F.mouse,i=new Float32Array(16);i[0]=.016*F.fx.timeScale,i[1]=n.separationRadius/50,i[2]=n.alignmentRadius/50,i[3]=n.cohesionRadius/50,i[4]=n.maxSpeed,i[5]=n.maxForce,i[6]=n.visualRange/50,i[8]=2,i[9]=r.worldX,i[10]=r.worldY,i[11]=r.worldZ,i[12]=r.down?1:0,new Uint32Array(i.buffer)[7]=e,V.queue.writeBuffer(a,0,i);let o=t.beginComputePass();o.setPipeline(u),o.setBindGroup(0,p[h]),o.dispatchWorkgroups(Math.ceil(e/64)),o.end(),h=1-h},render(t,n,r,i=0){let a=r?r[2]/r[3]:H.width/H.height;V.queue.writeBuffer(o,i*I,Xt(a));let s=t.beginRenderPass({colorAttachments:[qt(g,n,r)],depthStencilAttachment:Jt(g,r)}),c=Yt(r);c&&s.setViewport(c[0],c[1],c[2],c[3],0,1),un(s,a,i),s.setPipeline(f),s.setBindGroup(0,m[i][h]),s.draw(3,e),s.end()},getCount(){return e},destroy(){r.destroy(),i.destroy(),a.destroy(),o.destroy()}}}function fn(e,t){let n=t.levels-1;for(let n=1;n<t.levels;n++)e.clearBuffer(t.potential[n]);let r=t.timingBucket?ba(t.timingBucket):void 0,i=e.beginComputePass(r?{timestampWrites:r}:void 0);for(let e=0;e<n;e++){let n=t.wgCount[e];i.setPipeline(pn);for(let r=0;r<t.preSmooth;r++)i.setBindGroup(0,t.smoothBG[e][0]),i.dispatchWorkgroups(n,n,n),i.setBindGroup(0,t.smoothBG[e][1]),i.dispatchWorkgroups(n,n,n);i.setPipeline(mn),i.setBindGroup(0,t.residualBG[e]),i.dispatchWorkgroups(n,n,n),i.setPipeline(hn),i.setBindGroup(0,t.restrictBG[e]);let r=t.wgCount[e+1];i.dispatchWorkgroups(r,r,r)}{let e=t.wgCount[n];i.setPipeline(pn);for(let r=0;r<t.coarsestSweeps;r++)i.setBindGroup(0,t.smoothBG[n][0]),i.dispatchWorkgroups(e,e,e),i.setBindGroup(0,t.smoothBG[n][1]),i.dispatchWorkgroups(e,e,e)}for(let e=n-1;e>=0;e--){let n=t.wgCount[e];i.setPipeline(gn),i.setBindGroup(0,t.prolongBG[e]),i.dispatchWorkgroups(n,n,n),i.setPipeline(pn);for(let r=0;r<t.postSmooth;r++)i.setBindGroup(0,t.smoothBG[e][0]),i.dispatchWorkgroups(n,n,n),i.setBindGroup(0,t.smoothBG[e][1]),i.dispatchWorkgroups(n,n,n)}i.end()}var pn,mn,hn,gn;function _n(){let e=F.physics.count,t=e*48,n=Math.max(0,Math.min(.5,F.physics.gasMassFraction??.15)),r=.2,i=.18,a=F.physics.haloMass??5,o=F.physics.haloScale??2,s=F.physics.diskMass??3,c=F.physics.diskScaleA??1.5,l=F.physics.diskScaleB??.3;function u(e){let t=e*e,n=t+o*o,r=a*t/(n*Math.sqrt(n)),i=c+l,u=t+i*i;return r+s*t/(u*Math.sqrt(u))}let d=new Float32Array(e*12),f=0,p=F.physics.distribution,m=R([.18,1,-.12]),h=R(z([0,1,0],m)),g=z(m,h),_=1/e;for(let t=0;t<e;t++){let n=t*12,a,o,s,c=0,l=0,v=0,y=_,b=t/e;if(p===`spiral`){let e=3.5;if(b<.04){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=.3+Math.random()**.5*4;a=n*Math.sin(t)*Math.cos(e),o=n*Math.sin(t)*Math.sin(e),s=n*Math.cos(t);let r=.12+Math.random()*.1,i=R(z(R([a,o,s]),[.3,1,-.2]));c=i[0]*r,l=i[1]*r,v=i[2]*r,y=.01+Math.random()*.05}else{let t=Math.exp(-5*Math.random())*e,n=Math.random()*Math.PI*2,r=(-1/5*Math.exp(-5*t/e)+1/5)/(-1/5*Math.exp(-5)+1/5)*1,i=(F.physics.G??.3)*.001,d=Math.sqrt(Math.max(.001,i*r/Math.max(t,.05)+u(t))),f=(Math.random()-.5)*(.25+t*.05);a=h[0]*Math.cos(n)*t+g[0]*Math.sin(n)*t+m[0]*f,o=h[1]*Math.cos(n)*t+g[1]*Math.sin(n)*t+m[1]*f,s=h[2]*Math.cos(n)*t+g[2]*Math.sin(n)*t+m[2]*f,c=(-Math.sin(n)*h[0]+Math.cos(n)*g[0])*d,l=(-Math.sin(n)*h[1]+Math.cos(n)*g[1])*d,v=(-Math.sin(n)*h[2]+Math.cos(n)*g[2])*d,y=Math.random()**2*.8}}else if(p===`disk`){let e=Math.random()*Math.PI*2,t=Math.sqrt(Math.random())*4.5;if(y=Math.random()**3*.8,b<.03){let n=(Math.random()-.5)*r*.5;a=h[0]*Math.cos(e)*t+g[0]*Math.sin(e)*t+m[0]*n,o=h[1]*Math.cos(e)*t+g[1]*Math.sin(e)*t+m[1]*n,s=h[2]*Math.cos(e)*t+g[2]*Math.sin(e)*t+m[2]*n;let i=Math.sqrt(Math.max(.001,u(t)));c=(Math.sin(e)*h[0]-Math.cos(e)*g[0])*i,l=(Math.sin(e)*h[1]-Math.cos(e)*g[1])*i,v=(Math.sin(e)*h[2]-Math.cos(e)*g[2])*i,y=.1+Math.random()*.3}else if(b<.12){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=.5+Math.sqrt(Math.random())*3.5;a=n*Math.sin(t)*Math.cos(e),o=n*Math.sin(t)*Math.sin(e),s=n*Math.cos(t);let r=.15+Math.random()*.15,i=R(z(R([a,o,s]),[.3,1,-.2]));c=i[0]*r,l=i[1]*r,v=i[2]*r,y=.02+Math.random()*.1}else{let n=(Math.random()-.5)*r*(.35+t*.4);a=h[0]*Math.cos(e)*t+g[0]*Math.sin(e)*t+m[0]*n,o=h[1]*Math.cos(e)*t+g[1]*Math.sin(e)*t+m[1]*n,s=h[2]*Math.cos(e)*t+g[2]*Math.sin(e)*t+m[2]*n;let d=Math.sqrt(Math.max(.001,u(t)));c=(-Math.sin(e)*h[0]+Math.cos(e)*g[0])*d+m[0]*n*i,l=(-Math.sin(e)*h[1]+Math.cos(e)*g[1])*d+m[1]*n*i,v=(-Math.sin(e)*h[2]+Math.cos(e)*g[2])*d+m[2]*n*i}}else if(p===`web`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=3+(Math.random()-.5)*1.5;a=n*Math.sin(t)*Math.cos(e),o=n*Math.sin(t)*Math.sin(e),s=n*Math.cos(t);let r=2.5,i=Math.round(a/r)*r,u=Math.round(o/r)*r,d=Math.round(s/r)*r,f=.15+Math.random()*.1;a+=(i-a)*f,o+=(u-o)*f,s+=(d-s)*f;let p=R([a,o,s]),m=.02+Math.random()*.03;c=-p[0]*m,l=-p[1]*m,v=-p[2]*m,y=Math.random()**2*.6}else if(p===`cluster`){let e=t%5,n=e/5*Math.PI*2+.7,r=1.2+e*.3,i=Math.cos(n)*r,u=(e-2)*.4,d=Math.sin(n)*r,f=Math.random(),p=.6*f**.33/(1-f*f+.01)**.25,m=Math.random()*Math.PI*2,h=Math.acos(2*Math.random()-1);a=i+p*Math.sin(h)*Math.cos(m),o=u+p*Math.sin(h)*Math.sin(m),s=d+p*Math.cos(h);let g=.1+Math.random()*.12,_=R(z(R([a-i,o-u,s-d]),[.2,1,-.3]));c=_[0]*g,l=_[1]*g,v=_[2]*g,y=Math.random()**2.5*1}else if(p===`maelstrom`){let e=t%4,n=1+e*1.2+(Math.random()-.5)*.4,r=(e-1.5)*.35,i=R([Math.sin(r*1.3),Math.cos(r),Math.sin(r*.7)]),u=R(z([0,1,0],i)),d=z(i,u),f=Math.random()*Math.PI*2,p=(Math.random()-.5)*.15;a=u[0]*Math.cos(f)*n+d[0]*Math.sin(f)*n+i[0]*p,o=u[1]*Math.cos(f)*n+d[1]*Math.sin(f)*n+i[1]*p,s=u[2]*Math.cos(f)*n+d[2]*Math.sin(f)*n+i[2]*p;let m=(e%2==0?1:-1)*(1.2+e*.3)/Math.sqrt(n+.1);c=(-Math.sin(f)*u[0]+Math.cos(f)*d[0])*m,l=(-Math.sin(f)*u[1]+Math.cos(f)*d[1])*m,v=(-Math.sin(f)*u[2]+Math.cos(f)*d[2])*m,y=Math.random()**3*.5}else if(p===`dust`){a=(Math.random()-.5)*6,o=(Math.random()-.5)*6,s=(Math.random()-.5)*6;let e=.8,t=.08;c=Math.sin(o*e+1.3)*Math.cos(s*e+.7)*t,l=Math.sin(s*e+2.1)*Math.cos(a*e+1.1)*t,v=Math.sin(a*e+.5)*Math.cos(o*e+2.5)*t,y=Math.random()**4*.4}else if(p===`binary`){let e=Math.random()<.45,t=Math.sqrt(Math.random())*2.2,n=Math.random()*Math.PI*2,r=e?.25:-.15,i=R([r,1,r*.5]),u=R(z([0,1,0],i)),d=z(i,u),f=(Math.random()-.5)*.15;a=u[0]*Math.cos(n)*t+d[0]*Math.sin(n)*t+i[0]*f+(e?1.8:-1.8),o=u[1]*Math.cos(n)*t+d[1]*Math.sin(n)*t+i[1]*f+(e?.3:-.3),s=u[2]*Math.cos(n)*t+d[2]*Math.sin(n)*t+i[2]*f;let p=.7/Math.sqrt(t+.15),m=e?.12:-.12;if(c=(-Math.sin(n)*u[0]+Math.cos(n)*d[0])*p+m*.3,l=(-Math.sin(n)*u[1]+Math.cos(n)*d[1])*p,v=(-Math.sin(n)*u[2]+Math.cos(n)*d[2])*p+m,Math.random()<.1){let e=Math.random();a=-1.8+e*3.6+(Math.random()-.5)*.8,o=-.3+e*.6+(Math.random()-.5)*.5,s=(Math.random()-.5)*.6,c=(Math.random()-.5)*.1,l=(Math.random()-.5)*.05,v=(Math.random()-.5)*.1}y=Math.random()**2.5*.7}else if(p===`shell`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=1.5+Math.random()*.1;a=n*Math.sin(t)*Math.cos(e),o=n*Math.sin(t)*Math.sin(e),s=n*Math.cos(t);let r=R([a,o,s]),i=R(z(r,[.3,1,-.2])),u=z(r,i),d=.18+Math.random()*.08;c=(i[0]+u[0]*.35)*d,l=(i[1]+u[1]*.35)*d,v=(i[2]+u[2]*.35)*d,y=Math.random()**3*.8}else a=(Math.random()-.5)*4,o=(Math.random()-.5)*4,s=(Math.random()-.5)*4,c=(Math.random()-.5)*.12,l=(Math.random()-.5)*.12,v=(Math.random()-.5)*.12,y=Math.random()**3*.8;d[n]=a,d[n+1]=o,d[n+2]=s,d[n+3]=y,d[n+4]=c,d[n+5]=l,d[n+6]=v,d[n+8]=0,d[n+9]=0,d[n+10]=0,f+=y}let v=32/128,y=65536,b=V.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,mappedAtCreation:!0});new Float32Array(b.getMappedRange()).set(d),b.unmap();let x=V.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC}),ee=V.createBuffer({size:608,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),te=V.createBuffer({size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),S=V.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),C=new Float32Array(4);V.queue.writeBuffer(S,0,C);let w=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,T=16384*128,ne=V.createBuffer({size:T*4,usage:w}),re=V.createBuffer({size:T*4,usage:w}),E=[],ie=[];for(let e=0;e<6;e++){let t=128>>e,n=t*t*t*4;E.push(V.createBuffer({size:n,usage:w})),ie.push(V.createBuffer({size:n,usage:w}))}let ae=V.createBuffer({size:e*16,usage:w}),oe=V.createBuffer({size:16,usage:w}),se=[re];for(let e=1;e<6;e++){let t=128>>e;se.push(V.createBuffer({size:t*t*t*4,usage:w}))}let ce=V.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),le=new ArrayBuffer(32),ue=new Float32Array(le),de=new Uint32Array(le);de[1]=e,de[2]=128,ue[3]=16,ue[4]=v,ue[5]=y,de[6]=T,de[7]=1;let fe=j(`pm.deposit`,Ae),pe=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),me=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[pe]}),compute:{module:fe,entryPoint:`main`}}),D=j(`pm.density_convert`,je),he=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),ge=V.createPipelineLayout({bindGroupLayouts:[he]}),_e=V.createComputePipeline({layout:ge,compute:{module:D,entryPoint:`reduce`}}),ve=V.createComputePipeline({layout:ge,compute:{module:D,entryPoint:`convert`}}),ye=V.createBindGroup({layout:he,entries:[{binding:0,resource:{buffer:ne}},{binding:1,resource:{buffer:re}},{binding:2,resource:{buffer:oe}},{binding:3,resource:{buffer:ce}}]}),be=[V.createBindGroup({layout:pe,entries:[{binding:0,resource:{buffer:b}},{binding:1,resource:{buffer:ne}},{binding:2,resource:{buffer:ce}}]}),V.createBindGroup({layout:pe,entries:[{binding:0,resource:{buffer:x}},{binding:1,resource:{buffer:ne}},{binding:2,resource:{buffer:ce}}]})],O=V.createBuffer({size:T*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),xe=!1,Se=j(`pm.smooth`,Me),Ce=j(`pm.residual`,Ne),we=j(`pm.restrict`,Pe),Te=j(`pm.prolong`,Fe),Ee=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),Re=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),ze=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),Be=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]});pn=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[Ee]}),compute:{module:Se,entryPoint:`main`}}),mn=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[Re]}),compute:{module:Ce,entryPoint:`main`}}),hn=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[ze]}),compute:{module:we,entryPoint:`main`}}),gn=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[Be]}),compute:{module:Te,entryPoint:`main`}});let Ve=j(`pm.interpolate_nested`,Ie),He=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}},{binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),Ue=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[He]}),compute:{module:Ve,entryPoint:`main`}}),We=V.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});{let e=new ArrayBuffer(16);new Float32Array(e,0,2).set([14,16]),V.queue.writeBuffer(We,0,e)}let k=4*Math.PI*(F.physics.G??.3)*.001,Ge=[],Ke=[],A=[],M=[];for(let e=0;e<6;e++){let t=128>>e,n=32/t,r=n*n;Ge.push([0,1].map(e=>{let n=V.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),i=new ArrayBuffer(32);return new Uint32Array(i,0,2).set([t,e]),new Float32Array(i,8,2).set([r,k]),new Uint32Array(i,16,1).set([1]),V.queue.writeBuffer(n,0,i),n}));{let e=V.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),n=new ArrayBuffer(32);new Uint32Array(n,0,2).set([t,0]),new Float32Array(n,8,2).set([r,k]),new Uint32Array(n,16,1).set([1]),V.queue.writeBuffer(e,0,n),Ke.push(e)}if(e+1<6){let n=128>>e+1;{let e=V.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),t=new ArrayBuffer(16);new Uint32Array(t,0,1).set([n]),V.queue.writeBuffer(e,0,t),A.push(e)}{let e=V.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),n=new ArrayBuffer(16);new Uint32Array(n,0,2).set([t,1]),V.queue.writeBuffer(e,0,n),M.push(e)}}}let qe=[],Je=[],Ye=[],Xe=[];for(let e=0;e<6;e++)qe.push([0,1].map(t=>V.createBindGroup({layout:Ee,entries:[{binding:0,resource:{buffer:E[e]}},{binding:1,resource:{buffer:se[e]}},{binding:2,resource:{buffer:Ge[e][t]}}]}))),Je.push(V.createBindGroup({layout:Re,entries:[{binding:0,resource:{buffer:E[e]}},{binding:1,resource:{buffer:se[e]}},{binding:2,resource:{buffer:ie[e]}},{binding:3,resource:{buffer:Ke[e]}}]})),e+1<6&&(Ye.push(V.createBindGroup({layout:ze,entries:[{binding:0,resource:{buffer:ie[e]}},{binding:1,resource:{buffer:se[e+1]}},{binding:2,resource:{buffer:A[e]}}]})),Xe.push(V.createBindGroup({layout:Be,entries:[{binding:0,resource:{buffer:E[e+1]}},{binding:1,resource:{buffer:E[e]}},{binding:2,resource:{buffer:M[e]}}]})));let Ze=[];for(let e=0;e<6;e++)Ze.push(Math.max(1,(128>>e)/4));let N=4096*64,$e=V.createBuffer({size:N*4,usage:w}),et=V.createBuffer({size:N*4,usage:w}),tt=[],nt=[];for(let e=0;e<5;e++){let t=64>>e,n=t*t*t*4;tt.push(V.createBuffer({size:n,usage:w})),nt.push(V.createBuffer({size:n,usage:w}))}let rt=[et];for(let e=1;e<5;e++){let t=64>>e;rt.push(V.createBuffer({size:t*t*t*4,usage:w}))}let it=V.createBuffer({size:16,usage:w}),at=V.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),ot=new ArrayBuffer(32),st=new Float32Array(ot),ct=new Uint32Array(ot);ct[1]=e,ct[2]=64,st[3]=64,st[4]=2,st[5]=y,ct[6]=N,ct[7]=0;let P=[],ut=[],dt=[],pt=[];for(let e=0;e<5;e++){let t=64>>e,n=128/t,r=n*n;P.push([0,1].map(e=>{let n=V.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),i=new ArrayBuffer(32);return new Uint32Array(i,0,2).set([t,e]),new Float32Array(i,8,2).set([r,k]),new Uint32Array(i,16,1).set([0]),V.queue.writeBuffer(n,0,i),n}));{let e=V.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),n=new ArrayBuffer(32);new Uint32Array(n,0,2).set([t,0]),new Float32Array(n,8,2).set([r,k]),new Uint32Array(n,16,1).set([0]),V.queue.writeBuffer(e,0,n),ut.push(e)}if(e+1<5){let n=64>>e+1;{let e=V.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),t=new ArrayBuffer(16);new Uint32Array(t,0,1).set([n]),V.queue.writeBuffer(e,0,t),dt.push(e)}{let e=V.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),n=new ArrayBuffer(16);new Uint32Array(n,0,2).set([t,0]),V.queue.writeBuffer(e,0,n),pt.push(e)}}}let mt=[b,x].map(e=>V.createBindGroup({layout:pe,entries:[{binding:0,resource:{buffer:e}},{binding:1,resource:{buffer:$e}},{binding:2,resource:{buffer:at}}]})),ht=V.createBindGroup({layout:he,entries:[{binding:0,resource:{buffer:$e}},{binding:1,resource:{buffer:et}},{binding:2,resource:{buffer:it}},{binding:3,resource:{buffer:at}}]}),gt=[],_t=[],yt=[],bt=[];for(let e=0;e<5;e++)gt.push([0,1].map(t=>V.createBindGroup({layout:Ee,entries:[{binding:0,resource:{buffer:tt[e]}},{binding:1,resource:{buffer:rt[e]}},{binding:2,resource:{buffer:P[e][t]}}]}))),_t.push(V.createBindGroup({layout:Re,entries:[{binding:0,resource:{buffer:tt[e]}},{binding:1,resource:{buffer:rt[e]}},{binding:2,resource:{buffer:nt[e]}},{binding:3,resource:{buffer:ut[e]}}]})),e+1<5&&(yt.push(V.createBindGroup({layout:ze,entries:[{binding:0,resource:{buffer:nt[e]}},{binding:1,resource:{buffer:rt[e+1]}},{binding:2,resource:{buffer:dt[e]}}]})),bt.push(V.createBindGroup({layout:Be,entries:[{binding:0,resource:{buffer:tt[e+1]}},{binding:1,resource:{buffer:tt[e]}},{binding:2,resource:{buffer:pt[e]}}]})));let xt=[];for(let e=0;e<5;e++)xt.push(Math.max(1,(64>>e)/4));let St=V.createBuffer({size:N*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),Ct=!1,Tt=j(`pm.boundary_sample`,Le),Et=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),Dt=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[Et]}),compute:{module:Tt,entryPoint:`main`}}),Ot=V.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});{let e=new ArrayBuffer(32),t=new Uint32Array(e),n=new Float32Array(e);t[0]=128,n[2]=16,n[3]=v,t[4]=64,n[6]=64,n[7]=2,V.queue.writeBuffer(Ot,0,e)}let kt=V.createBindGroup({layout:Et,entries:[{binding:0,resource:{buffer:tt[0]}},{binding:1,resource:{buffer:E[0]}},{binding:2,resource:{buffer:Ot}}]}),At=Ze[0],jt=[V.createBindGroup({layout:He,entries:[{binding:0,resource:{buffer:b}},{binding:1,resource:{buffer:E[0]}},{binding:2,resource:{buffer:tt[0]}},{binding:3,resource:{buffer:ae}},{binding:4,resource:{buffer:ce}},{binding:5,resource:{buffer:at}},{binding:6,resource:{buffer:We}}]}),V.createBindGroup({layout:He,entries:[{binding:0,resource:{buffer:x}},{binding:1,resource:{buffer:E[0]}},{binding:2,resource:{buffer:tt[0]}},{binding:3,resource:{buffer:ae}},{binding:4,resource:{buffer:ce}},{binding:5,resource:{buffer:at}},{binding:6,resource:{buffer:We}}]})],L=De({device:V,createShaderModuleChecked:j,renderTargetFormat:$t,renderSampleCount:en,cameraBuffer:te,cameraStride:I,cameraSize:Mt,starCount:e,starBuffers:[b,x],totalStarMass:f,gasMassFraction:n,pmBufUsage:w,fixedPointScale:y,pmDepositBGL:pe,pmDepositPipeline:me,pmInterpolateBGL:He,pmInterpolatePipeline:Ue,innerDensityU32:ne,innerPotential:E[0],innerParams:{gridRes:128,domainHalf:16,cellSize:v,cellCount:T,filterOutOfDomain:1},outerDensityU32:$e,outerPotential:tt[0],outerParams:{gridRes:64,domainHalf:64,cellSize:2,cellCount:N,filterOutOfDomain:0},pmBlendBuffer:We}),Nt=j(`nbody.compute`,jr||`// [LAW:one-source-of-truth] DKD leapfrog integrator with ALL conservative forces.
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
`),Pt=j(`nbody.render`,Mr||`struct Camera {
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
`),Ft=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}}]}),It=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[Ft]}),compute:{module:Nt,entryPoint:`main`}}),Lt=j(`nbody.stats`,Oe),Rt=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),zt=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[Rt]}),compute:{module:Lt,entryPoint:`main`}}),Vt=V.createBuffer({size:32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),Ht=V.createBuffer({size:32,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),Ut=V.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),Wt=[V.createBindGroup({layout:Rt,entries:[{binding:0,resource:{buffer:x}},{binding:1,resource:{buffer:Vt}},{binding:2,resource:{buffer:Ut}}]}),V.createBindGroup({layout:Rt,entries:[{binding:0,resource:{buffer:b}},{binding:1,resource:{buffer:Vt}},{binding:2,resource:{buffer:Ut}}]})],Gt=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}},{binding:3,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),Zt=V.createRenderPipeline({layout:V.createPipelineLayout({bindGroupLayouts:[Gt]}),vertex:{module:Pt,entryPoint:`vs_main`},fragment:{module:Pt,entryPoint:`fs_main`,targets:[{format:$t,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:en}}),Qt=[V.createBindGroup({layout:Ft,entries:[{binding:0,resource:{buffer:b}},{binding:1,resource:{buffer:x}},{binding:2,resource:{buffer:ee}},{binding:3,resource:{buffer:ae}}]}),V.createBindGroup({layout:Ft,entries:[{binding:0,resource:{buffer:x}},{binding:1,resource:{buffer:b}},{binding:2,resource:{buffer:ee}},{binding:3,resource:{buffer:ae}}]})],tn=V.createBuffer({size:528,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),nn=new ArrayBuffer(528),rn=new Float32Array(nn),an=new Uint32Array(nn),on=[0,1].map(e=>[b,x].map(t=>V.createBindGroup({layout:Gt,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:te,offset:e*I,size:Mt}},{binding:2,resource:{buffer:S}},{binding:3,resource:{buffer:tn}}]}))),sn=ft*wt,cn=V.createBuffer({size:sn*32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),ln=new Float32Array(sn*8),U=j(`markers.render`,ke),dn=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),_n=V.createRenderPipeline({layout:V.createPipelineLayout({bindGroupLayouts:[dn]}),vertex:{module:U,entryPoint:`vs_main`},fragment:{module:U,entryPoint:`fs_main`,targets:[{format:$t,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:en}}),vn=[0,1].map(e=>V.createBindGroup({layout:dn,entries:[{binding:0,resource:{buffer:cn}},{binding:1,resource:{buffer:te,offset:e*I,size:Mt}}]}));function yn(e,t){let n=F.markers,r=Math.min(n.length,sn);if(r===0)return;let i=F.physics.interactionStrength??1,a=Tn,o=1/Math.log(1+Math.max(i,1));for(let e=0;e<r;e++){let t=n[e],r=F.attractors[t.attractorIdx],s=r?vt(r,a,i):0,c=Math.max(0,Math.min(1,Math.log(1+s)*o)),l=e*8;ln[l]=t.x,ln[l+1]=t.y,ln[l+2]=t.z,ln[l+3]=c,ln[l+4]=t.tintR,ln[l+5]=t.tintG,ln[l+6]=t.tintB,ln[l+7]=t.seed}V.queue.writeBuffer(cn,0,ln.buffer,0,r*32),e.setPipeline(_n),e.setBindGroup(0,vn[t]),e.draw(6,r)}let bn=2048,xn=Math.min(e,bn)*48,Sn=V.createBuffer({size:xn,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),Cn=!1,W=0,wn={},Tn=0,G=1,En=[0,1,0],Dn=18e3,On=1+ft*4,kn=new Float32Array(Dn*On),An=0,jn=!1,Mn=0,Nn={ke:0,pe:0,virial:0,rmsR:0,rmsH:0},Pn=new ArrayBuffer(608),K=new Float32Array(Pn),q=new Uint32Array(Pn),Fn=new Uint8Array(Pn);return{setTimeDirection(e){G=e},getSimStep(){return Tn},getTimeDirection(){return G},setBlurTime(e){C[0]=e,C[1]=0,C[2]=0,C[3]=0,V.queue.writeBuffer(S,0,C)},getJournalCapacity(){return Dn},getJournalHighWater(){return An},compute(t){if(G<0&&Tn<=0){F.paused=!0;return}G<0&&Tn--;let n=F.physics,r=lt*F.fx.timeScale,i=r*G;if(K[0]=i,K[1]=n.G*.001,K[2]=n.softening,K[3]=n.haloMass??5,q[4]=e,q[5]=0,K[6]=n.haloScale??2,K[7]=Tn*r,K[12]=En[0],K[13]=En[1],K[14]=En[2],K[16]=n.diskMass??3,K[17]=n.diskScaleA??1.5,K[18]=n.diskScaleB??.3,K[19]=0,K[20]=0,K[21]=0,K[22]=0,K[23]=n.tidalStrength??.005,G>0){let e=n.interactionStrength??1,t=F.attractors,r=Math.min(t.length,ft);q[8]=r,q[9]=0,q[10]=0,q[11]=0;for(let n=0;n<r;n++){let r=t[n],i=24+n*4;K[i]=r.x,K[i+1]=r.y,K[i+2]=r.z,K[i+3]=vt(r,Tn,e)}for(let e=r;e<ft;e++){let t=24+e*4;K[t]=0,K[t+1]=0,K[t+2]=0,K[t+3]=0}let i=Tn%Dn*On;kn[i]=r;for(let e=0;e<ft*4;e++)kn[i+1+e]=K[24+e];An=Math.max(An,Tn),Tn++}else{let e=Tn%Dn*On;q[8]=kn[e],q[9]=0,q[10]=0,q[11]=0;for(let t=0;t<ft*4;t++)K[24+t]=kn[e+1+t]}V.queue.writeBuffer(ee,0,Fn),ue[0]=i,V.queue.writeBuffer(ce,0,le),st[0]=i,V.queue.writeBuffer(at,0,ot),L.prepareFrame(i,n.gasSoundSpeed??2),t.clearBuffer(ne),t.clearBuffer(oe),t.clearBuffer($e),t.clearBuffer(it),L.clear(t);let a=ba(`pmDepositConvert`),o=t.beginComputePass(a?{timestampWrites:a}:void 0);o.setPipeline(me),o.setBindGroup(0,be[W]),o.dispatchWorkgroups(Math.ceil(e/256)),L.depositInnerPm(o,W),o.setPipeline(_e),o.setBindGroup(0,ye),o.dispatchWorkgroups(Math.ceil(T/256)),o.setPipeline(ve),o.dispatchWorkgroups(Math.ceil(T/256)),o.setPipeline(me),o.setBindGroup(0,mt[W]),o.dispatchWorkgroups(Math.ceil(e/256)),L.depositOuterPm(o,W),o.setPipeline(_e),o.setBindGroup(0,ht),o.dispatchWorkgroups(Math.ceil(N/256)),o.setPipeline(ve),o.dispatchWorkgroups(Math.ceil(N/256)),L.depositGasAndBuildPressure(o,W),o.end(),fn(t,{levels:5,wgCount:xt,potential:tt,smoothBG:gt,residualBG:_t,restrictBG:yt,prolongBG:bt,preSmooth:1,postSmooth:1,coarsestSweeps:16,timingBucket:`outerVCycle`});{let e=ba(`boundarySample`),n=t.beginComputePass(e?{timestampWrites:e}:void 0);n.setPipeline(Dt),n.setBindGroup(0,kt),n.dispatchWorkgroups(At,At,At),n.end()}fn(t,{levels:6,wgCount:Ze,potential:E,smoothBG:qe,residualBG:Je,restrictBG:Ye,prolongBG:Xe,preSmooth:1,postSmooth:1,coarsestSweeps:16,timingBucket:`innerVCycle`});let s=ba(`starInterpolate`),c=t.beginComputePass(s?{timestampWrites:s}:void 0);c.setPipeline(Ue),c.setBindGroup(0,jt[W]),c.dispatchWorkgroups(Math.ceil(e/256)),c.end();let l=ba(`gasInterpolatePressure`),u=t.beginComputePass(l?{timestampWrites:l}:void 0);L.interpolateForces(u,W),u.end();let d=ba(`starGasIntegrate`),f=t.beginComputePass(d?{timestampWrites:d}:void 0);L.integrate(f,W),f.setPipeline(It),f.setBindGroup(0,Qt[W]),f.dispatchWorkgroups(Math.ceil(e/256)),f.end();let p=1-W,m=performance.now();if(!jn&&m-Mn>1e3){Mn=m;let r=(n.G??.3)*.001,i=new Float32Array(4),a=new Uint32Array(i.buffer);a[0]=e,a[1]=e,i[2]=(n.softening??.15)*(n.softening??.15),i[3]=r,V.queue.writeBuffer(Ut,0,i);let o=t.beginComputePass();o.setPipeline(zt),o.setBindGroup(0,Wt[p]),o.dispatchWorkgroups(1),o.end(),t.copyBufferToBuffer(Vt,0,Ht,0,32),jn=!0,V.queue.onSubmittedWorkDone().then(()=>{Ht.mapAsync(GPUMapMode.READ).then(()=>{let t=new Float32Array(Ht.getMappedRange().slice(0));Ht.unmap(),jn=!1;let n=t[0],r=t[1];Nn={ke:n,pe:r,virial:Math.abs(r)>.001?2*n/Math.abs(r):1,rmsR:Math.sqrt(t[2]/Math.max(e,1)),rmsH:Math.sqrt(t[3]/Math.max(e,1))}}).catch(()=>{jn=!1})})}W=1-W},render(t,n,r,i=0){let a=r?r[2]/r[3]:H.width/H.height;V.queue.writeBuffer(te,i*I,Xt(a));{let e=F.physics.interactionStrength??1,t=Tn,n=F.attractors,r=Math.min(n.length,ft),i=1/Math.log(1+Math.max(e,1));an[0]=r,an[1]=0,an[2]=0,an[3]=0;for(let a=0;a<r;a++){let r=n[a],o=vt(r,t,e),s=4+a*4;rn[s]=r.x,rn[s+1]=r.y,rn[s+2]=r.z,rn[s+3]=Math.max(0,Math.min(1,Math.log(1+o)*i))}for(let e=r;e<ft;e++){let t=4+e*4;rn[t]=0,rn[t+1]=0,rn[t+2]=0,rn[t+3]=0}V.queue.writeBuffer(tn,0,nn)}let o=ba(`starsRender`),s=t.beginRenderPass({colorAttachments:[qt(wn,n,r)],depthStencilAttachment:Jt(wn,r),...o?{timestampWrites:o}:{}}),c=Yt(r);c&&s.setViewport(c[0],c[1],c[2],c[3],0,1),un(s,a,i),s.setPipeline(Zt),s.setBindGroup(0,on[i][W]),s.draw(6,e),yn(s,i),s.end();let l=F.physics.gasVisible,u=l?Kt():B.nullColorView,d=l?Bt??B.depth.createView():B.nullDepthView,f=l?c:null,p=ba(`gasRender`),m=t.beginRenderPass({colorAttachments:[{view:u,clearValue:Qe,loadOp:`load`,storeOp:`store`}],depthStencilAttachment:{view:d,depthClearValue:1,depthLoadOp:`load`,depthStoreOp:`store`},...p?{timestampWrites:p}:{}});f&&m.setViewport(f[0],f[1],f[2],f[3],0,1),L.render(m,i,l),m.end()},getCount(){return e},getStats(){return Nn},async diagnose(){if(Cn)return{error:1};Cn=!0;let t=Math.min(e,bn),n=Math.floor(t/8),r=Math.floor(e/8),i=W===0?b:x,a=V.createCommandEncoder();for(let e=0;e<8;e++){let t=e*r;a.copyBufferToBuffer(i,t*48,Sn,e*n*48,n*48)}V.queue.submit([a.finish()]),await V.queue.onSubmittedWorkDone(),await Sn.mapAsync(GPUMapMode.READ);let o=new Float32Array(Sn.getMappedRange().slice(0));Sn.unmap(),Cn=!1;let s=En,c=0,l=0,u=0,d=0,f=0,p=0,m=0,_=0,v=0,y=0,ee=new Float64Array(10),te=new Float64Array(12);for(let e=0;e<t;e++){let t=e*12,n=o[t],r=o[t+1],i=o[t+2],a=o[t+3],b=o[t+4],x=o[t+5],S=o[t+6];c+=n,l+=r,u+=i,m+=a;let C=Math.sqrt(n*n+r*r+i*i);C>_&&(_=C),f+=C*C;let w=n*s[0]+r*s[1]+i*s[2];d+=w*w;let T=Math.sqrt(b*b+x*x+S*S);if(p+=T*T,C>.1){let e=n-w*s[0],t=r-w*s[1],a=i-w*s[2],o=Math.sqrt(e*e+t*t+a*a);if(o>.05){let n=e/o,r=t/o,i=a/o,c=s[1]*i-s[2]*r,l=s[2]*n-s[0]*i,u=s[0]*r-s[1]*n,d=Math.sqrt(c*c+l*l+u*u)||1,f=c/d,p=l/d,m=u/d,h=b*f+x*p+S*m;v+=Math.abs(h)/(T+.001),y++}}let ne=Math.min(9,Math.floor(C*2));ee[ne]++;let re=n-w*s[0],E=r-w*s[1],ie=i-w*s[2],ae=Math.atan2(re*g[0]+E*g[1]+ie*g[2],re*h[0]+E*h[1]+ie*h[2]),oe=Math.floor((ae+Math.PI)/(2*Math.PI)*12)%12;te[oe]++}let S=1/t,C=Array.from(te),w=C.reduce((e,t)=>e+t,0)/12,T=C.reduce((e,t)=>e+(t-w)**2,0)/12,ne=w>0?Math.sqrt(T)/w:0;return{count:e,sampleCount:t,comX:c*S,comY:l*S,comZ:u*S,rmsHeight:Math.sqrt(d*S),rmsRadius:Math.sqrt(f*S),rmsSpeed:Math.sqrt(p*S),maxRadius:_,totalMass:e/t*m,tangentialFraction:y>0?v/y:0,armContrast:ne,radialProfile:Array.from(ee),angularProfile:C,diskNormalX:s[0],diskNormalY:s[1],diskNormalZ:s[2]}},async dumpDensity(){if(xe)return null;xe=!0;let e=V.createCommandEncoder();e.copyBufferToBuffer(re,0,O,0,T*4),V.queue.submit([e.finish()]),await V.queue.onSubmittedWorkDone(),await O.mapAsync(GPUMapMode.READ);let t=new Float32Array(O.getMappedRange().slice(0));return O.unmap(),xe=!1,t},async dumpPotential(){if(xe)return null;xe=!0;let e=V.createCommandEncoder();e.copyBufferToBuffer(E[0],0,O,0,T*4),V.queue.submit([e.finish()]),await V.queue.onSubmittedWorkDone(),await O.mapAsync(GPUMapMode.READ);let t=new Float32Array(O.getMappedRange().slice(0));return O.unmap(),xe=!1,t},async maxResidual(){if(xe||Ct)return null;xe=!0,Ct=!0;let e=V.createCommandEncoder();e.copyBufferToBuffer(ie[0],0,O,0,T*4),e.copyBufferToBuffer(nt[0],0,St,0,N*4),V.queue.submit([e.finish()]),await V.queue.onSubmittedWorkDone(),await O.mapAsync(GPUMapMode.READ);let t=new Float32Array(O.getMappedRange()),n=0;for(let e=0;e<t.length;e++){let r=Math.abs(t[e]);r>n&&(n=r)}O.unmap(),xe=!1,await St.mapAsync(GPUMapMode.READ);let r=new Float32Array(St.getMappedRange()),i=0;for(let e=0;e<r.length;e++){let t=Math.abs(r[e]);t>i&&(i=t)}return St.unmap(),Ct=!1,{inner:n,outer:i}},async dumpOuterDensity(){if(Ct)return null;Ct=!0;let e=V.createCommandEncoder();e.copyBufferToBuffer(et,0,St,0,N*4),V.queue.submit([e.finish()]),await V.queue.onSubmittedWorkDone(),await St.mapAsync(GPUMapMode.READ);let t=new Float32Array(St.getMappedRange().slice(0));return St.unmap(),Ct=!1,t},async dumpOuterPotential(){if(Ct)return null;Ct=!0;let e=V.createCommandEncoder();e.copyBufferToBuffer(tt[0],0,St,0,N*4),V.queue.submit([e.finish()]),await V.queue.onSubmittedWorkDone(),await St.mapAsync(GPUMapMode.READ);let t=new Float32Array(St.getMappedRange().slice(0));return St.unmap(),Ct=!1,t},gasDumpDensity:()=>L.dumpDensity(),gasEnergyBreakdown:()=>L.energyBreakdown(W,F.physics.gasSoundSpeed??2),gasWakeProbe:(e=0)=>L.wakeProbe(W,e),async gasReversibilityTest(e){let t=F.paused,n=G;F.paused=!0;let r=await L.snapshot(W);if(!r)return G=n,F.paused=t,null;G=1;for(let t=0;t<e;t++){let e=V.createCommandEncoder();this.compute(e),V.queue.submit([e.finish()])}G=-1;for(let t=0;t<e;t++){let e=V.createCommandEncoder();this.compute(e),V.queue.submit([e.finish()])}G=n,F.paused=t;let i=await L.snapshot(W);if(!i)return null;let a=0,o=0;for(let e=0;e<L.count;e++){let t=e*12,n=Math.hypot(i[t]-r[t],i[t+1]-r[t+1],i[t+2]-r[t+2]),s=Math.hypot(i[t+4]-r[t+4],i[t+5]-r[t+5],i[t+6]-r[t+6]);n>a&&(a=n),s>o&&(o=s)}return{maxPosErr:a,maxVelErr:o,count:L.count}},async reversibilityTest(t){if(xe)return null;let n=e*48;if(n>O.size)return null;xe=!0;let r=F.paused,i=G;F.paused=!0;let a=async()=>{let e=V.createCommandEncoder(),t=W===0?b:x;e.copyBufferToBuffer(t,0,O,0,n),V.queue.submit([e.finish()]),await V.queue.onSubmittedWorkDone(),await O.mapAsync(GPUMapMode.READ);let r=new Float32Array(O.getMappedRange(0,n).slice(0));return O.unmap(),r},o=await a();G=1;for(let e=0;e<t;e++){let e=V.createCommandEncoder();this.compute(e),V.queue.submit([e.finish()])}G=-1;for(let e=0;e<t;e++){let e=V.createCommandEncoder();this.compute(e),V.queue.submit([e.finish()])}G=i,F.paused=r;let s=await a(),c=0,l=0;for(let t=0;t<e;t++){let e=t*12,n=s[e]-o[e],r=s[e+1]-o[e+1],i=s[e+2]-o[e+2],a=Math.sqrt(n*n+r*r+i*i);a>c&&(c=a),l+=a}return xe=!1,{maxErr:c,meanErr:l/e,count:e}},destroy(){b.destroy(),x.destroy(),L.destroy(),ee.destroy(),te.destroy(),S.destroy(),tn.destroy(),cn.destroy(),Vt.destroy(),Ht.destroy(),Ut.destroy(),Sn.destroy(),ne.destroy(),re.destroy();for(let e of E)e.destroy();for(let e of ie)e.destroy();ae.destroy(),oe.destroy(),ce.destroy(),O.destroy();for(let e=1;e<se.length;e++)se[e].destroy();for(let e of Ge)for(let t of e)t.destroy();for(let e of Ke)e.destroy();for(let e of A)e.destroy();for(let e of M)e.destroy();$e.destroy(),et.destroy();for(let e of tt)e.destroy();for(let e of nt)e.destroy();it.destroy(),at.destroy(),St.destroy();for(let e=1;e<rt.length;e++)rt[e].destroy();for(let e of P)for(let t of e)t.destroy();for(let e of ut)e.destroy();for(let e of dt)e.destroy();for(let e of pt)e.destroy();We.destroy()},pmDensityU32:ne,pmDensityF32:re,pmPotential:E,pmResidual:ie,pmForce:ae,pmMeanScratch:oe}}function vn(){let e=F.physics_classic.count,t=e*32,n=new Float32Array(e*8),r=F.physics_classic.distribution;for(let t=0;t<e;t++){let e=t*8,i,a,o,s=0,c=0;if(r===`disk`){let e=Math.random()*Math.PI*2,t=Math.random()*2;i=Math.cos(e)*t,a=(Math.random()-.5)*.1,o=Math.sin(e)*t;let n=.5/Math.sqrt(t+.1);s=-Math.sin(e)*n,c=Math.cos(e)*n}else if(r===`shell`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=1.5+Math.random()*.1;i=n*Math.sin(t)*Math.cos(e),a=n*Math.sin(t)*Math.sin(e),o=n*Math.cos(t)}else i=(Math.random()-.5)*4,a=(Math.random()-.5)*4,o=(Math.random()-.5)*4;n[e]=i,n[e+1]=a,n[e+2]=o,n[e+3]=.5+Math.random()*2,n[e+4]=s,n[e+5]=0,n[e+6]=c}let i=V.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(i.getMappedRange()).set(n),i.unmap();let a=V.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),o=V.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),s=V.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),c=V.createBuffer({size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),l=j(`nbody.classic.compute`,Nr||`// Classic n-body compute — preserved verbatim from the original shader-playground for A/B comparison.
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
`),u=j(`nbody.classic.render`,Pr||`// Classic n-body render — preserved verbatim for A/B comparison. World-space billboards, soft fuzzy falloff.
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
`),d=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),f=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[d]}),compute:{module:l,entryPoint:`main`}}),p=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),m=V.createRenderPipeline({layout:V.createPipelineLayout({bindGroupLayouts:[p]}),vertex:{module:u,entryPoint:`vs_main`},fragment:{module:u,entryPoint:`fs_main`,targets:[{format:$t,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:en}}),h=[V.createBindGroup({layout:d,entries:[{binding:0,resource:{buffer:i}},{binding:1,resource:{buffer:a}},{binding:2,resource:{buffer:o}}]}),V.createBindGroup({layout:d,entries:[{binding:0,resource:{buffer:a}},{binding:1,resource:{buffer:i}},{binding:2,resource:{buffer:o}}]})],g=[0,1].map(e=>[i,a].map(t=>V.createBindGroup({layout:p,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:c,offset:e*I,size:Mt}},{binding:2,resource:{buffer:s}}]}))),_=0,v={};return{compute(t){let n=F.physics_classic,r=F.mouse,i=new ArrayBuffer(48),a=new Float32Array(i),c=new Uint32Array(i);a[0]=.016*F.fx.timeScale,a[1]=n.G*.001,a[2]=n.softening,a[3]=n.damping,c[4]=e,a[8]=r.down?r.worldX:0,a[9]=r.down?r.worldY:0,a[10]=r.down?r.worldZ:0,a[11]=r.down?1:0,V.queue.writeBuffer(o,0,new Uint8Array(i)),V.queue.writeBuffer(s,0,new Float32Array([r.down?r.worldX:0,r.down?r.worldY:0,r.down?r.worldZ:0,r.down?1:0]));let l=t.beginComputePass();l.setPipeline(f),l.setBindGroup(0,h[_]),l.dispatchWorkgroups(Math.ceil(e/64)),l.end(),_=1-_},render(t,n,r,i=0){let a=r?r[2]/r[3]:H.width/H.height;V.queue.writeBuffer(c,i*I,Xt(a));let o=t.beginRenderPass({colorAttachments:[qt(v,n,r)],depthStencilAttachment:Jt(v,r)}),s=Yt(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),un(o,a,i),o.setPipeline(m),o.setBindGroup(0,g[i][_]),o.draw(6,e),o.end()},getCount(){return e},destroy(){i.destroy(),a.destroy(),o.destroy(),s.destroy(),c.destroy()}}}function yn(){let e=F.fluid.resolution,t=e*e,n=t*8,r=t*4,i=t*16,a=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,o=V.createBuffer({size:n,usage:a}),s=V.createBuffer({size:n,usage:a}),c=V.createBuffer({size:r,usage:a}),l=V.createBuffer({size:r,usage:a}),u=V.createBuffer({size:r,usage:a}),d=V.createBuffer({size:i,usage:a}),f=V.createBuffer({size:i,usage:a}),p=V.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),m=V.createBuffer({size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),h=new Float32Array(t*4),g=new Float32Array(t*2);for(let t=0;t<e;t++)for(let n=0;n<e;n++){let r=t*e+n,i=n/e,a=t/e,o=i-.5,s=a-.5;g[r*2]=-s*3,g[r*2+1]=o*3}V.queue.writeBuffer(d,0,h),V.queue.writeBuffer(o,0,g);let _=j(`fluid.forces`,Fr||`struct Params {
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
`),v=j(`fluid.diffuse`,Ir||`struct Params {
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
`),y=j(`fluid.pressure`,Rr||`struct Params {
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
`),b=j(`fluid.divergence`,Lr||`struct Params {
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
`),x=j(`fluid.gradient`,zr||`struct Params {
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
`),ee=j(`fluid.render`,Br||`struct Camera {
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
`),te=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),S=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[te]}),compute:{module:_,entryPoint:`main`}}),C=V.createBindGroup({layout:te,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:d}},{binding:3,resource:{buffer:f}},{binding:4,resource:{buffer:p}}]}),w=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),T=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[w]}),compute:{module:v,entryPoint:`main`}}),ne=[V.createBindGroup({layout:w,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:p}}]}),V.createBindGroup({layout:w,entries:[{binding:0,resource:{buffer:s}},{binding:1,resource:{buffer:o}},{binding:2,resource:{buffer:p}}]})],re=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),E=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[re]}),compute:{module:b,entryPoint:`main`}}),ie=V.createBindGroup({layout:re,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:u}},{binding:2,resource:{buffer:p}}]}),ae=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),oe=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[ae]}),compute:{module:y,entryPoint:`main`}}),se=[V.createBindGroup({layout:ae,entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:u}},{binding:3,resource:{buffer:p}}]}),V.createBindGroup({layout:ae,entries:[{binding:0,resource:{buffer:l}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:u}},{binding:3,resource:{buffer:p}}]})],ce=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),le=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[ce]}),compute:{module:x,entryPoint:`main`}}),ue=V.createBindGroup({layout:ce,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:c}},{binding:3,resource:{buffer:p}}]}),de=V.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});V.queue.writeBuffer(de,0,new Float32Array([e,At,F.fluid.volumeScale,jt]));let fe=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),pe=V.createRenderPipeline({layout:V.createPipelineLayout({bindGroupLayouts:[fe]}),vertex:{module:ee,entryPoint:`vs_main`},fragment:{module:ee,entryPoint:`fs_main`,targets:[{format:$t}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:en}}),me=[0,1].map(e=>V.createBindGroup({layout:fe,entries:[{binding:0,resource:{buffer:d}},{binding:1,resource:{buffer:de}},{binding:2,resource:{buffer:m,offset:e*I,size:Mt}}]})),D=Math.ceil(e/8),he={},ge=0;return{compute(t){let a=F.fluid,u=a.dyeMode===`rainbow`?0:a.dyeMode===`single`?1:2;ge+=.016*F.fx.timeScale;let m=new Float32Array([.22*F.fx.timeScale,a.viscosity,a.diffusionRate,a.forceStrength,e,F.mouse.x,F.mouse.y,F.mouse.dx,F.mouse.dy,F.mouse.down?1:0,u,ge]);V.queue.writeBuffer(p,0,m);{let e=t.beginComputePass();e.setPipeline(S),e.setBindGroup(0,C),e.dispatchWorkgroups(D,D),e.end()}t.copyBufferToBuffer(s,0,o,0,n),t.copyBufferToBuffer(f,0,d,0,i);let h=0;for(let e=0;e<a.jacobiIterations;e++){let e=t.beginComputePass();e.setPipeline(T),e.setBindGroup(0,ne[h]),e.dispatchWorkgroups(D,D),e.end(),h=1-h}h===1&&t.copyBufferToBuffer(s,0,o,0,n);{let e=t.beginComputePass();e.setPipeline(E),e.setBindGroup(0,ie),e.dispatchWorkgroups(D,D),e.end()}let g=0;for(let e=0;e<a.jacobiIterations;e++){let e=t.beginComputePass();e.setPipeline(oe),e.setBindGroup(0,se[g]),e.dispatchWorkgroups(D,D),e.end(),g=1-g}g===1&&t.copyBufferToBuffer(l,0,c,0,r);{let e=t.beginComputePass();e.setPipeline(le),e.setBindGroup(0,ue),e.dispatchWorkgroups(D,D),e.end()}t.copyBufferToBuffer(s,0,o,0,n)},render(t,n,r,i=0){let a=r?r[2]/r[3]:H.width/H.height;V.queue.writeBuffer(m,i*I,Xt(a)),V.queue.writeBuffer(de,0,new Float32Array([e,At,F.fluid.volumeScale,jt]));let o=t.beginRenderPass({colorAttachments:[qt(he,n,r)],depthStencilAttachment:Jt(he,r)}),s=Yt(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),un(o,a,i),o.setPipeline(pe),o.setBindGroup(0,me[i]),o.draw(36,At*At),o.end()},getCount(){return e+`x`+e},destroy(){o.destroy(),s.destroy(),c.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),de.destroy(),m.destroy()}}}function bn(){let e=65025*6,t=V.createBuffer({size:2097152,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.VERTEX}),n=V.createBuffer({size:e*4,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});{let t=new Uint32Array(e),r=0;for(let e=0;e<255;e++)for(let n=0;n<255;n++){let i=e*256+n,a=i+1,o=(e+1)*256+n,s=o+1;t[r++]=i,t[r++]=o,t[r++]=a,t[r++]=a,t[r++]=o,t[r++]=s}V.queue.writeBuffer(n,0,t)}let r=V.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),i=V.createBuffer({size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),a=V.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),o=0,s=0,c=j(`parametric.compute`,Vr||`struct Params {
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
`),l=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),u=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[l]}),compute:{module:c,entryPoint:`main`}}),d=V.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:r}}]}),f=j(`parametric.render`,Hr||`struct Camera {
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
`),p=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),m=V.createRenderPipeline({layout:V.createPipelineLayout({bindGroupLayouts:[p]}),vertex:{module:f,entryPoint:`vs_main`},fragment:{module:f,entryPoint:`fs_main`,targets:[{format:$t}]},primitive:{topology:`triangle-list`,cullMode:`none`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:en}}),h=[0,1].map(e=>V.createBindGroup({layout:p,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:i,offset:e*I,size:Mt}},{binding:2,resource:{buffer:a}}]})),g={};return{compute(e){let t=F.parametric;o+=.016*F.fx.timeScale;let n=Math.max(t.p1Rate,t.p2Rate,t.p3Rate,t.p4Rate,t.twistRate);s+=.016*F.fx.timeScale*(n>0?1:0);let i=(e,t,n,r)=>e+(t-e)*(.5+.5*Math.sin(o*n+r)),a=i(t.p1Min,t.p1Max,t.p1Rate,0),c=i(t.p2Min,t.p2Max,t.p2Rate,Math.PI*.7),l=i(t.p3Min,t.p3Max,t.p3Rate,Math.PI*1.3),f=i(t.p4Min,t.p4Max,t.p4Rate,Math.PI*.4),p=i(t.twistMin,t.twistMax,t.twistRate,Math.PI*.9),m=F.mouse,h=new ArrayBuffer(64),g=new Uint32Array(h),_=new Float32Array(h);g[0]=256,g[1]=256,_[2]=t.scale,_[3]=p,_[4]=s,g[5]=Nt[t.shape]||0,_[6]=a,_[7]=c,_[8]=l,_[9]=f,_[10]=m.worldX,_[11]=m.worldY,_[12]=m.worldZ,_[13]=m.down?1:0,V.queue.writeBuffer(r,0,new Uint8Array(h));let v=e.beginComputePass();v.setPipeline(u),v.setBindGroup(0,d),v.dispatchWorkgroups(32,32),v.end()},render(t,r,o,c=0){let l=o?o[2]/o[3]:H.width/H.height;V.queue.writeBuffer(i,c*I,Xt(l));let u=Ft.rotateX(Ft.rotateY(Ft.identity(),s*.1),s*.03);V.queue.writeBuffer(a,0,u);let d=t.beginRenderPass({colorAttachments:[qt(g,r,o)],depthStencilAttachment:Jt(g,o)}),f=Yt(o);f&&d.setViewport(f[0],f[1],f[2],f[3],0,1),un(d,l,c),d.setPipeline(m),d.setBindGroup(0,h[c]),d.setIndexBuffer(n,`uint32`),d.drawIndexed(e),d.end()},getCount(){return`256×256 (${F.parametric.shape})`},destroy(){t.destroy(),n.destroy(),r.destroy(),i.destroy(),a.destroy()}}}function xn(){let e=F.reaction.resolution,t={size:[e,e,e],dimension:`3d`,format:`rgba16float`,usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST},n=V.createTexture(t),r=V.createTexture(t),i=new Uint16Array(e*e*e*4),a=e=>{let t=new Float32Array(1),n=new Int32Array(t.buffer);t[0]=e;let r=n[0],i=r>>16&32768,a=(r>>23&255)-112,o=r&8388607;return a<=0?i:a>=31?i|31744:i|a<<10|o>>13},o=a(1),s=a(0),c=a(.5);for(let t=0;t<e;t++)for(let n=0;n<e;n++)for(let r=0;r<e;r++){let a=(t*e*e+n*e+r)*4;i[a]=o,i[a+1]=s,i[a+2]=s,i[a+3]=s}let l=.3,u=.7;for(let t=0;t<80;t++){let t=Math.floor(e*(l+Math.random()*(u-l))),n=Math.floor(e*(l+Math.random()*(u-l))),r=Math.floor(e*(l+Math.random()*(u-l))),a=Math.random()<.5?1:2;for(let o=-a;o<=a;o++)for(let s=-a;s<=a;s++)for(let l=-a;l<=a;l++){if(l*l+s*s+o*o>a*a)continue;let u=t+l,d=n+s,f=r+o;if(u<0||d<0||f<0||u>=e||d>=e||f>=e)continue;let p=(f*e*e+d*e+u)*4;i[p]=c,i[p+1]=c}}V.queue.writeTexture({texture:n},i.buffer,{bytesPerRow:e*8,rowsPerImage:e},[e,e,e]),V.queue.writeTexture({texture:r},i.buffer,{bytesPerRow:e*8,rowsPerImage:e},[e,e,e]);let d=j(`reaction.compute`,Ur||`// Gray-Scott reaction-diffusion on a 3D volume.
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
`),f=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:`float`,viewDimension:`3d`}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:`write-only`,format:`rgba16float`,viewDimension:`3d`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),p=V.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),m=V.createComputePipeline({layout:V.createPipelineLayout({bindGroupLayouts:[f]}),compute:{module:d,entryPoint:`main`}}),h=[V.createBindGroup({layout:f,entries:[{binding:0,resource:n.createView({dimension:`3d`})},{binding:1,resource:r.createView({dimension:`3d`})},{binding:2,resource:{buffer:p}}]}),V.createBindGroup({layout:f,entries:[{binding:0,resource:r.createView({dimension:`3d`})},{binding:1,resource:n.createView({dimension:`3d`})},{binding:2,resource:{buffer:p}}]})],g=j(`reaction.render`,Wr||`// Raymarched volume render of the Gray-Scott v-field.
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
`),_=V.createSampler({magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`,addressModeW:`clamp-to-edge`}),v=V.createBuffer({size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),y=V.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),b=V.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`,viewDimension:`3d`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),x=V.createRenderPipeline({layout:V.createPipelineLayout({bindGroupLayouts:[b]}),vertex:{module:g,entryPoint:`vs_main`},fragment:{module:g,entryPoint:`fs_main`,targets:[{format:$t,blend:{color:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`less`},multisample:{count:en}}),ee=[0,1].map(e=>[0,1].map(t=>V.createBindGroup({layout:b,entries:[{binding:0,resource:(t===0?n:r).createView({dimension:`3d`})},{binding:1,resource:_},{binding:2,resource:{buffer:v,offset:e*I,size:Mt}},{binding:3,resource:{buffer:y}}]}))),te=Math.ceil(e/8),S=Math.ceil(e/8),C=Math.ceil(e/4),w={},T=0;return{compute(t){let n=F.reaction,r=Math.max(1,Math.floor(n.stepsPerFrame)),i=Math.max(0,F.fx.timeScale),a=Math.max(0,Math.round(r*i));V.queue.writeBuffer(p,0,new Float32Array([n.feed,n.kill,n.Du,n.Dv,.65,e,0,0]));for(let e=0;e<a;e++){let e=t.beginComputePass();e.setPipeline(m),e.setBindGroup(0,h[T]),e.dispatchWorkgroups(te,S,C),e.end(),T=1-T}},render(t,n,r,i=0){let a=r?r[2]/r[3]:H.width/H.height;V.queue.writeBuffer(v,i*I,Xt(a)),V.queue.writeBuffer(y,0,new Float32Array([e,F.reaction.isoThreshold,3,256]));let o=t.beginRenderPass({colorAttachments:[qt(w,n,r)],depthStencilAttachment:Jt(w,r)}),s=Yt(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),un(o,a,i),o.setPipeline(x),o.setBindGroup(0,ee[i][1-T]),o.draw(3),o.end()},getCount(){return`${e}³`},destroy(){n.destroy(),r.destroy(),p.destroy(),v.destroy(),y.destroy()}}}var Sn=[{key:`timeScale`,label:`Time`,min:-2,max:2,step:.05},{key:`bloomIntensity`,label:`Bloom`,min:0,max:4,step:.01},{key:`bloomThreshold`,label:`Threshold`,min:0,max:8,step:.01},{key:`bloomRadius`,label:`Bloom Radius`,min:.5,max:2,step:.01},{key:`trailPersistence`,label:`Trails`,min:0,max:.995,step:.001},{key:`exposure`,label:`Exposure`,min:.2,max:4,step:.01},{key:`vignette`,label:`Vignette`,min:0,max:1.5,step:.01},{key:`chromaticAberration`,label:`Chromatic`,min:0,max:2,step:.01},{key:`grading`,label:`Color Grade`,min:0,max:1.5,step:.01}];function Cn(e){let t=document.createElement(`div`);t.className=`param-section`;let n=document.createElement(`div`);n.className=`param-section-title`,n.textContent=`Visual FX`,t.appendChild(n);for(let e of Sn){let n=document.createElement(`div`);n.className=`control-row`;let r=document.createElement(`span`);r.className=`control-label`,r.textContent=e.label,n.appendChild(r);let i=document.createElement(`input`);i.type=`range`,i.min=String(e.min),i.max=String(e.max),i.step=String(e.step),i.value=String(F.fx[e.key]);let a=document.createElement(`span`);a.className=`control-value`,a.textContent=En(F.fx[e.key],e.step),i.addEventListener(`input`,()=>{let t=Number(i.value);F.fx[e.key]=t,a.textContent=En(t,e.step),Fa()}),n.appendChild(i),n.appendChild(a),t.appendChild(n)}e.appendChild(t)}function W(){for(let[e,t]of Object.entries(Je)){let n=e,r=document.getElementById(`params-${n}`),i=document.createElement(`div`);i.className=`presets`;for(let e of Object.keys(qe[n])){let t=document.createElement(`button`);t.className=`preset-btn`+(e===`Default`?` active`:``),t.textContent=e,t.dataset.preset=e,t.dataset.mode=n,t.addEventListener(`click`,()=>jn(n,e)),i.appendChild(t)}r.appendChild(i);for(let e of t){let t=document.createElement(`div`);t.className=`param-section`;let i=document.createElement(`div`);if(i.className=`param-section-title`,i.textContent=e.section,t.appendChild(i),e.dynamic){t.id=e.id??``,r.appendChild(t);continue}for(let r of e.params)wn(t,n,r);r.appendChild(t)}Cn(r)}}function wn(e,t,n){let r=document.createElement(`div`);r.className=`control-row`;let i=document.createElement(`span`);if(i.className=`control-label`,i.textContent=n.label,r.appendChild(i),n.type===`dropdown`){let e=document.createElement(`select`);e.dataset.mode=t,e.dataset.key=n.key;for(let t of n.options??[]){let n=document.createElement(`option`);n.value=String(t),n.textContent=String(t),e.appendChild(n)}e.value=String(P(t)[n.key]),e.addEventListener(`change`,()=>{let r=Number.isNaN(Number(e.value))?e.value:Number(e.value);P(t)[n.key]=r,n.requiresReset&&Da(),n.key===`shape`&&(Tn(String(r)),G()),gr()}),r.appendChild(e)}else if(n.type===`toggle`){let e=document.createElement(`input`);e.type=`checkbox`,e.dataset.mode=t,e.dataset.key=n.key,e.checked=!!P(t)[n.key],e.addEventListener(`change`,()=>{P(t)[n.key]=e.checked,gr()}),r.appendChild(e)}else{let e=document.createElement(`input`);e.type=`range`,n.logScale&&n.min!==void 0&&n.max!==void 0?(e.min=`0`,e.max=String(On),e.step=`1`,e.value=String(kn(Number(P(t)[n.key]),n.min,n.max)),e.dataset.logScale=`1`):(e.min=String(n.min),e.max=String(n.max),e.step=String(n.step),e.value=String(P(t)[n.key])),e.dataset.mode=t,e.dataset.key=n.key;let i=document.createElement(`span`);i.className=`control-value`,i.textContent=Dn(Number(P(t)[n.key]),n),e.addEventListener(`input`,()=>{let r=n.logScale&&n.min!==void 0&&n.max!==void 0?An(Number(e.value),n.min,n.max):Number(e.value);P(t)[n.key]=r,i.textContent=Dn(r,n),n.requiresReset&&(e.dataset.needsReset=`1`),gr()}),e.addEventListener(`change`,()=>{e.dataset.needsReset===`1`&&(e.dataset.needsReset=`0`,Da())}),r.appendChild(e),r.appendChild(i)}return e.appendChild(r),r}function Tn(e){let t=Pt[e]??{},n=F.parametric;t.p1?(n.p1Min=t.p1.animMin,n.p1Max=t.p1.animMax,n.p1Rate=t.p1.animRate):(n.p1Min=0,n.p1Max=0,n.p1Rate=0),t.p2?(n.p2Min=t.p2.animMin,n.p2Max=t.p2.animMax,n.p2Rate=t.p2.animRate):(n.p2Min=0,n.p2Max=0,n.p2Rate=0)}function G(){let e=document.getElementById(`shape-params-section`);if(!e)return;for(;e.children.length>1;)e.removeChild(e.lastChild);let t=Pt[F.parametric.shape]??{};for(let[n,r]of Object.entries(t)){let t=document.createElement(`div`);t.className=`anim-param-label`,t.textContent=r.label,e.appendChild(t),wn(e,`parametric`,{key:`${n}Min`,label:`Min`,min:r.min,max:r.max,step:r.step}),wn(e,`parametric`,{key:`${n}Max`,label:`Max`,min:r.min,max:r.max,step:r.step}),wn(e,`parametric`,{key:`${n}Rate`,label:`Rate`,min:0,max:3,step:.05})}}function En(e,t){if(t>=1)return String(Math.round(e));let n=Math.max(0,-Math.floor(Math.log10(t)));return e.toFixed(n)}function Dn(e,t){let n=t?.step??.01;return t?.maxLabel!==void 0&&t.max!==void 0&&e>=t.max-n/2?t.maxLabel:En(e,n)}var On=1e3;function kn(e,t,n){let r=(Math.log(e)-Math.log(t))/(Math.log(n)-Math.log(t));return Math.round(On*Math.max(0,Math.min(1,r)))}function An(e,t,n){let r=e/On;return Math.exp(Math.log(t)+r*(Math.log(n)-Math.log(t)))}function jn(e,t){let n=qe[e][t];Object.assign(P(e),n);let r=document.getElementById(`params-${e}`);r.querySelectorAll(`input[type="range"]`).forEach(t=>{let r=t.dataset.key;if(r in n){let i=Mn(e,r),a=Number(n[r]);t.value=i?.logScale&&i.min!==void 0&&i.max!==void 0?String(kn(a,i.min,i.max)):String(n[r]);let o=t.parentElement?.querySelector(`.control-value`);o&&(o.textContent=Dn(a,i))}}),r.querySelectorAll(`select`).forEach(e=>{let t=e.dataset.key;t in n&&(e.value=String(n[t]))}),r.querySelectorAll(`.preset-btn`).forEach(e=>{e.classList.toggle(`active`,e.dataset.preset===t)}),e===`parametric`&&G(),Da(),gr()}function Mn(e,t){for(let n of Je[e])for(let e of n.params)if(e.key===t)return e;return null}var Nn={boids:`Boids`,physics:`N-Body`,physics_classic:`N-Body Classic`,fluid:`Fluid`,parametric:`Shapes`,reaction:`Reaction`};function Pn(e){F.mode=e,document.querySelectorAll(`.mode-tab`).forEach(t=>t.classList.toggle(`active`,t.dataset.mode===e)),document.querySelectorAll(`.param-group`).forEach(t=>t.classList.toggle(`active`,t.dataset.mode===e)),document.querySelectorAll(`.debug-panel`).forEach(t=>t.classList.toggle(`active`,t.dataset.mode===e));let t=document.getElementById(`mode-stepper-label`);t&&(t.textContent=Nn[e]),Ea(),gr()}function K(){document.querySelectorAll(`.mode-tab`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.mode;Pn(t)})})}function q(){let e=document.getElementById(`btn-pause`);e&&(e.textContent=F.paused?`Resume`:`Pause`,e.classList.toggle(`active`,F.paused));let t=document.getElementById(`fab-pause`);t&&(t.textContent=F.paused?`▶`:`⏸`,t.classList.toggle(`active`,F.paused))}function Fn(){document.getElementById(`btn-pause`).addEventListener(`click`,()=>{F.paused=!F.paused,F.paused&&Gn(),q()}),document.getElementById(`btn-reset`).addEventListener(`click`,()=>{Da()}),document.getElementById(`copy-btn`).addEventListener(`click`,()=>{let e=document.getElementById(`prompt-text`).textContent??``;navigator.clipboard.writeText(e).then(()=>{let e=document.getElementById(`copy-btn`);e.textContent=`Copied!`,setTimeout(()=>{e.textContent=`Copy`},1500)})}),document.getElementById(`btn-reset-all`).addEventListener(`click`,()=>{localStorage.removeItem(Pa),location.reload()}),In();let e=document.getElementById(`toggle-xr-log`);e.addEventListener(`change`,()=>{F.debug.xrLog=e.checked,Ti(F.debug.xrLog),Fa()}),Qi()}function In(){let e=document.getElementById(`btn-xr-record`);if(!e)return;let t=()=>{if(Kr.status().phase===`idle`){e.textContent=`Record XR Session`,e.disabled=!!Z;return}e.textContent=`Recording — exit XR to stop`,e.disabled=!0,requestAnimationFrame(t)};e.addEventListener(`click`,async()=>{if(Kr.status().phase!==`idle`||Z)return;Kr.record({}).then(e=>{window.__xrLastRecording=e;let t={};for(let n of e)t[n.channel]=(t[n.channel]??0)+1;let n=Object.entries(t).map(([e,t])=>`${e}: ${t}`).join(`, `);console.group(`[xr] recording — ${e.length} samples (${n})`);for(let t of e){if(t.channel===`xr.snap`||t.channel===`xr.gesture`&&t.payload.gesture.kind===`pinch-hold`)continue;let e=t.channel;if(t.channel===`xr.gesture`){let n=t.payload;e=`xr.gesture:${n.gesture.kind}${n.hand?`(${n.hand})`:``}`}else if(t.channel===`xr.state`){let n=t.payload;e=`xr.state:${n.hand} ${n.from}→${n.to}`}console.log(`[t=${t.t.toFixed(0).padStart(5)}ms] ${e}`,t.payload)}console.groupEnd()}),requestAnimationFrame(t),await $i();let e=Z;if(!e){Kr.stop();return}e.addEventListener(`end`,()=>Kr.stop(),{once:!0})})}function Ln(){let e=e=>{let t=U[F.mode];!t||!(`setTimeDirection`in t)||(t.setTimeDirection(e?-1:1),!e&&F.paused&&(F.paused=!1))};document.addEventListener(`keydown`,t=>{if(t.key===`r`||t.key===`R`){if(t.repeat)return;let n=t.target?.tagName;if(n===`INPUT`||n===`TEXTAREA`||n===`SELECT`)return;e(!0)}}),document.addEventListener(`keyup`,t=>{(t.key===`r`||t.key===`R`)&&e(!1)});let t=document.getElementById(`fab-rewind`);t&&(t.addEventListener(`pointerdown`,()=>e(!0)),t.addEventListener(`pointerup`,()=>e(!1)),t.addEventListener(`pointercancel`,()=>e(!1)),t.addEventListener(`pointerleave`,()=>e(!1)))}var J={skipTarget:null,targetStepsPerSec:6e3,adaptiveChunk:8,breakAtStep:null,manualStepsRemaining:0,manualDirection:1,lastSkipDispatches:0},Rn=20,zn=14,Bn=1.3,Vn=.7,Hn=1,Un=5e3;function Wn(e){if(J.lastSkipDispatches<=0)return;let t=Math.max(1,Math.ceil(J.targetStepsPerSec/60));e>Rn?J.adaptiveChunk=Math.max(Hn,Math.floor(J.adaptiveChunk*Vn)):e<zn&&J.adaptiveChunk<t&&(J.adaptiveChunk=Math.min(Un,Math.ceil(J.adaptiveChunk*Bn)))}function Gn(){J.skipTarget=null,J.manualStepsRemaining=0,J.lastSkipDispatches=0}function Kn(e,t){if(F.mode!==`physics`||!(`getSimStep`in e)){J.lastSkipDispatches=0,F.paused||e.compute(t);return}let n=e,r=0,i=null,a=!1;if(J.skipTarget!==null){let e=J.skipTarget-n.getSimStep();if(e===0){J.skipTarget=null,J.lastSkipDispatches=0,n.setBlurTime(0),F.paused=!0,q();return}i=e>0?1:-1;let t=Math.max(1,Math.ceil(J.targetStepsPerSec/60));r=Math.min(t,J.adaptiveChunk,Math.abs(e)),a=!0}else J.manualStepsRemaining>0?(i=J.manualDirection,r=Math.min(J.adaptiveChunk,J.manualStepsRemaining),J.manualStepsRemaining-=r):F.paused||(r=1);if(r===0){n.setBlurTime(0),J.lastSkipDispatches=0;return}let o=n.getTimeDirection(),s=i!==null&&i!==o;s&&n.setTimeDirection(i);let c=i===null?o:i,l=.016*F.fx.timeScale,u=a?r*l*c:0;n.setBlurTime(u),J.lastSkipDispatches=a?r:0;for(let e=0;e<r;e++){n.compute(t);let e=n.getSimStep();if(J.breakAtStep!==null&&e===J.breakAtStep){J.breakAtStep=null,Gn(),F.paused=!0,q(),qn(),n.setBlurTime(0);break}if(J.skipTarget!==null&&e===J.skipTarget){J.skipTarget=null,F.paused=!0,q(),n.setBlurTime(0),J.lastSkipDispatches=0;break}}s&&n.setTimeDirection(o)}function qn(){let e=document.getElementById(`debug-break-status`),t=document.getElementById(`debug-break-val`);!e||!t||(J.breakAtStep===null?e.style.display=`none`:(t.textContent=String(J.breakAtStep),e.style.display=``))}function Jn(){let e=e=>document.getElementById(e),t=(e,t)=>{Gn(),F.paused=!0,q(),J.manualStepsRemaining=e,J.manualDirection=t};e(`debug-rev60`)?.addEventListener(`click`,()=>t(60,-1)),e(`debug-rev10`)?.addEventListener(`click`,()=>t(10,-1)),e(`debug-rev1`)?.addEventListener(`click`,()=>t(1,-1)),e(`debug-fwd1`)?.addEventListener(`click`,()=>t(1,1)),e(`debug-fwd10`)?.addEventListener(`click`,()=>t(10,1)),e(`debug-fwd60`)?.addEventListener(`click`,()=>t(60,1));let n=e(`debug-skip-chunk`);if(n){let e=parseInt(n.value,10);Number.isFinite(e)&&e>0&&(J.targetStepsPerSec=e),n.addEventListener(`change`,()=>{let e=parseInt(n.value,10);Number.isFinite(e)&&e>0&&(J.targetStepsPerSec=e)})}let r=e=>{e<0||(Gn(),F.paused=!0,q(),J.skipTarget=e)},i=e(`debug-skip-target`);e(`debug-skip-btn`)?.addEventListener(`click`,()=>{let e=parseInt(i?.value??``,10);Number.isFinite(e)&&r(e)}),i?.addEventListener(`keydown`,e=>{if(e.key===`Enter`){let e=parseInt(i.value,10);Number.isFinite(e)&&r(e)}});let a=e(`debug-break-step`);e(`debug-break-btn`)?.addEventListener(`click`,()=>{let e=parseInt(a?.value??``,10);Number.isFinite(e)&&e>=0&&(J.breakAtStep=e,qn())}),a?.addEventListener(`keydown`,e=>{if(e.key===`Enter`){let e=parseInt(a.value,10);Number.isFinite(e)&&e>=0&&(J.breakAtStep=e,qn())}}),e(`debug-break-clear`)?.addEventListener(`click`,()=>{J.breakAtStep=null,qn()});let o=e(`debug-scrub`);o?.addEventListener(`change`,()=>{let e=parseInt(o.value,10);Number.isFinite(e)&&r(e)}),e(`debug-screenshot`)?.addEventListener(`click`,()=>{let e=U.physics,t=e&&`getSimStep`in e?e.getSimStep():0;H.toBlob(e=>{if(!e)return;let n=URL.createObjectURL(e),r=document.createElement(`a`);r.href=n,r.download=`shader-playground-step-${t}.png`,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(n)},`image/png`)})}function Yn(){if(F.mode!==`physics`)return;let e=U.physics;if(!e||!(`getSimStep`in e))return;let t=e,n=t.getSimStep(),r=t.getTimeDirection(),i=t.getJournalHighWater(),a=document.getElementById(`debug-step-num`);a&&(a.textContent=String(n));let o=document.getElementById(`debug-step-dir`);o&&(o.textContent=r<0?`◀`:`▶`);let s=document.getElementById(`debug-scrub`),c=document.getElementById(`debug-scrub-high`);if(s&&c){let e=Math.max(i,n);s.max!==String(e)&&(s.max=String(e)),document.activeElement!==s&&(s.value=String(n)),c.textContent=String(e)}}function Xn(){let e=document.getElementById(`theme-presets`);for(let t of Object.keys(Ye)){let n=Ye[t],r=document.createElement(`button`);r.className=`preset-btn`+(t===F.colorTheme?` active`:``),r.textContent=t,r.dataset.theme=t,r.style.borderLeftWidth=`3px`,r.style.borderLeftColor=n.primary,r.addEventListener(`click`,()=>{F.colorTheme!==t&&(F.colorTheme=t,ct(t),e.querySelectorAll(`.preset-btn`).forEach(e=>e.classList.toggle(`active`,e.dataset.theme===t)),gr())}),e.appendChild(r)}}function Zn(){let e=F.camera,t=Math.cos(e.rotX),n=Math.sin(e.rotX),r=Math.cos(e.rotY),i=Math.sin(e.rotY),a=[e.distance*t*i,e.distance*n,e.distance*t*r],o=R(It([0,0,0],a)),s=R(z(o,[0,1,0]));return{eye:a,forward:o,right:s,up:z(s,o)}}function Qn(e,t){let n=F.camera.fov*Math.PI/180,r=H.width/H.height,{eye:i,forward:a,right:o,up:s}=Zn(),c=Math.tan(n*.5),l=(e*2-1)*c*r,u=(t*2-1)*c;return{eye:i,dir:R([a[0]+o[0]*l+s[0]*u,a[1]+o[1]*l+s[1]*u,a[2]+o[2]*l+s[2]*u])}}function $n(e,t){let{dir:n}=Qn(e,t),r=F.camera.distance*.5;return[n[0]*r,n[1]*r,n[2]*r]}function er(e,t){let{eye:n,dir:r}=Qn(e,t),i=R(n),a=Lt(r,i);if(Math.abs(a)<1e-4)return ir(n,r);let o=-Lt(n,i)/a;return[n[0]+r[0]*o,n[1]+r[1]*o,n[2]+r[2]*o]}function tr(e,t){let{eye:n,dir:r}=Qn(e,t);if(Math.abs(r[1])<1e-4)return null;let i=-n[1]/r[1];if(i<0)return null;let a=n[0]+r[0]*i,o=n[2]+r[2]*i,s=jt*.5;return Math.abs(a)>s||Math.abs(o)>s?null:[(a+s)/jt,(o+s)/jt]}function nr(e){let t=jt*.5;return Math.abs(e[0])>t||Math.abs(e[2])>t?null:[(e[0]+t)/jt,(e[2]+t)/jt]}function rr(e,t,n){if(Math.abs(t[1])<1e-4)return null;let r=(n-e[1])/t[1];return r<0?null:[e[0]+t[0]*r,e[1]+t[1]*r,e[2]+t[2]*r]}function ir(e,t){let n=Lt(t,t)||1,r=Math.max(0,-Lt(e,t)/n);return[e[0]+t[0]*r,e[1]+t[1]*r,e[2]+t[2]*r]}function ar(){F.mouse.down=!1,F.mouse.dx=0,F.mouse.dy=0}function or(){let e=H,t=!1,n=!1;e.addEventListener(`pointerdown`,r=>{if(F.xrEnabled)return;t=!0,n=!(r.ctrlKey||r.metaKey);let i=e.getBoundingClientRect(),a=(r.clientX-i.left)/i.width,o=1-(r.clientY-i.top)/i.height;if(F.mouse.dx=0,F.mouse.dy=0,n)if(F.mode===`fluid`){let e=tr(a,o);if(!e)ar();else{F.mouse.down=!0;let t=$n(a,o);F.mouse.worldX=t[0],F.mouse.worldY=t[1],F.mouse.worldZ=t[2],F.mouse.x=e[0],F.mouse.y=e[1]}}else{let e=er(a,o);F.mouse.down=!0,F.mouse.worldX=e[0],F.mouse.worldY=e[1],F.mouse.worldZ=e[2],F.mouse.x=a,F.mouse.y=o,F.mode===`physics`&&xt(r.pointerId,e)}else F.mouse.x=a,F.mouse.y=o;r.preventDefault()}),e.addEventListener(`pointermove`,r=>{if(F.xrEnabled||!t)return;let i=e.getBoundingClientRect(),a=(r.clientX-i.left)/i.width,o=1-(r.clientY-i.top)/i.height;if(n)if(F.mode===`fluid`){let e=tr(a,o);if(!e)ar();else{F.mouse.down=!0;let t=$n(a,o);F.mouse.worldX=t[0],F.mouse.worldY=t[1],F.mouse.worldZ=t[2],F.mouse.dx=(e[0]-F.mouse.x)*10,F.mouse.dy=(e[1]-F.mouse.y)*10,F.mouse.x=e[0],F.mouse.y=e[1]}}else{let e=er(a,o);F.mouse.down=!0,F.mouse.worldX=e[0],F.mouse.worldY=e[1],F.mouse.worldZ=e[2],F.mouse.dx=(a-F.mouse.x)*10,F.mouse.dy=(o-F.mouse.y)*10,F.mouse.x=a,F.mouse.y=o,F.mode===`physics`&&St(r.pointerId,e)}else F.camera.rotY+=r.movementX*.005,F.camera.rotX+=r.movementY*.005,F.camera.rotX=Math.max(-Math.PI*.45,Math.min(Math.PI*.45,F.camera.rotX)),F.mouse.down=!1});let r=e=>{F.xrEnabled||(t=!1,n=!1,F.mouse.down=!1,F.mouse.dx=0,F.mouse.dy=0,Ct(e.pointerId))};e.addEventListener(`pointerup`,r),e.addEventListener(`pointercancel`,r),e.addEventListener(`pointerleave`,r),e.addEventListener(`contextmenu`,e=>e.preventDefault()),e.addEventListener(`wheel`,e=>{F.xrEnabled||(F.camera.distance*=1+e.deltaY*.001,F.camera.distance=Math.max(.5,Math.min(200,F.camera.distance)),e.preventDefault())},{passive:!1})}var sr=matchMedia(`(max-width: 768px)`),cr=sr.matches;function lr(){let e=H,t=new Map,n=0,r=0,i=0;function a(e,t,n,r){if(F.mode===`fluid`){let e=tr(t,n);if(!e)ar();else{F.mouse.down=!0;let i=$n(t,n);F.mouse.worldX=i[0],F.mouse.worldY=i[1],F.mouse.worldZ=i[2],F.mouse.dx=r?(e[0]-F.mouse.x)*10:0,F.mouse.dy=r?(e[1]-F.mouse.y)*10:0,F.mouse.x=e[0],F.mouse.y=e[1]}}else{let i=er(t,n);F.mouse.down=!0,F.mouse.worldX=i[0],F.mouse.worldY=i[1],F.mouse.worldZ=i[2],F.mouse.dx=r?(t-F.mouse.x)*10:0,F.mouse.dy=r?(n-F.mouse.y)*10:0,F.mouse.x=t,F.mouse.y=n,F.mode===`physics`&&(r?St(e,i):xt(e,i))}}e.addEventListener(`pointerdown`,o=>{if(!F.xrEnabled){if(o.preventDefault(),t.set(o.pointerId,{x:o.clientX,y:o.clientY}),t.size===1){let t=e.getBoundingClientRect(),n=(o.clientX-t.left)/t.width,r=1-(o.clientY-t.top)/t.height;F.mouse.dx=0,F.mouse.dy=0,a(o.pointerId,n,r,!1)}if(t.size===2){ar(),t.forEach((e,t)=>Ct(t));let e=[...t.values()];r=(e[0].x+e[1].x)/2,i=(e[0].y+e[1].y)/2,n=Math.hypot(e[0].x-e[1].x,e[0].y-e[1].y)}}},{passive:!1}),e.addEventListener(`pointermove`,o=>{if(!F.xrEnabled&&t.has(o.pointerId)){if(o.preventDefault(),t.set(o.pointerId,{x:o.clientX,y:o.clientY}),t.size===1){let t=e.getBoundingClientRect(),n=(o.clientX-t.left)/t.width,r=1-(o.clientY-t.top)/t.height;a(o.pointerId,n,r,!0)}else if(t.size===2){let e=[...t.values()],a=(e[0].x+e[1].x)/2,o=(e[0].y+e[1].y)/2,s=Math.hypot(e[0].x-e[1].x,e[0].y-e[1].y);F.camera.rotY+=(a-r)*.005,F.camera.rotX+=(o-i)*.005,F.camera.rotX=Math.max(-Math.PI*.45,Math.min(Math.PI*.45,F.camera.rotX)),n>0&&(F.camera.distance*=n/s,F.camera.distance=Math.max(.5,Math.min(200,F.camera.distance))),r=a,i=o,n=s,F.mouse.down=!1}}},{passive:!1});let o=r=>{if(t.delete(r.pointerId),Ct(r.pointerId),t.size===0&&(F.mouse.down=!1,F.mouse.dx=0,F.mouse.dy=0,n=0),t.size===1){let[n,r]=[...t.entries()][0],i=e.getBoundingClientRect(),o=(r.x-i.left)/i.width,s=1-(r.y-i.top)/i.height;F.mouse.dx=0,F.mouse.dy=0,a(n,o,s,!1)}};e.addEventListener(`pointerup`,o),e.addEventListener(`pointercancel`,o),e.addEventListener(`contextmenu`,e=>e.preventDefault())}function ur(){document.getElementById(`fab-pause`).addEventListener(`click`,()=>{F.paused=!F.paused,F.paused&&Gn(),q()}),document.getElementById(`fab-reset`).addEventListener(`click`,()=>{Da()});let e=[`physics`,`boids`,`physics_classic`,`fluid`,`parametric`,`reaction`],t=t=>{let n=e[(e.indexOf(F.mode)+t+e.length)%e.length];Pn(n)};document.getElementById(`mode-prev`).addEventListener(`click`,()=>t(-1)),document.getElementById(`mode-next`).addEventListener(`click`,()=>t(1)),document.getElementById(`mode-stepper-label`).textContent=Nn[F.mode]}function dr(){let e=document.getElementById(`controls`),t=0,n=0,r=!1;e.addEventListener(`touchstart`,i=>{t=i.touches[0].clientY,n=e.scrollTop,r=!e.classList.contains(`mobile-expanded`)||n<=0},{passive:!0}),e.addEventListener(`touchmove`,i=>{if(!r)return;let a=i.touches[0].clientY-t,o=e.classList.contains(`mobile-expanded`);!o&&a<0&&i.preventDefault(),o&&n<=0&&a>0&&i.preventDefault()},{passive:!1}),e.addEventListener(`touchend`,i=>{if(!r)return;r=!1;let a=i.changedTouches[0].clientY-t,o=e.classList.contains(`mobile-expanded`);if(!o&&a<-30)e.classList.add(`mobile-expanded`);else if(o&&n<=0&&a>30)e.classList.remove(`mobile-expanded`);else if(Math.abs(a)<10){let t=e.querySelector(`.mobile-drag-handle`).getBoundingClientRect();i.changedTouches[0].clientY>=t.top&&i.changedTouches[0].clientY<=t.bottom&&e.classList.toggle(`mobile-expanded`)}}),H.addEventListener(`pointerdown`,()=>{e.classList.remove(`mobile-expanded`)},{capture:!0})}function fr(){localStorage.getItem(Pa)||(F.boids.count=500,F.physics.count=2e3,F.physics_classic.count=200,F.reaction.resolution=64)}var pr={boids:`boids/flocking`,physics:`N-body gravitational`,physics_classic:`classic N-body (vintage shader)`,fluid:`fluid dynamics`,parametric:`parametric shape`,reaction:`Gray-Scott reaction-diffusion (3D)`};function mr(){let e=F.mode,t=P(e),n=M[e],r=[];for(let[i,a]of Object.entries(t))a!==n[i]&&r.push(hr(e,i,a));let i=`WebGPU ${pr[e]} simulation`;F.colorTheme!==`Dracula`&&(i+=` (${F.colorTheme} theme)`),r.length>0&&(i+=` with ${r.filter(Boolean).join(`, `)}`),i+=`.`,document.getElementById(`prompt-text`).textContent=i}function hr(e,t,n){let r=Number(n),i={count:()=>`${n} particles`,separationRadius:()=>r<15?`tight separation (${n})`:r>50?`wide separation (${n})`:`separation radius ${n}`,alignmentRadius:()=>`alignment range ${n}`,cohesionRadius:()=>r>80?`strong cohesion (${n})`:`cohesion range ${n}`,maxSpeed:()=>r>4?`high speed (${n})`:r<1?`slow movement (${n})`:`speed ${n}`,maxForce:()=>r>.1?`strong steering (${n})`:`steering force ${n}`,visualRange:()=>`visual range ${n}`,G:()=>r>5?`strong gravity (G=${n})`:r<.5?`weak gravity (G=${n})`:`G=${n}`,softening:()=>`softening ${n}`,damping:()=>r<.995?`high damping (${n})`:`damping ${n}`,haloMass:()=>r>8?`heavy halo (${n})`:r<2?`light halo (${n})`:`halo mass ${n}`,haloScale:()=>`halo scale ${n}`,diskMass:()=>r<.1?`no disk potential`:`disk mass ${n}`,diskScaleA:()=>`disk scale A ${n}`,diskScaleB:()=>`disk scale B ${n}`,gasMassFraction:()=>r<.01?`no gas reservoir`:`gas mass fraction ${n}`,gasSoundSpeed:()=>`gas sound speed ${n}`,gasVisible:()=>n?null:`gas hidden`,distribution:()=>`${n} distribution`,resolution:()=>`${n}x${n} grid`,viscosity:()=>r>.5?`thick fluid (viscosity ${n})`:r<.05?`thin fluid (viscosity ${n})`:`viscosity ${n}`,diffusionRate:()=>`diffusion ${n}`,forceStrength:()=>r>200?`strong forces (${n})`:`force strength ${n}`,volumeScale:()=>r>2?`large volume (${n})`:r<1?`compact volume (${n})`:`volume scale ${n}`,dyeMode:()=>`${n} dye`,jacobiIterations:()=>`${n} solver iterations`,shape:()=>`${n} shape`,scale:()=>r===1?null:`scale ${n}`,p1Min:()=>null,p1Max:()=>null,p1Rate:()=>null,p2Min:()=>null,p2Max:()=>null,p2Rate:()=>null,p3Min:()=>null,p3Max:()=>null,p3Rate:()=>null,p4Min:()=>null,p4Max:()=>null,p4Rate:()=>null,twistMin:()=>null,twistMax:()=>null,twistRate:()=>null}[t];return i?i():`${t}: ${n}`}function gr(){mr(),Oa(),Tr(),Fa()}function _r(e){return{boids:{"Compute (Flocking)":`struct Particle {
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
`},physics:{"Compute (Gravity)":`// [LAW:one-source-of-truth] DKD leapfrog integrator with ALL conservative forces.
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
`,...xe},physics_classic:{"Compute (Classic)":`// Classic n-body compute — preserved verbatim from the original shader-playground for A/B comparison.
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
`,"Render (Classic)":`// Classic n-body render — preserved verbatim for A/B comparison. World-space billboards, soft fuzzy falloff.
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

  // HDR boost: rim and emission carry more punch since bloom captures their spillover.
  let composed = shadedColor + rimGlow * 2.5 + emission * 3.0;
  return vec4f(composed * 3.2, 1.0);
}
`},reaction:{"Compute (Gray-Scott)":`// Gray-Scott reaction-diffusion on a 3D volume.
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
`,"Render (Raymarch)":`// Raymarched volume render of the Gray-Scott v-field.
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
`}}[e]||{}}var vr=!1,Y=null,yr={},br={};function xr(){let e=document.getElementById(`shader-toggle`),t=document.getElementById(`shader-panel`);e.addEventListener(`click`,()=>{vr=!vr,t.classList.toggle(`open`,vr),e.classList.toggle(`active`,vr),vr&&Sr()}),document.getElementById(`shader-compile`).addEventListener(`click`,Er),document.getElementById(`shader-reset`).addEventListener(`click`,Dr),document.getElementById(`shader-editor`).addEventListener(`keydown`,e=>{if(e.key===`Tab`){e.preventDefault();let t=e.target,n=t.selectionStart;t.value=t.value.substring(0,n)+`  `+t.value.substring(t.selectionEnd),t.selectionStart=t.selectionEnd=n+2}})}function Sr(){let e=_r(F.mode);br={...e},(!yr._mode||yr._mode!==F.mode)&&(yr={...e,_mode:F.mode});let t=document.getElementById(`shader-tabs`);t.innerHTML=``;let n=Object.keys(e);Y=Y&&n.includes(Y)?Y:n[0];for(let e of n){let n=document.createElement(`button`);n.className=`shader-tab`+(e===Y?` active`:``),n.textContent=e,n.addEventListener(`click`,()=>{Cr(),Y=e,t.querySelectorAll(`.shader-tab`).forEach(t=>t.classList.toggle(`active`,t.textContent===e)),wr()}),t.appendChild(n)}wr()}function Cr(){Y&&(yr[Y]=document.getElementById(`shader-editor`).value)}function wr(){let e=document.getElementById(`shader-editor`);e.value=yr[Y]||``,document.getElementById(`shader-status`).textContent=``,document.getElementById(`shader-status`).className=`shader-success`}function Tr(){vr&&yr._mode!==F.mode&&Sr()}function Er(){Cr();let e=yr[Y],t=document.getElementById(`shader-status`);try{V.createShaderModule({code:e}).getCompilationInfo().then(n=>{let r=n.messages.filter(e=>e.type===`error`);r.length>0?(t.className=`shader-error`,t.textContent=r.map(e=>`Line ${e.lineNum}: ${e.message}`).join(`; `),t.title=r.map(e=>`Line ${e.lineNum}: ${e.message}`).join(`
`)):(t.className=`shader-success`,t.textContent=`Compiled OK — reset simulation to apply`,t.title=``,Or(F.mode,Y,e))})}catch(e){t.className=`shader-error`,t.textContent=e.message,t.title=e.message}}function Dr(){Y&&br[Y]&&(yr[Y]=br[Y],wr(),Or(F.mode,Y,br[Y]),document.getElementById(`shader-status`).className=`shader-success`,document.getElementById(`shader-status`).textContent=`Shader reset to original`)}function Or(e,t,n){let r={boids:{"Compute (Flocking)":()=>{kr=n},"Render (Vert+Frag)":()=>{Ar=n}},physics:{"Compute (Gravity)":()=>{jr=n},"Render (Vert+Frag)":()=>{Mr=n}},physics_classic:{"Compute (Classic)":()=>{Nr=n},"Render (Classic)":()=>{Pr=n}},fluid:{"Forces + Advect":()=>{Fr=n},Diffuse:()=>{Ir=n},Divergence:()=>{Lr=n},"Pressure Solve":()=>{Rr=n},"Gradient Sub":()=>{zr=n},Render:()=>{Br=n}},parametric:{"Compute (Mesh Gen)":()=>{Vr=n},"Render (Phong)":()=>{Hr=n}},reaction:{"Compute (Gray-Scott)":()=>{Ur=n},"Render (Raymarch)":()=>{Wr=n}}}[e]?.[t];r&&r()}var kr=null,Ar=null,jr=null,Mr=null,Nr=null,Pr=null,Fr=null,Ir=null,Lr=null,Rr=null,zr=null,Br=null,Vr=null,Hr=null,Ur=null,Wr=null,Gr=new Map,X={phase:`idle`,phaseDeadline:0,bounded:!1,samples:[],startedAt:0,unsubs:[],preDelayTimer:null,stopTimer:null,resolve:null},Kr={channel(e){let t=Gr.get(e);if(t)return t;let n={name:e,subscribers:new Set};return Gr.set(e,n),n},subscribe(e,t){return e.subscribers.add(t),()=>{e.subscribers.delete(t)}},emit(e,t){for(let n of e.subscribers)n(t)},record(e){if(X.phase!==`idle`)return Promise.reject(Error(`metrics.record: recording already in progress`));let t=e.preDelayMs??0;return X.samples=[],X.bounded=e.durationMs!==void 0,new Promise(n=>{X.resolve=n;let r=()=>{let t=e.channels??Array.from(Gr.values());X.startedAt=performance.now(),X.phase=`recording`,X.phaseDeadline=e.durationMs===void 0?0:X.startedAt+e.durationMs,X.preDelayTimer=null;for(let e of t){let t=e.name;X.unsubs.push(Kr.subscribe(e,e=>{X.samples.push({t:performance.now()-X.startedAt,channel:t,payload:e})}))}e.durationMs!==void 0&&(X.stopTimer=setTimeout(()=>Kr.stop(),e.durationMs))};t>0?(X.phase=`pre-delay`,X.phaseDeadline=performance.now()+t,X.preDelayTimer=setTimeout(r,t)):r()})},stop(){if(X.phase===`idle`)return;X.preDelayTimer&&=(clearTimeout(X.preDelayTimer),null),X.stopTimer&&=(clearTimeout(X.stopTimer),null);for(let e of X.unsubs)e();X.unsubs=[];let e=X.samples;X.samples=[],X.phase=`idle`,X.phaseDeadline=0,X.bounded=!1;let t=X.resolve;X.resolve=null,t&&t(e)},status(){return X.phase===`idle`?{phase:`idle`,remainingMs:0,bounded:!1}:{phase:X.phase,remainingMs:X.phaseDeadline===0?0:Math.max(0,X.phaseDeadline-performance.now()),bounded:X.bounded}}},Z=null,qr=null,Jr=null,Yr=null,Xr=null,Zr=!1,Qr=[`wrist`,`thumb-metacarpal`,`thumb-phalanx-proximal`,`thumb-phalanx-distal`,`thumb-tip`,`index-finger-metacarpal`,`index-finger-phalanx-proximal`,`index-finger-phalanx-intermediate`,`index-finger-phalanx-distal`,`index-finger-tip`,`middle-finger-metacarpal`,`middle-finger-phalanx-proximal`,`middle-finger-phalanx-intermediate`,`middle-finger-phalanx-distal`,`middle-finger-tip`,`ring-finger-metacarpal`,`ring-finger-phalanx-proximal`,`ring-finger-phalanx-intermediate`,`ring-finger-phalanx-distal`,`ring-finger-tip`,`pinky-finger-metacarpal`,`pinky-finger-phalanx-proximal`,`pinky-finger-phalanx-intermediate`,`pinky-finger-phalanx-distal`,`pinky-finger-tip`];function $r(e){return{hand:e,tracked:!1,source:null,pinch:{active:!1,startTime:0,origin:[0,0,0],current:[0,0,0]},gazeRay:null,currentRay:null,ray:null,palmNormal:null,joints:null,grip:null}}var Q={left:$r(`left`),right:$r(`right`)},ei={left:{kind:`idle`},right:{kind:`idle`}},ti=[],ni={gainMultiplier:1},ri=`left`,ii={bindings:e,layouts:new Map,activeLayoutId:null},ai=S(),oi=[],si={left:!1,right:!1},ci=null,li=null,ui={x:0,y:0,z:-5},di=0,fi={startDistance:0,startOffset:{x:0,y:0,z:0}},pi={left:!1,right:!1};function mi(){return{fineModifier:!1,palmUp:!1,wristOrient:null,wristTime:0,flickArmed:!1,lastFlickAt:0}}var hi={left:mi(),right:mi()},gi=.7,_i=.4,vi=4,yi=300,bi=Kr.channel(`xr.gesture`),xi=Kr.channel(`xr.state`),Si=Kr.channel(`xr.snap`),Ci={unsubs:[],lastSnapMs:{left:0,right:0}},wi=200;function Ti(e){for(let e of Ci.unsubs)e();Ci.unsubs.length=0,Ci.lastSnapMs.left=0,Ci.lastSnapMs.right=0,e&&(Ci.unsubs.push(Kr.subscribe(bi,e=>{if(e.gesture.kind===`pinch-hold`)return;let t=e.hand?`(${e.hand})`:``;console.log(`[xr] gesture:${e.gesture.kind}${t}`,e.gesture)})),Ci.unsubs.push(Kr.subscribe(xi,e=>{console.log(`[xr] state:${e.hand} ${e.from}→${e.to}`)})),Ci.unsubs.push(Kr.subscribe(Si,e=>{let t=performance.now();if(t-Ci.lastSnapMs[e.hand]<wi)return;Ci.lastSnapMs[e.hand]=t;let n=e.palmDot===null?`—`:e.palmDot.toFixed(2);console.log(`[xr] snap:${e.hand} tracked=${e.handTracked} pinch=${e.pinching} palm=${n} palmUp=${e.palmUp} fine=${e.fineModifier} flick=${e.flickSpeed.toFixed(2)}`)})))}function Ei(e,t){let n=ei[e];ei[e]=t,xi.subscribers.size>0&&n.kind!==t.kind&&Kr.emit(xi,{hand:e,from:n.kind,to:t.kind})}var Di={left:-1,right:-2},Oi=150;function ki(e){let t=e.matrix;return R([-t[8],-t[9],-t[10]])}function Ai(e,t){if(!qr)return null;let n=e.getPose(t.targetRaySpace,qr);if(!n)return null;let r=n.transform.position;return{origin:[r.x,r.y,r.z],dir:ki(n.transform)}}function ji(e,t){if(!qr)return null;let n=e.getPose(t.gripSpace||t.targetRaySpace,qr);if(!n)return null;let r=n.transform.position;return[r.x,r.y,r.z]}function Mi(e){let t=!Q.left.source,n=!Q.right.source;return e.handedness===`left`&&t?`left`:e.handedness===`right`&&n?`right`:t?`left`:n?`right`:null}function Ni(e){return Q.left.source===e?`left`:Q.right.source===e?`right`:null}var Pi=.03,Fi=Pi*Pi;function Ii(e){return[-e[0],-e[1],-e[2],e[3]]}function Li(e,t){return[e[3]*t[0]+e[0]*t[3]+e[1]*t[2]-e[2]*t[1],e[3]*t[1]-e[0]*t[2]+e[1]*t[3]+e[2]*t[0],e[3]*t[2]+e[0]*t[1]-e[1]*t[0]+e[2]*t[3],e[3]*t[3]-e[0]*t[0]-e[1]*t[1]-e[2]*t[2]]}function Ri(e,t,n){let r={};for(let i of Qr){let a=t.get(i),o=a?e.getJointPose(a,n):null;if(!o){r[i]=null;continue}let s=o.transform.position,c=o.transform.orientation;r[i]={position:[s.x,s.y,s.z],orientation:[c.x,c.y,c.z,c.w],radius:o.radius}}return r}function zi(e,t){let n=e.wrist,r=e[`index-finger-metacarpal`],i=e[`pinky-finger-metacarpal`];if(!n||!r||!i)return null;let a=It(r.position,n.position),o=It(i.position,n.position),s=t===`right`?z(o,a):z(a,o);return s[0]*s[0]+s[1]*s[1]+s[2]*s[2]<1e-12?null:R(s)}function Bi(e){let t=e[`thumb-tip`];if(!t)return null;let n=e=>{if(!e)return null;let n=It(t.position,e.position);return Lt(n,n)<Fi};return{thumbIndex:n(e[`index-finger-tip`]),thumbMiddle:n(e[`middle-finger-tip`]),thumbRing:n(e[`ring-finger-tip`]),thumbPinky:n(e[`pinky-finger-tip`])}}function Vi(){if(!Jr)return;let e=globalThis.XRRigidTransform;qr=Jr.getOffsetReferenceSpace(new e({x:ui.x,y:ui.y+di,z:ui.z}))}function Hi(e){for(let t=ti.length-1;t>=0;t--){let n=ti[t],r=Ai(e,n);if(!r)continue;ti.splice(t,1);let i=Mi(n);if(!i)continue;let a=ji(e,n)??r.origin,o=Q[i];o.tracked=!0,o.source=n,o.pinch.active=!0,o.pinch.startTime=performance.now(),o.pinch.origin=a,o.pinch.current=a,o.gazeRay={origin:[...r.origin],dir:[...r.dir]},o.currentRay=r}for(let t of[`left`,`right`]){let n=Q[t];if(!n.pinch.active||!n.source)continue;let r=Ai(e,n.source);r&&(n.currentRay=r);let i=ji(e,n.source);i&&(n.pinch.current=i)}for(let e of[`left`,`right`]){let t=Q[e];t.joints=null,t.palmNormal=null,t.grip=null,t.ray=null}if(qr)for(let t of e.session.inputSources){if(t.handedness===`none`||!t.hand)continue;let n=t.handedness,r=Q[n],i=Ri(e,t.hand,qr);r.joints=i,r.palmNormal=zi(i,n),r.grip=Bi(i),r.ray=Ui(i)}}function Ui(e){let t=e.wrist,n=e[`index-finger-metacarpal`];if(!t||!n)return null;let r=R(It(n.position,t.position));return r[0]===0&&r[1]===0&&r[2]===0?null:{origin:[...n.position],dir:r}}function Wi(){let e=[],t=Q.left.pinch.active,n=Q.right.pinch.active,r=t&&n,i=pi.left&&pi.right,a=performance.now();for(let t of[`left`,`right`]){let n=Q[t],r=pi[t],i=n.pinch.active;i&&!r&&n.gazeRay?e.push({kind:`pinch-start`,hand:t,gazeRay:n.gazeRay}):i&&r?e.push({kind:`pinch-hold`,hand:t,dur:a-n.pinch.startTime}):!i&&r&&e.push({kind:`pinch-end`,hand:t,dur:a-n.pinch.startTime});let o=hi[t];if(n.grip){let r=n.grip.thumbRing===!0;r&&!o.fineModifier?e.push({kind:`fine-modifier-on`,hand:t}):!r&&o.fineModifier&&e.push({kind:`fine-modifier-off`,hand:t}),o.fineModifier=r}if(n.palmNormal){let r=n.palmNormal[1],i=o.palmUp?r>_i:r>gi;i&&!o.palmUp?e.push({kind:`palm-up`,hand:t}):!i&&o.palmUp&&e.push({kind:`palm-down`,hand:t}),o.palmUp=i}let s=n.joints?.wrist?.orientation??null,c=0;if(s&&o.wristOrient&&!n.pinch.active){let n=Math.max(.001,(a-o.wristTime)/1e3),r=Li(s,Ii(o.wristOrient)),i=Math.min(1,Math.abs(r[3])),l=2*Math.acos(i),u=Math.sqrt(Math.max(0,1-i*i)),d=r[3]<0?-1:1,f=u>1e-6?r[0]*d/u:0,p=u>1e-6?r[1]*d/u:0,m=u>1e-6?r[2]*d/u:0;c=l/n;let h=c>vi;if(h&&o.flickArmed&&a-o.lastFlickAt>yi){let n=Math.abs(f),r=Math.abs(p),i=Math.abs(m),s=n>=r&&n>=i?`pitch`:r>=i?`yaw`:`roll`,c=(s===`pitch`?f:s===`yaw`?p:m)>=0?1:-1;e.push({kind:`wrist-flick`,hand:t,axis:s,sign:c}),o.lastFlickAt=a}o.flickArmed=h}else o.flickArmed=!1;o.wristOrient=s?[...s]:null,o.wristTime=a,Si.subscribers.size>0&&Kr.emit(Si,{hand:t,handTracked:n.joints!==null,pinching:n.pinch.active,palmDot:n.palmNormal?n.palmNormal[1]:null,palmUp:o.palmUp,fineModifier:o.fineModifier,flickSpeed:c,grip:n.grip})}if(r&&!i?e.push({kind:`two-hand-pinch-start`}):!r&&i&&e.push({kind:`two-hand-pinch-end`}),pi.left=t,pi.right=n,bi.subscribers.size>0)for(let t of e)Kr.emit(bi,{hand:`hand`in t?t.hand:null,gesture:t});return e}function Gi(e,t){for(let t of e)switch(t.kind){case`pinch-start`:Ei(t.hand,{kind:`pending`,deadline:performance.now()+Oi});break;case`two-hand-pinch-start`:if(ei.left.kind===`pending`&&ei.right.kind===`pending`){let e=It(Q.left.pinch.current,Q.right.pinch.current);fi.startDistance=Math.max(.01,Math.sqrt(Lt(e,e))),fi.startOffset={...ui},Ei(`left`,{kind:`two-hand-scale`}),Ei(`right`,{kind:`two-hand-scale`})}break;case`two-hand-pinch-end`:ei.left.kind===`two-hand-scale`&&Ei(`left`,{kind:`idle`}),ei.right.kind===`two-hand-scale`&&Ei(`right`,{kind:`idle`});break;case`pinch-end`:Ki(t.hand);break;case`pinch-hold`:break;case`fine-modifier-on`:ni.gainMultiplier=.1;break;case`fine-modifier-off`:ni.gainMultiplier=1;break;case`palm-up`:case`palm-down`:case`wrist-flick`:break}let n=performance.now();for(let e of[`left`,`right`]){let t=ei[e];t.kind===`pending`&&n>=t.deadline&&(si[e]?Ei(e,{kind:`idle`}):Ei(e,{kind:`dragging`,handOrigin:[...Q[e].pinch.origin],hasSample:!1}))}}function Ki(e){switch(ei[e].kind){case`dragging`:ar(),Ct(Di[e]);break;case`pending`:case`two-hand-scale`:case`idle`:break}Ei(e,{kind:`idle`});let t=Q[e];t.pinch.active||(t.source=null,t.gazeRay=null,t.currentRay=null)}function qi(e){if(ei.left.kind===`two-hand-scale`&&ei.right.kind===`two-hand-scale`){let e=It(Q.left.pinch.current,Q.right.pinch.current),t=Math.sqrt(Lt(e,e));if(fi.startDistance>=.01){let e=t/fi.startDistance;ui.z=Math.max(-200,Math.min(-1,fi.startOffset.z/e)),Vi()}return}let t=!1;for(let e of[`left`,`right`]){let n=ei[e],r=Q[e];if(n.kind!==`dragging`||!r.source)continue;let i=r.currentRay;if(!i)continue;t=!0;let a=F.mode===`fluid`?rr(i.origin,i.dir,0):ir(i.origin,i.dir);if(!a){ar(),n.hasSample=!1;continue}if(F.mouse.down=!0,F.mouse.worldX=a[0],F.mouse.worldY=a[1],F.mouse.worldZ=a[2],F.mode===`fluid`){let e=nr(a);if(!e){ar(),n.hasSample=!1;continue}F.mouse.dx=n.hasSample?(e[0]-F.mouse.x)*10:0,F.mouse.dy=n.hasSample?(e[1]-F.mouse.y)*10:0,F.mouse.x=e[0],F.mouse.y=e[1]}else F.mouse.dx=0,F.mouse.dy=0,F.mouse.x=a[0],F.mouse.y=a[1];if(F.mode===`physics`){let t=Di[e];F.pointerToAttractor.has(t)?St(t,a):xt(t,a)}n.hasSample=!0}t||F.xrEnabled&&F.mouse.down&&ar()}function Ji(e){if(!qr)return null;let t=e.getViewerPose(qr);if(!t)return null;let n=t.transform;return{position:[n.position.x,n.position.y,n.position.z],orientation:[n.orientation.x,n.orientation.y,n.orientation.z,n.orientation.w]}}function Yi(e){Hi(e);let t=Ji(e),n=w(ii,Q,ai,{hands:Q,headPose:t},ni,16);ne(n.sideEffects,ii),ai=n.next,oi=n.renderList,si.left=T(n.next.states.left),si.right=T(n.next.states.right),Gi(Wi(),e),qi(e)}function Xi(e){let t=Ni(e);if(t){let e=Q[t];e.pinch.active=!1,e.tracked=!1}let n=ti.indexOf(e);n>=0&&ti.splice(n,1)}function Zi(){ti.length=0,Q.left=$r(`left`),Q.right=$r(`right`),Ei(`left`,{kind:`idle`}),Ei(`right`,{kind:`idle`}),pi.left=!1,pi.right=!1,hi.left=mi(),hi.right=mi(),ni.gainMultiplier=1,ai=S(),oi=[],si.left=!1,si.right=!1,ar(),Ct(Di.left),Ct(Di.right)}function Qi(){let e=document.getElementById(`btn-xr`);if(!navigator.xr){e.textContent=`VR Not Available`;return}navigator.xr.isSessionSupported(`immersive-vr`).then(t=>{t?(e.disabled=!1,e.addEventListener(`click`,$i)):e.textContent=`VR Not Supported`}).catch(()=>{e.textContent=`VR Check Failed`})}async function $i(){if(Z){A(`xr`,`exiting session (user clicked Exit VR)`),k=`xr:session.end`,Z.end();return}let e=document.getElementById(`btn-xr`);e.textContent=`Starting...`,A(`xr`,`toggleXR start`,{hasWebXR:!!navigator.xr,userAgent:navigator.userAgent});try{k=`xr:requestSession`,Z=await navigator.xr.requestSession(`immersive-vr`,{requiredFeatures:[`webgpu`],optionalFeatures:[`layers`,`local-floor`,`hand-tracking`]});let t=Z.enabledFeatures;Zr=!!t&&t.includes(`hand-tracking`),A(`xr`,`session acquired`,{environmentBlendMode:Z.environmentBlendMode,interactionMode:Z.interactionMode,visibilityState:Z.visibilityState,handTracking:Zr,enabledFeatures:t});let n=!1;try{k=`xr:requestReferenceSpace(local-floor)`,qr=await Z.requestReferenceSpace(`local-floor`),n=!0,A(`xr`,`reference space = local-floor`)}catch(e){A(`xr`,`local-floor unavailable, falling back to local`,e.message),k=`xr:requestReferenceSpace(local)`,qr=await Z.requestReferenceSpace(`local`)}Jr=qr,di=n?1.6:0,ui.x=0,ui.y=0,ui.z=-5,Vi(),k=`xr:new XRGPUBinding`,Yr=new XRGPUBinding(Z,V);let r=Yr.getPreferredColorFormat(),i=Yr.nativeProjectionScaleFactor;A(`xr`,`binding ready`,{preferredFormat:r,nativeProjectionScaleFactor:i}),nn(r,1);let a=[{colorFormat:r,depthStencilFormat:`depth24plus`,scaleFactor:i,textureType:`texture-array`},{colorFormat:r,depthStencilFormat:`depth24plus`,textureType:`texture-array`},{colorFormat:r,scaleFactor:i,textureType:`texture-array`},{colorFormat:r,textureType:`texture-array`},{colorFormat:r,scaleFactor:i},{colorFormat:r}];k=`xr:createProjectionLayer`;let o=null,s=[];for(let e of a)try{Xr=Yr.createProjectionLayer(e),o=e;break}catch(t){let n=t.message;s.push({config:e,error:n}),A(`xr`,`projection layer config rejected`,{config:e,error:n}),Xr=null}if(!Xr)throw Error(`All projection layer configurations failed. Attempts: ${JSON.stringify(s)}`);A(`xr`,`projection layer created`,{config:o,textureWidth:Xr.textureWidth,textureHeight:Xr.textureHeight,textureArrayLength:Xr.textureArrayLength,ignoreDepthValues:Xr.ignoreDepthValues});try{Xr.fixedFoveation=0,A(`xr`,`fixedFoveation set to 0`)}catch(e){A(`xr`,`fixedFoveation unsupported on this platform`,e.message)}k=`xr:updateRenderState`;try{Z.updateRenderState({layers:[Xr]}),A(`xr`,`render state updated with projection layer`)}catch(e){throw Ke(`xr:updateRenderState`,e),e}Z.addEventListener(`selectstart`,e=>{ti.push(e.inputSource)}),Z.addEventListener(`selectend`,e=>{Xi(e.inputSource)}),e.textContent=`Exit VR`,F.xrEnabled=!0,k=`xr:awaiting first frame`;let c=[0,0,0,1],l={x:.16,y:.06},u={x:.02,y:.02};ii.layouts.set(`debug`,{id:`debug-panel`,kind:`panel`,anchor:{kind:`head-hud`,distance:.7,offset:{position:[0,-.15,0],orientation:c}},size:{x:1.1,y:.5},children:[{id:`debug-row-1`,kind:`group`,layout:`row`,children:[{id:`debug-s1`,kind:`slider`,binding:`physics.G`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:l,hitPadding:u},{id:`debug-b1`,kind:`button`,binding:`preset.physics.Default`,style:`primary`,visualSize:l,hitPadding:u},{id:`debug-r1`,kind:`readout`,binding:`physics.G`,visualSize:l,hitPadding:u},{id:`debug-d1`,kind:`dial`,binding:`physics.softening`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:l,hitPadding:u}]},{id:`debug-row-2`,kind:`group`,layout:`row`,children:[{id:`debug-tg1`,kind:`toggle`,binding:`app.paused`,style:`switch`,visualSize:l,hitPadding:u},{id:`debug-st1`,kind:`stepper`,binding:`physics.count`,step:1e3,visualSize:l,hitPadding:u},{id:`debug-en1`,kind:`enum-chips`,binding:`physics.distribution`,visualSize:l,hitPadding:u},{id:`debug-pt1`,kind:`preset-tile`,binding:`preset.physics.Spiral Galaxy`,visualSize:l,hitPadding:u},{id:`debug-ct1`,kind:`category-tile`,targetTabId:`physics`,summary:{},visualSize:l,hitPadding:u}]}]});let f={kind:`held`,hand:ri,offset:{position:[0,.15,-.1],orientation:[Math.sin(Math.PI*.33),0,0,Math.cos(Math.PI*.33)]}},p={x:.17,y:.03};ii.layouts.set(`clipboard`,{id:`clipboard-panel`,kind:`panel`,anchor:f,size:{x:.2,y:.28},children:[{id:`clipboard-col`,kind:`group`,layout:`column`,gap:.015,children:[{id:`clipboard-title`,kind:`readout`,binding:`physics.G`,visualSize:{x:.18,y:.025},hitPadding:{x:0,y:0}},{id:`clipboard-G`,kind:`slider`,binding:`physics.G`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:p,hitPadding:d.defaultHitPadding},{id:`clipboard-soft`,kind:`slider`,binding:`physics.softening`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:p,hitPadding:d.defaultHitPadding},{id:`clipboard-int`,kind:`slider`,binding:`physics.interactionStrength`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:p,hitPadding:d.defaultHitPadding}]}]}),ii.activeLayoutId=`clipboard`,Z.addEventListener(`visibilitychange`,()=>{A(`xr`,`visibilitychange`,{visibilityState:Z?.visibilityState})}),Z.requestAnimationFrame(ta),A(`xr`,`first frame requested; waiting for xrFrame callback`),Z.addEventListener(`end`,()=>{A(`xr`,`session ended`,{finalPhase:k,framesRendered:$}),Z=null,qr=null,Jr=null,Yr=null,Xr=null,Zr=!1,F.xrEnabled=!1,$=0,k=`desktop`,nn(Qt,1),Zi(),e.textContent=`Enter VR`,requestAnimationFrame(Na)})}catch(t){if(Ke(`xr:toggle`,t,`session failed to start (phase=${k})`),e.textContent=`XR Error: ${t.message}`,Z)try{Z.end()}catch(e){Ke(`xr:cleanup-end`,e)}Z=null,k=`desktop`,setTimeout(()=>{e.textContent=`Enter VR`},4e3)}}var $=0,ea=3;function ta(e,t){if(!Z)return;Z.requestAnimationFrame(ta),ot(e);let n=$<ea;n&&A(`xr:frame`,`xrFrame #${$} entered`,{mode:F.mode}),bt(ht());let r=aa>=0?e-aa:16.7;aa=e,kt(Math.min(.05,r*.001)*F.fx.timeScale*gt()),na++,e-ra>=1e3&&(ia=na,na=0,ra=e),k=`xr:frame:${$}:pre-encode`,V.pushErrorScope(`validation`);try{let e=t.getViewerPose(qr);if(!e){n&&A(`xr:frame`,`no viewer pose yet`);return}let r=U[F.mode];if(!r){Ke(`xr:frame`,Error(`simulation for mode=${F.mode} is not initialized`));return}Yi(t),k=`xr:frame:${$}:createCommandEncoder`;let i=V.createCommandEncoder({label:`xr-frame-${$}`});F.paused||(k=`xr:frame:${$}:sim.compute(${F.mode})`,r.compute(i)),n&&A(`xr:frame`,`pose has ${e.views.length} views`);for(let t=0;t<e.views.length;t++){let a=e.views[t];k=`xr:frame:${$}:getViewSubImage(eye=${t})`;let o=Yr,s=o.getViewSubImage?o.getViewSubImage(Xr,a):o.getSubImage(Xr,a);if(!s){Ke(`xr:frame`,Error(`subImage null for eye ${t}`));continue}n&&t===0&&A(`xr:frame`,`subImage`,{viewport:s.viewport,colorFormat:s.colorTexture.format,hasDepth:!!s.depthStencilTexture}),k=`xr:frame:${$}:createView(color,eye=${t})`;let c=s.getViewDescriptor?s.getViewDescriptor():{},l=s.colorTexture.createView(c);k=`xr:frame:${$}:createView(depth,eye=${t})`;let u=(Xr.textureArrayLength??1)>1,d=s.depthStencilTexture;Bt=d&&u?d.createView(c):null;let f=a.transform.position;zt={viewMatrix:new Float32Array(a.transform.inverse.matrix),projMatrix:new Float32Array(a.projectionMatrix),eye:[f.x,f.y,f.z]};let{x:p,y:m,width:h,height:g}=s.viewport;k=`xr:frame:${$}:ensureHdrTargets(${h}x${g})`,Gt(h,g),B.needsClear=!0;let _=B.sceneIdx;k=`xr:frame:${$}:sim.render(${F.mode},eye=${t})`;let v=B.scene[_].createView();r.render(i,v,null,t),ci||=(li=V.createBuffer({label:`xr-widgets-camera`,size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),_e(V,li,()=>Xt(h/g))),k=`xr:frame:${$}:xr-widgets(eye=${t})`,ci.draw(i,v,B.scene[_].format,t,oi),k=`xr:frame:${$}:bloom(eye=${t})`,ja(i),k=`xr:frame:${$}:composite(eye=${t})`;let y=s.colorTexture.format;Ma(i,l,y,[p,m,h,g])}k=`xr:frame:${$}:submit`,V.queue.submit([i.finish()]),n&&A(`xr:frame`,`frame #${$} submitted OK`)}catch(e){Ke(`xr:frame`,e,`frame #${$} threw synchronously`)}finally{zt=null,Bt=null,V.popErrorScope().then(e=>{e&&Ke(`xr:frame:validation`,e,`frame #${$}`)}).catch(e=>Ke(`xr:frame:popScope`,e)),$++}}var na=0,ra=0,ia=0,aa=-1,oa=0,sa=[`pmDepositConvert`,`outerVCycle`,`boundarySample`,`innerVCycle`,`starInterpolate`,`gasInterpolatePressure`,`starGasIntegrate`,`starsRender`,`gasRender`,`bloomComposite`],ca=Object.fromEntries(sa.map((e,t)=>[e,t]));function la(){return Object.fromEntries(sa.map(e=>[e,0]))}var ua=la(),da=new Set,fa=!1,pa=!1,ma=0,ha=2e3,ga=sa.length*2,_a=null;function va(){V.features.has(`timestamp-query`)&&(_a={querySet:V.createQuerySet({type:`timestamp`,count:ga}),resolveBuf:V.createBuffer({size:ga*8,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),stagingBuf:V.createBuffer({size:ga*8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),pending:!1})}function ya(){da=new Set,fa=!0}function ba(e){if(!_a||!fa)return;da.add(e);let t=ca[e];return{querySet:_a.querySet,beginningOfPassWriteIndex:t*2,endOfPassWriteIndex:t*2+1}}function xa(e){if(!(!_a||!fa))return da.add(e),{querySet:_a.querySet,beginningOfPassWriteIndex:ca[e]*2}}function Sa(e){if(!(!_a||!fa))return da.add(e),{querySet:_a.querySet,endOfPassWriteIndex:ca[e]*2+1}}function Ca(e,t){if(fa=!1,!_a||_a.pending||t-ma<ha)return;let n=Array.from(da);if(n.length===0)return;ma=t,e.resolveQuerySet(_a.querySet,0,ga,_a.resolveBuf,0),e.copyBufferToBuffer(_a.resolveBuf,0,_a.stagingBuf,0,ga*8),_a.pending=!0;let r=_a;V.queue.onSubmittedWorkDone().then(()=>{r.stagingBuf.mapAsync(GPUMapMode.READ).then(()=>{let e=new BigUint64Array(r.stagingBuf.getMappedRange().slice(0));r.stagingBuf.unmap(),r.pending=!1;let t=(e,t)=>t>e?Number(t-e)/1e6:0,i=la(),a=0n,o=0n;for(let r of n){let n=ca[r]*2,s=e[n],c=e[n+1];i[r]=t(s,c),s>0n&&(a===0n||s<a)&&(a=s),c>o&&(o=c)}ua=i,oa=a>0n&&o>a?Number(o-a)/1e6:0}).catch(()=>{r.pending=!1})})}function wa(e){if(_a||pa||e-ma<ha)return;ma=e,pa=!0;let t=performance.now();V.queue.onSubmittedWorkDone().then(()=>{oa=performance.now()-t,pa=!1}).catch(()=>{pa=!1})}function Ta(e,t){console.error(`[sim:${e}]`,t);let n=document.getElementById(`gpu-error-overlay`);n||(n=document.createElement(`div`),n.id=`gpu-error-overlay`,n.style.cssText=`position:fixed;top:60px;left:10px;right:10px;max-height:60vh;overflow:auto;background:rgba(20,0,0,0.92);color:#ff8080;font:11px monospace;padding:10px;border:1px solid #ff4040;border-radius:4px;z-index:9999;white-space:pre-wrap;`,document.body.appendChild(n));let r=new Date().toLocaleTimeString();n.textContent=`[${r}] [sim:${e}] ${t}\n\n`+n.textContent}function Ea(){let e=F.mode;if(U[e])return;let t={boids:dn,physics:_n,physics_classic:vn,fluid:yn,parametric:bn,reaction:xn};V.pushErrorScope(`validation`),V.pushErrorScope(`internal`),V.pushErrorScope(`out-of-memory`);let n=null;try{n=t[e]()}catch(t){Ta(e,`factory threw: ${t.message}`)}let r=n,i=e,a=e=>{if(Ta(i,e),r&&U[i]===r){try{r.destroy()}catch{}delete U[i]}};V.popErrorScope().then(e=>{e&&a(`OOM: ${e.message}`)}),V.popErrorScope().then(e=>{e&&a(`internal: ${e.message}`)}),V.popErrorScope().then(e=>{e&&a(`validation: ${e.message}`)}),n&&(U[e]=n)}function Da(){let e=F.mode;U[e]&&(U[e].destroy(),delete U[e]),Ea()}function Oa(){let e=ia>0?(1e3/ia).toFixed(1):`--`,t=ua,n=sa.some(e=>t[e]>0)?` (PM:${t.pmDepositConvert.toFixed(1)} V:${(t.outerVCycle+t.innerVCycle).toFixed(1)} R:${(t.starsRender+t.gasRender).toFixed(1)} P:${t.bloomComposite.toFixed(1)})`:oa>0?` gpu:${oa.toFixed(1)}ms`:``;document.getElementById(`stat-fps`).textContent=`${ia} fps ${e}ms${n}`;let r=U[F.mode],i=r?r.getCount():`--`;document.getElementById(`stat-count`).textContent=F.mode===`fluid`||F.mode===`reaction`?`Grid: ${i}`:`Particles: ${i}`;let a=document.getElementById(`stat-step`);if(a)if(F.mode===`physics`&&r&&`getSimStep`in r){let e=r.getSimStep(),t=r.getTimeDirection();a.style.display=``,a.textContent=`Step: ${e} ${t<0?`◀`:`▶`}`}else a.style.display=`none`}function ka(){let e=document.getElementById(`canvas-container`),t=window.devicePixelRatio||1,n=Math.floor(e.clientWidth*t),r=Math.floor(e.clientHeight*t);(H.width!==n||H.height!==r)&&(H.width=n,H.height=r),Gt(H.width,H.height)}function Aa(e,t,n){if(B.needsClear)return;let r=F.fx.trailPersistence;if(r<.001)return;B.fadeParams[0]=r,V.queue.writeBuffer(B.fadeUBO,0,B.fadeParams);let i=e.beginRenderPass({colorAttachments:[{view:B.sceneViews[n],clearValue:Qe,loadOp:`clear`,storeOp:`store`}]});i.setPipeline(B.fadePipeline),i.setBindGroup(0,B.fadeBGs[t]),i.draw(3),i.end()}function ja(e,t){let n=F.fx,r=B.sceneIdx;for(let i=0;i<Ht;i++){let a=i===0?B.scene[r]:B.bloomMips[i-1],o=B.downsampleParams[i];o[0]=1/a.width,o[1]=1/a.height,o[2]=n.bloomThreshold,o[3]=i===0?1:0,V.queue.writeBuffer(B.downsampleUBO[i],0,o);let s=B.downsampleBGs[i===0?r:i+1],c=t&&i===0?xa(t):void 0,l=e.beginRenderPass({colorAttachments:[{view:B.bloomMipViews[i],clearValue:{r:0,g:0,b:0,a:1},loadOp:`clear`,storeOp:`store`}],...c?{timestampWrites:c}:{}});l.setPipeline(B.downsamplePipeline),l.setBindGroup(0,s),l.draw(3),l.end()}for(let t=Ht-1;t>0;t--){let r=B.bloomMips[t],i=B.upsampleParams[t];i[0]=1/r.width,i[1]=1/r.height,i[2]=n.bloomRadius,V.queue.writeBuffer(B.upsampleUBO[t],0,i);let a=e.beginRenderPass({colorAttachments:[{view:B.bloomMipViews[t-1],clearValue:{r:0,g:0,b:0,a:1},loadOp:`load`,storeOp:`store`}]});a.setPipeline(B.upsamplePipelineAdditive),a.setBindGroup(0,B.upsampleBGs[t]),a.draw(3),a.end()}}function Ma(e,t,n,r=null,i){let a=F.fx,o=at(),s=B.compositeParams;s[0]=a.bloomIntensity,s[1]=a.exposure,s[2]=a.vignette,s[3]=a.chromaticAberration,s[4]=a.grading,s[8]=o.primary[0],s[9]=o.primary[1],s[10]=o.primary[2],s[12]=o.accent[0],s[13]=o.accent[1],s[14]=o.accent[2],V.queue.writeBuffer(B.compositeUBO,0,s);let c=Wt(n),l=B.compositeBGs[B.sceneIdx],u=i?Sa(i):void 0,d=e.beginRenderPass({colorAttachments:[{view:t,clearValue:{r:0,g:0,b:0,a:1},loadOp:`clear`,storeOp:`store`}],...u?{timestampWrites:u}:{}});d.setPipeline(c),d.setBindGroup(0,l),r&&d.setViewport(r[0],r[1],r[2],r[3],0,1),d.draw(3),d.end()}function Na(e){if(F.xrEnabled)return;requestAnimationFrame(Na);let t=aa>=0?e-aa:16.7;aa>=0&&Wn(t),aa=e,ot(e),ka(),bt(ht()),kt(Math.min(.05,t*.001)*F.fx.timeScale*gt()),na++,e-ra>=1e3&&(ia=na,na=0,ra=e,Oa());let n=U[F.mode];if(!n)return;let r=F.mode;try{ya();let t=V.createCommandEncoder();Kn(n,t),Yn();let r=B.sceneIdx,i=1-r;B.sceneIdx=i,Aa(t,r,i),n.render(t,B.sceneViews[i],null),ja(t,`bloomComposite`),Ma(t,Zt.getCurrentTexture().createView(),Qt,null,`bloomComposite`),Ca(t,e),V.queue.submit([t.finish()]),wa(e),B.needsClear=!1}catch(e){if(Ta(r,`frame threw: ${e.message}`),U[r]===n){try{n.destroy()}catch{}delete U[r]}}}var Pa=`shader-playground-state`;function Fa(){try{let e={};for(let t of Object.keys(M))e[t]=P(t);let t={mode:F.mode,colorTheme:F.colorTheme,camera:F.camera,fx:F.fx,debug:F.debug,...e};localStorage.setItem(Pa,JSON.stringify(t))}catch{}}function Ia(){try{let e=localStorage.getItem(Pa);if(!e)return;let t=JSON.parse(e);t.mode&&t.mode in M&&(F.mode=t.mode),t.colorTheme&&Ye[t.colorTheme]&&(F.colorTheme=t.colorTheme);for(let e of Object.keys(M))t[e]&&Object.assign(P(e),t[e]);t.camera&&Object.assign(F.camera,t.camera),t.fx&&Object.assign(F.fx,t.fx),t.debug&&Object.assign(F.debug,t.debug),st(F.colorTheme)}catch{}}function La(){document.querySelectorAll(`.mode-tab`).forEach(e=>e.classList.toggle(`active`,e.dataset.mode===F.mode)),document.querySelectorAll(`.param-group`).forEach(e=>e.classList.toggle(`active`,e.dataset.mode===F.mode)),document.querySelectorAll(`.debug-panel`).forEach(e=>e.classList.toggle(`active`,e.dataset.mode===F.mode));for(let e of Object.keys(Je)){let t=e,n=document.getElementById(`params-${t}`),r=P(t);n.querySelectorAll(`input[type="range"]`).forEach(e=>{let n=e.dataset.key;if(n&&n in r){let i=Mn(t,n),a=Number(r[n]);e.value=i?.logScale&&i.min!==void 0&&i.max!==void 0?String(kn(a,i.min,i.max)):String(r[n]);let o=e.parentElement?.querySelector(`.control-value`);o&&(o.textContent=Dn(a,i))}}),n.querySelectorAll(`input[type="checkbox"]`).forEach(e=>{let t=e.dataset.key;t&&t in r&&(e.checked=!!r[t])}),n.querySelectorAll(`select`).forEach(e=>{let t=e.dataset.key;t&&t in r&&(e.value=String(r[t]))})}document.querySelectorAll(`#theme-presets .preset-btn`).forEach(e=>e.classList.toggle(`active`,e.dataset.theme===F.colorTheme));let e=document.getElementById(`toggle-xr-log`);e&&(e.checked=F.debug.xrLog),Ti(F.debug.xrLog),G()}function Ra(){for(let t of Object.keys(Je))for(let n of Je[t])if(!n.dynamic)for(let r of n.params)r.type===`dropdown`?e.register({kind:`enum`,id:`${t}.${r.key}`,label:r.label,group:t,get:()=>String(P(t)[r.key]),set:e=>{let n=P(t),i=n[r.key];n[r.key]=typeof i==`number`?Number(e):e},options:(r.options??[]).map(e=>({value:String(e),label:String(e)}))}):r.type===`toggle`?e.register({kind:`toggle`,id:`${t}.${r.key}`,label:r.label,group:t,get:()=>!!P(t)[r.key],set:e=>{P(t)[r.key]=e}}):r.min!==void 0&&r.max!==void 0&&e.register({kind:`continuous`,id:`${t}.${r.key}`,label:r.label,group:t,get:()=>Number(P(t)[r.key]),set:e=>{P(t)[r.key]=e},range:{min:r.min,max:r.max},step:r.step,scale:r.logScale?`log`:`linear`});for(let t of Object.keys(qe))for(let n of Object.keys(qe[t]))e.register({kind:`action`,id:`preset.${t}.${n}`,label:n,group:`presets`,invoke:()=>jn(t,n)});e.register({kind:`enum`,id:`app.mode`,label:`Mode`,group:`app`,get:()=>F.mode,set:e=>Pn(e),options:Object.keys(Nn).map(e=>({value:e,label:Nn[e]}))}),e.register({kind:`enum`,id:`app.theme`,label:`Theme`,group:`app`,get:()=>F.colorTheme,set:e=>{F.colorTheme=e,ct(e)},options:Object.keys(Ye).map(e=>({value:e,label:e}))}),e.register({kind:`toggle`,id:`app.paused`,label:`Pause`,group:`app`,get:()=>F.paused,set:e=>{F.paused=e,q()}})}async function za(){await tn()&&(cr=sr.matches,document.body.classList.toggle(`mobile`,cr),sr.addEventListener(`change`,e=>{let t=e.matches;t!==cr&&(cr=t,document.body.classList.toggle(`mobile`,cr),window.location.reload())}),ln(),Ia(),cr&&fr(),st(F.colorTheme),Ra(),W(),Xn(),K(),Fn(),cr?(lr(),ur(),dr()):or(),xr(),Ln(),Jn(),La(),ka(),Ea(),gr(),new ResizeObserver(()=>ka()).observe(document.getElementById(`canvas-container`)),requestAnimationFrame(Na),window.__simDiagnose=()=>{let e=U[F.mode];return e?.diagnose?e.diagnose():Promise.resolve({error:1,msg:`no diagnose on this sim`})},window.__simPreset=e=>{let t=document.querySelectorAll(`button`);for(let n of t)if(n.textContent?.trim()===e)return n.click(),`ok`;return`preset not found`},window.__simState=()=>({mode:F.mode,...F[F.mode],fps:ia,gpuMs:oa,gpuDetail:ua}),window.__pmDumpDensity=()=>{let e=U[F.mode];return e?.dumpDensity?e.dumpDensity():Promise.resolve(null)},window.__pmDumpPotential=()=>{let e=U[F.mode];return e?.dumpPotential?e.dumpPotential():Promise.resolve(null)},window.__pmDumpOuterDensity=()=>{let e=U[F.mode];return e?.dumpOuterDensity?e.dumpOuterDensity():Promise.resolve(null)},window.__pmDumpOuterPotential=()=>{let e=U[F.mode];return e?.dumpOuterPotential?e.dumpOuterPotential():Promise.resolve(null)},window.__pmMaxResidual=()=>{let e=U[F.mode];return e?.maxResidual?e.maxResidual():Promise.resolve(null)},window.__pmReversibilityTest=(e=1e3)=>{let t=U[F.mode];return t?.reversibilityTest?t.reversibilityTest(e):Promise.resolve(null)},window.__gasDumpDensity=()=>{let e=U[F.mode];return e?.gasDumpDensity?e.gasDumpDensity():Promise.resolve(null)},window.__gasEnergyBreakdown=()=>{let e=U[F.mode];return e?.gasEnergyBreakdown?e.gasEnergyBreakdown():Promise.resolve(null)},window.__gasWakeProbe=(e=0)=>{let t=U[F.mode];return t?.gasWakeProbe?t.gasWakeProbe(e):Promise.resolve(null)},window.__gasReversibilityTest=(e=1e3)=>{let t=U[F.mode];return t?.gasReversibilityTest?t.gasReversibilityTest(e):Promise.resolve(null)},window.__bindings=e,window.__anchors={evaluateAnchor:r,handFrames:Q},window.__xrUi={layout:m,hitTestWidgets:ee,step:w,applyEffects:ne,registry:ii,makeIdlePrev:S,getRenderList:()=>oi,getPrev:()=>ai,getClaimed:()=>({...si})},window.__simStats=()=>{let e=U[F.mode];return{...e?.getStats?e.getStats():{error:`no stats on this sim`},gpuMs:oa,gpuDetail:ua}})}za();