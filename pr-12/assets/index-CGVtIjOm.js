(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=!1;function t(){if(e)return;let t=new URLSearchParams(location.search).get(`xrbridge`);if(!t)return;let r=`xrpb-${t}`,i=`https://ntfy.sh/${r}-cmd/sse`,a=`https://ntfy.sh/${r}-result`;console.log(`[xr-bridge] listening`,{topic:r,cmd:`curl -d '<code>' https://ntfy.sh/${r}-cmd`,results:`curl -sN https://ntfy.sh/${r}-result/sse`}),e=!0;let o=new EventSource(i);o.onmessage=async e=>{let t=null;try{t=JSON.parse(e.data)}catch{return}let r=t?.message;if(!r)return;let i=t?.id,o;try{o={id:i,ok:!0,value:n(await Promise.resolve((0,eval)(r))),at:Date.now()}}catch(e){o={id:i,ok:!1,error:String(e),at:Date.now()}}try{await fetch(a,{method:`POST`,body:JSON.stringify(o),headers:{"Content-Type":`application/json`}})}catch{}},o.onerror=()=>{console.warn(`[xr-bridge] SSE error; EventSource auto-reconnects`)}}function n(e){try{return JSON.parse(JSON.stringify(e,(e,t)=>typeof t==`function`?`[function ${t.name||`anonymous`}]`:t instanceof Element?`[Element ${t.tagName}]`:t instanceof Map?Array.from(t.entries()):t instanceof Set?Array.from(t.values()):t))}catch(e){return`[unserializable: ${String(e)}]`}}var r=new class{map=new Map;register(e){if(this.map.has(e.id))throw Error(`BindingRegistry: id "${e.id}" already registered`);this.map.set(e.id,e)}get(e){return this.map.get(e)}list(){return Array.from(this.map.values())}filterByGroup(e){return this.list().filter(t=>t.group===e)}},i=[0,0,0,1];function a(e){return[-e[0],-e[1],-e[2],e[3]]}function o(e,t){switch(e.kind){case`world`:return e.pose;case`wrist`:case`held`:{let n=t.hands[e.hand].joints?.wrist??null;return n?u(s(n),e.offset):null}case`palm`:{let n=t.hands[e.hand],r=n.joints?.wrist??null,i=n.palmNormal;return!r||!i?null:u({position:c(r.position),orientation:p([0,0,1],c(i))},e.offset)}case`head-hud`:return t.headPose?u(u(t.headPose,{position:[0,0,-e.distance],orientation:i}),e.offset):null}}function s(e){return{position:c(e.position),orientation:l(e.orientation)}}function c(e){return[e[0],e[1],e[2]]}function l(e){return[e[0],e[1],e[2],e[3]]}function u(e,t){let n=f(e.orientation,t.position);return{position:[e.position[0]+n[0],e.position[1]+n[1],e.position[2]+n[2]],orientation:d(e.orientation,t.orientation)}}function d(e,t){return[e[3]*t[0]+e[0]*t[3]+e[1]*t[2]-e[2]*t[1],e[3]*t[1]-e[0]*t[2]+e[1]*t[3]+e[2]*t[0],e[3]*t[2]+e[0]*t[1]-e[1]*t[0]+e[2]*t[3],e[3]*t[3]-e[0]*t[0]-e[1]*t[1]-e[2]*t[2]]}function f(e,t){let n=e[0],r=e[1],i=e[2],a=e[3],o=r*t[2]-i*t[1],s=i*t[0]-n*t[2],c=n*t[1]-r*t[0],l=o+a*t[0],u=s+a*t[1],d=c+a*t[2];return[t[0]+2*(r*d-i*u),t[1]+2*(i*l-n*d),t[2]+2*(n*u-r*l)]}function p(e,t){let n=e[0],r=e[1],i=e[2],a=t[0],o=t[1],s=t[2],c=n*a+r*o+i*s;if(c>.999999)return[0,0,0,1];if(c<-.999999){let e=Math.abs(n)<.9?[1,0,0]:[0,1,0],t=r*e[2]-i*e[1],a=i*e[0]-n*e[2],o=n*e[1]-r*e[0],s=Math.hypot(t,a,o)||1;return[t/s,a/s,o/s,0]}let l=n+a,u=r+o,d=i+s,f=Math.hypot(l,u,d),p=l/f,m=u/f,h=d/f;return[r*h-i*m,i*p-n*h,n*m-r*p,n*p+r*m+i*h]}var m=Object.freeze({minHitHalfExtent:Object.freeze({x:.06,y:.06}),defaultHitPadding:Object.freeze({x:.02,y:.02}),minNeighborHitGap:.02}),h=new Set([`slider`,`dial`,`toggle`,`stepper`,`enum-chips`,`button`,`preset-tile`,`category-tile`,`readout`]);function g(e){return h.has(e.kind)}function _(e,t){let n=o(e.anchor,t);if(!n)return null;let r=new Map,i=[];return y(e.children,n,{x:0,y:0},e.id,r,i),r.set(e.id,{pose:n,visualRect:{halfExtent:C(e.size)},hitRect:{halfExtent:C(e.size)},widget:null,containerKind:`panel`,childrenIds:i}),r}function v(e,t,n,r,i,a){if(g(e)){let o=x(e);i.set(e.id,{pose:w(t,n),visualRect:{halfExtent:o.visualHalf},hitRect:{halfExtent:o.hitHalf},widget:e,parentId:r,childrenIds:[]}),a.push(e.id);return}switch(e.kind){case`group`:b(e,t,n,r,i,a);return;case`tabs`:{let o=e.tabs.find(t=>t.id===e.activeTabId);o&&v(o.body,t,n,r,i,a);return}case`focus-view`:{if(e.focused==null)return;let o=e.children.find(t=>t.id===e.focused);o&&v(o,t,n,r,i,a);return}case`panel`:return}}function y(e,t,n,r,i,a){let o=e.map(x),s=m.minNeighborHitGap,c=S(o,`y`,s)/2;for(let l=0;l<e.length;l++){let u=o[l],d=c-u.hitHalf.y;v(e[l],t,{x:n.x,y:n.y+d},r,i,a),c-=u.hitHalf.y*2+s}}function b(e,t,n,r,i,a){let o=Math.max(e.gap??0,m.minNeighborHitGap),s=e.children.map(x);if(e.layout===`row`){let c=-S(s,`x`,o)/2;for(let l=0;l<e.children.length;l++){let u=s[l],d=c+u.hitHalf.x;v(e.children[l],t,{x:n.x+d,y:n.y},r,i,a),c+=u.hitHalf.x*2+o}return}if(e.layout===`column`){let c=S(s,`y`,o)/2;for(let l=0;l<e.children.length;l++){let u=s[l],d=c-u.hitHalf.y;v(e.children[l],t,{x:n.x,y:n.y+d},r,i,a),c-=u.hitHalf.y*2+o}return}let c=Math.max(1,e.columns??1),l=Math.max(0,...s.map(e=>e.hitHalf.x)),u=Math.max(0,...s.map(e=>e.hitHalf.y)),d=Math.ceil(e.children.length/c),f=c*l*2+Math.max(0,c-1)*o,p=d*u*2+Math.max(0,d-1)*o;for(let s=0;s<e.children.length;s++){let d=Math.floor(s/c),m=s%c,h=-f/2+m*(l*2+o)+l,g=p/2-d*(u*2+o)-u;v(e.children[s],t,{x:n.x+h,y:n.y+g},r,i,a)}}function x(e){if(g(e)){let t=C(e.visualSize);return{hitHalf:{x:Math.max(t.x+e.hitPadding.x,m.minHitHalfExtent.x),y:Math.max(t.y+e.hitPadding.y,m.minHitHalfExtent.y)},visualHalf:t}}switch(e.kind){case`panel`:return{hitHalf:C(e.size),visualHalf:C(e.size)};case`group`:{let t=Math.max(e.gap??0,m.minNeighborHitGap),n=e.children.map(x);if(e.layout===`row`){let e=S(n,`x`,t),r=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.y*2));return{hitHalf:{x:e/2,y:r/2},visualHalf:{x:e/2,y:r/2}}}if(e.layout===`column`){let e=S(n,`y`,t),r=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.x*2));return{hitHalf:{x:r/2,y:e/2},visualHalf:{x:r/2,y:e/2}}}let r=Math.max(1,e.columns??1),i=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.x)),a=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.y)),o=Math.ceil(e.children.length/r),s=r*i*2+Math.max(0,r-1)*t,c=o*a*2+Math.max(0,o-1)*t;return{hitHalf:{x:s/2,y:c/2},visualHalf:{x:s/2,y:c/2}}}case`tabs`:{let t=e.tabs.find(t=>t.id===e.activeTabId);return t?x(t.body):{hitHalf:{x:0,y:0},visualHalf:{x:0,y:0}}}case`focus-view`:{if(e.focused==null)return{hitHalf:{x:0,y:0},visualHalf:{x:0,y:0}};let t=e.children.find(t=>t.id===e.focused);return t?x(t):{hitHalf:{x:0,y:0},visualHalf:{x:0,y:0}}}}}function S(e,t,n){let r=0;for(let i=0;i<e.length;i++)r+=(t===`x`?e[i].hitHalf.x:e[i].hitHalf.y)*2,i>0&&(r+=n);return r}function C(e){return{x:e.x/2,y:e.y/2}}function w(e,t){return u(e,{position:[t.x,t.y,0],orientation:[0,0,0,1]})}function ee(e,t){let n=null,r=1/0;for(let[i,a]of e){if(!a.widget)continue;let e=T(t,a.pose,a.hitRect.halfExtent);e!==null&&e<r&&(r=e,n=i)}return n}function T(e,t,n){let r=a(t.orientation),i=f(r,[e.origin[0]-t.position[0],e.origin[1]-t.position[1],e.origin[2]-t.position[2]]),o=f(r,[e.dir[0],e.dir[1],e.dir[2]]);if(Math.abs(o[2])<1e-9)return null;let s=-i[2]/o[2];if(s<=0)return null;let c=i[0]+s*o[0],l=i[1]+s*o[1];return Math.abs(c)>n.x||Math.abs(l)>n.y?null:s}function E(){return{states:{left:{kind:`idle`},right:{kind:`idle`}},pinches:{left:!1,right:!1}}}var D=[`left`,`right`];function O(e,t,n,r,i,a){let o=[],s=[],c={states:{left:n.states.left,right:n.states.right},pinches:{left:t.left.pinch.active,right:t.right.pinch.active}},l=e.activeLayoutId==null?void 0:e.layouts.get(e.activeLayoutId);if(!l)return c.states.left={kind:`idle`},c.states.right={kind:`idle`},{next:c,sideEffects:o,renderList:s};let u=_(l,r);if(!u)return c.states.left={kind:`idle`},c.states.right={kind:`idle`},{next:c,sideEffects:o,renderList:s};for(let r of D){let a=t[r],s=n.pinches[r],l=a.pinch.active,d=n.states[r],f=d;if(l&&!s){let t=a.gazeRay?ee(u,a.gazeRay):null,n=t?u.get(t)?.widget??null:null;f=n&&t?se(n,t,e.bindings,a):{kind:`idle`}}else if(!l&&s){if(d.kind===`pressing`&&!d.cancelPending){let e=d.commit;if(e.kind===`invoke`)o.push({kind:`binding-invoke`,bindingId:d.bindingId});else if(e.kind===`toggle`)o.push({kind:`binding-set`,bindingId:d.bindingId,value:!e.valueAtOrigin});else{let t=Math.max(e.min,Math.min(e.max,e.valueAtOrigin+e.step));o.push({kind:`binding-set`,bindingId:d.bindingId,value:t})}}f={kind:`idle`}}else if(l&&s){if(d.kind===`dragging`){let t=e.bindings.get(d.bindingId);if(t&&t.kind===`continuous`){let e=ce(d,a,t,i.gainMultiplier);o.push({kind:`binding-set`,bindingId:d.bindingId,value:e})}f=d}else if(d.kind===`pressing`){let e=!!a.currentRay&&ee(u,a.currentRay)===d.widgetId;f={...d,cancelPending:!e}}}else{let e=a.ray?ee(u,a.ray):null;f=e?{kind:`hovering`,widgetId:e}:{kind:`idle`}}c.states[r]=f}for(let[t,n]of u){if(!n.widget)continue;let r=n.widget,i=re(c.states,e=>e.kind===`hovering`&&e.widgetId===t),a=re(c.states,e=>e.kind===`pressing`&&e.widgetId===t),o=re(c.states,e=>e.kind===`dragging`&&e.widgetId===t);s.push({widgetId:t,pose:n.pose,visualHalfExtent:n.visualRect.halfExtent,kind:r.kind,state:{hover:i,pressed:a,dragging:o,value:oe(r,e.bindings)},label:ie(r,e.bindings)})}return{next:c,sideEffects:o,renderList:s}}function te(e){return e.kind===`pressing`||e.kind===`dragging`}function ne(e,t){for(let n of e){if(n.kind===`tab-switch`)continue;let e=t.bindings.get(n.bindingId);if(e){if(n.kind===`binding-invoke`&&e.kind===`action`){e.invoke();continue}n.kind===`binding-set`&&(e.kind===`continuous`&&typeof n.value==`number`||e.kind===`toggle`&&typeof n.value==`boolean`||e.kind===`enum`&&typeof n.value==`string`)&&e.set(n.value)}}}function re(e,t){return t(e.left)||t(e.right)}function ie(e,t){if(e.kind===`category-tile`)return;let n=t.get(e.binding);if(n){if(e.kind===`slider`||e.kind===`dial`||e.kind===`readout`||e.kind===`stepper`){if(n.kind!==`continuous`)return n.label;let e=n.get();return n.format?n.format(e):ae(e)}if(e.kind===`toggle`)return n.kind===`toggle`?n.get()?`On`:`Off`:n.label;if(e.kind===`enum-chips`)return n.kind===`enum`?n.get():n.label;if(e.kind===`button`||e.kind===`preset-tile`)return n.label}}function ae(e){if(Number.isInteger(e))return String(e);let t=Math.abs(e);return t>=100?e.toFixed(0):t>=10?e.toFixed(1):t>=1?e.toFixed(2):e.toFixed(3)}function oe(e,t){if(e.kind!==`slider`&&e.kind!==`dial`&&e.kind!==`readout`)return;let n=t.get(e.binding);if(!n||n.kind!==`continuous`)return;let r=n.range.max-n.range.min;return r<=0?0:(n.get()-n.range.min)/r}function se(e,t,n,r){if(e.kind===`button`||e.kind===`preset-tile`){let i=n.get(e.binding);return!i||i.kind!==`action`?{kind:`idle`}:{kind:`pressing`,widgetId:t,bindingId:i.id,startedAt:r.pinch.startTime,cancelPending:!1,commit:{kind:`invoke`}}}if(e.kind===`toggle`){let i=n.get(e.binding);return!i||i.kind!==`toggle`?{kind:`idle`}:{kind:`pressing`,widgetId:t,bindingId:i.id,startedAt:r.pinch.startTime,cancelPending:!1,commit:{kind:`toggle`,valueAtOrigin:i.get()}}}if(e.kind===`stepper`){let i=n.get(e.binding);return!i||i.kind!==`continuous`?{kind:`idle`}:{kind:`pressing`,widgetId:t,bindingId:i.id,startedAt:r.pinch.startTime,cancelPending:!1,commit:{kind:`increment`,valueAtOrigin:i.get(),step:e.step,min:i.range.min,max:i.range.max}}}if(e.kind===`slider`||e.kind===`dial`){let i=n.get(e.binding);return!i||i.kind!==`continuous`?{kind:`idle`}:{kind:`dragging`,widgetId:t,bindingId:i.id,handOriginPos:[...r.pinch.origin],valueAtOrigin:i.get(),interaction:e.interaction,cancelPending:!1}}return{kind:`idle`}}function ce(e,t,n,r){let i=t.pinch.current[0]-e.handOriginPos[0],a=t.pinch.current[1]-e.handOriginPos[1],o=t.pinch.current[2]-e.handOriginPos[2],s=n.range.max-n.range.min,c=0;switch(e.interaction.kind){case`direct-drag`:c=(e.interaction.axis===`x`?i:a)*s;break;case`pinch-pull`:{let t=e.interaction.axis;c=(t===`forward`?-o:t===`up`?a:i)*e.interaction.unitsPerMeter;break}case`pinch-twist`:c=0;break;case`expand-to-focus`:c=0;break}let l=e.valueAtOrigin+c*r;return Math.max(n.range.min,Math.min(n.range.max,l))}var le=`// XR widget renderer.
// One instanced draw call covers every widget in the active layout's render
// list. Vertex shader generates a quad from instance pose + half-extent;
// fragment renders an SDF rounded rectangle and branches on \`kind\` for
// kind-specific fills (slider track, dial arc, toggle knob, etc.).
//
// Label atlas: instance.labelStripIndex selects a 32-pixel-tall strip in the
// 256x2048 atlas texture; instance.hasLabel gates the lookup. CPU side
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
    // Floor uHalf at 0.4 so very narrow widgets still show readable text
    // (cropping a few glyphs is preferable to invisible text).
    let uHalf = clamp(widgetTextAspect / CANVAS_ASPECT * 0.5, 0.1, 0.5);
    let labelU = 0.5 + in.uv.x * uHalf;
    let labelLocalV = (in.uv.y - labelCenterY) / V_BAND; // -1..1 inside the strip
    let stripV0 = f32(in.stripIndex) * STRIP_V_FRAC;
    let labelV = stripV0 + (labelLocalV * 0.5 + 0.5) * STRIP_V_FRAC;
    if (labelU >= 0.0 && labelU <= 1.0 && labelLocalV >= -1.0 && labelLocalV <= 1.0) {
      let glyph = textureSample(atlas, atlasSampler, vec2<f32>(labelU, labelV));
      fill = mix(fill, vec3<f32>(0.97, 0.97, 0.97), glyph.a);
    }
  }

  return vec4<f32>(fill, plate);
}
`,ue=64,de=64,fe=208,pe=256,me=512,he=64,ge=ue,_e=he*ge,ve={slider:0,button:1,readout:2,dial:3,toggle:4,stepper:5,"enum-chips":6,"preset-tile":7,"category-tile":8};function ye(e,t,n){let r=e.createShaderModule({code:le,label:`xr-widgets`}),i=e.createBindGroupLayout({label:`xr-widgets-bgl`,entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,sampler:{}}]}),a=e.createPipelineLayout({bindGroupLayouts:[i]}),o=e.createBuffer({label:`xr-widgets-instances`,size:de*ue,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),s=new ArrayBuffer(de*ue),c=new Float32Array(s),l=new Uint32Array(s),u=document.createElement(`canvas`);u.width=me,u.height=_e;let d=u.getContext(`2d`);if(!d)throw Error(`xr-widgets: 2D canvas context unavailable`);let f=d;f.font=`600 40px system-ui, -apple-system, sans-serif`,f.textAlign=`center`,f.textBaseline=`middle`;let p=e.createTexture({label:`xr-widgets-label-atlas`,size:[me,_e,1],format:`rgba8unorm`,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),m=p.createView(),h=e.createSampler({label:`xr-widgets-atlas-sampler`,magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`}),g=new Map,_=0;function v(t,n){let r=g.get(t);if(!r){if(_>=ge)return-1;r={stripIndex:_++,lastLabel:``},g.set(t,r)}if(r.lastLabel===n)return r.stripIndex;r.lastLabel=n;let i=r.stripIndex*he;return f.clearRect(0,i,me,he),f.fillStyle=`rgba(255, 255, 255, 1)`,f.fillText(n,me/2,i+he/2),e.queue.copyExternalImageToTexture({source:u,origin:{x:0,y:i}},{texture:p,origin:{x:0,y:i}},[me,he,1]),r.stripIndex}let y=[];for(let n=0;n<2;n++)y.push(e.createBindGroup({label:`xr-widgets-bg-eye${n}`,layout:i,entries:[{binding:0,resource:{buffer:t,offset:n*pe,size:fe}},{binding:1,resource:{buffer:o}},{binding:2,resource:m},{binding:3,resource:h}]}));let b=new Map;function x(t){let n=b.get(t);return n||(n=e.createRenderPipeline({label:`xr-widgets-pipeline-${t}`,layout:a,vertex:{module:r,entryPoint:`vs`},fragment:{module:r,entryPoint:`fs`,targets:[{format:t,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`}}),b.set(t,n),n)}function S(e){let t=Math.min(e.length,ue);for(let n=0;n<t;n++){let t=e[n],r=de/4*n;c[r+0]=t.pose.position[0],c[r+1]=t.pose.position[1],c[r+2]=t.pose.position[2],c[r+3]=t.visualHalfExtent.x,c[r+4]=t.pose.orientation[0],c[r+5]=t.pose.orientation[1],c[r+6]=t.pose.orientation[2],c[r+7]=t.pose.orientation[3],c[r+8]=t.visualHalfExtent.y,l[r+9]=ve[t.kind]??0;let i=(t.state.hover?1:0)|(t.state.pressed?2:0)|(t.state.dragging?4:0);l[r+10]=i>>>0,c[r+11]=t.state.value??0;let a=t.label!=null&&t.label.length>0?v(t.widgetId,t.label):-1;l[r+12]=a>=0?a>>>0:0,l[r+13]=a>=0?1:0,l[r+14]=0,l[r+15]=0}return t}return{draw(r,i,a,c,l){e.queue.writeBuffer(t,c*pe,n(c));let u=S(l);u>0&&e.queue.writeBuffer(o,0,s,0,u*de);let d=r.beginRenderPass({label:`xr-widgets-pass-eye${c}`,colorAttachments:[{view:i,loadOp:`load`,storeOp:`store`}]});u>0&&(d.setPipeline(x(a)),d.setBindGroup(0,y[c]),d.draw(6,u)),d.end()},destroy(){o.destroy(),p.destroy()}}}var be=`// [LAW:one-source-of-truth] System-wide statistics computed in one reduction pass.
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
`,xe=`// PM CIC (cloud-in-cell) deposition. Each particle scatters its mass into
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

// Shared layout with pm.density_convert.wgsl. Only the first six fields are
// read here; cellCount + _pad are populated by the host for the convert pass.
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
`,Se=`// PM density post-processing. Two entry points share one bind group layout:
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
`,Ce=`// Red-black Gauss-Seidel smoother for the multigrid V-cycle.
// Dispatched twice per sweep: once with colorParity=0 (red), once with 1 (black).
// Within one dispatch, every thread of the matching parity updates its cell
// in-place using neighbor values — neighbors are the opposite color so no
// intra-dispatch read/write race.
//
// Update rule derived from the 7-point Laplacian:
//   (neighbor_sum - 6φ) / h² = 4πG ρ
//   → φ = (neighbor_sum - h² · 4πG ρ) / 6
//
// Periodic wrap on neighbor indices (torus domain).

struct Params {
  gridRes: u32,
  colorParity: u32,   // 0 = red, 1 = black
  hSquared: f32,
  fourPiG: f32,
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
  phi[me] = (neighborSum - params.hSquared * params.fourPiG * rho[me]) / 6.0;
}
`,we=`// Compute residual r = 4πGρ - ∇²φ with the same 7-point stencil + periodic
// wrap used by the smoother. Run once per level between pre-smoothing and
// restriction: the residual is what gets coarsened and solved more cheaply
// on the smaller grid, then interpolated back as a correction.

struct Params {
  gridRes: u32,
  _pad: u32,
  hSquared: f32,
  fourPiG: f32,
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

  residual[me] = params.fourPiG * rho[me] - laplacian;
}
`,Te=`// Restriction (fine → coarse) for the multigrid V-cycle. Each coarse cell
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
`,Ee=`// Prolongation (coarse → fine) for the multigrid V-cycle. Each fine cell is
// trilinearly interpolated from the 8 surrounding coarse cells, and the
// interpolated value is ADDED to the fine buffer (it's a correction to the
// existing potential, not a replacement).
//
// Periodic wrap on coarse indices handles cells near the domain faces.

struct Params {
  fineGridRes: u32,   // coarseGridRes = fineGridRes / 2
  _pad0: u32,
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

  fine[gid.z * nF * nF + gid.y * nF + gid.x] = fine[gid.z * nF * nF + gid.y * nF + gid.x] + sum;
}
`,De=`struct Camera {
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
`,ke=`// [LAW:one-source-of-truth] CoD-Advanced-Warfare 13-tap downsample. The first level applies a soft bright-pass.
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
`,Ae=`// 9-tap tent filter upsample. Reads from a smaller mip; output is additively blended into a larger one.

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
`,je=`// Final HDR composite: combine scene + bloom, ACES tone-map, color grade, vignette, chromatic aberration,
// and per-attractor interaction reticles.

// [LAW:one-source-of-truth] Screen-space attractor record used only by the composite pass.
// CPU projects each world-space attractor once per frame and packs it here.
struct ReticleAttractor {
  screenPos: vec2f,
  strength: f32,
  _pad: f32,
}

struct CompositeParams {
  bloomIntensity: f32,
  exposure: f32,
  vignette: f32,
  chromaticAberration: f32,
  grading: f32,
  attractorCount: u32,
  _pad0: f32,
  _pad1: f32,
  primary: vec3f,
  _pad3: f32,
  accent: vec3f,
  _pad4: f32,
  interactTime: f32,
  _pad5: f32,
  _pad6: f32,
  _pad7: f32,
  // Attractor array at byte offset 80 (16-aligned).
  attractors: array<ReticleAttractor, 32>,
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
  let dims = vec2f(textureDimensions(sceneTex));
  let aspect = dims.x / dims.y;

  // [LAW:dataflow-not-control-flow] Gravitational lensing accumulates across all active attractors.
  // Each attractor's contribution scales with its strength, so zero-strength slots add nothing.
  var lensOffset = vec2f(0.0);
  for (var i = 0u; i < params.attractorCount; i++) {
    let a = params.attractors[i];
    let toI = a.screenPos - uv;
    let iDist2 = dot(toI, toI) + 0.001;
    let lensStrength = a.strength * 0.0004 / (iDist2 + 0.03);
    lensOffset = lensOffset + toI * lensStrength;
  }
  let sampleUV = uv + lensOffset;

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

  // [LAW:dataflow-not-control-flow] Per-attractor reticle — ring + dot, aspect-corrected for round appearance.
  // \`s\` is the per-attractor strength in the range [0, interactionStrength ceiling] (up to ~3.0 at max slider),
  // NOT [0, 1]. mix() with s > 1 extrapolates beyond the anchor values, which is intentional: a high-ceiling
  // attractor is genuinely more powerful, so its reticle reads bigger and brighter.
  let pulse = 0.75 + 0.25 * sin(params.interactTime * 5.0);
  var reticleSum = vec3f(0.0);
  for (var i = 0u; i < params.attractorCount; i++) {
    let a = params.attractors[i];
    let s = a.strength;
    // Anchors: s=0 → tiny dim pinpoint (0.012 radius, 0.0018 width, 0.002 dot).
    // s=1 → fully-charged ring at default ceiling (0.035, 0.004, 0.0055). s > 1 extrapolates linearly.
    let ringRadius = mix(0.012, 0.035, s);
    let ringHalfWidth = mix(0.0018, 0.004, s);
    let ringEdge = 0.0015;
    let dotRadius = mix(0.002, 0.0055, s);
    let toRing = (uv - a.screenPos) * vec2f(aspect, 1.0);
    let ringDist = length(toRing);
    let distFromRing = abs(ringDist - ringRadius);
    let ringMask = 1.0 - smoothstep(ringHalfWidth - ringEdge, ringHalfWidth + ringEdge, distFromRing);
    let dotMask = 1.0 - smoothstep(dotRadius * 0.5, dotRadius, ringDist);
    // Brightness anchors: 0.3 at s=0, 1.8 at s=1. Extrapolates for s > 1.
    let brightness = mix(0.3, 1.8, s) * pulse * s;
    reticleSum = reticleSum + params.accent * brightness * (ringMask + dotMask * 2.0);
  }
  ldr = ldr + reticleSum;

  return vec4f(ldr, 1.0);
}
`,Me=200,Ne=[],k=`boot`;function Pe(e){let t=document.getElementById(`gpu-error-overlay`);t||(t=document.createElement(`div`),t.id=`gpu-error-overlay`,t.style.cssText=`position:fixed;top:60px;left:10px;right:10px;max-height:60vh;overflow:auto;background:rgba(20,0,0,0.92);color:#ff8080;font:11px monospace;padding:10px;border:1px solid #ff4040;border-radius:4px;z-index:9999;white-space:pre-wrap;`,document.body.appendChild(t));let n=new Date().toLocaleTimeString();t.textContent=`[${n}] ${e}\n\n`+t.textContent}function A(e,t,n){let r=t instanceof Error?t:Error(typeof t==`string`?t:JSON.stringify(t)),i=n?`${n}: ${r.message}`:r.message,a={t:performance.now(),kind:e,phase:k,msg:i,stack:r.stack};Ne.push(a),Ne.length>Me&&Ne.splice(0,Ne.length-Me),console.error(`[${e}] (phase=${k})`,i,r.stack||``),Pe(`[${e}] (phase=${k}) ${i}`)}function j(e,t,...n){console.info(`[${e}] (phase=${k})`,t,...n)}globalThis.__errorLog=()=>Ne.slice(),globalThis.__gpuPhase=()=>k,window.addEventListener(`error`,e=>{A(`window.error`,e.error??e.message,`at ${e.filename}:${e.lineno}:${e.colno}`)}),window.addEventListener(`unhandledrejection`,e=>{A(`unhandledrejection`,e.reason)});function M(e,t){let n=W.createShaderModule({label:e,code:t});return n.getCompilationInfo().then(n=>{if(n.messages.length===0)return;let r=t.split(`
`),i=!1;for(let t of n.messages){let n=(r[t.lineNum-1]||``).trimEnd(),a=` `.repeat(Math.max(0,t.linePos-1))+`^`,o=`[shader:${e}] ${t.type.toUpperCase()} line ${t.lineNum}:${t.linePos} ${t.message}\n  ${n}\n  ${a}`;t.type===`error`?(i=!0,A(`shader:${e}`,Error(o))):t.type===`warning`?console.warn(o):console.info(o)}i||j(`shader:${e}`,`compiled with ${n.messages.length} non-error messages`)}).catch(t=>A(`shader:${e}:compilationInfo`,t)),n}var N={boids:{count:1e3,separationRadius:25,alignmentRadius:50,cohesionRadius:50,maxSpeed:2,maxForce:.05,visualRange:100},physics:{count:8e4,G:1,softening:1.5,distribution:`disk`,interactionStrength:1,tidalStrength:.008,attractorDecayRatio:.5,attractorDecayCap:2,haloMass:5,haloScale:2,diskMass:3,diskScaleA:1.5,diskScaleB:.3},physics_classic:{count:500,G:1,softening:.5,damping:.999,distribution:`random`},fluid:{resolution:256,viscosity:.1,diffusionRate:.001,forceStrength:100,volumeScale:1.5,dyeMode:`rainbow`,jacobiIterations:40},parametric:{shape:`torus`,scale:1,p1Min:.7,p1Max:1.3,p1Rate:.3,p2Min:.2,p2Max:.55,p2Rate:.5,p3Min:.15,p3Max:.45,p3Rate:.7,p4Min:.5,p4Max:2,p4Rate:.4,twistMin:0,twistMax:.4,twistRate:.15},reaction:{resolution:128,feed:.055,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Spots`}},Fe={boids:{Default:{...N.boids},"Tight Flock":{count:3e3,separationRadius:10,alignmentRadius:30,cohesionRadius:80,maxSpeed:3,maxForce:.08,visualRange:60},Dispersed:{count:2e3,separationRadius:60,alignmentRadius:100,cohesionRadius:20,maxSpeed:1.5,maxForce:.03,visualRange:200},Massive:{count:2e4,separationRadius:15,alignmentRadius:40,cohesionRadius:40,maxSpeed:2.5,maxForce:.04,visualRange:80},"Slow Dance":{count:500,separationRadius:40,alignmentRadius:80,cohesionRadius:100,maxSpeed:.5,maxForce:.01,visualRange:150}},physics:{Default:{...N.physics},"Spiral Galaxy":{count:1e5,G:1.5,softening:.15,distribution:`spiral`,interactionStrength:1,tidalStrength:.005,haloMass:8,haloScale:2.5,diskMass:4,diskScaleA:1.2,diskScaleB:.15},"Cosmic Web":{count:8e4,G:.8,softening:2,distribution:`web`,interactionStrength:1,tidalStrength:.025,haloMass:2,haloScale:4,diskMass:0,diskScaleA:1.5,diskScaleB:.3},"Star Cluster":{count:6e4,G:.3,softening:1.2,distribution:`cluster`,interactionStrength:1,tidalStrength:.001,haloMass:3,haloScale:1.5,diskMass:0,diskScaleA:1,diskScaleB:.5},Maelstrom:{count:12e4,G:.25,softening:2.5,distribution:`maelstrom`,interactionStrength:1.5,tidalStrength:.005,haloMass:6,haloScale:1.8,diskMass:5,diskScaleA:.8,diskScaleB:.2},"Dust Cloud":{count:15e4,G:.08,softening:3.5,distribution:`dust`,interactionStrength:.5,tidalStrength:.003,haloMass:1,haloScale:5,diskMass:0,diskScaleA:2,diskScaleB:.5},Binary:{count:8e4,G:.6,softening:1,distribution:`binary`,interactionStrength:1,tidalStrength:.04,haloMass:4,haloScale:2,diskMass:2,diskScaleA:1,diskScaleB:.25}},physics_classic:{Default:{...N.physics_classic},Galaxy:{count:3e3,G:.5,softening:1,damping:.998,distribution:`disk`},Collapse:{count:2e3,G:10,softening:.1,damping:.995,distribution:`shell`},Gentle:{count:1e3,G:.1,softening:2,damping:.9999,distribution:`random`}},fluid:{Default:{...N.fluid},Thick:{resolution:256,viscosity:.8,diffusionRate:.005,forceStrength:200,volumeScale:1.8,dyeMode:`rainbow`,jacobiIterations:40},Turbulent:{resolution:512,viscosity:.01,diffusionRate:1e-4,forceStrength:300,volumeScale:1.3,dyeMode:`rainbow`,jacobiIterations:60},"Ink Drop":{resolution:256,viscosity:.3,diffusionRate:0,forceStrength:50,volumeScale:2.1,dyeMode:`single`,jacobiIterations:40}},parametric:{Default:{shape:`torus`,scale:1,p1Min:.7,p1Max:1.3,p1Rate:.3,p2Min:.2,p2Max:.55,p2Rate:.5,p3Min:.15,p3Max:.45,p3Rate:.7,p4Min:.5,p4Max:2,p4Rate:.4,twistMin:0,twistMax:.4,twistRate:.15},"Rippling Ring":{shape:`torus`,scale:1,p1Min:.5,p1Max:1.5,p1Rate:.5,p2Min:.15,p2Max:.7,p2Rate:.7,p3Min:.3,p3Max:.8,p3Rate:1,p4Min:1,p4Max:3,p4Rate:.6,twistMin:0,twistMax:1,twistRate:.2},"Wild Möbius":{shape:`mobius`,scale:1.5,p1Min:.8,p1Max:2,p1Rate:.3,p2Min:1,p2Max:3,p2Rate:.15,p3Min:.2,p3Max:.6,p3Rate:.8,p4Min:.5,p4Max:2.5,p4Rate:.5,twistMin:1,twistMax:4,twistRate:.1},"Trefoil Pulse":{shape:`trefoil`,scale:1.2,p1Min:.08,p1Max:.35,p1Rate:.9,p2Min:.25,p2Max:.55,p2Rate:.4,p3Min:.3,p3Max:.9,p3Rate:1.2,p4Min:1,p4Max:4,p4Rate:.7,twistMin:0,twistMax:.5,twistRate:.2},"Klein Chaos":{shape:`klein`,scale:1.2,p1Min:.5,p1Max:1.5,p1Rate:.4,p2Min:0,p2Max:0,p2Rate:0,p3Min:.2,p3Max:.6,p3Rate:.9,p4Min:.8,p4Max:3.5,p4Rate:.5,twistMin:0,twistMax:.8,twistRate:.15}},reaction:{Spots:{resolution:128,feed:.055,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Spots`},Mazes:{resolution:128,feed:.029,kill:.057,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Mazes`},Worms:{resolution:128,feed:.058,kill:.065,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Worms`},Mitosis:{resolution:128,feed:.0367,kill:.0649,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Mitosis`},Coral:{resolution:128,feed:.062,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Coral`}}},Ie={boids:[{section:`Flock`,params:[{key:`count`,label:`Count`,min:100,max:3e4,step:100,requiresReset:!0},{key:`visualRange`,label:`Visual Range`,min:10,max:500,step:5}]},{section:`Forces`,params:[{key:`separationRadius`,label:`Separation`,min:1,max:100,step:1},{key:`alignmentRadius`,label:`Alignment`,min:1,max:200,step:1},{key:`cohesionRadius`,label:`Cohesion`,min:1,max:200,step:1},{key:`maxSpeed`,label:`Max Speed`,min:.1,max:10,step:.1},{key:`maxForce`,label:`Max Force`,min:.001,max:.5,step:.001}]}],physics:[{section:`Simulation`,params:[{key:`count`,label:`Bodies`,min:10,max:15e4,step:10,requiresReset:!0},{key:`G`,label:`Gravity (G)`,min:.05,max:5,step:.01},{key:`softening`,label:`Softening`,min:.2,max:4,step:.05},{key:`interactionStrength`,label:`Interaction Pull`,min:.1,max:3,step:.05},{key:`attractorDecayRatio`,label:`Decay Ratio`,min:.1,max:4,step:.05},{key:`attractorDecayCap`,label:`Decay Cap (s)`,min:.5,max:10,step:.1},{key:`tidalStrength`,label:`Tidal Field`,min:0,max:.05,step:5e-4}]},{section:`Initial State`,params:[{key:`distribution`,label:`Distribution`,type:`dropdown`,options:[`random`,`disk`,`shell`]}]},{section:`Dark Matter`,params:[{key:`haloMass`,label:`Halo Mass`,min:0,max:15,step:.1},{key:`haloScale`,label:`Halo Scale`,min:.5,max:8,step:.1},{key:`diskMass`,label:`Disk Mass`,min:0,max:10,step:.1},{key:`diskScaleA`,label:`Disk Scale A`,min:.1,max:5,step:.05},{key:`diskScaleB`,label:`Disk Scale B`,min:.05,max:2,step:.01}]}],physics_classic:[{section:`Simulation`,params:[{key:`count`,label:`Bodies`,min:10,max:1e4,step:10,requiresReset:!0},{key:`G`,label:`Gravity (G)`,min:.01,max:100,step:.01},{key:`softening`,label:`Softening`,min:.01,max:10,step:.01},{key:`damping`,label:`Damping`,min:.9,max:1,step:.001}]},{section:`Initial State`,params:[{key:`distribution`,label:`Distribution`,type:`dropdown`,options:[`random`,`disk`,`shell`],requiresReset:!0}]}],fluid:[{section:`Grid`,params:[{key:`resolution`,label:`Resolution`,type:`dropdown`,options:[64,128,256,512],requiresReset:!0}]},{section:`Physics`,params:[{key:`viscosity`,label:`Viscosity`,min:0,max:1,step:.01},{key:`diffusionRate`,label:`Diffusion`,min:0,max:.01,step:1e-4},{key:`forceStrength`,label:`Force`,min:1,max:500,step:1},{key:`jacobiIterations`,label:`Iterations`,min:10,max:80,step:5}]},{section:`Appearance`,params:[{key:`volumeScale`,label:`Volume`,min:.4,max:3,step:.05},{key:`dyeMode`,label:`Dye Mode`,type:`dropdown`,options:[`rainbow`,`single`,`temperature`]}]}],parametric:[{section:`Shape`,params:[{key:`shape`,label:`Equation`,type:`dropdown`,options:[`torus`,`klein`,`mobius`,`sphere`,`trefoil`]}]},{section:`Shape Parameters`,id:`shape-params-section`,params:[],dynamic:!0},{section:`Transform`,params:[{key:`scale`,label:`Scale`,min:.1,max:5,step:.1}]},{section:`Twist`,params:[{key:`twistMin`,label:`Min`,min:0,max:12.56,step:.05},{key:`twistMax`,label:`Max`,min:0,max:12.56,step:.05},{key:`twistRate`,label:`Rate`,min:0,max:3,step:.05}]},{section:`Wave Amplitude`,params:[{key:`p3Min`,label:`Min`,min:0,max:2,step:.05},{key:`p3Max`,label:`Max`,min:0,max:2,step:.05},{key:`p3Rate`,label:`Rate`,min:0,max:3,step:.05}]},{section:`Wave Frequency`,params:[{key:`p4Min`,label:`Min`,min:0,max:5,step:.1},{key:`p4Max`,label:`Max`,min:0,max:5,step:.1},{key:`p4Rate`,label:`Rate`,min:0,max:3,step:.05}]}],reaction:[{section:`Volume`,params:[{key:`resolution`,label:`Resolution`,type:`dropdown`,options:[64,128],requiresReset:!0},{key:`stepsPerFrame`,label:`Steps/Frame`,min:1,max:12,step:1}]},{section:`Reaction`,params:[{key:`feed`,label:`Feed`,min:.01,max:.1,step:5e-4},{key:`kill`,label:`Kill`,min:.03,max:.08,step:5e-4},{key:`Du`,label:`Du`,min:.05,max:.35,step:.001},{key:`Dv`,label:`Dv`,min:.02,max:.2,step:.001}]},{section:`Render`,params:[{key:`isoThreshold`,label:`Iso Threshold`,min:.05,max:.6,step:.01}]}]},Le={Dracula:{primary:`#BD93F9`,secondary:`#FF79C6`,accent:`#50FA7B`,bg:`#282A36`,fg:`#F8F8F2`},Nord:{primary:`#88C0D0`,secondary:`#81A1C1`,accent:`#A3BE8C`,bg:`#2E3440`,fg:`#D8DEE9`},Monokai:{primary:`#AE81FF`,secondary:`#F82672`,accent:`#A5E22E`,bg:`#272822`,fg:`#D6D6D6`},"Rose Pine":{primary:`#C4A7E7`,secondary:`#EBBCBA`,accent:`#9CCFD8`,bg:`#191724`,fg:`#E0DEF4`},Gruvbox:{primary:`#85A598`,secondary:`#F9BD2F`,accent:`#B7BB26`,bg:`#282828`,fg:`#FBF1C7`},Solarized:{primary:`#268BD2`,secondary:`#2AA198`,accent:`#849900`,bg:`#002B36`,fg:`#839496`},"Tokyo Night":{primary:`#BB9AF7`,secondary:`#7AA2F7`,accent:`#9ECE6A`,bg:`#1A1B26`,fg:`#A9B1D6`},Catppuccin:{primary:`#F5C2E7`,secondary:`#CBA6F7`,accent:`#ABE9B3`,bg:`#181825`,fg:`#CDD6F4`},"Atom One":{primary:`#61AFEF`,secondary:`#C678DD`,accent:`#62F062`,bg:`#282C34`,fg:`#ABB2BF`},Flexoki:{primary:`#205EA6`,secondary:`#24837B`,accent:`#65800B`,bg:`#100F0F`,fg:`#FFFCF0`}},Re=`Dracula`,ze=12e3,Be={r:.02,g:.02,b:.025,a:1};function Ve(e){let t=parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function He(e){let t=Le[e]||Le[Re];return{primary:Ve(t.primary),secondary:Ve(t.secondary),accent:Ve(t.accent),bg:Ve(t.bg),fg:Ve(t.fg),clearColor:{r:Ve(t.bg)[0],g:Ve(t.bg)[1],b:Ve(t.bg)[2],a:1}}}function Ue(e,t,n){return e.map((e,r)=>e+(t[r]-e)*n)}function We(e,t,n){let r=Ue(e.bg,t.bg,n);return{primary:Ue(e.primary,t.primary,n),secondary:Ue(e.secondary,t.secondary,n),accent:Ue(e.accent,t.accent,n),bg:r,fg:Ue(e.fg,t.fg,n),clearColor:{r:r[0],g:r[1],b:r[2],a:1}}}var Ge={from:He(Re),to:He(Re),startedAtMs:0},Ke=He(Re);function qe(e){let t=Math.max(0,Math.min(1,(e-Ge.startedAtMs)/ze));return We(Ge.from,Ge.to,t)}function P(){return Ke}function Je(e){Ke=qe(e)}function Ye(e){let t=He(e);Ge.from=t,Ge.to=t,Ge.startedAtMs=0,Ke=t}function Xe(e,t=performance.now()){let n=He(e),r=qe(t);Ge.from=r,Ge.to=n,Ge.startedAtMs=t,Ke=r}function Ze(e){return F[e]}var F={mode:`physics`,colorTheme:`Dracula`,xrEnabled:!1,paused:!1,boids:{...N.boids},physics:{...N.physics},physics_classic:{...N.physics_classic},fluid:{...N.fluid},parametric:{...N.parametric},reaction:{...N.reaction},camera:{distance:5,fov:60,rotX:.3,rotY:0,panX:0,panY:0},mouse:{down:!1,x:0,y:0,dx:0,dy:0,worldX:0,worldY:0,worldZ:0},attractors:[],pointerToAttractor:new Map,fx:{bloomIntensity:.7,bloomThreshold:4,bloomRadius:1,trailPersistence:0,exposure:1,vignette:.35,chromaticAberration:.25,grading:.5,timeScale:1},debug:{xrLog:!1}},Qe=.016,$e=1/Qe,et=90,tt=32,nt=3;function rt(){let e=K.physics;return e&&`getSimStep`in e?e.getSimStep():0}function it(){let e=K.physics;return e&&`getTimeDirection`in e?e.getTimeDirection():1}function at(e){let t=F.physics.attractorDecayRatio??.5,n=(F.physics.attractorDecayCap??2)*$e;return Math.max(nt,Math.min(n,t*e.holdSteps))}function ot(e,t,n){if(e.releaseStep<0||t<e.releaseStep){let r=Math.max(0,t-e.chargeStep),i=Math.min(1,r/et);return i*i*n}let r=Math.min(1,e.holdSteps/et),i=r*r*n,a=t-e.releaseStep,o=at(e);if(a>=o)return 0;let s=1-a/o;return i*s*s}function st(e,t){return e.releaseStep<0?!1:t-e.releaseStep>=at(e)}function ct(e){if(it()<0)return;let t=[],n=new Map;for(let r=0;r<F.attractors.length;r++){let i=F.attractors[r];st(i,e)||(n.set(r,t.length),t.push(i))}F.attractors=t;let r=new Map;F.pointerToAttractor.forEach((e,t)=>{let i=n.get(e);i!==void 0&&r.set(t,i)}),F.pointerToAttractor=r}function lt(e,t){if(it()<0)return;if(F.attractors.length>=tt){F.attractors.shift();let e=new Map;F.pointerToAttractor.forEach((t,n)=>{t>0&&e.set(n,t-1)}),F.pointerToAttractor=e}let n=rt();F.attractors.push({x:t[0],y:t[1],z:t[2],chargeStep:n,releaseStep:-1,holdSteps:-1}),F.pointerToAttractor.set(e,F.attractors.length-1)}function ut(e,t){let n=F.pointerToAttractor.get(e);if(n===void 0)return;let r=F.attractors[n];!r||r.releaseStep>=0||(r.x=t[0],r.y=t[1],r.z=t[2])}function dt(e){let t=F.pointerToAttractor.get(e);if(t===void 0)return;F.pointerToAttractor.delete(e);let n=F.attractors[t];if(!n||n.releaseStep>=0)return;let r=rt();n.releaseStep=r,n.holdSteps=Math.max(1,r-n.chargeStep)}var ft=96,pt=4,mt=208,I=256,ht=500,gt={torus:0,klein:1,mobius:2,sphere:3,trefoil:4},_t={torus:{p1:{label:`Major Radius`,animMin:.7,animMax:1.3,animRate:.3,min:.2,max:2.5,step:.05},p2:{label:`Minor Radius`,animMin:.2,animMax:.6,animRate:.5,min:.05,max:1.2,step:.05}},klein:{p1:{label:`Bulge`,animMin:.7,animMax:1.5,animRate:.4,min:.2,max:3,step:.05}},mobius:{p1:{label:`Width`,animMin:.5,animMax:1.8,animRate:.35,min:.1,max:3,step:.05},p2:{label:`Half-Twists`,animMin:1,animMax:3,animRate:.15,min:.5,max:5,step:.5}},sphere:{p1:{label:`XY Stretch`,animMin:.6,animMax:1.5,animRate:.4,min:.1,max:3,step:.05},p2:{label:`Z Stretch`,animMin:.5,animMax:1.8,animRate:.6,min:.1,max:3,step:.05}},trefoil:{p1:{label:`Tube Radius`,animMin:.08,animMax:.35,animRate:.6,min:.05,max:1,step:.05},p2:{label:`Knot Scale`,animMin:.25,animMax:.5,animRate:.35,min:.1,max:1,step:.05}}},L={identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])},perspective(e,t,n,r){let i=1/Math.tan(e*.5),a=1/(n-r),o=new Float32Array(16);return o[0]=i/t,o[5]=i,o[10]=r*a,o[11]=-1,o[14]=n*r*a,o},lookAt(e,t,n){let r=R(B(e,t)),i=R(z(n,r)),a=z(r,i);return new Float32Array([i[0],a[0],r[0],0,i[1],a[1],r[1],0,i[2],a[2],r[2],0,-V(i,e),-V(a,e),-V(r,e),1])},multiply(e,t){let n=new Float32Array(16);for(let r=0;r<4;r++)for(let i=0;i<4;i++)n[i*4+r]=e[r]*t[i*4]+e[4+r]*t[i*4+1]+e[8+r]*t[i*4+2]+e[12+r]*t[i*4+3];return n},rotateX(e,t){let n=Math.cos(t),r=Math.sin(t),i=L.identity();return i[5]=n,i[6]=r,i[9]=-r,i[10]=n,L.multiply(e,i)},rotateY(e,t){let n=Math.cos(t),r=Math.sin(t),i=L.identity();return i[0]=n,i[2]=-r,i[8]=r,i[10]=n,L.multiply(e,i)},rotateZ(e,t){let n=Math.cos(t),r=Math.sin(t),i=L.identity();return i[0]=n,i[1]=r,i[4]=-r,i[5]=n,L.multiply(e,i)},translate(e,t,n,r){let i=L.identity();return i[12]=t,i[13]=n,i[14]=r,L.multiply(e,i)}};function R(e){let t=Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);return t>0?[e[0]/t,e[1]/t,e[2]/t]:[0,0,0]}function z(e,t){return[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]]}function B(e,t){return[e[0]-t[0],e[1]-t[1],e[2]-t[2]]}function V(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function vt(){let e=F.camera,t=[e.distance*Math.cos(e.rotX)*Math.sin(e.rotY),e.distance*Math.sin(e.rotX),e.distance*Math.cos(e.rotX)*Math.cos(e.rotY)];return{eye:t,view:L.lookAt(t,[e.panX,e.panY,0],[0,1,0]),proj:null}}var yt=null,bt=null,H={scene:[],sceneIdx:0,depth:null,bloomMips:[],width:0,height:0,needsClear:!0,linSampler:null,fadePipeline:null,downsamplePipeline:null,upsamplePipelineAdditive:null,upsamplePipelineReplace:null,compositePipelines:new Map,fadeBGL:null,downsampleBGL:null,upsampleBGL:null,compositeBGL:null,fadeUBO:null,downsampleUBO:[],upsampleUBO:[],compositeUBO:null,sceneViews:[],bloomMipViews:[],fadeBGs:[],downsampleBGs:[],upsampleBGs:[],fadeParams:new Float32Array(4),downsampleParams:[],upsampleParams:[],compositeBGs:[],compositeParams:new Float32Array(148)},xt=`rgba16float`,St=3;function Ct(){H.linSampler=W.createSampler({magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`}),H.fadeBGL=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),H.downsampleBGL=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),H.upsampleBGL=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),H.compositeBGL=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]});let e=M(`post.fade`,Oe),t=M(`post.downsample`,ke),n=M(`post.upsample`,Ae);H.fadePipeline=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[H.fadeBGL]}),vertex:{module:e,entryPoint:`vs_main`},fragment:{module:e,entryPoint:`fs_main`,targets:[{format:xt}]},primitive:{topology:`triangle-list`}}),H.downsamplePipeline=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[H.downsampleBGL]}),vertex:{module:t,entryPoint:`vs_main`},fragment:{module:t,entryPoint:`fs_main`,targets:[{format:xt}]},primitive:{topology:`triangle-list`}}),H.upsamplePipelineAdditive=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[H.upsampleBGL]}),vertex:{module:n,entryPoint:`vs_main`},fragment:{module:n,entryPoint:`fs_main`,targets:[{format:xt,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`}}),H.upsamplePipelineReplace=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[H.upsampleBGL]}),vertex:{module:n,entryPoint:`vs_main`},fragment:{module:n,entryPoint:`fs_main`,targets:[{format:xt}]},primitive:{topology:`triangle-list`}}),H.fadeUBO=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),H.downsampleUBO=[],H.upsampleUBO=[];for(let e=0;e<St;e++)H.downsampleUBO.push(W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})),H.upsampleUBO.push(W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));H.compositeUBO=W.createBuffer({size:592,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),H.fadeParams=new Float32Array(4),H.compositeParams=new Float32Array(148),H.downsampleParams=[],H.upsampleParams=[];for(let e=0;e<St;e++)H.downsampleParams.push(new Float32Array(4)),H.upsampleParams.push(new Float32Array(4))}function wt(e){let t=H.compositePipelines.get(e);if(t)return t;let n=M(`post.composite`,je);return t=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[H.compositeBGL]}),vertex:{module:n,entryPoint:`vs_main`},fragment:{module:n,entryPoint:`fs_main`,targets:[{format:e}]},primitive:{topology:`triangle-list`}}),H.compositePipelines.set(e,t),t}function Tt(e,t){if(H.width===e&&H.height===t&&H.scene.length===2)return;for(let e of H.scene)e.destroy();for(let e of H.bloomMips)e.destroy();H.depth?.destroy(),H.scene=[],H.bloomMips=[],H.width=e,H.height=t;for(let n=0;n<2;n++)H.scene.push(W.createTexture({size:[e,t],format:xt,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));H.depth=W.createTexture({size:[e,t],format:`depth24plus`,usage:GPUTextureUsage.RENDER_ATTACHMENT});let n=Math.max(1,Math.floor(e/2)),r=Math.max(1,Math.floor(t/2));for(let e=0;e<St;e++)H.bloomMips.push(W.createTexture({size:[n,r],format:xt,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING})),n=Math.max(1,Math.floor(n/2)),r=Math.max(1,Math.floor(r/2));H.needsClear=!0,H.sceneViews=H.scene.map(e=>e.createView()),H.bloomMipViews=H.bloomMips.map(e=>e.createView()),H.fadeBGs=H.sceneViews.map(e=>W.createBindGroup({layout:H.fadeBGL,entries:[{binding:0,resource:e},{binding:1,resource:H.linSampler},{binding:2,resource:{buffer:H.fadeUBO}}]})),H.downsampleBGs=[];for(let e=0;e<2;e++)H.downsampleBGs.push(W.createBindGroup({layout:H.downsampleBGL,entries:[{binding:0,resource:H.sceneViews[e]},{binding:1,resource:H.linSampler},{binding:2,resource:{buffer:H.downsampleUBO[0]}}]}));for(let e=1;e<St;e++)H.downsampleBGs.push(W.createBindGroup({layout:H.downsampleBGL,entries:[{binding:0,resource:H.bloomMipViews[e-1]},{binding:1,resource:H.linSampler},{binding:2,resource:{buffer:H.downsampleUBO[e]}}]}));H.upsampleBGs=H.bloomMipViews.map((e,t)=>W.createBindGroup({layout:H.upsampleBGL,entries:[{binding:0,resource:e},{binding:1,resource:H.linSampler},{binding:2,resource:{buffer:H.upsampleUBO[t]}}]})),H.compositeBGs=H.sceneViews.map(e=>W.createBindGroup({layout:H.compositeBGL,entries:[{binding:0,resource:e},{binding:1,resource:H.bloomMipViews[0]},{binding:2,resource:H.linSampler},{binding:3,resource:{buffer:H.compositeUBO}}]}))}function U(){return H.scene[H.sceneIdx].createView()}function Et(e,t,n){let r=F.fx.trailPersistence>.001&&!H.needsClear;return{view:U(),clearValue:Be,loadOp:r?`load`:`clear`,storeOp:`store`}}function Dt(e,t){return{view:bt??H.depth.createView(),depthClearValue:1,depthLoadOp:`clear`,depthStoreOp:`store`}}function Ot(e){return e}function kt(e){let t=P(),n=new Float32Array(52);if(yt)n.set(yt.viewMatrix,0),n.set(yt.projMatrix,16),n.set(yt.eye,32);else{let t=vt(),r=F.camera.fov*Math.PI/180,i=L.perspective(r,e,.01,ht);n.set(t.view,0),n.set(i,16),n.set(t.eye,32)}n.set(t.primary,36),n.set(t.secondary,40),n.set(t.accent,44);let r=F.mouse;return n[48]=r.worldX,n[49]=r.worldY,n[50]=r.worldZ,n[51]=r.down?1:0,n}var W,G,At,jt,Mt,Nt=1;async function Pt(){let e=document.getElementById(`fallback`),t=t=>{e.querySelector(`p`).textContent=t,e.classList.add(`visible`)};if(!navigator.gpu)return t(`navigator.gpu not found. This browser may not support WebGPU, or it may need to be enabled in settings.`),!1;let n;try{n=await navigator.gpu.requestAdapter({powerPreference:`high-performance`,xrCompatible:!0})}catch(e){return t(`requestAdapter() failed: ${e.message}`),!1}if(!n)return t(`requestAdapter() returned null. WebGPU may be available but no suitable GPU adapter was found.`),!1;try{let e=[];n.features.has(`timestamp-query`)&&e.push(`timestamp-query`),W=await n.requestDevice({requiredFeatures:e})}catch(e){return t(`requestDevice() failed: ${e.message}`),!1}return Bi(),W.lost.then(e=>{A(`webgpu:device-lost`,Error(e.message),`reason=${e.reason}`),e.reason!==`destroyed`&&Pt().then(e=>{e&&(Vt(),Gi(),requestAnimationFrame(Qi))})}),W.onuncapturederror=e=>{A(`webgpu:uncaptured`,e.error)},G=document.getElementById(`gpu-canvas`),At=G.getContext(`webgpu`),jt=navigator.gpu.getPreferredCanvasFormat(),Mt=`rgba16float`,Nt=1,At.configure({device:W,format:jt,alphaMode:`opaque`}),Ct(),!0}function Ft(e,t){H.needsClear=!0}var It,Lt,Rt,zt,Bt=0;function Vt(){Rt?.destroy(),zt?.destroy(),Rt=W.createBuffer({size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),zt=W.createBuffer({size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let e=M(`grid`,De),t=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]});It=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[t]}),vertex:{module:e,entryPoint:`vs_main`},fragment:{module:e,entryPoint:`fs_main`,targets:[{format:Mt,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:Nt}}),Lt=[0,1].map(e=>W.createBindGroup({layout:t,entries:[{binding:0,resource:{buffer:Rt,offset:e*I,size:mt}},{binding:1,resource:{buffer:zt}}]}))}function Ht(e,t,n=0){Bt+=.016,W.queue.writeBuffer(Rt,n*I,kt(t)),W.queue.writeBuffer(zt,0,new Float32Array([Bt])),e.setPipeline(It),e.setBindGroup(0,Lt[n]),e.draw(30)}var K={};function Ut(){let e=F.boids.count,t=e*32,n=new Float32Array(e*8);for(let t=0;t<e;t++){let e=t*8;n[e]=(Math.random()-.5)*2*2,n[e+1]=(Math.random()-.5)*2*2,n[e+2]=(Math.random()-.5)*2*2,n[e+4]=(Math.random()-.5)*.5,n[e+5]=(Math.random()-.5)*.5,n[e+6]=(Math.random()-.5)*.5}let r=W.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(r.getMappedRange()).set(n),r.unmap();let i=W.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),a=W.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),o=W.createBuffer({size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),s=M(`boids.compute`,rr||`struct Particle {
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
`),c=M(`boids.render`,ir||`struct Camera {
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
`),l=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),u=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[l]}),compute:{module:s,entryPoint:`main`}}),d=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),f=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[d]}),vertex:{module:c,entryPoint:`vs_main`},fragment:{module:c,entryPoint:`fs_main`,targets:[{format:Mt}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:Nt}}),p=[W.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:r}},{binding:1,resource:{buffer:i}},{binding:2,resource:{buffer:a}}]}),W.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:i}},{binding:1,resource:{buffer:r}},{binding:2,resource:{buffer:a}}]})],m=[0,1].map(e=>[r,i].map(t=>W.createBindGroup({layout:d,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:o,offset:e*I,size:mt}}]}))),h=0,g={};return{compute(t){let n=F.boids,r=F.mouse,i=new Float32Array(16);i[0]=.016*F.fx.timeScale,i[1]=n.separationRadius/50,i[2]=n.alignmentRadius/50,i[3]=n.cohesionRadius/50,i[4]=n.maxSpeed,i[5]=n.maxForce,i[6]=n.visualRange/50,i[8]=2,i[9]=r.worldX,i[10]=r.worldY,i[11]=r.worldZ,i[12]=r.down?1:0,new Uint32Array(i.buffer)[7]=e,W.queue.writeBuffer(a,0,i);let o=t.beginComputePass();o.setPipeline(u),o.setBindGroup(0,p[h]),o.dispatchWorkgroups(Math.ceil(e/64)),o.end(),h=1-h},render(t,n,r,i=0){let a=r?r[2]/r[3]:G.width/G.height;W.queue.writeBuffer(o,i*I,kt(a));let s=t.beginRenderPass({colorAttachments:[Et(g,n,r)],depthStencilAttachment:Dt(g,r)}),c=Ot(r);c&&s.setViewport(c[0],c[1],c[2],c[3],0,1),Ht(s,a,i),s.setPipeline(f),s.setBindGroup(0,m[i][h]),s.draw(3,e),s.end()},getCount(){return e},destroy(){r.destroy(),i.destroy(),a.destroy(),o.destroy()}}}function Wt(){let e=F.physics.count,t=e*48,n=.2,r=.18,i=Math.min(e,Math.max(1,Math.round(e*.03))),a=Math.min(e-i,Math.max(1,Math.round(e*.1))),o=Math.min(i+a,8192),s=.8,c=1.8,l=.3,u=.9,d=F.physics.haloMass??5,f=F.physics.haloScale??2,p=F.physics.diskMass??3,m=F.physics.diskScaleA??1.5,h=F.physics.diskScaleB??.3;function g(e){let t=e*e,n=t+f*f,r=d*t/(n*Math.sqrt(n)),i=m+h,a=t+i*i;return r+p*t/(a*Math.sqrt(a))}let _=new Float32Array(e*12),v=F.physics.distribution,y=R([.18,1,-.12]),b=R(z([0,1,0],y)),x=z(y,b);for(let t=0;t<e;t++){let d=t*12,f,p,m,h=0,S=0,C=0,w=0,ee=t===0,T=t<i,E=t>=i&&t<o;if(ee)f=0,p=0,m=0,h=0,S=0,C=0,w=2;else if(T||E)if(v===`spiral`){let e=3.5,t=Math.exp(-5*Math.random())*e,n=Math.random()*Math.PI*2,r=(Math.random()-.5)*.2;f=b[0]*Math.cos(n)*t+x[0]*Math.sin(n)*t+y[0]*r,p=b[1]*Math.cos(n)*t+x[1]*Math.sin(n)*t+y[1]*r,m=b[2]*Math.cos(n)*t+x[2]*Math.sin(n)*t+y[2]*r;let i=-1/5*Math.exp(-5*t/e)+1/5,a=-1/5*Math.exp(-5)+1/5,d=1e3*((s+c+l+u)/4),_=(F.physics.G??1.5)*.001/Math.sqrt(Math.max(1,o)/1e3),v=Math.sqrt(Math.max(.001,i/a*_*d/Math.max(t,.05)+g(t)));h=(-Math.sin(n)*b[0]+Math.cos(n)*x[0])*v,S=(-Math.sin(n)*b[1]+Math.cos(n)*x[1])*v,C=(-Math.sin(n)*b[2]+Math.cos(n)*x[2])*v,w=T?s+Math.random()**.4*(c-s):l+Math.random()**.7*(u-l)}else{let e=T?t-1:t-i,n=T?Math.max(1,i-1):a,r=n>1?e/(n-1):.5,o=T?.2:.5,d=T?2.5:4,g=T?.05:.1,_=o+(d-o)*r+(Math.random()-.5)*g,v=T?.12:.2,ee=(Math.random()-.5)*v,E=T?Math.PI*.18:Math.PI/Math.max(3,a),D=e/Math.max(1,n)*Math.PI*2+E;f=b[0]*Math.cos(D)*_+x[0]*Math.sin(D)*_+y[0]*ee,p=b[1]*Math.cos(D)*_+x[1]*Math.sin(D)*_+y[1]*ee,m=b[2]*Math.cos(D)*_+x[2]*Math.sin(D)*_+y[2]*ee;let O=.6/Math.sqrt(_+.05);h=(-Math.sin(D)*b[0]+Math.cos(D)*x[0])*O,S=(-Math.sin(D)*b[1]+Math.cos(D)*x[1])*O,C=(-Math.sin(D)*b[2]+Math.cos(D)*x[2])*O,w=T?s+Math.random()**.4*(c-s):l+Math.random()**.7*(u-l)}else if(v===`spiral`){let n=3.5;if((t-o)/Math.max(1,e-o)<.04){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=.3+Math.random()**.5*4;f=n*Math.sin(t)*Math.cos(e),p=n*Math.sin(t)*Math.sin(e),m=n*Math.cos(t);let r=.12+Math.random()*.1,i=R(z(R([f,p,m]),[.3,1,-.2]));h=i[0]*r,S=i[1]*r,C=i[2]*r,w=.01+Math.random()*.05}else{let e=Math.exp(-5*Math.random())*n,t=Math.random()*Math.PI*2,r=(-1/5*Math.exp(-5*e/n)+1/5)/(-1/5*Math.exp(-5)+1/5)*(1e3*(((s+c)/2+(l+u)/2)/2)),i=(F.physics.G??1.5)*.001/Math.sqrt(Math.max(1,o)/1e3),a=Math.sqrt(Math.max(.001,i*r/Math.max(e,.05)+g(e))),d=(Math.random()-.5)*(.25+e*.05);f=b[0]*Math.cos(t)*e+x[0]*Math.sin(t)*e+y[0]*d,p=b[1]*Math.cos(t)*e+x[1]*Math.sin(t)*e+y[1]*d,m=b[2]*Math.cos(t)*e+x[2]*Math.sin(t)*e+y[2]*d,h=(-Math.sin(t)*b[0]+Math.cos(t)*x[0])*a,S=(-Math.sin(t)*b[1]+Math.cos(t)*x[1])*a,C=(-Math.sin(t)*b[2]+Math.cos(t)*x[2])*a,w=Math.random()**2*.8}}else if(v===`disk`){let i=Math.random()*Math.PI*2,a=Math.sqrt(Math.random())*4.5;w=Math.random()**3*.8;let s=(t-o)/Math.max(1,e-o);if(s<.03){let e=(Math.random()-.5)*n*.5;f=b[0]*Math.cos(i)*a+x[0]*Math.sin(i)*a+y[0]*e,p=b[1]*Math.cos(i)*a+x[1]*Math.sin(i)*a+y[1]*e,m=b[2]*Math.cos(i)*a+x[2]*Math.sin(i)*a+y[2]*e;let t=Math.sqrt(Math.max(.001,g(a)));h=(Math.sin(i)*b[0]-Math.cos(i)*x[0])*t,S=(Math.sin(i)*b[1]-Math.cos(i)*x[1])*t,C=(Math.sin(i)*b[2]-Math.cos(i)*x[2])*t,w=.1+Math.random()*.3}else if(s<.12){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=.5+Math.sqrt(Math.random())*3.5;f=n*Math.sin(t)*Math.cos(e),p=n*Math.sin(t)*Math.sin(e),m=n*Math.cos(t);let r=.15+Math.random()*.15,i=R(z(R([f,p,m]),[.3,1,-.2]));h=i[0]*r,S=i[1]*r,C=i[2]*r,w=.02+Math.random()*.1}else{let e=(Math.random()-.5)*n*(.35+a*.4);f=b[0]*Math.cos(i)*a+x[0]*Math.sin(i)*a+y[0]*e,p=b[1]*Math.cos(i)*a+x[1]*Math.sin(i)*a+y[1]*e,m=b[2]*Math.cos(i)*a+x[2]*Math.sin(i)*a+y[2]*e;let t=Math.sqrt(Math.max(.001,g(a)));h=(-Math.sin(i)*b[0]+Math.cos(i)*x[0])*t+y[0]*e*r,S=(-Math.sin(i)*b[1]+Math.cos(i)*x[1])*t+y[1]*e*r,C=(-Math.sin(i)*b[2]+Math.cos(i)*x[2])*t+y[2]*e*r}}else if(v===`web`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=3+(Math.random()-.5)*1.5;f=n*Math.sin(t)*Math.cos(e),p=n*Math.sin(t)*Math.sin(e),m=n*Math.cos(t);let r=2.5,i=Math.round(f/r)*r,a=Math.round(p/r)*r,o=Math.round(m/r)*r,s=.15+Math.random()*.1;f+=(i-f)*s,p+=(a-p)*s,m+=(o-m)*s;let c=R([f,p,m]),l=.02+Math.random()*.03;h=-c[0]*l,S=-c[1]*l,C=-c[2]*l,w=Math.random()**2*.6}else if(v===`cluster`){let e=t%5,n=e/5*Math.PI*2+.7,r=1.2+e*.3,i=Math.cos(n)*r,a=(e-2)*.4,o=Math.sin(n)*r,s=Math.random(),c=.6*s**.33/(1-s*s+.01)**.25,l=Math.random()*Math.PI*2,u=Math.acos(2*Math.random()-1);f=i+c*Math.sin(u)*Math.cos(l),p=a+c*Math.sin(u)*Math.sin(l),m=o+c*Math.cos(u);let d=.1+Math.random()*.12,g=R(z(R([f-i,p-a,m-o]),[.2,1,-.3]));h=g[0]*d,S=g[1]*d,C=g[2]*d,w=Math.random()**2.5*1}else if(v===`maelstrom`){let e=t%4,n=1+e*1.2+(Math.random()-.5)*.4,r=(e-1.5)*.35,i=R([Math.sin(r*1.3),Math.cos(r),Math.sin(r*.7)]),a=R(z([0,1,0],i)),o=z(i,a),s=Math.random()*Math.PI*2,c=(Math.random()-.5)*.15;f=a[0]*Math.cos(s)*n+o[0]*Math.sin(s)*n+i[0]*c,p=a[1]*Math.cos(s)*n+o[1]*Math.sin(s)*n+i[1]*c,m=a[2]*Math.cos(s)*n+o[2]*Math.sin(s)*n+i[2]*c;let l=(e%2==0?1:-1)*(1.2+e*.3)/Math.sqrt(n+.1);h=(-Math.sin(s)*a[0]+Math.cos(s)*o[0])*l,S=(-Math.sin(s)*a[1]+Math.cos(s)*o[1])*l,C=(-Math.sin(s)*a[2]+Math.cos(s)*o[2])*l,w=Math.random()**3*.5}else if(v===`dust`){f=(Math.random()-.5)*6,p=(Math.random()-.5)*6,m=(Math.random()-.5)*6;let e=.8,t=.08;h=Math.sin(p*e+1.3)*Math.cos(m*e+.7)*t,S=Math.sin(m*e+2.1)*Math.cos(f*e+1.1)*t,C=Math.sin(f*e+.5)*Math.cos(p*e+2.5)*t,w=Math.random()**4*.4}else if(v===`binary`){let e=Math.random()<.45,t=Math.sqrt(Math.random())*2.2,n=Math.random()*Math.PI*2,r=e?.25:-.15,i=R([r,1,r*.5]),a=R(z([0,1,0],i)),o=z(i,a),s=(Math.random()-.5)*.15;f=a[0]*Math.cos(n)*t+o[0]*Math.sin(n)*t+i[0]*s+(e?1.8:-1.8),p=a[1]*Math.cos(n)*t+o[1]*Math.sin(n)*t+i[1]*s+(e?.3:-.3),m=a[2]*Math.cos(n)*t+o[2]*Math.sin(n)*t+i[2]*s;let c=.7/Math.sqrt(t+.15),l=e?.12:-.12;if(h=(-Math.sin(n)*a[0]+Math.cos(n)*o[0])*c+l*.3,S=(-Math.sin(n)*a[1]+Math.cos(n)*o[1])*c,C=(-Math.sin(n)*a[2]+Math.cos(n)*o[2])*c+l,Math.random()<.1){let e=Math.random();f=-1.8+e*3.6+(Math.random()-.5)*.8,p=-.3+e*.6+(Math.random()-.5)*.5,m=(Math.random()-.5)*.6,h=(Math.random()-.5)*.1,S=(Math.random()-.5)*.05,C=(Math.random()-.5)*.1}w=Math.random()**2.5*.7}else if(v===`shell`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=1.5+Math.random()*.1;f=n*Math.sin(t)*Math.cos(e),p=n*Math.sin(t)*Math.sin(e),m=n*Math.cos(t);let r=R([f,p,m]),i=R(z(r,[.3,1,-.2])),a=z(r,i),o=.18+Math.random()*.08;h=(i[0]+a[0]*.35)*o,S=(i[1]+a[1]*.35)*o,C=(i[2]+a[2]*.35)*o,w=Math.random()**3*.8}else f=(Math.random()-.5)*4,p=(Math.random()-.5)*4,m=(Math.random()-.5)*4,h=(Math.random()-.5)*.12,S=(Math.random()-.5)*.12,C=(Math.random()-.5)*.12,w=Math.random()**3*.8;_[d]=f,_[d+1]=p,_[d+2]=m,_[d+3]=w,_[d+4]=h,_[d+5]=S,_[d+6]=C,_[d+8]=0,_[d+9]=0,_[d+10]=0}let S=W.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,mappedAtCreation:!0});new Float32Array(S.getMappedRange()).set(_),S.unmap();let C=W.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC}),w=W.createBuffer({size:608,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),ee=W.createBuffer({size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),T=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),E=new Float32Array(4);W.queue.writeBuffer(T,0,E);let D=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,O=16384*128,te=W.createBuffer({size:O*4,usage:D}),ne=W.createBuffer({size:O*4,usage:D}),re=[],ie=[];for(let e=0;e<6;e++){let t=128>>e,n=t*t*t*4;re.push(W.createBuffer({size:n,usage:D})),ie.push(W.createBuffer({size:n,usage:D}))}let ae=W.createBuffer({size:e*16,usage:D}),oe=W.createBuffer({size:16,usage:D}),se=[ne];for(let e=1;e<6;e++){let t=128>>e;se.push(W.createBuffer({size:t*t*t*4,usage:D}))}let ce=W.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),le=new ArrayBuffer(32),ue=new Float32Array(le),de=new Uint32Array(le);de[1]=e,de[2]=128,ue[3]=16,ue[4]=.25,ue[5]=65536,de[6]=O;let fe=M(`pm.deposit`,xe),pe=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),me=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[pe]}),compute:{module:fe,entryPoint:`main`}}),he=M(`pm.density_convert`,Se),ge=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),_e=W.createPipelineLayout({bindGroupLayouts:[ge]}),ve=W.createComputePipeline({layout:_e,compute:{module:he,entryPoint:`reduce`}}),ye=W.createComputePipeline({layout:_e,compute:{module:he,entryPoint:`convert`}}),De=W.createBindGroup({layout:ge,entries:[{binding:0,resource:{buffer:te}},{binding:1,resource:{buffer:ne}},{binding:2,resource:{buffer:oe}},{binding:3,resource:{buffer:ce}}]}),Oe=[W.createBindGroup({layout:pe,entries:[{binding:0,resource:{buffer:S}},{binding:1,resource:{buffer:te}},{binding:2,resource:{buffer:ce}}]}),W.createBindGroup({layout:pe,entries:[{binding:0,resource:{buffer:C}},{binding:1,resource:{buffer:te}},{binding:2,resource:{buffer:ce}}]})],ke=W.createBuffer({size:O*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),Ae=!1,je=M(`pm.smooth`,Ce),Me=M(`pm.residual`,we),Ne=M(`pm.restrict`,Te),k=M(`pm.prolong`,Ee),Pe=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),A=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),j=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),N=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),Fe=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[Pe]}),compute:{module:je,entryPoint:`main`}}),Ie=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[A]}),compute:{module:Me,entryPoint:`main`}}),Le=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[j]}),compute:{module:Ne,entryPoint:`main`}}),Re=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[N]}),compute:{module:k,entryPoint:`main`}}),ze=4*Math.PI*(F.physics.G??1.5)*.001/Math.sqrt(Math.max(1,o)/1e3),Be=[],Ve=[],He=[],Ue=[];for(let e=0;e<6;e++){let t=128>>e,n=32/t,r=n*n;Be.push([0,1].map(e=>{let n=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),i=new ArrayBuffer(16);return new Uint32Array(i,0,2).set([t,e]),new Float32Array(i,8,2).set([r,ze]),W.queue.writeBuffer(n,0,i),n}));{let e=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),n=new ArrayBuffer(16);new Uint32Array(n,0,2).set([t,0]),new Float32Array(n,8,2).set([r,ze]),W.queue.writeBuffer(e,0,n),Ve.push(e)}if(e+1<6){let n=128>>e+1;{let e=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),t=new ArrayBuffer(16);new Uint32Array(t,0,1).set([n]),W.queue.writeBuffer(e,0,t),He.push(e)}{let e=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),n=new ArrayBuffer(16);new Uint32Array(n,0,1).set([t]),W.queue.writeBuffer(e,0,n),Ue.push(e)}}}let We=[],Ge=[],Ke=[],qe=[];for(let e=0;e<6;e++)We.push([0,1].map(t=>W.createBindGroup({layout:Pe,entries:[{binding:0,resource:{buffer:re[e]}},{binding:1,resource:{buffer:se[e]}},{binding:2,resource:{buffer:Be[e][t]}}]}))),Ge.push(W.createBindGroup({layout:A,entries:[{binding:0,resource:{buffer:re[e]}},{binding:1,resource:{buffer:se[e]}},{binding:2,resource:{buffer:ie[e]}},{binding:3,resource:{buffer:Ve[e]}}]})),e+1<6&&(Ke.push(W.createBindGroup({layout:j,entries:[{binding:0,resource:{buffer:ie[e]}},{binding:1,resource:{buffer:se[e+1]}},{binding:2,resource:{buffer:He[e]}}]})),qe.push(W.createBindGroup({layout:N,entries:[{binding:0,resource:{buffer:re[e+1]}},{binding:1,resource:{buffer:re[e]}},{binding:2,resource:{buffer:Ue[e]}}]})));let P=[];for(let e=0;e<6;e++)P.push(Math.max(1,(128>>e)/4));let Je=M(`nbody.compute`,ar||`// [LAW:one-source-of-truth] DKD leapfrog integrator with ALL conservative forces.
// Time-reversible: negating params.dt produces the exact inverse trajectory.
//
// The integration scheme per step:
//   1. Half-drift: posHalf = pos + vel * dt/2         (all particles, inline in tile loads)
//   2. Forces: acc = F(posHalf)                       (gravity + dark matter + attractors + tidal + boundary)
//   3. Kick: velNew = vel + acc * dt                  (full velocity update)
//   4. Half-drift: posNew = posHalf + velNew * dt/2   (complete the position step)
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
  softening: f32,
  haloMass: f32,      // Plummer halo gravitational mass (was \`damping\`)
  count: u32,
  sourceCount: u32,
  haloScale: f32,     // Plummer halo softening radius (was \`coreOrbit\`)
  time: f32,
  attractorCount: u32,
  _pad_a: u32,
  _pad_b: u32,
  _pad_c: u32,
  diskNormal: vec3f,
  _pad4: f32,
  diskMass: f32,      // Miyamoto-Nagai disk mass (was \`diskVertDamp\`)
  diskScaleA: f32,    // MN radial scale length (was \`diskRadDamp\`)
  diskScaleB: f32,    // MN vertical scale height (was \`diskTangGain\`)
  _pad_e: f32,        // (was \`diskVertSpring\`)
  _pad_f: f32,        // (was \`diskAlignGain\`)
  _pad_d: f32,
  _pad_g: f32,        // (was \`diskTangSpeed\`)
  tidalStrength: f32,
  // Attractor array at offset 96 (16-aligned). CPU packing must match.
  attractors: array<Attractor, 32>,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;

// [LAW:one-source-of-truth] All forces are conservative (position-only, derivable from a potential).
// No velocity-dependent terms exist in this shader. Time-reversibility follows directly.

// Soft outer boundary — conservative containment (quadratic potential for r > R_outer).
const N_BODY_OUTER_RADIUS = 15.0;   // raised from 8; dark matter handles normal confinement
const N_BODY_BOUNDARY_PULL = 0.01;

// Periodic domain (3-torus). Particles leaving any face reappear on the
// opposite face with the same velocity. Authoritative extent for downstream
// PM-grid work. [LAW:one-source-of-truth] Single constant shared by the
// integrator's wrap and (in later tickets) the PM grid allocation.
const DOMAIN_SIZE = 32.0;     // cube edge length
const DOMAIN_HALF = 16.0;     // = DOMAIN_SIZE / 2

// Per-attractor conservative force constants.
const INTERACTION_WELL_STRENGTH = 12.0;
const INTERACTION_WELL_SOFTENING = 0.25;
const INTERACTION_CORE_RADIUS = 0.3;
const INTERACTION_CORE_PRESSURE = 16.0;

// Shared memory tile for source bodies — pos_half + mass packed as vec4f.
// [LAW:one-source-of-truth] TILE_SIZE matches @workgroup_size so every thread loads exactly one body per tile.
const TILE_SIZE = 256u;
var<workgroup> tile: array<vec4f, TILE_SIZE>;

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

@compute @workgroup_size(TILE_SIZE)
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_id) lid: vec3u) {
  let idx = gid.x;
  let alive = idx < params.count;

  let me = bodiesIn[min(idx, params.count - 1u)];
  let halfDt = params.dt * 0.5;

  // ── DKD STEP 1: Half-drift ──────────────────────────────────────────────────
  // All particles advance to the half-step position. For the self-particle this
  // is computed here; for tile-loaded source particles it's computed inline below.
  let posHalf = me.pos + me.vel * halfDt;

  // ── FORCE ACCUMULATION at posHalf ───────────────────────────────────────────
  var acc = vec3f(0.0);

  let softeningSq = params.softening * params.softening;
  let G = params.G;
  let numTiles = (params.sourceCount + TILE_SIZE - 1u) / TILE_SIZE;

  // N-body gravity: tile-based O(N×S), with sources half-drifted inline.
  for (var t = 0u; t < numTiles; t++) {
    let loadIdx = t * TILE_SIZE + lid.x;
    let src = bodiesIn[min(loadIdx, params.sourceCount - 1u)];
    // [LAW:one-source-of-truth] Half-drift the source particle inline so gravity is evaluated
    // at consistent half-step positions across all pairs — this is what makes DKD reversible.
    let srcHalf = src.pos + src.vel * halfDt;
    tile[lid.x] = select(vec4f(0.0), vec4f(srcHalf, src.mass), loadIdx < params.sourceCount);
    workgroupBarrier();

    let tileEnd = min(TILE_SIZE, params.sourceCount - t * TILE_SIZE);
    for (var j = 0u; j < tileEnd; j++) {
      let other = tile[j];
      let diff = other.xyz - posHalf;
      let dist2 = dot(diff, diff) + softeningSq;
      let inv = inverseSqrt(dist2);
      acc += diff * (G * other.w * inv * inv * inv);
    }
    workgroupBarrier();
  }

  if (!alive) { return; }

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
  // haloMass is a GM-equivalent parameter (gravitational constant rolled in), NOT a raw mass.
  // It is intentionally decoupled from params.G because params.G is normalized for the pairwise
  // N-body sum (p.G * 0.001 / sqrt(sourceCount/1000)) — applying it here would crush the halo
  // force by ~1000× and break the confinement tuning.
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
`),Ye=M(`nbody.render`,or||`struct Camera {
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

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> blurParams: BlurParams;

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

  // Interaction glow: particles near the interaction point pick up accent tint and brighten.
  let toInteract = body.pos - camera.interactPos;
  let interactDist = length(toInteract);
  let proximity = camera.interactActive * (1.0 - smoothstep(0.0, 2.0, interactDist));
  col = mix(col, camera.accent * 1.4, proximity * 0.3);

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

  // Velocity-dependent interaction flare: fast particles near the interaction well glow bright in accent,
  // creating visible energy tendrils of infalling material.
  let speedGlow = smoothstep(0.5, 2.5, speed) * interactProximity * 0.35;

  return vec4f(tinted * (intensity + speedGlow), 1.0);
}
`),Xe=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),Ze=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[Xe]}),compute:{module:Je,entryPoint:`main`}}),$e=M(`nbody.stats`,be),et=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),nt=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[et]}),compute:{module:$e,entryPoint:`main`}}),rt=W.createBuffer({size:32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),it=W.createBuffer({size:32,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),at=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),st=[W.createBindGroup({layout:et,entries:[{binding:0,resource:{buffer:C}},{binding:1,resource:{buffer:rt}},{binding:2,resource:{buffer:at}}]}),W.createBindGroup({layout:et,entries:[{binding:0,resource:{buffer:S}},{binding:1,resource:{buffer:rt}},{binding:2,resource:{buffer:at}}]})],ct=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),lt=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[ct]}),vertex:{module:Ye,entryPoint:`vs_main`},fragment:{module:Ye,entryPoint:`fs_main`,targets:[{format:Mt,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:Nt}}),ut=[W.createBindGroup({layout:Xe,entries:[{binding:0,resource:{buffer:S}},{binding:1,resource:{buffer:C}},{binding:2,resource:{buffer:w}}]}),W.createBindGroup({layout:Xe,entries:[{binding:0,resource:{buffer:C}},{binding:1,resource:{buffer:S}},{binding:2,resource:{buffer:w}}]})],dt=[0,1].map(e=>[S,C].map(t=>W.createBindGroup({layout:ct,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:ee,offset:e*I,size:mt}},{binding:2,resource:{buffer:T}}]}))),ft=2048,pt=Math.min(e,ft)*48,ht=W.createBuffer({size:pt,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),gt=!1,_t=0,L={},B=0,V=1,vt=[0,1,0],yt=18e3,bt=1+tt*4,H=new Float32Array(yt*bt),xt=0,St=!1,Ct=0,wt={ke:0,pe:0,virial:0,rmsR:0,rmsH:0},Tt=new ArrayBuffer(608),U=new Float32Array(Tt),At=new Uint32Array(Tt),jt=new Uint8Array(Tt);return{setTimeDirection(e){V=e},getSimStep(){return B},getTimeDirection(){return V},setBlurTime(e){E[0]=e,E[1]=0,E[2]=0,E[3]=0,W.queue.writeBuffer(T,0,E)},getJournalCapacity(){return yt},getJournalHighWater(){return xt},compute(t){if(V<0&&B<=0){F.paused=!0;return}V<0&&B--;let n=F.physics,r=Qe*F.fx.timeScale,i=r*V;if(U[0]=i,U[1]=n.G*.001/Math.sqrt(Math.max(1,o)/1e3),U[2]=n.softening,U[3]=n.haloMass??5,At[4]=e,At[5]=o,U[6]=n.haloScale??2,U[7]=B*r,U[12]=vt[0],U[13]=vt[1],U[14]=vt[2],U[16]=n.diskMass??3,U[17]=n.diskScaleA??1.5,U[18]=n.diskScaleB??.3,U[19]=0,U[20]=0,U[21]=0,U[22]=0,U[23]=n.tidalStrength??.005,V>0){let e=n.interactionStrength??1,t=F.attractors,r=Math.min(t.length,tt);At[8]=r,At[9]=0,At[10]=0,At[11]=0;for(let n=0;n<r;n++){let r=t[n],i=24+n*4;U[i]=r.x,U[i+1]=r.y,U[i+2]=r.z,U[i+3]=ot(r,B,e)}for(let e=r;e<tt;e++){let t=24+e*4;U[t]=0,U[t+1]=0,U[t+2]=0,U[t+3]=0}let i=B%yt*bt;H[i]=r;for(let e=0;e<tt*4;e++)H[i+1+e]=U[24+e];xt=Math.max(xt,B),B++}else{let e=B%yt*bt;At[8]=H[e],At[9]=0,At[10]=0,At[11]=0;for(let t=0;t<tt*4;t++)U[24+t]=H[e+1+t]}W.queue.writeBuffer(w,0,jt),ue[0]=i,W.queue.writeBuffer(ce,0,le),t.clearBuffer(te),t.clearBuffer(oe);let a=t.beginComputePass();a.setPipeline(me),a.setBindGroup(0,Oe[_t]),a.dispatchWorkgroups(Math.ceil(e/256)),a.setPipeline(ve),a.setBindGroup(0,De),a.dispatchWorkgroups(Math.ceil(O/256)),a.setPipeline(ye),a.dispatchWorkgroups(Math.ceil(O/256)),a.end();for(let e=0;e<4;e++){for(let e=1;e<6;e++)t.clearBuffer(re[e]);let e=t.beginComputePass();for(let t=0;t<5;t++){e.setPipeline(Fe);for(let n=0;n<2;n++)e.setBindGroup(0,We[t][0]),e.dispatchWorkgroups(P[t],P[t],P[t]),e.setBindGroup(0,We[t][1]),e.dispatchWorkgroups(P[t],P[t],P[t]);e.setPipeline(Ie),e.setBindGroup(0,Ge[t]),e.dispatchWorkgroups(P[t],P[t],P[t]),e.setPipeline(Le),e.setBindGroup(0,Ke[t]),e.dispatchWorkgroups(P[t+1],P[t+1],P[t+1])}e.setPipeline(Fe);for(let t=0;t<16;t++)e.setBindGroup(0,We[5][0]),e.dispatchWorkgroups(P[5],P[5],P[5]),e.setBindGroup(0,We[5][1]),e.dispatchWorkgroups(P[5],P[5],P[5]);for(let t=4;t>=0;t--){e.setPipeline(Re),e.setBindGroup(0,qe[t]),e.dispatchWorkgroups(P[t],P[t],P[t]),e.setPipeline(Fe);for(let n=0;n<2;n++)e.setBindGroup(0,We[t][0]),e.dispatchWorkgroups(P[t],P[t],P[t]),e.setBindGroup(0,We[t][1]),e.dispatchWorkgroups(P[t],P[t],P[t])}e.end()}let s=Vi(0),c=t.beginComputePass(s?{timestampWrites:s}:void 0);c.setPipeline(Ze),c.setBindGroup(0,ut[_t]),c.dispatchWorkgroups(Math.ceil(e/256)),c.end();let l=1-_t,u=performance.now();if(!St&&u-Ct>1e3){Ct=u;let r=(n.G??1.5)*.001/Math.sqrt(Math.max(1,o)/1e3),i=new Float32Array(4),a=new Uint32Array(i.buffer);a[0]=e,a[1]=o,i[2]=(n.softening??.15)*(n.softening??.15),i[3]=r,W.queue.writeBuffer(at,0,i);let s=t.beginComputePass();s.setPipeline(nt),s.setBindGroup(0,st[l]),s.dispatchWorkgroups(1),s.end(),t.copyBufferToBuffer(rt,0,it,0,32),St=!0,W.queue.onSubmittedWorkDone().then(()=>{it.mapAsync(GPUMapMode.READ).then(()=>{let t=new Float32Array(it.getMappedRange().slice(0));it.unmap(),St=!1;let n=t[0],r=t[1];wt={ke:n,pe:r,virial:Math.abs(r)>.001?2*n/Math.abs(r):1,rmsR:Math.sqrt(t[2]/Math.max(e,1)),rmsH:Math.sqrt(t[3]/Math.max(e,1))}}).catch(()=>{St=!1})})}_t=1-_t},render(t,n,r,i=0){let a=r?r[2]/r[3]:G.width/G.height;W.queue.writeBuffer(ee,i*I,kt(a));let o=Vi(1),s=t.beginRenderPass({colorAttachments:[Et(L,n,r)],depthStencilAttachment:Dt(L,r),...o?{timestampWrites:o}:{}}),c=Ot(r);c&&s.setViewport(c[0],c[1],c[2],c[3],0,1),Ht(s,a,i),s.setPipeline(lt),s.setBindGroup(0,dt[i][_t]),s.draw(6,e),s.end()},getCount(){return e},getStats(){return wt},async diagnose(){if(gt)return{error:1};gt=!0;let t=e-o,n=Math.min(t,ft),r=Math.floor(n/8),i=Math.floor(t/8),a=_t===0?S:C,s=W.createCommandEncoder();for(let e=0;e<8;e++){let t=o+e*i;s.copyBufferToBuffer(a,t*48,ht,e*r*48,r*48)}W.queue.submit([s.finish()]),await W.queue.onSubmittedWorkDone(),await ht.mapAsync(GPUMapMode.READ);let c=new Float32Array(ht.getMappedRange().slice(0));ht.unmap(),gt=!1;let l=vt,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,w=new Float64Array(10),ee=new Float64Array(12);for(let e=0;e<n;e++){let t=e*12,n=c[t],r=c[t+1],i=c[t+2],a=c[t+3],o=c[t+4],s=c[t+5],S=c[t+6];u+=n,d+=r,f+=i,g+=a;let C=Math.sqrt(n*n+r*r+i*i);C>_&&(_=C),m+=C*C;let T=n*l[0]+r*l[1]+i*l[2];p+=T*T;let E=Math.sqrt(o*o+s*s+S*S);if(h+=E*E,C>.1){let e=n-T*l[0],t=r-T*l[1],a=i-T*l[2],c=Math.sqrt(e*e+t*t+a*a);if(c>.05){let n=e/c,r=t/c,i=a/c,u=l[1]*i-l[2]*r,d=l[2]*n-l[0]*i,f=l[0]*r-l[1]*n,p=Math.sqrt(u*u+d*d+f*f)||1,m=u/p,h=d/p,g=f/p,_=o*m+s*h+S*g;v+=Math.abs(_)/(E+.001),y++}}let D=Math.min(9,Math.floor(C*2));w[D]++;let O=n-T*l[0],te=r-T*l[1],ne=i-T*l[2],re=Math.atan2(O*x[0]+te*x[1]+ne*x[2],O*b[0]+te*b[1]+ne*b[2]),ie=Math.floor((re+Math.PI)/(2*Math.PI)*12)%12;ee[ie]++}let T=1/n,E=Array.from(ee),D=E.reduce((e,t)=>e+t,0)/12,O=E.reduce((e,t)=>e+(t-D)**2,0)/12,te=D>0?Math.sqrt(O)/D:0;return{count:e,sampleCount:n,comX:u*T,comY:d*T,comZ:f*T,rmsHeight:Math.sqrt(p*T),rmsRadius:Math.sqrt(m*T),rmsSpeed:Math.sqrt(h*T),maxRadius:_,totalMass:e/n*g,tangentialFraction:y>0?v/y:0,armContrast:te,radialProfile:Array.from(w),angularProfile:E,diskNormalX:l[0],diskNormalY:l[1],diskNormalZ:l[2]}},async dumpDensity(){if(Ae)return null;Ae=!0;let e=W.createCommandEncoder();e.copyBufferToBuffer(ne,0,ke,0,O*4),W.queue.submit([e.finish()]),await W.queue.onSubmittedWorkDone(),await ke.mapAsync(GPUMapMode.READ);let t=new Float32Array(ke.getMappedRange().slice(0));return ke.unmap(),Ae=!1,t},async dumpPotential(){if(Ae)return null;Ae=!0;let e=W.createCommandEncoder();e.copyBufferToBuffer(re[0],0,ke,0,O*4),W.queue.submit([e.finish()]),await W.queue.onSubmittedWorkDone(),await ke.mapAsync(GPUMapMode.READ);let t=new Float32Array(ke.getMappedRange().slice(0));return ke.unmap(),Ae=!1,t},async maxResidual(){if(Ae)return null;Ae=!0;let e=W.createCommandEncoder();e.copyBufferToBuffer(ie[0],0,ke,0,O*4),W.queue.submit([e.finish()]),await W.queue.onSubmittedWorkDone(),await ke.mapAsync(GPUMapMode.READ);let t=new Float32Array(ke.getMappedRange()),n=0;for(let e=0;e<t.length;e++){let r=Math.abs(t[e]);r>n&&(n=r)}return ke.unmap(),Ae=!1,n},destroy(){S.destroy(),C.destroy(),w.destroy(),ee.destroy(),T.destroy(),rt.destroy(),it.destroy(),at.destroy(),ht.destroy(),te.destroy(),ne.destroy();for(let e of re)e.destroy();for(let e of ie)e.destroy();ae.destroy(),oe.destroy(),ce.destroy(),ke.destroy();for(let e=1;e<se.length;e++)se[e].destroy();for(let e of Be)for(let t of e)t.destroy();for(let e of Ve)e.destroy();for(let e of He)e.destroy();for(let e of Ue)e.destroy()},pmDensityU32:te,pmDensityF32:ne,pmPotential:re,pmResidual:ie,pmForce:ae,pmMeanScratch:oe}}function Gt(){let e=F.physics_classic.count,t=e*32,n=new Float32Array(e*8),r=F.physics_classic.distribution;for(let t=0;t<e;t++){let e=t*8,i,a,o,s=0,c=0;if(r===`disk`){let e=Math.random()*Math.PI*2,t=Math.random()*2;i=Math.cos(e)*t,a=(Math.random()-.5)*.1,o=Math.sin(e)*t;let n=.5/Math.sqrt(t+.1);s=-Math.sin(e)*n,c=Math.cos(e)*n}else if(r===`shell`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=1.5+Math.random()*.1;i=n*Math.sin(t)*Math.cos(e),a=n*Math.sin(t)*Math.sin(e),o=n*Math.cos(t)}else i=(Math.random()-.5)*4,a=(Math.random()-.5)*4,o=(Math.random()-.5)*4;n[e]=i,n[e+1]=a,n[e+2]=o,n[e+3]=.5+Math.random()*2,n[e+4]=s,n[e+5]=0,n[e+6]=c}let i=W.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(i.getMappedRange()).set(n),i.unmap();let a=W.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),o=W.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),s=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),c=W.createBuffer({size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),l=M(`nbody.classic.compute`,sr||`// Classic n-body compute — preserved verbatim from the original shader-playground for A/B comparison.
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
`),u=M(`nbody.classic.render`,cr||`// Classic n-body render — preserved verbatim for A/B comparison. World-space billboards, soft fuzzy falloff.
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
`),d=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),f=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[d]}),compute:{module:l,entryPoint:`main`}}),p=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),m=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[p]}),vertex:{module:u,entryPoint:`vs_main`},fragment:{module:u,entryPoint:`fs_main`,targets:[{format:Mt,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:Nt}}),h=[W.createBindGroup({layout:d,entries:[{binding:0,resource:{buffer:i}},{binding:1,resource:{buffer:a}},{binding:2,resource:{buffer:o}}]}),W.createBindGroup({layout:d,entries:[{binding:0,resource:{buffer:a}},{binding:1,resource:{buffer:i}},{binding:2,resource:{buffer:o}}]})],g=[0,1].map(e=>[i,a].map(t=>W.createBindGroup({layout:p,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:c,offset:e*I,size:mt}},{binding:2,resource:{buffer:s}}]}))),_=0,v={};return{compute(t){let n=F.physics_classic,r=F.mouse,i=new ArrayBuffer(48),a=new Float32Array(i),c=new Uint32Array(i);a[0]=.016*F.fx.timeScale,a[1]=n.G*.001,a[2]=n.softening,a[3]=n.damping,c[4]=e,a[8]=r.down?r.worldX:0,a[9]=r.down?r.worldY:0,a[10]=r.down?r.worldZ:0,a[11]=r.down?1:0,W.queue.writeBuffer(o,0,new Uint8Array(i)),W.queue.writeBuffer(s,0,new Float32Array([r.down?r.worldX:0,r.down?r.worldY:0,r.down?r.worldZ:0,r.down?1:0]));let l=t.beginComputePass();l.setPipeline(f),l.setBindGroup(0,h[_]),l.dispatchWorkgroups(Math.ceil(e/64)),l.end(),_=1-_},render(t,n,r,i=0){let a=r?r[2]/r[3]:G.width/G.height;W.queue.writeBuffer(c,i*I,kt(a));let o=t.beginRenderPass({colorAttachments:[Et(v,n,r)],depthStencilAttachment:Dt(v,r)}),s=Ot(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),Ht(o,a,i),o.setPipeline(m),o.setBindGroup(0,g[i][_]),o.draw(6,e),o.end()},getCount(){return e},destroy(){i.destroy(),a.destroy(),o.destroy(),s.destroy(),c.destroy()}}}function Kt(){let e=F.fluid.resolution,t=e*e,n=t*8,r=t*4,i=t*16,a=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,o=W.createBuffer({size:n,usage:a}),s=W.createBuffer({size:n,usage:a}),c=W.createBuffer({size:r,usage:a}),l=W.createBuffer({size:r,usage:a}),u=W.createBuffer({size:r,usage:a}),d=W.createBuffer({size:i,usage:a}),f=W.createBuffer({size:i,usage:a}),p=W.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),m=W.createBuffer({size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),h=new Float32Array(t*4),g=new Float32Array(t*2);for(let t=0;t<e;t++)for(let n=0;n<e;n++){let r=t*e+n,i=n/e,a=t/e,o=i-.5,s=a-.5;g[r*2]=-s*3,g[r*2+1]=o*3}W.queue.writeBuffer(d,0,h),W.queue.writeBuffer(o,0,g);let _=M(`fluid.forces`,lr||`struct Params {
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
`),v=M(`fluid.diffuse`,ur||`struct Params {
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
`),y=M(`fluid.pressure`,fr||`struct Params {
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
`),b=M(`fluid.divergence`,dr||`struct Params {
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
`),x=M(`fluid.gradient`,pr||`struct Params {
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
`),S=M(`fluid.render`,mr||`struct Camera {
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
`),C=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),w=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[C]}),compute:{module:_,entryPoint:`main`}}),ee=W.createBindGroup({layout:C,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:d}},{binding:3,resource:{buffer:f}},{binding:4,resource:{buffer:p}}]}),T=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),E=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[T]}),compute:{module:v,entryPoint:`main`}}),D=[W.createBindGroup({layout:T,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:p}}]}),W.createBindGroup({layout:T,entries:[{binding:0,resource:{buffer:s}},{binding:1,resource:{buffer:o}},{binding:2,resource:{buffer:p}}]})],O=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),te=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[O]}),compute:{module:b,entryPoint:`main`}}),ne=W.createBindGroup({layout:O,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:u}},{binding:2,resource:{buffer:p}}]}),re=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),ie=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[re]}),compute:{module:y,entryPoint:`main`}}),ae=[W.createBindGroup({layout:re,entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:u}},{binding:3,resource:{buffer:p}}]}),W.createBindGroup({layout:re,entries:[{binding:0,resource:{buffer:l}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:u}},{binding:3,resource:{buffer:p}}]})],oe=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),se=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[oe]}),compute:{module:x,entryPoint:`main`}}),ce=W.createBindGroup({layout:oe,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:c}},{binding:3,resource:{buffer:p}}]}),le=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});W.queue.writeBuffer(le,0,new Float32Array([e,ft,F.fluid.volumeScale,pt]));let ue=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),de=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[ue]}),vertex:{module:S,entryPoint:`vs_main`},fragment:{module:S,entryPoint:`fs_main`,targets:[{format:Mt}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:Nt}}),fe=[0,1].map(e=>W.createBindGroup({layout:ue,entries:[{binding:0,resource:{buffer:d}},{binding:1,resource:{buffer:le}},{binding:2,resource:{buffer:m,offset:e*I,size:mt}}]})),pe=Math.ceil(e/8),me={},he=0;return{compute(t){let a=F.fluid,u=a.dyeMode===`rainbow`?0:a.dyeMode===`single`?1:2;he+=.016*F.fx.timeScale;let m=new Float32Array([.22*F.fx.timeScale,a.viscosity,a.diffusionRate,a.forceStrength,e,F.mouse.x,F.mouse.y,F.mouse.dx,F.mouse.dy,F.mouse.down?1:0,u,he]);W.queue.writeBuffer(p,0,m);{let e=t.beginComputePass();e.setPipeline(w),e.setBindGroup(0,ee),e.dispatchWorkgroups(pe,pe),e.end()}t.copyBufferToBuffer(s,0,o,0,n),t.copyBufferToBuffer(f,0,d,0,i);let h=0;for(let e=0;e<a.jacobiIterations;e++){let e=t.beginComputePass();e.setPipeline(E),e.setBindGroup(0,D[h]),e.dispatchWorkgroups(pe,pe),e.end(),h=1-h}h===1&&t.copyBufferToBuffer(s,0,o,0,n);{let e=t.beginComputePass();e.setPipeline(te),e.setBindGroup(0,ne),e.dispatchWorkgroups(pe,pe),e.end()}let g=0;for(let e=0;e<a.jacobiIterations;e++){let e=t.beginComputePass();e.setPipeline(ie),e.setBindGroup(0,ae[g]),e.dispatchWorkgroups(pe,pe),e.end(),g=1-g}g===1&&t.copyBufferToBuffer(l,0,c,0,r);{let e=t.beginComputePass();e.setPipeline(se),e.setBindGroup(0,ce),e.dispatchWorkgroups(pe,pe),e.end()}t.copyBufferToBuffer(s,0,o,0,n)},render(t,n,r,i=0){let a=r?r[2]/r[3]:G.width/G.height;W.queue.writeBuffer(m,i*I,kt(a)),W.queue.writeBuffer(le,0,new Float32Array([e,ft,F.fluid.volumeScale,pt]));let o=t.beginRenderPass({colorAttachments:[Et(me,n,r)],depthStencilAttachment:Dt(me,r)}),s=Ot(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),Ht(o,a,i),o.setPipeline(de),o.setBindGroup(0,fe[i]),o.draw(36,ft*ft),o.end()},getCount(){return e+`x`+e},destroy(){o.destroy(),s.destroy(),c.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),le.destroy(),m.destroy()}}}function qt(){let e=65025*6,t=W.createBuffer({size:2097152,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.VERTEX}),n=W.createBuffer({size:e*4,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});{let t=new Uint32Array(e),r=0;for(let e=0;e<255;e++)for(let n=0;n<255;n++){let i=e*256+n,a=i+1,o=(e+1)*256+n,s=o+1;t[r++]=i,t[r++]=o,t[r++]=a,t[r++]=a,t[r++]=o,t[r++]=s}W.queue.writeBuffer(n,0,t)}let r=W.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),i=W.createBuffer({size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),a=W.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),o=0,s=0,c=M(`parametric.compute`,hr||`struct Params {
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
`),l=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),u=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[l]}),compute:{module:c,entryPoint:`main`}}),d=W.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:r}}]}),f=M(`parametric.render`,gr||`struct Camera {
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
`),p=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),m=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[p]}),vertex:{module:f,entryPoint:`vs_main`},fragment:{module:f,entryPoint:`fs_main`,targets:[{format:Mt}]},primitive:{topology:`triangle-list`,cullMode:`none`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:Nt}}),h=[0,1].map(e=>W.createBindGroup({layout:p,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:i,offset:e*I,size:mt}},{binding:2,resource:{buffer:a}}]})),g={};return{compute(e){let t=F.parametric;o+=.016*F.fx.timeScale;let n=Math.max(t.p1Rate,t.p2Rate,t.p3Rate,t.p4Rate,t.twistRate);s+=.016*F.fx.timeScale*(n>0?1:0);let i=(e,t,n,r)=>e+(t-e)*(.5+.5*Math.sin(o*n+r)),a=i(t.p1Min,t.p1Max,t.p1Rate,0),c=i(t.p2Min,t.p2Max,t.p2Rate,Math.PI*.7),l=i(t.p3Min,t.p3Max,t.p3Rate,Math.PI*1.3),f=i(t.p4Min,t.p4Max,t.p4Rate,Math.PI*.4),p=i(t.twistMin,t.twistMax,t.twistRate,Math.PI*.9),m=F.mouse,h=new ArrayBuffer(64),g=new Uint32Array(h),_=new Float32Array(h);g[0]=256,g[1]=256,_[2]=t.scale,_[3]=p,_[4]=s,g[5]=gt[t.shape]||0,_[6]=a,_[7]=c,_[8]=l,_[9]=f,_[10]=m.worldX,_[11]=m.worldY,_[12]=m.worldZ,_[13]=m.down?1:0,W.queue.writeBuffer(r,0,new Uint8Array(h));let v=e.beginComputePass();v.setPipeline(u),v.setBindGroup(0,d),v.dispatchWorkgroups(32,32),v.end()},render(t,r,o,c=0){let l=o?o[2]/o[3]:G.width/G.height;W.queue.writeBuffer(i,c*I,kt(l));let u=L.rotateX(L.rotateY(L.identity(),s*.1),s*.03);W.queue.writeBuffer(a,0,u);let d=t.beginRenderPass({colorAttachments:[Et(g,r,o)],depthStencilAttachment:Dt(g,o)}),f=Ot(o);f&&d.setViewport(f[0],f[1],f[2],f[3],0,1),Ht(d,l,c),d.setPipeline(m),d.setBindGroup(0,h[c]),d.setIndexBuffer(n,`uint32`),d.drawIndexed(e),d.end()},getCount(){return`256×256 (${F.parametric.shape})`},destroy(){t.destroy(),n.destroy(),r.destroy(),i.destroy(),a.destroy()}}}function Jt(){let e=F.reaction.resolution,t={size:[e,e,e],dimension:`3d`,format:`rgba16float`,usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST},n=W.createTexture(t),r=W.createTexture(t),i=new Uint16Array(e*e*e*4),a=e=>{let t=new Float32Array(1),n=new Int32Array(t.buffer);t[0]=e;let r=n[0],i=r>>16&32768,a=(r>>23&255)-112,o=r&8388607;return a<=0?i:a>=31?i|31744:i|a<<10|o>>13},o=a(1),s=a(0),c=a(.5);for(let t=0;t<e;t++)for(let n=0;n<e;n++)for(let r=0;r<e;r++){let a=(t*e*e+n*e+r)*4;i[a]=o,i[a+1]=s,i[a+2]=s,i[a+3]=s}let l=.3,u=.7;for(let t=0;t<80;t++){let t=Math.floor(e*(l+Math.random()*(u-l))),n=Math.floor(e*(l+Math.random()*(u-l))),r=Math.floor(e*(l+Math.random()*(u-l))),a=Math.random()<.5?1:2;for(let o=-a;o<=a;o++)for(let s=-a;s<=a;s++)for(let l=-a;l<=a;l++){if(l*l+s*s+o*o>a*a)continue;let u=t+l,d=n+s,f=r+o;if(u<0||d<0||f<0||u>=e||d>=e||f>=e)continue;let p=(f*e*e+d*e+u)*4;i[p]=c,i[p+1]=c}}W.queue.writeTexture({texture:n},i.buffer,{bytesPerRow:e*8,rowsPerImage:e},[e,e,e]),W.queue.writeTexture({texture:r},i.buffer,{bytesPerRow:e*8,rowsPerImage:e},[e,e,e]);let d=M(`reaction.compute`,_r||`// Gray-Scott reaction-diffusion on a 3D volume.
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
`),f=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:`float`,viewDimension:`3d`}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:`write-only`,format:`rgba16float`,viewDimension:`3d`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),p=W.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),m=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[f]}),compute:{module:d,entryPoint:`main`}}),h=[W.createBindGroup({layout:f,entries:[{binding:0,resource:n.createView({dimension:`3d`})},{binding:1,resource:r.createView({dimension:`3d`})},{binding:2,resource:{buffer:p}}]}),W.createBindGroup({layout:f,entries:[{binding:0,resource:r.createView({dimension:`3d`})},{binding:1,resource:n.createView({dimension:`3d`})},{binding:2,resource:{buffer:p}}]})],g=M(`reaction.render`,vr||`// Raymarched volume render of the Gray-Scott v-field.
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
`),_=W.createSampler({magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`,addressModeW:`clamp-to-edge`}),v=W.createBuffer({size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),y=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),b=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`,viewDimension:`3d`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),x=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[b]}),vertex:{module:g,entryPoint:`vs_main`},fragment:{module:g,entryPoint:`fs_main`,targets:[{format:Mt,blend:{color:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`less`},multisample:{count:Nt}}),S=[0,1].map(e=>[0,1].map(t=>W.createBindGroup({layout:b,entries:[{binding:0,resource:(t===0?n:r).createView({dimension:`3d`})},{binding:1,resource:_},{binding:2,resource:{buffer:v,offset:e*I,size:mt}},{binding:3,resource:{buffer:y}}]}))),C=Math.ceil(e/8),w=Math.ceil(e/8),ee=Math.ceil(e/4),T={},E=0;return{compute(t){let n=F.reaction,r=Math.max(1,Math.floor(n.stepsPerFrame)),i=Math.max(0,F.fx.timeScale),a=Math.max(0,Math.round(r*i));W.queue.writeBuffer(p,0,new Float32Array([n.feed,n.kill,n.Du,n.Dv,.65,e,0,0]));for(let e=0;e<a;e++){let e=t.beginComputePass();e.setPipeline(m),e.setBindGroup(0,h[E]),e.dispatchWorkgroups(C,w,ee),e.end(),E=1-E}},render(t,n,r,i=0){let a=r?r[2]/r[3]:G.width/G.height;W.queue.writeBuffer(v,i*I,kt(a)),W.queue.writeBuffer(y,0,new Float32Array([e,F.reaction.isoThreshold,3,256]));let o=t.beginRenderPass({colorAttachments:[Et(T,n,r)],depthStencilAttachment:Dt(T,r)}),s=Ot(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),Ht(o,a,i),o.setPipeline(x),o.setBindGroup(0,S[i][1-E]),o.draw(3),o.end()},getCount(){return`${e}³`},destroy(){n.destroy(),r.destroy(),p.destroy(),v.destroy(),y.destroy()}}}var Yt=[{key:`timeScale`,label:`Time`,min:-2,max:2,step:.05},{key:`bloomIntensity`,label:`Bloom`,min:0,max:4,step:.01},{key:`bloomThreshold`,label:`Threshold`,min:0,max:8,step:.01},{key:`bloomRadius`,label:`Bloom Radius`,min:.5,max:2,step:.01},{key:`trailPersistence`,label:`Trails`,min:0,max:.995,step:.001},{key:`exposure`,label:`Exposure`,min:.2,max:4,step:.01},{key:`vignette`,label:`Vignette`,min:0,max:1.5,step:.01},{key:`chromaticAberration`,label:`Chromatic`,min:0,max:2,step:.01},{key:`grading`,label:`Color Grade`,min:0,max:1.5,step:.01}];function Xt(e){let t=document.createElement(`div`);t.className=`param-section`;let n=document.createElement(`div`);n.className=`param-section-title`,n.textContent=`Visual FX`,t.appendChild(n);for(let e of Yt){let n=document.createElement(`div`);n.className=`control-row`;let r=document.createElement(`span`);r.className=`control-label`,r.textContent=e.label,n.appendChild(r);let i=document.createElement(`input`);i.type=`range`,i.min=String(e.min),i.max=String(e.max),i.step=String(e.step),i.value=String(F.fx[e.key]);let a=document.createElement(`span`);a.className=`control-value`,a.textContent=tn(F.fx[e.key],e.step),i.addEventListener(`input`,()=>{let t=Number(i.value);F.fx[e.key]=t,a.textContent=tn(t,e.step),ea()}),n.appendChild(i),n.appendChild(a),t.appendChild(n)}e.appendChild(t)}function Zt(){for(let[e,t]of Object.entries(Ie)){let n=e,r=document.getElementById(`params-${n}`),i=document.createElement(`div`);i.className=`presets`;for(let e of Object.keys(Fe[n])){let t=document.createElement(`button`);t.className=`preset-btn`+(e===`Default`?` active`:``),t.textContent=e,t.dataset.preset=e,t.dataset.mode=n,t.addEventListener(`click`,()=>nn(n,e)),i.appendChild(t)}r.appendChild(i);for(let e of t){let t=document.createElement(`div`);t.className=`param-section`;let i=document.createElement(`div`);if(i.className=`param-section-title`,i.textContent=e.section,t.appendChild(i),e.dynamic){t.id=e.id??``,r.appendChild(t);continue}for(let r of e.params)Qt(t,n,r);r.appendChild(t)}Xt(r)}}function Qt(e,t,n){let r=document.createElement(`div`);r.className=`control-row`;let i=document.createElement(`span`);if(i.className=`control-label`,i.textContent=n.label,r.appendChild(i),n.type===`dropdown`){let e=document.createElement(`select`);e.dataset.mode=t,e.dataset.key=n.key;for(let t of n.options??[]){let n=document.createElement(`option`);n.value=String(t),n.textContent=String(t),e.appendChild(n)}e.value=String(Ze(t)[n.key]),e.addEventListener(`change`,()=>{let r=Number.isNaN(Number(e.value))?e.value:Number(e.value);Ze(t)[n.key]=r,n.requiresReset&&Ki(),n.key===`shape`&&($t(String(r)),en()),Wn()}),r.appendChild(e)}else{let e=document.createElement(`input`);e.type=`range`,e.min=String(n.min),e.max=String(n.max),e.step=String(n.step),e.value=String(Ze(t)[n.key]),e.dataset.mode=t,e.dataset.key=n.key;let i=document.createElement(`span`);i.className=`control-value`,i.textContent=tn(Number(Ze(t)[n.key]),n.step??1),e.addEventListener(`input`,()=>{let r=Number(e.value);Ze(t)[n.key]=r,i.textContent=tn(r,n.step??1),n.requiresReset&&(e.dataset.needsReset=`1`),Wn()}),e.addEventListener(`change`,()=>{e.dataset.needsReset===`1`&&(e.dataset.needsReset=`0`,Ki())}),r.appendChild(e),r.appendChild(i)}return e.appendChild(r),r}function $t(e){let t=_t[e]??{},n=F.parametric;t.p1?(n.p1Min=t.p1.animMin,n.p1Max=t.p1.animMax,n.p1Rate=t.p1.animRate):(n.p1Min=0,n.p1Max=0,n.p1Rate=0),t.p2?(n.p2Min=t.p2.animMin,n.p2Max=t.p2.animMax,n.p2Rate=t.p2.animRate):(n.p2Min=0,n.p2Max=0,n.p2Rate=0)}function en(){let e=document.getElementById(`shape-params-section`);if(!e)return;for(;e.children.length>1;)e.removeChild(e.lastChild);let t=_t[F.parametric.shape]??{};for(let[n,r]of Object.entries(t)){let t=document.createElement(`div`);t.className=`anim-param-label`,t.textContent=r.label,e.appendChild(t),Qt(e,`parametric`,{key:`${n}Min`,label:`Min`,min:r.min,max:r.max,step:r.step}),Qt(e,`parametric`,{key:`${n}Max`,label:`Max`,min:r.min,max:r.max,step:r.step}),Qt(e,`parametric`,{key:`${n}Rate`,label:`Rate`,min:0,max:3,step:.05})}}function tn(e,t){if(t>=1)return String(Math.round(e));let n=Math.max(0,-Math.floor(Math.log10(t)));return e.toFixed(n)}function nn(e,t){let n=Fe[e][t];Object.assign(Ze(e),n);let r=document.getElementById(`params-${e}`);r.querySelectorAll(`input[type="range"]`).forEach(t=>{let r=t.dataset.key;if(r in n){t.value=String(n[r]);let i=t.parentElement?.querySelector(`.control-value`);if(i){let t=rn(e,r);i.textContent=tn(Number(n[r]),t?t.step??1:1)}}}),r.querySelectorAll(`select`).forEach(e=>{let t=e.dataset.key;t in n&&(e.value=String(n[t]))}),r.querySelectorAll(`.preset-btn`).forEach(e=>{e.classList.toggle(`active`,e.dataset.preset===t)}),e===`parametric`&&en(),Ki(),Wn()}function rn(e,t){for(let n of Ie[e])for(let e of n.params)if(e.key===t)return e;return null}var an={boids:`Boids`,physics:`N-Body`,physics_classic:`N-Body Classic`,fluid:`Fluid`,parametric:`Shapes`,reaction:`Reaction`};function on(e){F.mode=e,document.querySelectorAll(`.mode-tab`).forEach(t=>t.classList.toggle(`active`,t.dataset.mode===e)),document.querySelectorAll(`.param-group`).forEach(t=>t.classList.toggle(`active`,t.dataset.mode===e)),document.querySelectorAll(`.debug-panel`).forEach(t=>t.classList.toggle(`active`,t.dataset.mode===e));let t=document.getElementById(`mode-stepper-label`);t&&(t.textContent=an[e]),Gi(),Wn()}function sn(){document.querySelectorAll(`.mode-tab`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.mode;on(t)})})}function cn(){let e=document.getElementById(`btn-pause`);e&&(e.textContent=F.paused?`Resume`:`Pause`,e.classList.toggle(`active`,F.paused));let t=document.getElementById(`fab-pause`);t&&(t.textContent=F.paused?`▶`:`⏸`,t.classList.toggle(`active`,F.paused))}function ln(){document.getElementById(`btn-pause`).addEventListener(`click`,()=>{F.paused=!F.paused,F.paused&&yn(),cn()}),document.getElementById(`btn-reset`).addEventListener(`click`,()=>{Ki()}),document.getElementById(`copy-btn`).addEventListener(`click`,()=>{let e=document.getElementById(`prompt-text`).textContent??``;navigator.clipboard.writeText(e).then(()=>{let e=document.getElementById(`copy-btn`);e.textContent=`Copied!`,setTimeout(()=>{e.textContent=`Copy`},1500)})}),document.getElementById(`btn-reset-all`).addEventListener(`click`,()=>{localStorage.removeItem($i),location.reload()}),un();let e=document.getElementById(`toggle-xr-log`);e.addEventListener(`change`,()=>{F.debug.xrLog=e.checked,Qr(F.debug.xrLog),ea()}),Ti()}function un(){let e=document.getElementById(`btn-xr-record`);if(!e)return;let t=()=>{if(X.status().phase===`idle`){e.textContent=`Record XR Session`,e.disabled=!!Z;return}e.textContent=`Recording — exit XR to stop`,e.disabled=!0,requestAnimationFrame(t)};e.addEventListener(`click`,async()=>{if(X.status().phase!==`idle`||Z)return;X.record({}).then(e=>{window.__xrLastRecording=e;let t={};for(let n of e)t[n.channel]=(t[n.channel]??0)+1;let n=Object.entries(t).map(([e,t])=>`${e}: ${t}`).join(`, `);console.group(`[xr] recording — ${e.length} samples (${n})`);for(let t of e){if(t.channel===`xr.snap`||t.channel===`xr.gesture`&&t.payload.gesture.kind===`pinch-hold`)continue;let e=t.channel;if(t.channel===`xr.gesture`){let n=t.payload;e=`xr.gesture:${n.gesture.kind}${n.hand?`(${n.hand})`:``}`}else if(t.channel===`xr.state`){let n=t.payload;e=`xr.state:${n.hand} ${n.from}→${n.to}`}console.log(`[t=${t.t.toFixed(0).padStart(5)}ms] ${e}`,t.payload)}console.groupEnd()}),requestAnimationFrame(t),await Ei();let e=Z;if(!e){X.stop();return}e.addEventListener(`end`,()=>X.stop(),{once:!0})})}function dn(){let e=e=>{let t=K[F.mode];!t||!(`setTimeDirection`in t)||(t.setTimeDirection(e?-1:1),!e&&F.paused&&(F.paused=!1))};document.addEventListener(`keydown`,t=>{if(t.key===`r`||t.key===`R`){if(t.repeat)return;let n=t.target?.tagName;if(n===`INPUT`||n===`TEXTAREA`||n===`SELECT`)return;e(!0)}}),document.addEventListener(`keyup`,t=>{(t.key===`r`||t.key===`R`)&&e(!1)});let t=document.getElementById(`fab-rewind`);t&&(t.addEventListener(`pointerdown`,()=>e(!0)),t.addEventListener(`pointerup`,()=>e(!1)),t.addEventListener(`pointercancel`,()=>e(!1)),t.addEventListener(`pointerleave`,()=>e(!1)))}var q={skipTarget:null,targetStepsPerSec:6e3,adaptiveChunk:8,breakAtStep:null,manualStepsRemaining:0,manualDirection:1,lastSkipDispatches:0},fn=20,pn=14,mn=1.3,hn=.7,gn=1,_n=5e3;function vn(e){if(q.lastSkipDispatches<=0)return;let t=Math.max(1,Math.ceil(q.targetStepsPerSec/60));e>fn?q.adaptiveChunk=Math.max(gn,Math.floor(q.adaptiveChunk*hn)):e<pn&&q.adaptiveChunk<t&&(q.adaptiveChunk=Math.min(_n,Math.ceil(q.adaptiveChunk*mn)))}function yn(){q.skipTarget=null,q.manualStepsRemaining=0,q.lastSkipDispatches=0}function bn(e,t){if(F.mode!==`physics`||!(`getSimStep`in e)){q.lastSkipDispatches=0,F.paused||e.compute(t);return}let n=e,r=0,i=null,a=!1;if(q.skipTarget!==null){let e=q.skipTarget-n.getSimStep();if(e===0){q.skipTarget=null,q.lastSkipDispatches=0,n.setBlurTime(0),F.paused=!0,cn();return}i=e>0?1:-1;let t=Math.max(1,Math.ceil(q.targetStepsPerSec/60));r=Math.min(t,q.adaptiveChunk,Math.abs(e)),a=!0}else q.manualStepsRemaining>0?(i=q.manualDirection,r=Math.min(q.adaptiveChunk,q.manualStepsRemaining),q.manualStepsRemaining-=r):F.paused||(r=1);if(r===0){n.setBlurTime(0),q.lastSkipDispatches=0;return}let o=n.getTimeDirection(),s=i!==null&&i!==o;s&&n.setTimeDirection(i);let c=i===null?o:i,l=.016*F.fx.timeScale,u=a?r*l*c:0;n.setBlurTime(u),q.lastSkipDispatches=a?r:0;for(let e=0;e<r;e++){n.compute(t);let e=n.getSimStep();if(q.breakAtStep!==null&&e===q.breakAtStep){q.breakAtStep=null,yn(),F.paused=!0,cn(),xn(),n.setBlurTime(0);break}if(q.skipTarget!==null&&e===q.skipTarget){q.skipTarget=null,F.paused=!0,cn(),n.setBlurTime(0),q.lastSkipDispatches=0;break}}s&&n.setTimeDirection(o)}function xn(){let e=document.getElementById(`debug-break-status`),t=document.getElementById(`debug-break-val`);!e||!t||(q.breakAtStep===null?e.style.display=`none`:(t.textContent=String(q.breakAtStep),e.style.display=``))}function Sn(){let e=e=>document.getElementById(e),t=(e,t)=>{yn(),F.paused=!0,cn(),q.manualStepsRemaining=e,q.manualDirection=t};e(`debug-rev60`)?.addEventListener(`click`,()=>t(60,-1)),e(`debug-rev10`)?.addEventListener(`click`,()=>t(10,-1)),e(`debug-rev1`)?.addEventListener(`click`,()=>t(1,-1)),e(`debug-fwd1`)?.addEventListener(`click`,()=>t(1,1)),e(`debug-fwd10`)?.addEventListener(`click`,()=>t(10,1)),e(`debug-fwd60`)?.addEventListener(`click`,()=>t(60,1));let n=e(`debug-skip-chunk`);if(n){let e=parseInt(n.value,10);Number.isFinite(e)&&e>0&&(q.targetStepsPerSec=e),n.addEventListener(`change`,()=>{let e=parseInt(n.value,10);Number.isFinite(e)&&e>0&&(q.targetStepsPerSec=e)})}let r=e=>{e<0||(yn(),F.paused=!0,cn(),q.skipTarget=e)},i=e(`debug-skip-target`);e(`debug-skip-btn`)?.addEventListener(`click`,()=>{let e=parseInt(i?.value??``,10);Number.isFinite(e)&&r(e)}),i?.addEventListener(`keydown`,e=>{if(e.key===`Enter`){let e=parseInt(i.value,10);Number.isFinite(e)&&r(e)}});let a=e(`debug-break-step`);e(`debug-break-btn`)?.addEventListener(`click`,()=>{let e=parseInt(a?.value??``,10);Number.isFinite(e)&&e>=0&&(q.breakAtStep=e,xn())}),a?.addEventListener(`keydown`,e=>{if(e.key===`Enter`){let e=parseInt(a.value,10);Number.isFinite(e)&&e>=0&&(q.breakAtStep=e,xn())}}),e(`debug-break-clear`)?.addEventListener(`click`,()=>{q.breakAtStep=null,xn()});let o=e(`debug-scrub`);o?.addEventListener(`change`,()=>{let e=parseInt(o.value,10);Number.isFinite(e)&&r(e)}),e(`debug-screenshot`)?.addEventListener(`click`,()=>{let e=K.physics,t=e&&`getSimStep`in e?e.getSimStep():0;G.toBlob(e=>{if(!e)return;let n=URL.createObjectURL(e),r=document.createElement(`a`);r.href=n,r.download=`shader-playground-step-${t}.png`,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(n)},`image/png`)})}function Cn(){if(F.mode!==`physics`)return;let e=K.physics;if(!e||!(`getSimStep`in e))return;let t=e,n=t.getSimStep(),r=t.getTimeDirection(),i=t.getJournalHighWater(),a=document.getElementById(`debug-step-num`);a&&(a.textContent=String(n));let o=document.getElementById(`debug-step-dir`);o&&(o.textContent=r<0?`◀`:`▶`);let s=document.getElementById(`debug-scrub`),c=document.getElementById(`debug-scrub-high`);if(s&&c){let e=Math.max(i,n);s.max!==String(e)&&(s.max=String(e)),document.activeElement!==s&&(s.value=String(n)),c.textContent=String(e)}}function wn(){let e=document.getElementById(`theme-presets`);for(let t of Object.keys(Le)){let n=Le[t],r=document.createElement(`button`);r.className=`preset-btn`+(t===F.colorTheme?` active`:``),r.textContent=t,r.dataset.theme=t,r.style.borderLeftWidth=`3px`,r.style.borderLeftColor=n.primary,r.addEventListener(`click`,()=>{F.colorTheme!==t&&(F.colorTheme=t,Xe(t),e.querySelectorAll(`.preset-btn`).forEach(e=>e.classList.toggle(`active`,e.dataset.theme===t)),Wn())}),e.appendChild(r)}}function Tn(){let e=F.camera,t=Math.cos(e.rotX),n=Math.sin(e.rotX),r=Math.cos(e.rotY),i=Math.sin(e.rotY),a=[e.distance*t*i,e.distance*n,e.distance*t*r],o=R(B([0,0,0],a)),s=R(z(o,[0,1,0]));return{eye:a,forward:o,right:s,up:z(s,o)}}function En(e,t){let n=F.camera.fov*Math.PI/180,r=G.width/G.height,{eye:i,forward:a,right:o,up:s}=Tn(),c=Math.tan(n*.5),l=(e*2-1)*c*r,u=(t*2-1)*c;return{eye:i,dir:R([a[0]+o[0]*l+s[0]*u,a[1]+o[1]*l+s[1]*u,a[2]+o[2]*l+s[2]*u])}}function Dn(e,t){let{dir:n}=En(e,t),r=F.camera.distance*.5;return[n[0]*r,n[1]*r,n[2]*r]}function On(e,t){let{eye:n,dir:r}=En(e,t),i=R(n),a=V(r,i);if(Math.abs(a)<1e-4)return Mn(n,r);let o=-V(n,i)/a;return[n[0]+r[0]*o,n[1]+r[1]*o,n[2]+r[2]*o]}function kn(e,t){let{eye:n,dir:r}=En(e,t);if(Math.abs(r[1])<1e-4)return null;let i=-n[1]/r[1];if(i<0)return null;let a=n[0]+r[0]*i,o=n[2]+r[2]*i,s=pt*.5;return Math.abs(a)>s||Math.abs(o)>s?null:[(a+s)/pt,(o+s)/pt]}function An(e){let t=pt*.5;return Math.abs(e[0])>t||Math.abs(e[2])>t?null:[(e[0]+t)/pt,(e[2]+t)/pt]}function jn(e,t,n){if(Math.abs(t[1])<1e-4)return null;let r=(n-e[1])/t[1];return r<0?null:[e[0]+t[0]*r,e[1]+t[1]*r,e[2]+t[2]*r]}function Mn(e,t){let n=V(t,t)||1,r=Math.max(0,-V(e,t)/n);return[e[0]+t[0]*r,e[1]+t[1]*r,e[2]+t[2]*r]}function Nn(){F.mouse.down=!1,F.mouse.dx=0,F.mouse.dy=0}function Pn(){let e=G,t=!1,n=!1;e.addEventListener(`pointerdown`,r=>{if(F.xrEnabled)return;t=!0,n=!(r.ctrlKey||r.metaKey);let i=e.getBoundingClientRect(),a=(r.clientX-i.left)/i.width,o=1-(r.clientY-i.top)/i.height;if(F.mouse.dx=0,F.mouse.dy=0,n)if(F.mode===`fluid`){let e=kn(a,o);if(!e)Nn();else{F.mouse.down=!0;let t=Dn(a,o);F.mouse.worldX=t[0],F.mouse.worldY=t[1],F.mouse.worldZ=t[2],F.mouse.x=e[0],F.mouse.y=e[1]}}else{let e=On(a,o);F.mouse.down=!0,F.mouse.worldX=e[0],F.mouse.worldY=e[1],F.mouse.worldZ=e[2],F.mouse.x=a,F.mouse.y=o,F.mode===`physics`&&lt(r.pointerId,e)}else F.mouse.x=a,F.mouse.y=o;r.preventDefault()}),e.addEventListener(`pointermove`,r=>{if(F.xrEnabled||!t)return;let i=e.getBoundingClientRect(),a=(r.clientX-i.left)/i.width,o=1-(r.clientY-i.top)/i.height;if(n)if(F.mode===`fluid`){let e=kn(a,o);if(!e)Nn();else{F.mouse.down=!0;let t=Dn(a,o);F.mouse.worldX=t[0],F.mouse.worldY=t[1],F.mouse.worldZ=t[2],F.mouse.dx=(e[0]-F.mouse.x)*10,F.mouse.dy=(e[1]-F.mouse.y)*10,F.mouse.x=e[0],F.mouse.y=e[1]}}else{let e=On(a,o);F.mouse.down=!0,F.mouse.worldX=e[0],F.mouse.worldY=e[1],F.mouse.worldZ=e[2],F.mouse.dx=(a-F.mouse.x)*10,F.mouse.dy=(o-F.mouse.y)*10,F.mouse.x=a,F.mouse.y=o,F.mode===`physics`&&ut(r.pointerId,e)}else F.camera.rotY+=r.movementX*.005,F.camera.rotX+=r.movementY*.005,F.camera.rotX=Math.max(-Math.PI*.45,Math.min(Math.PI*.45,F.camera.rotX)),F.mouse.down=!1});let r=e=>{F.xrEnabled||(t=!1,n=!1,F.mouse.down=!1,F.mouse.dx=0,F.mouse.dy=0,dt(e.pointerId))};e.addEventListener(`pointerup`,r),e.addEventListener(`pointercancel`,r),e.addEventListener(`pointerleave`,r),e.addEventListener(`contextmenu`,e=>e.preventDefault()),e.addEventListener(`wheel`,e=>{F.xrEnabled||(F.camera.distance*=1+e.deltaY*.001,F.camera.distance=Math.max(.5,Math.min(200,F.camera.distance)),e.preventDefault())},{passive:!1})}var Fn=matchMedia(`(max-width: 768px)`),In=Fn.matches;function Ln(){let e=G,t=new Map,n=0,r=0,i=0;function a(e,t,n,r){if(F.mode===`fluid`){let e=kn(t,n);if(!e)Nn();else{F.mouse.down=!0;let i=Dn(t,n);F.mouse.worldX=i[0],F.mouse.worldY=i[1],F.mouse.worldZ=i[2],F.mouse.dx=r?(e[0]-F.mouse.x)*10:0,F.mouse.dy=r?(e[1]-F.mouse.y)*10:0,F.mouse.x=e[0],F.mouse.y=e[1]}}else{let i=On(t,n);F.mouse.down=!0,F.mouse.worldX=i[0],F.mouse.worldY=i[1],F.mouse.worldZ=i[2],F.mouse.dx=r?(t-F.mouse.x)*10:0,F.mouse.dy=r?(n-F.mouse.y)*10:0,F.mouse.x=t,F.mouse.y=n,F.mode===`physics`&&(r?ut(e,i):lt(e,i))}}e.addEventListener(`pointerdown`,o=>{if(!F.xrEnabled){if(o.preventDefault(),t.set(o.pointerId,{x:o.clientX,y:o.clientY}),t.size===1){let t=e.getBoundingClientRect(),n=(o.clientX-t.left)/t.width,r=1-(o.clientY-t.top)/t.height;F.mouse.dx=0,F.mouse.dy=0,a(o.pointerId,n,r,!1)}if(t.size===2){Nn(),t.forEach((e,t)=>dt(t));let e=[...t.values()];r=(e[0].x+e[1].x)/2,i=(e[0].y+e[1].y)/2,n=Math.hypot(e[0].x-e[1].x,e[0].y-e[1].y)}}},{passive:!1}),e.addEventListener(`pointermove`,o=>{if(!F.xrEnabled&&t.has(o.pointerId)){if(o.preventDefault(),t.set(o.pointerId,{x:o.clientX,y:o.clientY}),t.size===1){let t=e.getBoundingClientRect(),n=(o.clientX-t.left)/t.width,r=1-(o.clientY-t.top)/t.height;a(o.pointerId,n,r,!0)}else if(t.size===2){let e=[...t.values()],a=(e[0].x+e[1].x)/2,o=(e[0].y+e[1].y)/2,s=Math.hypot(e[0].x-e[1].x,e[0].y-e[1].y);F.camera.rotY+=(a-r)*.005,F.camera.rotX+=(o-i)*.005,F.camera.rotX=Math.max(-Math.PI*.45,Math.min(Math.PI*.45,F.camera.rotX)),n>0&&(F.camera.distance*=n/s,F.camera.distance=Math.max(.5,Math.min(200,F.camera.distance))),r=a,i=o,n=s,F.mouse.down=!1}}},{passive:!1});let o=r=>{if(t.delete(r.pointerId),dt(r.pointerId),t.size===0&&(F.mouse.down=!1,F.mouse.dx=0,F.mouse.dy=0,n=0),t.size===1){let[n,r]=[...t.entries()][0],i=e.getBoundingClientRect(),o=(r.x-i.left)/i.width,s=1-(r.y-i.top)/i.height;F.mouse.dx=0,F.mouse.dy=0,a(n,o,s,!1)}};e.addEventListener(`pointerup`,o),e.addEventListener(`pointercancel`,o),e.addEventListener(`contextmenu`,e=>e.preventDefault())}function Rn(){document.getElementById(`fab-pause`).addEventListener(`click`,()=>{F.paused=!F.paused,F.paused&&yn(),cn()}),document.getElementById(`fab-reset`).addEventListener(`click`,()=>{Ki()});let e=[`physics`,`boids`,`physics_classic`,`fluid`,`parametric`,`reaction`],t=t=>{let n=e[(e.indexOf(F.mode)+t+e.length)%e.length];on(n)};document.getElementById(`mode-prev`).addEventListener(`click`,()=>t(-1)),document.getElementById(`mode-next`).addEventListener(`click`,()=>t(1)),document.getElementById(`mode-stepper-label`).textContent=an[F.mode]}function zn(){let e=document.getElementById(`controls`),t=0,n=0,r=!1;e.addEventListener(`touchstart`,i=>{t=i.touches[0].clientY,n=e.scrollTop,r=!e.classList.contains(`mobile-expanded`)||n<=0},{passive:!0}),e.addEventListener(`touchmove`,i=>{if(!r)return;let a=i.touches[0].clientY-t,o=e.classList.contains(`mobile-expanded`);!o&&a<0&&i.preventDefault(),o&&n<=0&&a>0&&i.preventDefault()},{passive:!1}),e.addEventListener(`touchend`,i=>{if(!r)return;r=!1;let a=i.changedTouches[0].clientY-t,o=e.classList.contains(`mobile-expanded`);if(!o&&a<-30)e.classList.add(`mobile-expanded`);else if(o&&n<=0&&a>30)e.classList.remove(`mobile-expanded`);else if(Math.abs(a)<10){let t=e.querySelector(`.mobile-drag-handle`).getBoundingClientRect();i.changedTouches[0].clientY>=t.top&&i.changedTouches[0].clientY<=t.bottom&&e.classList.toggle(`mobile-expanded`)}}),G.addEventListener(`pointerdown`,()=>{e.classList.remove(`mobile-expanded`)},{capture:!0})}function Bn(){localStorage.getItem($i)||(F.boids.count=500,F.physics.count=2e3,F.physics_classic.count=200,F.reaction.resolution=64)}var Vn={boids:`boids/flocking`,physics:`N-body gravitational`,physics_classic:`classic N-body (vintage shader)`,fluid:`fluid dynamics`,parametric:`parametric shape`,reaction:`Gray-Scott reaction-diffusion (3D)`};function Hn(){let e=F.mode,t=Ze(e),n=N[e],r=[];for(let[i,a]of Object.entries(t))a!==n[i]&&r.push(Un(e,i,a));let i=`WebGPU ${Vn[e]} simulation`;F.colorTheme!==`Dracula`&&(i+=` (${F.colorTheme} theme)`),r.length>0&&(i+=` with ${r.filter(Boolean).join(`, `)}`),i+=`.`,document.getElementById(`prompt-text`).textContent=i}function Un(e,t,n){let r=Number(n),i={count:()=>`${n} particles`,separationRadius:()=>r<15?`tight separation (${n})`:r>50?`wide separation (${n})`:`separation radius ${n}`,alignmentRadius:()=>`alignment range ${n}`,cohesionRadius:()=>r>80?`strong cohesion (${n})`:`cohesion range ${n}`,maxSpeed:()=>r>4?`high speed (${n})`:r<1?`slow movement (${n})`:`speed ${n}`,maxForce:()=>r>.1?`strong steering (${n})`:`steering force ${n}`,visualRange:()=>`visual range ${n}`,G:()=>r>5?`strong gravity (G=${n})`:r<.5?`weak gravity (G=${n})`:`G=${n}`,softening:()=>`softening ${n}`,damping:()=>r<.995?`high damping (${n})`:`damping ${n}`,haloMass:()=>r>8?`heavy halo (${n})`:r<2?`light halo (${n})`:`halo mass ${n}`,haloScale:()=>`halo scale ${n}`,diskMass:()=>r<.1?`no disk potential`:`disk mass ${n}`,diskScaleA:()=>`disk scale A ${n}`,diskScaleB:()=>`disk scale B ${n}`,distribution:()=>`${n} distribution`,resolution:()=>`${n}x${n} grid`,viscosity:()=>r>.5?`thick fluid (viscosity ${n})`:r<.05?`thin fluid (viscosity ${n})`:`viscosity ${n}`,diffusionRate:()=>`diffusion ${n}`,forceStrength:()=>r>200?`strong forces (${n})`:`force strength ${n}`,volumeScale:()=>r>2?`large volume (${n})`:r<1?`compact volume (${n})`:`volume scale ${n}`,dyeMode:()=>`${n} dye`,jacobiIterations:()=>`${n} solver iterations`,shape:()=>`${n} shape`,scale:()=>r===1?null:`scale ${n}`,p1Min:()=>null,p1Max:()=>null,p1Rate:()=>null,p2Min:()=>null,p2Max:()=>null,p2Rate:()=>null,p3Min:()=>null,p3Max:()=>null,p3Rate:()=>null,p4Min:()=>null,p4Max:()=>null,p4Rate:()=>null,twistMin:()=>null,twistMax:()=>null,twistRate:()=>null}[t];return i?i():`${t}: ${n}`}function Wn(){Hn(),qi(),$n(),ea()}function Gn(e){return{boids:{"Compute (Flocking)":`struct Particle {
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
//   1. Half-drift: posHalf = pos + vel * dt/2         (all particles, inline in tile loads)
//   2. Forces: acc = F(posHalf)                       (gravity + dark matter + attractors + tidal + boundary)
//   3. Kick: velNew = vel + acc * dt                  (full velocity update)
//   4. Half-drift: posNew = posHalf + velNew * dt/2   (complete the position step)
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
  softening: f32,
  haloMass: f32,      // Plummer halo gravitational mass (was \`damping\`)
  count: u32,
  sourceCount: u32,
  haloScale: f32,     // Plummer halo softening radius (was \`coreOrbit\`)
  time: f32,
  attractorCount: u32,
  _pad_a: u32,
  _pad_b: u32,
  _pad_c: u32,
  diskNormal: vec3f,
  _pad4: f32,
  diskMass: f32,      // Miyamoto-Nagai disk mass (was \`diskVertDamp\`)
  diskScaleA: f32,    // MN radial scale length (was \`diskRadDamp\`)
  diskScaleB: f32,    // MN vertical scale height (was \`diskTangGain\`)
  _pad_e: f32,        // (was \`diskVertSpring\`)
  _pad_f: f32,        // (was \`diskAlignGain\`)
  _pad_d: f32,
  _pad_g: f32,        // (was \`diskTangSpeed\`)
  tidalStrength: f32,
  // Attractor array at offset 96 (16-aligned). CPU packing must match.
  attractors: array<Attractor, 32>,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;

// [LAW:one-source-of-truth] All forces are conservative (position-only, derivable from a potential).
// No velocity-dependent terms exist in this shader. Time-reversibility follows directly.

// Soft outer boundary — conservative containment (quadratic potential for r > R_outer).
const N_BODY_OUTER_RADIUS = 15.0;   // raised from 8; dark matter handles normal confinement
const N_BODY_BOUNDARY_PULL = 0.01;

// Periodic domain (3-torus). Particles leaving any face reappear on the
// opposite face with the same velocity. Authoritative extent for downstream
// PM-grid work. [LAW:one-source-of-truth] Single constant shared by the
// integrator's wrap and (in later tickets) the PM grid allocation.
const DOMAIN_SIZE = 32.0;     // cube edge length
const DOMAIN_HALF = 16.0;     // = DOMAIN_SIZE / 2

// Per-attractor conservative force constants.
const INTERACTION_WELL_STRENGTH = 12.0;
const INTERACTION_WELL_SOFTENING = 0.25;
const INTERACTION_CORE_RADIUS = 0.3;
const INTERACTION_CORE_PRESSURE = 16.0;

// Shared memory tile for source bodies — pos_half + mass packed as vec4f.
// [LAW:one-source-of-truth] TILE_SIZE matches @workgroup_size so every thread loads exactly one body per tile.
const TILE_SIZE = 256u;
var<workgroup> tile: array<vec4f, TILE_SIZE>;

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

@compute @workgroup_size(TILE_SIZE)
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_id) lid: vec3u) {
  let idx = gid.x;
  let alive = idx < params.count;

  let me = bodiesIn[min(idx, params.count - 1u)];
  let halfDt = params.dt * 0.5;

  // ── DKD STEP 1: Half-drift ──────────────────────────────────────────────────
  // All particles advance to the half-step position. For the self-particle this
  // is computed here; for tile-loaded source particles it's computed inline below.
  let posHalf = me.pos + me.vel * halfDt;

  // ── FORCE ACCUMULATION at posHalf ───────────────────────────────────────────
  var acc = vec3f(0.0);

  let softeningSq = params.softening * params.softening;
  let G = params.G;
  let numTiles = (params.sourceCount + TILE_SIZE - 1u) / TILE_SIZE;

  // N-body gravity: tile-based O(N×S), with sources half-drifted inline.
  for (var t = 0u; t < numTiles; t++) {
    let loadIdx = t * TILE_SIZE + lid.x;
    let src = bodiesIn[min(loadIdx, params.sourceCount - 1u)];
    // [LAW:one-source-of-truth] Half-drift the source particle inline so gravity is evaluated
    // at consistent half-step positions across all pairs — this is what makes DKD reversible.
    let srcHalf = src.pos + src.vel * halfDt;
    tile[lid.x] = select(vec4f(0.0), vec4f(srcHalf, src.mass), loadIdx < params.sourceCount);
    workgroupBarrier();

    let tileEnd = min(TILE_SIZE, params.sourceCount - t * TILE_SIZE);
    for (var j = 0u; j < tileEnd; j++) {
      let other = tile[j];
      let diff = other.xyz - posHalf;
      let dist2 = dot(diff, diff) + softeningSq;
      let inv = inverseSqrt(dist2);
      acc += diff * (G * other.w * inv * inv * inv);
    }
    workgroupBarrier();
  }

  if (!alive) { return; }

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
  // haloMass is a GM-equivalent parameter (gravitational constant rolled in), NOT a raw mass.
  // It is intentionally decoupled from params.G because params.G is normalized for the pairwise
  // N-body sum (p.G * 0.001 / sqrt(sourceCount/1000)) — applying it here would crush the halo
  // force by ~1000× and break the confinement tuning.
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

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> blurParams: BlurParams;

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

  // Interaction glow: particles near the interaction point pick up accent tint and brighten.
  let toInteract = body.pos - camera.interactPos;
  let interactDist = length(toInteract);
  let proximity = camera.interactActive * (1.0 - smoothstep(0.0, 2.0, interactDist));
  col = mix(col, camera.accent * 1.4, proximity * 0.3);

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

  // Velocity-dependent interaction flare: fast particles near the interaction well glow bright in accent,
  // creating visible energy tendrils of infalling material.
  let speedGlow = smoothstep(0.5, 2.5, speed) * interactProximity * 0.35;

  return vec4f(tinted * (intensity + speedGlow), 1.0);
}
`},physics_classic:{"Compute (Classic)":`// Classic n-body compute — preserved verbatim from the original shader-playground for A/B comparison.
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
`}}[e]||{}}var Kn=!1,J=null,qn={},Jn={};function Yn(){let e=document.getElementById(`shader-toggle`),t=document.getElementById(`shader-panel`);e.addEventListener(`click`,()=>{Kn=!Kn,t.classList.toggle(`open`,Kn),e.classList.toggle(`active`,Kn),Kn&&Xn()}),document.getElementById(`shader-compile`).addEventListener(`click`,er),document.getElementById(`shader-reset`).addEventListener(`click`,tr),document.getElementById(`shader-editor`).addEventListener(`keydown`,e=>{if(e.key===`Tab`){e.preventDefault();let t=e.target,n=t.selectionStart;t.value=t.value.substring(0,n)+`  `+t.value.substring(t.selectionEnd),t.selectionStart=t.selectionEnd=n+2}})}function Xn(){let e=Gn(F.mode);Jn={...e},(!qn._mode||qn._mode!==F.mode)&&(qn={...e,_mode:F.mode});let t=document.getElementById(`shader-tabs`);t.innerHTML=``;let n=Object.keys(e);J=J&&n.includes(J)?J:n[0];for(let e of n){let n=document.createElement(`button`);n.className=`shader-tab`+(e===J?` active`:``),n.textContent=e,n.addEventListener(`click`,()=>{Zn(),J=e,t.querySelectorAll(`.shader-tab`).forEach(t=>t.classList.toggle(`active`,t.textContent===e)),Qn()}),t.appendChild(n)}Qn()}function Zn(){J&&(qn[J]=document.getElementById(`shader-editor`).value)}function Qn(){let e=document.getElementById(`shader-editor`);e.value=qn[J]||``,document.getElementById(`shader-status`).textContent=``,document.getElementById(`shader-status`).className=`shader-success`}function $n(){Kn&&qn._mode!==F.mode&&Xn()}function er(){Zn();let e=qn[J],t=document.getElementById(`shader-status`);try{W.createShaderModule({code:e}).getCompilationInfo().then(n=>{let r=n.messages.filter(e=>e.type===`error`);r.length>0?(t.className=`shader-error`,t.textContent=r.map(e=>`Line ${e.lineNum}: ${e.message}`).join(`; `),t.title=r.map(e=>`Line ${e.lineNum}: ${e.message}`).join(`
`)):(t.className=`shader-success`,t.textContent=`Compiled OK — reset simulation to apply`,t.title=``,nr(F.mode,J,e))})}catch(e){t.className=`shader-error`,t.textContent=e.message,t.title=e.message}}function tr(){J&&Jn[J]&&(qn[J]=Jn[J],Qn(),nr(F.mode,J,Jn[J]),document.getElementById(`shader-status`).className=`shader-success`,document.getElementById(`shader-status`).textContent=`Shader reset to original`)}function nr(e,t,n){let r={boids:{"Compute (Flocking)":()=>{rr=n},"Render (Vert+Frag)":()=>{ir=n}},physics:{"Compute (Gravity)":()=>{ar=n},"Render (Vert+Frag)":()=>{or=n}},physics_classic:{"Compute (Classic)":()=>{sr=n},"Render (Classic)":()=>{cr=n}},fluid:{"Forces + Advect":()=>{lr=n},Diffuse:()=>{ur=n},Divergence:()=>{dr=n},"Pressure Solve":()=>{fr=n},"Gradient Sub":()=>{pr=n},Render:()=>{mr=n}},parametric:{"Compute (Mesh Gen)":()=>{hr=n},"Render (Phong)":()=>{gr=n}},reaction:{"Compute (Gray-Scott)":()=>{_r=n},"Render (Raymarch)":()=>{vr=n}}}[e]?.[t];r&&r()}var rr=null,ir=null,ar=null,or=null,sr=null,cr=null,lr=null,ur=null,dr=null,fr=null,pr=null,mr=null,hr=null,gr=null,_r=null,vr=null,yr=new Map,Y={phase:`idle`,phaseDeadline:0,bounded:!1,samples:[],startedAt:0,unsubs:[],preDelayTimer:null,stopTimer:null,resolve:null},X={channel(e){let t=yr.get(e);if(t)return t;let n={name:e,subscribers:new Set};return yr.set(e,n),n},subscribe(e,t){return e.subscribers.add(t),()=>{e.subscribers.delete(t)}},emit(e,t){for(let n of e.subscribers)n(t)},record(e){if(Y.phase!==`idle`)return Promise.reject(Error(`metrics.record: recording already in progress`));let t=e.preDelayMs??0;return Y.samples=[],Y.bounded=e.durationMs!==void 0,new Promise(n=>{Y.resolve=n;let r=()=>{let t=e.channels??Array.from(yr.values());Y.startedAt=performance.now(),Y.phase=`recording`,Y.phaseDeadline=e.durationMs===void 0?0:Y.startedAt+e.durationMs,Y.preDelayTimer=null;for(let e of t){let t=e.name;Y.unsubs.push(X.subscribe(e,e=>{Y.samples.push({t:performance.now()-Y.startedAt,channel:t,payload:e})}))}e.durationMs!==void 0&&(Y.stopTimer=setTimeout(()=>X.stop(),e.durationMs))};t>0?(Y.phase=`pre-delay`,Y.phaseDeadline=performance.now()+t,Y.preDelayTimer=setTimeout(r,t)):r()})},stop(){if(Y.phase===`idle`)return;Y.preDelayTimer&&=(clearTimeout(Y.preDelayTimer),null),Y.stopTimer&&=(clearTimeout(Y.stopTimer),null);for(let e of Y.unsubs)e();Y.unsubs=[];let e=Y.samples;Y.samples=[],Y.phase=`idle`,Y.phaseDeadline=0,Y.bounded=!1;let t=Y.resolve;Y.resolve=null,t&&t(e)},status(){return Y.phase===`idle`?{phase:`idle`,remainingMs:0,bounded:!1}:{phase:Y.phase,remainingMs:Y.phaseDeadline===0?0:Math.max(0,Y.phaseDeadline-performance.now()),bounded:Y.bounded}}},Z=null,br=null,xr=null,Sr=null,Cr=null,wr=!1,Tr=[`wrist`,`thumb-metacarpal`,`thumb-phalanx-proximal`,`thumb-phalanx-distal`,`thumb-tip`,`index-finger-metacarpal`,`index-finger-phalanx-proximal`,`index-finger-phalanx-intermediate`,`index-finger-phalanx-distal`,`index-finger-tip`,`middle-finger-metacarpal`,`middle-finger-phalanx-proximal`,`middle-finger-phalanx-intermediate`,`middle-finger-phalanx-distal`,`middle-finger-tip`,`ring-finger-metacarpal`,`ring-finger-phalanx-proximal`,`ring-finger-phalanx-intermediate`,`ring-finger-phalanx-distal`,`ring-finger-tip`,`pinky-finger-metacarpal`,`pinky-finger-phalanx-proximal`,`pinky-finger-phalanx-intermediate`,`pinky-finger-phalanx-distal`,`pinky-finger-tip`];function Er(e){return{hand:e,tracked:!1,source:null,pinch:{active:!1,startTime:0,origin:[0,0,0],current:[0,0,0]},gazeRay:null,currentRay:null,ray:null,palmNormal:null,joints:null,grip:null}}var Q={left:Er(`left`),right:Er(`right`)},Dr={left:{kind:`idle`},right:{kind:`idle`}},Or=[],kr={gainMultiplier:1},Ar=`left`,jr={bindings:r,layouts:new Map,activeLayoutId:null},Mr=E(),Nr=[],Pr={left:!1,right:!1},Fr=null,Ir=null,Lr={x:0,y:0,z:-5},Rr=0,zr={startDistance:0,startOffset:{x:0,y:0,z:0}},Br={left:!1,right:!1};function Vr(){return{fineModifier:!1,palmUp:!1,wristOrient:null,wristTime:0,flickArmed:!1,lastFlickAt:0}}var Hr={left:Vr(),right:Vr()},Ur=.7,Wr=.4,Gr=4,Kr=300,qr=X.channel(`xr.gesture`),Jr=X.channel(`xr.state`),Yr=X.channel(`xr.snap`),Xr={unsubs:[],lastSnapMs:{left:0,right:0}},Zr=200;function Qr(e){for(let e of Xr.unsubs)e();Xr.unsubs.length=0,Xr.lastSnapMs.left=0,Xr.lastSnapMs.right=0,e&&(Xr.unsubs.push(X.subscribe(qr,e=>{if(e.gesture.kind===`pinch-hold`)return;let t=e.hand?`(${e.hand})`:``;console.log(`[xr] gesture:${e.gesture.kind}${t}`,e.gesture)})),Xr.unsubs.push(X.subscribe(Jr,e=>{console.log(`[xr] state:${e.hand} ${e.from}→${e.to}`)})),Xr.unsubs.push(X.subscribe(Yr,e=>{let t=performance.now();if(t-Xr.lastSnapMs[e.hand]<Zr)return;Xr.lastSnapMs[e.hand]=t;let n=e.palmDot===null?`—`:e.palmDot.toFixed(2);console.log(`[xr] snap:${e.hand} tracked=${e.handTracked} pinch=${e.pinching} palm=${n} palmUp=${e.palmUp} fine=${e.fineModifier} flick=${e.flickSpeed.toFixed(2)}`)})))}function $r(e,t){let n=Dr[e];Dr[e]=t,Jr.subscribers.size>0&&n.kind!==t.kind&&X.emit(Jr,{hand:e,from:n.kind,to:t.kind})}var ei={left:-1,right:-2},ti=150;function ni(e){let t=e.matrix;return R([-t[8],-t[9],-t[10]])}function ri(e,t){if(!br)return null;let n=e.getPose(t.targetRaySpace,br);if(!n)return null;let r=n.transform.position;return{origin:[r.x,r.y,r.z],dir:ni(n.transform)}}function ii(e,t){if(!br)return null;let n=e.getPose(t.gripSpace||t.targetRaySpace,br);if(!n)return null;let r=n.transform.position;return[r.x,r.y,r.z]}function ai(e){let t=!Q.left.source,n=!Q.right.source;return e.handedness===`left`&&t?`left`:e.handedness===`right`&&n?`right`:t?`left`:n?`right`:null}function oi(e){return Q.left.source===e?`left`:Q.right.source===e?`right`:null}var si=.03,ci=si*si;function li(e){return[-e[0],-e[1],-e[2],e[3]]}function ui(e,t){return[e[3]*t[0]+e[0]*t[3]+e[1]*t[2]-e[2]*t[1],e[3]*t[1]-e[0]*t[2]+e[1]*t[3]+e[2]*t[0],e[3]*t[2]+e[0]*t[1]-e[1]*t[0]+e[2]*t[3],e[3]*t[3]-e[0]*t[0]-e[1]*t[1]-e[2]*t[2]]}function di(e,t,n){let r={};for(let i of Tr){let a=t.get(i),o=a?e.getJointPose(a,n):null;if(!o){r[i]=null;continue}let s=o.transform.position,c=o.transform.orientation;r[i]={position:[s.x,s.y,s.z],orientation:[c.x,c.y,c.z,c.w],radius:o.radius}}return r}function fi(e,t){let n=e.wrist,r=e[`index-finger-metacarpal`],i=e[`pinky-finger-metacarpal`];if(!n||!r||!i)return null;let a=B(r.position,n.position),o=B(i.position,n.position),s=R(t===`right`?z(o,a):z(a,o));return s[0]===0&&s[1]===0&&s[2]===0?null:s}function pi(e){let t=e[`thumb-tip`];if(!t)return null;let n=e=>{if(!e)return null;let n=B(t.position,e.position);return V(n,n)<ci};return{thumbIndex:n(e[`index-finger-tip`]),thumbMiddle:n(e[`middle-finger-tip`]),thumbRing:n(e[`ring-finger-tip`]),thumbPinky:n(e[`pinky-finger-tip`])}}function mi(){if(!xr)return;let e=globalThis.XRRigidTransform;br=xr.getOffsetReferenceSpace(new e({x:Lr.x,y:Lr.y+Rr,z:Lr.z}))}function hi(e){for(let t=Or.length-1;t>=0;t--){let n=Or[t],r=ri(e,n);if(!r)continue;Or.splice(t,1);let i=ai(n);if(!i)continue;let a=ii(e,n)??r.origin,o=Q[i];o.tracked=!0,o.source=n,o.pinch.active=!0,o.pinch.startTime=performance.now(),o.pinch.origin=a,o.pinch.current=a,o.gazeRay={origin:[...r.origin],dir:[...r.dir]},o.currentRay=r}for(let t of[`left`,`right`]){let n=Q[t];if(!n.pinch.active||!n.source)continue;let r=ri(e,n.source);r&&(n.currentRay=r);let i=ii(e,n.source);i&&(n.pinch.current=i)}for(let e of[`left`,`right`]){let t=Q[e];t.joints=null,t.palmNormal=null,t.grip=null,t.ray=null}if(br)for(let t of e.session.inputSources){if(t.handedness===`none`||!t.hand)continue;let n=t.handedness,r=Q[n],i=di(e,t.hand,br);r.joints=i,r.palmNormal=fi(i,n),r.grip=pi(i),r.ray=gi(i)}}function gi(e){let t=e.wrist,n=e[`index-finger-metacarpal`];if(!t||!n)return null;let r=R(B(n.position,t.position));return r[0]===0&&r[1]===0&&r[2]===0?null:{origin:[...n.position],dir:r}}function _i(){let e=[],t=Q.left.pinch.active,n=Q.right.pinch.active,r=t&&n,i=Br.left&&Br.right,a=performance.now();for(let t of[`left`,`right`]){let n=Q[t],r=Br[t],i=n.pinch.active;i&&!r&&n.gazeRay?e.push({kind:`pinch-start`,hand:t,gazeRay:n.gazeRay}):i&&r?e.push({kind:`pinch-hold`,hand:t,dur:a-n.pinch.startTime}):!i&&r&&e.push({kind:`pinch-end`,hand:t,dur:a-n.pinch.startTime});let o=Hr[t];if(n.grip){let r=n.grip.thumbRing===!0;r&&!o.fineModifier?e.push({kind:`fine-modifier-on`,hand:t}):!r&&o.fineModifier&&e.push({kind:`fine-modifier-off`,hand:t}),o.fineModifier=r}if(n.palmNormal){let r=n.palmNormal[1],i=o.palmUp?r>Wr:r>Ur;i&&!o.palmUp?e.push({kind:`palm-up`,hand:t}):!i&&o.palmUp&&e.push({kind:`palm-down`,hand:t}),o.palmUp=i}let s=n.joints?.wrist?.orientation??null,c=0;if(s&&o.wristOrient&&!n.pinch.active){let n=Math.max(.001,(a-o.wristTime)/1e3),r=ui(s,li(o.wristOrient)),i=Math.min(1,Math.abs(r[3])),l=2*Math.acos(i),u=Math.sqrt(Math.max(0,1-i*i)),d=r[3]<0?-1:1,f=u>1e-6?r[0]*d/u:0,p=u>1e-6?r[1]*d/u:0,m=u>1e-6?r[2]*d/u:0;c=l/n;let h=c>Gr;if(h&&o.flickArmed&&a-o.lastFlickAt>Kr){let n=Math.abs(f),r=Math.abs(p),i=Math.abs(m),s=n>=r&&n>=i?`pitch`:r>=i?`yaw`:`roll`,c=(s===`pitch`?f:s===`yaw`?p:m)>=0?1:-1;e.push({kind:`wrist-flick`,hand:t,axis:s,sign:c}),o.lastFlickAt=a}o.flickArmed=h}else o.flickArmed=!1;o.wristOrient=s?[...s]:null,o.wristTime=a,Yr.subscribers.size>0&&X.emit(Yr,{hand:t,handTracked:n.joints!==null,pinching:n.pinch.active,palmDot:n.palmNormal?n.palmNormal[1]:null,palmUp:o.palmUp,fineModifier:o.fineModifier,flickSpeed:c,grip:n.grip})}if(r&&!i?e.push({kind:`two-hand-pinch-start`}):!r&&i&&e.push({kind:`two-hand-pinch-end`}),Br.left=t,Br.right=n,qr.subscribers.size>0)for(let t of e)X.emit(qr,{hand:`hand`in t?t.hand:null,gesture:t});return e}function vi(e,t){for(let t of e)switch(t.kind){case`pinch-start`:$r(t.hand,{kind:`pending`,deadline:performance.now()+ti});break;case`two-hand-pinch-start`:if(Dr.left.kind===`pending`&&Dr.right.kind===`pending`){let e=B(Q.left.pinch.current,Q.right.pinch.current);zr.startDistance=Math.max(.01,Math.sqrt(V(e,e))),zr.startOffset={...Lr},$r(`left`,{kind:`two-hand-scale`}),$r(`right`,{kind:`two-hand-scale`})}break;case`two-hand-pinch-end`:Dr.left.kind===`two-hand-scale`&&$r(`left`,{kind:`idle`}),Dr.right.kind===`two-hand-scale`&&$r(`right`,{kind:`idle`});break;case`pinch-end`:yi(t.hand);break;case`pinch-hold`:break;case`fine-modifier-on`:kr.gainMultiplier=.1;break;case`fine-modifier-off`:kr.gainMultiplier=1;break;case`palm-up`:case`palm-down`:case`wrist-flick`:break}let n=performance.now();for(let e of[`left`,`right`]){let t=Dr[e];t.kind===`pending`&&n>=t.deadline&&(Pr[e]?$r(e,{kind:`idle`}):$r(e,{kind:`dragging`,handOrigin:[...Q[e].pinch.origin],hasSample:!1}))}}function yi(e){switch(Dr[e].kind){case`dragging`:Nn(),dt(ei[e]);break;case`pending`:case`two-hand-scale`:case`idle`:break}$r(e,{kind:`idle`});let t=Q[e];t.pinch.active||(t.source=null,t.gazeRay=null,t.currentRay=null)}function bi(e){if(Dr.left.kind===`two-hand-scale`&&Dr.right.kind===`two-hand-scale`){let e=B(Q.left.pinch.current,Q.right.pinch.current),t=Math.sqrt(V(e,e));if(zr.startDistance>=.01){let e=t/zr.startDistance;Lr.z=Math.max(-200,Math.min(-1,zr.startOffset.z/e)),mi()}return}let t=!1;for(let e of[`left`,`right`]){let n=Dr[e],r=Q[e];if(n.kind!==`dragging`||!r.source)continue;let i=r.currentRay;if(!i)continue;t=!0;let a=F.mode===`fluid`?jn(i.origin,i.dir,0):Mn(i.origin,i.dir);if(!a){Nn(),n.hasSample=!1;continue}if(F.mouse.down=!0,F.mouse.worldX=a[0],F.mouse.worldY=a[1],F.mouse.worldZ=a[2],F.mode===`fluid`){let e=An(a);if(!e){Nn(),n.hasSample=!1;continue}F.mouse.dx=n.hasSample?(e[0]-F.mouse.x)*10:0,F.mouse.dy=n.hasSample?(e[1]-F.mouse.y)*10:0,F.mouse.x=e[0],F.mouse.y=e[1]}else F.mouse.dx=0,F.mouse.dy=0,F.mouse.x=a[0],F.mouse.y=a[1];if(F.mode===`physics`){let t=ei[e];F.pointerToAttractor.has(t)?ut(t,a):lt(t,a)}n.hasSample=!0}t||F.xrEnabled&&F.mouse.down&&Nn()}function xi(e){if(!br)return null;let t=e.getViewerPose(br);if(!t)return null;let n=t.transform;return{position:[n.position.x,n.position.y,n.position.z],orientation:[n.orientation.x,n.orientation.y,n.orientation.z,n.orientation.w]}}function Si(e){hi(e);let t=xi(e),n=O(jr,Q,Mr,{hands:Q,headPose:t},kr,16);ne(n.sideEffects,jr),Mr=n.next,Nr=n.renderList,Pr.left=te(n.next.states.left),Pr.right=te(n.next.states.right),vi(_i(),e),bi(e)}function Ci(e){let t=oi(e);if(t){let e=Q[t];e.pinch.active=!1,e.tracked=!1}let n=Or.indexOf(e);n>=0&&Or.splice(n,1)}function wi(){Or.length=0,Q.left=Er(`left`),Q.right=Er(`right`),$r(`left`,{kind:`idle`}),$r(`right`,{kind:`idle`}),Br.left=!1,Br.right=!1,Hr.left=Vr(),Hr.right=Vr(),kr.gainMultiplier=1,Mr=E(),Nr=[],Pr.left=!1,Pr.right=!1,Nn(),dt(ei.left),dt(ei.right)}function Ti(){let e=document.getElementById(`btn-xr`);if(!navigator.xr){e.textContent=`VR Not Available`;return}navigator.xr.isSessionSupported(`immersive-vr`).then(t=>{t?(e.disabled=!1,e.addEventListener(`click`,Ei)):e.textContent=`VR Not Supported`}).catch(()=>{e.textContent=`VR Check Failed`})}async function Ei(){if(Z){j(`xr`,`exiting session (user clicked Exit VR)`),k=`xr:session.end`,Z.end();return}let e=document.getElementById(`btn-xr`);e.textContent=`Starting...`,j(`xr`,`toggleXR start`,{hasWebXR:!!navigator.xr,userAgent:navigator.userAgent});try{k=`xr:requestSession`,Z=await navigator.xr.requestSession(`immersive-vr`,{requiredFeatures:[`webgpu`],optionalFeatures:[`layers`,`local-floor`,`hand-tracking`]});let t=Z.enabledFeatures;wr=!!t&&t.includes(`hand-tracking`),j(`xr`,`session acquired`,{environmentBlendMode:Z.environmentBlendMode,interactionMode:Z.interactionMode,visibilityState:Z.visibilityState,handTracking:wr,enabledFeatures:t});let n=!1;try{k=`xr:requestReferenceSpace(local-floor)`,br=await Z.requestReferenceSpace(`local-floor`),n=!0,j(`xr`,`reference space = local-floor`)}catch(e){j(`xr`,`local-floor unavailable, falling back to local`,e.message),k=`xr:requestReferenceSpace(local)`,br=await Z.requestReferenceSpace(`local`)}xr=br,Rr=n?1.6:0,Lr.x=0,Lr.y=0,Lr.z=-5,mi(),k=`xr:new XRGPUBinding`,Sr=new XRGPUBinding(Z,W);let r=Sr.getPreferredColorFormat(),i=Sr.nativeProjectionScaleFactor;j(`xr`,`binding ready`,{preferredFormat:r,nativeProjectionScaleFactor:i}),Ft(r,1);let a=[{colorFormat:r,depthStencilFormat:`depth24plus`,scaleFactor:i,textureType:`texture-array`},{colorFormat:r,depthStencilFormat:`depth24plus`,textureType:`texture-array`},{colorFormat:r,scaleFactor:i,textureType:`texture-array`},{colorFormat:r,textureType:`texture-array`},{colorFormat:r,scaleFactor:i},{colorFormat:r}];k=`xr:createProjectionLayer`;let o=null,s=[];for(let e of a)try{Cr=Sr.createProjectionLayer(e),o=e;break}catch(t){let n=t.message;s.push({config:e,error:n}),j(`xr`,`projection layer config rejected`,{config:e,error:n}),Cr=null}if(!Cr)throw Error(`All projection layer configurations failed. Attempts: ${JSON.stringify(s)}`);j(`xr`,`projection layer created`,{config:o,textureWidth:Cr.textureWidth,textureHeight:Cr.textureHeight,textureArrayLength:Cr.textureArrayLength,ignoreDepthValues:Cr.ignoreDepthValues});try{Cr.fixedFoveation=0,j(`xr`,`fixedFoveation set to 0`)}catch(e){j(`xr`,`fixedFoveation unsupported on this platform`,e.message)}k=`xr:updateRenderState`;try{Z.updateRenderState({layers:[Cr]}),j(`xr`,`render state updated with projection layer`)}catch(e){throw A(`xr:updateRenderState`,e),e}Z.addEventListener(`selectstart`,e=>{Or.push(e.inputSource)}),Z.addEventListener(`selectend`,e=>{Ci(e.inputSource)}),e.textContent=`Exit VR`,F.xrEnabled=!0,k=`xr:awaiting first frame`;let c=[0,0,0,1],l={x:.16,y:.06},u={x:.02,y:.02};jr.layouts.set(`debug`,{id:`debug-panel`,kind:`panel`,anchor:{kind:`head-hud`,distance:.7,offset:{position:[0,-.15,0],orientation:c}},size:{x:1.1,y:.5},children:[{id:`debug-row-1`,kind:`group`,layout:`row`,children:[{id:`debug-s1`,kind:`slider`,binding:`physics.G`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:l,hitPadding:u},{id:`debug-b1`,kind:`button`,binding:`preset.physics.Default`,style:`primary`,visualSize:l,hitPadding:u},{id:`debug-r1`,kind:`readout`,binding:`physics.G`,visualSize:l,hitPadding:u},{id:`debug-d1`,kind:`dial`,binding:`physics.softening`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:l,hitPadding:u}]},{id:`debug-row-2`,kind:`group`,layout:`row`,children:[{id:`debug-tg1`,kind:`toggle`,binding:`app.paused`,style:`switch`,visualSize:l,hitPadding:u},{id:`debug-st1`,kind:`stepper`,binding:`physics.count`,step:1e3,visualSize:l,hitPadding:u},{id:`debug-en1`,kind:`enum-chips`,binding:`physics.distribution`,visualSize:l,hitPadding:u},{id:`debug-pt1`,kind:`preset-tile`,binding:`preset.physics.Spiral Galaxy`,visualSize:l,hitPadding:u},{id:`debug-ct1`,kind:`category-tile`,targetTabId:`physics`,summary:{},visualSize:l,hitPadding:u}]}]});let d={kind:`held`,hand:Ar,offset:{position:[0,.15,-.1],orientation:[Math.sin(Math.PI*.33),0,0,Math.cos(Math.PI*.33)]}},f={x:.17,y:.03};jr.layouts.set(`clipboard`,{id:`clipboard-panel`,kind:`panel`,anchor:d,size:{x:.2,y:.28},children:[{id:`clipboard-col`,kind:`group`,layout:`column`,gap:.015,children:[{id:`clipboard-title`,kind:`readout`,binding:`physics.G`,visualSize:{x:.18,y:.025},hitPadding:{x:0,y:0}},{id:`clipboard-G`,kind:`slider`,binding:`physics.G`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:f,hitPadding:m.defaultHitPadding},{id:`clipboard-soft`,kind:`slider`,binding:`physics.softening`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:f,hitPadding:m.defaultHitPadding},{id:`clipboard-int`,kind:`slider`,binding:`physics.interactionStrength`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:f,hitPadding:m.defaultHitPadding}]}]}),jr.activeLayoutId=`clipboard`,Z.addEventListener(`visibilitychange`,()=>{j(`xr`,`visibilitychange`,{visibilityState:Z?.visibilityState})}),Z.requestAnimationFrame(Oi),j(`xr`,`first frame requested; waiting for xrFrame callback`),Z.addEventListener(`end`,()=>{j(`xr`,`session ended`,{finalPhase:k,framesRendered:$}),Z=null,br=null,xr=null,Sr=null,Cr=null,wr=!1,F.xrEnabled=!1,$=0,k=`desktop`,Ft(jt,1),wi(),e.textContent=`Enter VR`,requestAnimationFrame(Qi)})}catch(t){if(A(`xr:toggle`,t,`session failed to start (phase=${k})`),e.textContent=`XR Error: ${t.message}`,Z)try{Z.end()}catch(e){A(`xr:cleanup-end`,e)}Z=null,k=`desktop`,setTimeout(()=>{e.textContent=`Enter VR`},4e3)}}var $=0,Di=3;function Oi(e,t){if(!Z)return;Z.requestAnimationFrame(Oi),Je(e);let n=$<Di;n&&j(`xr:frame`,`xrFrame #${$} entered`,{mode:F.mode}),ct(rt()),ki++,e-Ai>=1e3&&(ji=ki,ki=0,Ai=e),k=`xr:frame:${$}:pre-encode`,W.pushErrorScope(`validation`);try{let e=t.getViewerPose(br);if(!e){n&&j(`xr:frame`,`no viewer pose yet`);return}let r=K[F.mode];if(!r){A(`xr:frame`,Error(`simulation for mode=${F.mode} is not initialized`));return}Si(t),k=`xr:frame:${$}:createCommandEncoder`;let i=W.createCommandEncoder({label:`xr-frame-${$}`});F.paused||(k=`xr:frame:${$}:sim.compute(${F.mode})`,r.compute(i)),n&&j(`xr:frame`,`pose has ${e.views.length} views`);for(let t=0;t<e.views.length;t++){let a=e.views[t];k=`xr:frame:${$}:getViewSubImage(eye=${t})`;let o=Sr,s=o.getViewSubImage?o.getViewSubImage(Cr,a):o.getSubImage(Cr,a);if(!s){A(`xr:frame`,Error(`subImage null for eye ${t}`));continue}n&&t===0&&j(`xr:frame`,`subImage`,{viewport:s.viewport,colorFormat:s.colorTexture.format,hasDepth:!!s.depthStencilTexture}),k=`xr:frame:${$}:createView(color,eye=${t})`;let c=s.getViewDescriptor?s.getViewDescriptor():{},l=s.colorTexture.createView(c);k=`xr:frame:${$}:createView(depth,eye=${t})`;let u=(Cr.textureArrayLength??1)>1,d=s.depthStencilTexture;bt=d&&u?d.createView(c):null;let f=a.transform.position;yt={viewMatrix:new Float32Array(a.transform.inverse.matrix),projMatrix:new Float32Array(a.projectionMatrix),eye:[f.x,f.y,f.z]};let{x:p,y:m,width:h,height:g}=s.viewport;k=`xr:frame:${$}:ensureHdrTargets(${h}x${g})`,Tt(h,g),H.needsClear=!0;let _=H.sceneIdx;k=`xr:frame:${$}:sim.render(${F.mode},eye=${t})`;let v=H.scene[_].createView();r.render(i,v,null,t),Fr||=(Ir=W.createBuffer({label:`xr-widgets-camera`,size:I*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),ye(W,Ir,()=>kt(h/g))),k=`xr:frame:${$}:xr-widgets(eye=${t})`,Fr.draw(i,v,H.scene[_].format,t,Nr),k=`xr:frame:${$}:bloom(eye=${t})`,Xi(i),k=`xr:frame:${$}:composite(eye=${t})`;let y=s.colorTexture.format;Zi(i,l,y,[p,m,h,g])}k=`xr:frame:${$}:submit`,W.queue.submit([i.finish()]),n&&j(`xr:frame`,`frame #${$} submitted OK`)}catch(e){A(`xr:frame`,e,`frame #${$} threw synchronously`)}finally{yt=null,bt=null,W.popErrorScope().then(e=>{e&&A(`xr:frame:validation`,e,`frame #${$}`)}).catch(e=>A(`xr:frame:popScope`,e)),$++}}var ki=0,Ai=0,ji=0,Mi=-1,Ni=0,Pi={compute:0,render:0,post:0},Fi=!1,Ii=0,Li=2e3,Ri=6,zi=null;function Bi(){W.features.has(`timestamp-query`)&&(zi={querySet:W.createQuerySet({type:`timestamp`,count:Ri}),resolveBuf:W.createBuffer({size:Ri*8,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),stagingBuf:W.createBuffer({size:Ri*8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),pending:!1})}function Vi(e){if(zi)return{querySet:zi.querySet,beginningOfPassWriteIndex:e*2,endOfPassWriteIndex:e*2+1}}function Hi(e,t){if(!zi||zi.pending||t-Ii<Li)return;Ii=t,e.resolveQuerySet(zi.querySet,0,Ri,zi.resolveBuf,0),e.copyBufferToBuffer(zi.resolveBuf,0,zi.stagingBuf,0,Ri*8),zi.pending=!0;let n=zi;W.queue.onSubmittedWorkDone().then(()=>{n.stagingBuf.mapAsync(GPUMapMode.READ).then(()=>{let e=new BigUint64Array(n.stagingBuf.getMappedRange().slice(0));n.stagingBuf.unmap(),n.pending=!1;let t=(e,t)=>Number(t-e)/1e6;Pi={compute:t(e[0],e[1]),render:t(e[2],e[3]),post:t(e[4],e[5])},Ni=t(e[0],e[5])}).catch(()=>{n.pending=!1})})}function Ui(e){if(zi||Fi||e-Ii<Li)return;Ii=e,Fi=!0;let t=performance.now();W.queue.onSubmittedWorkDone().then(()=>{Ni=performance.now()-t,Fi=!1}).catch(()=>{Fi=!1})}function Wi(e,t){console.error(`[sim:${e}]`,t);let n=document.getElementById(`gpu-error-overlay`);n||(n=document.createElement(`div`),n.id=`gpu-error-overlay`,n.style.cssText=`position:fixed;top:60px;left:10px;right:10px;max-height:60vh;overflow:auto;background:rgba(20,0,0,0.92);color:#ff8080;font:11px monospace;padding:10px;border:1px solid #ff4040;border-radius:4px;z-index:9999;white-space:pre-wrap;`,document.body.appendChild(n));let r=new Date().toLocaleTimeString();n.textContent=`[${r}] [sim:${e}] ${t}\n\n`+n.textContent}function Gi(){let e=F.mode;if(K[e])return;let t={boids:Ut,physics:Wt,physics_classic:Gt,fluid:Kt,parametric:qt,reaction:Jt};W.pushErrorScope(`validation`),W.pushErrorScope(`internal`),W.pushErrorScope(`out-of-memory`);let n=null;try{n=t[e]()}catch(t){Wi(e,`factory threw: ${t.message}`)}let r=n,i=e,a=e=>{if(Wi(i,e),r&&K[i]===r){try{r.destroy()}catch{}delete K[i]}};W.popErrorScope().then(e=>{e&&a(`OOM: ${e.message}`)}),W.popErrorScope().then(e=>{e&&a(`internal: ${e.message}`)}),W.popErrorScope().then(e=>{e&&a(`validation: ${e.message}`)}),n&&(K[e]=n)}function Ki(){let e=F.mode;K[e]&&(K[e].destroy(),delete K[e]),Gi()}function qi(){let e=ji>0?(1e3/ji).toFixed(1):`--`,t=Pi,n=t.compute>0?` (C:${t.compute.toFixed(1)} R:${t.render.toFixed(1)} P:${t.post.toFixed(1)})`:Ni>0?` gpu:${Ni.toFixed(1)}ms`:``;document.getElementById(`stat-fps`).textContent=`${ji} fps ${e}ms${n}`;let r=K[F.mode],i=r?r.getCount():`--`;document.getElementById(`stat-count`).textContent=F.mode===`fluid`||F.mode===`reaction`?`Grid: ${i}`:`Particles: ${i}`;let a=document.getElementById(`stat-step`);if(a)if(F.mode===`physics`&&r&&`getSimStep`in r){let e=r.getSimStep(),t=r.getTimeDirection();a.style.display=``,a.textContent=`Step: ${e} ${t<0?`◀`:`▶`}`}else a.style.display=`none`}function Ji(){let e=document.getElementById(`canvas-container`),t=window.devicePixelRatio||1,n=Math.floor(e.clientWidth*t),r=Math.floor(e.clientHeight*t);(G.width!==n||G.height!==r)&&(G.width=n,G.height=r),Tt(G.width,G.height)}function Yi(e,t,n){if(H.needsClear)return;let r=F.fx.trailPersistence;if(r<.001)return;H.fadeParams[0]=r,W.queue.writeBuffer(H.fadeUBO,0,H.fadeParams);let i=e.beginRenderPass({colorAttachments:[{view:H.sceneViews[n],clearValue:Be,loadOp:`clear`,storeOp:`store`}]});i.setPipeline(H.fadePipeline),i.setBindGroup(0,H.fadeBGs[t]),i.draw(3),i.end()}function Xi(e){let t=F.fx,n=H.sceneIdx;for(let r=0;r<St;r++){let i=r===0?H.scene[n]:H.bloomMips[r-1],a=H.downsampleParams[r];a[0]=1/i.width,a[1]=1/i.height,a[2]=t.bloomThreshold,a[3]=r===0?1:0,W.queue.writeBuffer(H.downsampleUBO[r],0,a);let o=H.downsampleBGs[r===0?n:r+1],s=e.beginRenderPass({colorAttachments:[{view:H.bloomMipViews[r],clearValue:{r:0,g:0,b:0,a:1},loadOp:`clear`,storeOp:`store`}]});s.setPipeline(H.downsamplePipeline),s.setBindGroup(0,o),s.draw(3),s.end()}for(let n=St-1;n>0;n--){let r=H.bloomMips[n],i=H.upsampleParams[n];i[0]=1/r.width,i[1]=1/r.height,i[2]=t.bloomRadius,W.queue.writeBuffer(H.upsampleUBO[n],0,i);let a=e.beginRenderPass({colorAttachments:[{view:H.bloomMipViews[n-1],clearValue:{r:0,g:0,b:0,a:1},loadOp:`load`,storeOp:`store`}]});a.setPipeline(H.upsamplePipelineAdditive),a.setBindGroup(0,H.upsampleBGs[n]),a.draw(3),a.end()}}function Zi(e,t,n,r=null){let i=F.fx,a=P(),o=H.compositeParams,s=new Uint32Array(o.buffer);o[0]=i.bloomIntensity,o[1]=i.exposure,o[2]=i.vignette,o[3]=i.chromaticAberration,o[4]=i.grading;let c=r?r[2]/r[3]:G.width/G.height,l=F.camera.fov*Math.PI/180,u=vt(),d=yt?yt.viewMatrix:u.view,f=yt?yt.projMatrix:L.perspective(l,c,.01,ht),p=performance.now()*.001,m=Math.max(0,rt()-(it()>0?1:0)),h=F.physics.interactionStrength??1,g=F.attractors,_=Math.min(g.length,tt);s[5]=_,o[6]=0,o[7]=0,o[8]=a.primary[0],o[9]=a.primary[1],o[10]=a.primary[2],o[12]=a.accent[0],o[13]=a.accent[1],o[14]=a.accent[2],o[16]=p;for(let e=0;e<_;e++){let t=g[e],n=t.x,r=t.y,i=t.z,a=d[0]*n+d[4]*r+d[8]*i+d[12],s=d[1]*n+d[5]*r+d[9]*i+d[13],c=d[2]*n+d[6]*r+d[10]*i+d[14],l=d[3]*n+d[7]*r+d[11]*i+d[15],u=f[0]*a+f[4]*s+f[8]*c+f[12]*l,p=f[1]*a+f[5]*s+f[9]*c+f[13]*l,_=f[3]*a+f[7]*s+f[11]*c+f[15]*l,v=_===0?0:u/_,y=_===0?0:p/_,b=20+e*4;o[b]=v*.5+.5,o[b+1]=1-(y*.5+.5),o[b+2]=ot(t,m,h),o[b+3]=0}for(let e=_;e<tt;e++){let t=20+e*4;o[t]=0,o[t+1]=0,o[t+2]=0,o[t+3]=0}W.queue.writeBuffer(H.compositeUBO,0,o);let v=wt(n),y=H.compositeBGs[H.sceneIdx],b=Vi(2),x=e.beginRenderPass({colorAttachments:[{view:t,clearValue:{r:0,g:0,b:0,a:1},loadOp:`clear`,storeOp:`store`}],...b?{timestampWrites:b}:{}});x.setPipeline(v),x.setBindGroup(0,y),r&&x.setViewport(r[0],r[1],r[2],r[3],0,1),x.draw(3),x.end()}function Qi(e){if(F.xrEnabled)return;requestAnimationFrame(Qi),Mi>=0&&vn(e-Mi),Mi=e,Je(e),Ji(),ct(rt()),ki++,e-Ai>=1e3&&(ji=ki,ki=0,Ai=e,qi());let t=K[F.mode];if(!t)return;let n=F.mode;try{let n=W.createCommandEncoder();bn(t,n),Cn();let r=H.sceneIdx,i=1-r;H.sceneIdx=i,Yi(n,r,i),t.render(n,H.sceneViews[i],null),Xi(n),Zi(n,At.getCurrentTexture().createView(),jt),Hi(n,e),W.queue.submit([n.finish()]),Ui(e),H.needsClear=!1}catch(e){if(Wi(n,`frame threw: ${e.message}`),K[n]===t){try{t.destroy()}catch{}delete K[n]}}}var $i=`shader-playground-state`;function ea(){try{let e={};for(let t of Object.keys(N))e[t]=Ze(t);let t={mode:F.mode,colorTheme:F.colorTheme,camera:F.camera,fx:F.fx,debug:F.debug,...e};localStorage.setItem($i,JSON.stringify(t))}catch{}}function ta(){try{let e=localStorage.getItem($i);if(!e)return;let t=JSON.parse(e);t.mode&&t.mode in N&&(F.mode=t.mode),t.colorTheme&&Le[t.colorTheme]&&(F.colorTheme=t.colorTheme);for(let e of Object.keys(N))t[e]&&Object.assign(Ze(e),t[e]);t.camera&&Object.assign(F.camera,t.camera),t.fx&&Object.assign(F.fx,t.fx),t.debug&&Object.assign(F.debug,t.debug),Ye(F.colorTheme)}catch{}}function na(){document.querySelectorAll(`.mode-tab`).forEach(e=>e.classList.toggle(`active`,e.dataset.mode===F.mode)),document.querySelectorAll(`.param-group`).forEach(e=>e.classList.toggle(`active`,e.dataset.mode===F.mode)),document.querySelectorAll(`.debug-panel`).forEach(e=>e.classList.toggle(`active`,e.dataset.mode===F.mode));for(let e of Object.keys(Ie)){let t=e,n=document.getElementById(`params-${t}`),r=Ze(t);n.querySelectorAll(`input[type="range"]`).forEach(e=>{let n=e.dataset.key;if(n&&n in r){e.value=String(r[n]);let i=e.parentElement?.querySelector(`.control-value`);if(i){let e=rn(t,n);i.textContent=tn(Number(r[n]),e?e.step??.01:.01)}}}),n.querySelectorAll(`select`).forEach(e=>{let t=e.dataset.key;t&&t in r&&(e.value=String(r[t]))})}document.querySelectorAll(`#theme-presets .preset-btn`).forEach(e=>e.classList.toggle(`active`,e.dataset.theme===F.colorTheme));let e=document.getElementById(`toggle-xr-log`);e&&(e.checked=F.debug.xrLog),Qr(F.debug.xrLog),en()}function ra(){for(let e of Object.keys(Ie))for(let t of Ie[e])if(!t.dynamic)for(let n of t.params)n.type===`dropdown`?r.register({kind:`enum`,id:`${e}.${n.key}`,label:n.label,group:e,get:()=>String(Ze(e)[n.key]),set:t=>{let r=Ze(e),i=r[n.key];r[n.key]=typeof i==`number`?Number(t):t},options:(n.options??[]).map(e=>({value:String(e),label:String(e)}))}):n.min!==void 0&&n.max!==void 0&&r.register({kind:`continuous`,id:`${e}.${n.key}`,label:n.label,group:e,get:()=>Number(Ze(e)[n.key]),set:t=>{Ze(e)[n.key]=t},range:{min:n.min,max:n.max},step:n.step});for(let e of Object.keys(Fe))for(let t of Object.keys(Fe[e]))r.register({kind:`action`,id:`preset.${e}.${t}`,label:t,group:`presets`,invoke:()=>nn(e,t)});r.register({kind:`enum`,id:`app.mode`,label:`Mode`,group:`app`,get:()=>F.mode,set:e=>on(e),options:Object.keys(an).map(e=>({value:e,label:an[e]}))}),r.register({kind:`enum`,id:`app.theme`,label:`Theme`,group:`app`,get:()=>F.colorTheme,set:e=>{F.colorTheme=e,Xe(e)},options:Object.keys(Le).map(e=>({value:e,label:e}))}),r.register({kind:`toggle`,id:`app.paused`,label:`Pause`,group:`app`,get:()=>F.paused,set:e=>{F.paused=e,cn()}})}async function ia(){t(),await Pt()&&(In=Fn.matches,document.body.classList.toggle(`mobile`,In),Fn.addEventListener(`change`,e=>{let t=e.matches;t!==In&&(In=t,document.body.classList.toggle(`mobile`,In),window.location.reload())}),Vt(),ta(),In&&Bn(),Ye(F.colorTheme),ra(),Zt(),wn(),sn(),ln(),In?(Ln(),Rn(),zn()):Pn(),Yn(),dn(),Sn(),na(),Ji(),Gi(),Wn(),new ResizeObserver(()=>Ji()).observe(document.getElementById(`canvas-container`)),requestAnimationFrame(Qi),window.__simDiagnose=()=>{let e=K[F.mode];return e?.diagnose?e.diagnose():Promise.resolve({error:1,msg:`no diagnose on this sim`})},window.__simPreset=e=>{let t=document.querySelectorAll(`button`);for(let n of t)if(n.textContent?.trim()===e)return n.click(),`ok`;return`preset not found`},window.__simState=()=>({mode:F.mode,...F[F.mode],fps:ji,gpuMs:Ni,gpuDetail:Pi}),window.__pmDumpDensity=()=>{let e=K[F.mode];return e?.dumpDensity?e.dumpDensity():Promise.resolve(null)},window.__pmDumpPotential=()=>{let e=K[F.mode];return e?.dumpPotential?e.dumpPotential():Promise.resolve(null)},window.__pmMaxResidual=()=>{let e=K[F.mode];return e?.maxResidual?e.maxResidual():Promise.resolve(null)},window.__bindings=r,window.__anchors={evaluateAnchor:o,handFrames:Q},window.__xrUi={layout:_,hitTestWidgets:ee,step:O,applyEffects:ne,registry:jr,makeIdlePrev:E,getRenderList:()=>Nr,getPrev:()=>Mr,getClaimed:()=>({...Pr})},window.__simStats=()=>{let e=K[F.mode];return{...e?.getStats?e.getStats():{error:`no stats on this sim`},gpuMs:Ni,gpuDetail:Pi}})}ia();