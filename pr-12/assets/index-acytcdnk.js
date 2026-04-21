(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=!1;function t(){if(e)return;let t=new URLSearchParams(location.search).get(`xrbridge`);if(!t)return;let r=`xrpb-${t}`,i=`https://ntfy.sh/${r}-cmd/sse`,a=`https://ntfy.sh/${r}-result`;console.log(`[xr-bridge] listening`,{topic:r,cmd:`curl -d '<code>' https://ntfy.sh/${r}-cmd`,results:`curl -sN https://ntfy.sh/${r}-result/sse`}),e=!0;let o=new EventSource(i);o.onmessage=async e=>{let t=null;try{t=JSON.parse(e.data)}catch{return}let r=t?.message;if(!r)return;let i=t?.id,o;try{o={id:i,ok:!0,value:n(await Promise.resolve((0,eval)(r))),at:Date.now()}}catch(e){o={id:i,ok:!1,error:String(e),at:Date.now()}}try{await fetch(a,{method:`POST`,body:JSON.stringify(o),headers:{"Content-Type":`application/json`}})}catch{}},o.onerror=()=>{console.warn(`[xr-bridge] SSE error; EventSource auto-reconnects`)}}function n(e){try{return JSON.parse(JSON.stringify(e,(e,t)=>typeof t==`function`?`[function ${t.name||`anonymous`}]`:t instanceof Element?`[Element ${t.tagName}]`:t instanceof Map?Array.from(t.entries()):t instanceof Set?Array.from(t.values()):t))}catch(e){return`[unserializable: ${String(e)}]`}}var r=new class{map=new Map;register(e){if(this.map.has(e.id))throw Error(`BindingRegistry: id "${e.id}" already registered`);this.map.set(e.id,e)}get(e){return this.map.get(e)}list(){return Array.from(this.map.values())}filterByGroup(e){return this.list().filter(t=>t.group===e)}},i=[0,0,0,1];function a(e){return[-e[0],-e[1],-e[2],e[3]]}function o(e,t){switch(e.kind){case`world`:return e.pose;case`wrist`:case`held`:{let n=t.hands[e.hand].joints?.wrist??null;return n?u(s(n),e.offset):null}case`palm`:{let n=t.hands[e.hand],r=n.joints?.wrist??null,i=n.palmNormal;return!r||!i?null:u({position:c(r.position),orientation:p([0,0,1],c(i))},e.offset)}case`head-hud`:return t.headPose?u(u(t.headPose,{position:[0,0,-e.distance],orientation:i}),e.offset):null}}function s(e){return{position:c(e.position),orientation:l(e.orientation)}}function c(e){return[e[0],e[1],e[2]]}function l(e){return[e[0],e[1],e[2],e[3]]}function u(e,t){let n=f(e.orientation,t.position);return{position:[e.position[0]+n[0],e.position[1]+n[1],e.position[2]+n[2]],orientation:d(e.orientation,t.orientation)}}function d(e,t){return[e[3]*t[0]+e[0]*t[3]+e[1]*t[2]-e[2]*t[1],e[3]*t[1]-e[0]*t[2]+e[1]*t[3]+e[2]*t[0],e[3]*t[2]+e[0]*t[1]-e[1]*t[0]+e[2]*t[3],e[3]*t[3]-e[0]*t[0]-e[1]*t[1]-e[2]*t[2]]}function f(e,t){let n=e[0],r=e[1],i=e[2],a=e[3],o=r*t[2]-i*t[1],s=i*t[0]-n*t[2],c=n*t[1]-r*t[0],l=o+a*t[0],u=s+a*t[1],d=c+a*t[2];return[t[0]+2*(r*d-i*u),t[1]+2*(i*l-n*d),t[2]+2*(n*u-r*l)]}function p(e,t){let n=e[0],r=e[1],i=e[2],a=t[0],o=t[1],s=t[2],c=n*a+r*o+i*s;if(c>.999999)return[0,0,0,1];if(c<-.999999){let e=Math.abs(n)<.9?[1,0,0]:[0,1,0],t=r*e[2]-i*e[1],a=i*e[0]-n*e[2],o=n*e[1]-r*e[0],s=Math.hypot(t,a,o)||1;return[t/s,a/s,o/s,0]}let l=n+a,u=r+o,d=i+s,f=Math.hypot(l,u,d),p=l/f,m=u/f,h=d/f;return[r*h-i*m,i*p-n*h,n*m-r*p,n*p+r*m+i*h]}var m=Object.freeze({minHitHalfExtent:Object.freeze({x:.06,y:.06}),defaultHitPadding:Object.freeze({x:.02,y:.02}),minNeighborHitGap:.02}),h=new Set([`slider`,`dial`,`toggle`,`stepper`,`enum-chips`,`button`,`preset-tile`,`category-tile`,`readout`]);function g(e){return h.has(e.kind)}function _(e,t){let n=o(e.anchor,t);if(!n)return null;let r=new Map,i=[];return y(e.children,n,{x:0,y:0},e.id,r,i),r.set(e.id,{pose:n,visualRect:{halfExtent:C(e.size)},hitRect:{halfExtent:C(e.size)},widget:null,containerKind:`panel`,childrenIds:i}),r}function v(e,t,n,r,i,a){if(g(e)){let o=x(e);i.set(e.id,{pose:w(t,n),visualRect:{halfExtent:o.visualHalf},hitRect:{halfExtent:o.hitHalf},widget:e,parentId:r,childrenIds:[]}),a.push(e.id);return}switch(e.kind){case`group`:b(e,t,n,r,i,a);return;case`tabs`:{let o=e.tabs.find(t=>t.id===e.activeTabId);o&&v(o.body,t,n,r,i,a);return}case`focus-view`:{if(e.focused==null)return;let o=e.children.find(t=>t.id===e.focused);o&&v(o,t,n,r,i,a);return}case`panel`:return}}function y(e,t,n,r,i,a){let o=e.map(x),s=m.minNeighborHitGap,c=S(o,`y`,s)/2;for(let l=0;l<e.length;l++){let u=o[l],d=c-u.hitHalf.y;v(e[l],t,{x:n.x,y:n.y+d},r,i,a),c-=u.hitHalf.y*2+s}}function b(e,t,n,r,i,a){let o=Math.max(e.gap??0,m.minNeighborHitGap),s=e.children.map(x);if(e.layout===`row`){let c=-S(s,`x`,o)/2;for(let l=0;l<e.children.length;l++){let u=s[l],d=c+u.hitHalf.x;v(e.children[l],t,{x:n.x+d,y:n.y},r,i,a),c+=u.hitHalf.x*2+o}return}if(e.layout===`column`){let c=S(s,`y`,o)/2;for(let l=0;l<e.children.length;l++){let u=s[l],d=c-u.hitHalf.y;v(e.children[l],t,{x:n.x,y:n.y+d},r,i,a),c-=u.hitHalf.y*2+o}return}let c=Math.max(1,e.columns??1),l=Math.max(0,...s.map(e=>e.hitHalf.x)),u=Math.max(0,...s.map(e=>e.hitHalf.y)),d=Math.ceil(e.children.length/c),f=c*l*2+Math.max(0,c-1)*o,p=d*u*2+Math.max(0,d-1)*o;for(let s=0;s<e.children.length;s++){let d=Math.floor(s/c),m=s%c,h=-f/2+m*(l*2+o)+l,g=p/2-d*(u*2+o)-u;v(e.children[s],t,{x:n.x+h,y:n.y+g},r,i,a)}}function x(e){if(g(e)){let t=C(e.visualSize);return{hitHalf:{x:Math.max(t.x+e.hitPadding.x,m.minHitHalfExtent.x),y:Math.max(t.y+e.hitPadding.y,m.minHitHalfExtent.y)},visualHalf:t}}switch(e.kind){case`panel`:return{hitHalf:C(e.size),visualHalf:C(e.size)};case`group`:{let t=Math.max(e.gap??0,m.minNeighborHitGap),n=e.children.map(x);if(e.layout===`row`){let e=S(n,`x`,t),r=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.y*2));return{hitHalf:{x:e/2,y:r/2},visualHalf:{x:e/2,y:r/2}}}if(e.layout===`column`){let e=S(n,`y`,t),r=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.x*2));return{hitHalf:{x:r/2,y:e/2},visualHalf:{x:r/2,y:e/2}}}let r=Math.max(1,e.columns??1),i=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.x)),a=n.length===0?0:Math.max(...n.map(e=>e.hitHalf.y)),o=Math.ceil(e.children.length/r),s=r*i*2+Math.max(0,r-1)*t,c=o*a*2+Math.max(0,o-1)*t;return{hitHalf:{x:s/2,y:c/2},visualHalf:{x:s/2,y:c/2}}}case`tabs`:{let t=e.tabs.find(t=>t.id===e.activeTabId);return t?x(t.body):{hitHalf:{x:0,y:0},visualHalf:{x:0,y:0}}}case`focus-view`:{if(e.focused==null)return{hitHalf:{x:0,y:0},visualHalf:{x:0,y:0}};let t=e.children.find(t=>t.id===e.focused);return t?x(t):{hitHalf:{x:0,y:0},visualHalf:{x:0,y:0}}}}}function S(e,t,n){let r=0;for(let i=0;i<e.length;i++)r+=(t===`x`?e[i].hitHalf.x:e[i].hitHalf.y)*2,i>0&&(r+=n);return r}function C(e){return{x:e.x/2,y:e.y/2}}function w(e,t){return u(e,{position:[t.x,t.y,0],orientation:[0,0,0,1]})}function T(e,t){let n=null,r=1/0;for(let[i,a]of e){if(!a.widget)continue;let e=E(t,a.pose,a.hitRect.halfExtent);e!==null&&e<r&&(r=e,n=i)}return n}function E(e,t,n){let r=a(t.orientation),i=f(r,[e.origin[0]-t.position[0],e.origin[1]-t.position[1],e.origin[2]-t.position[2]]),o=f(r,[e.dir[0],e.dir[1],e.dir[2]]);if(Math.abs(o[2])<1e-9)return null;let s=-i[2]/o[2];if(s<=0)return null;let c=i[0]+s*o[0],l=i[1]+s*o[1];return Math.abs(c)>n.x||Math.abs(l)>n.y?null:s}function D(){return{states:{left:{kind:`idle`},right:{kind:`idle`}},pinches:{left:!1,right:!1}}}var ee=[`left`,`right`];function te(e,t,n,r,i,a){let o=[],s=[],c={states:{left:n.states.left,right:n.states.right},pinches:{left:t.left.pinch.active,right:t.right.pinch.active}},l=e.activeLayoutId==null?void 0:e.layouts.get(e.activeLayoutId);if(!l)return c.states.left={kind:`idle`},c.states.right={kind:`idle`},{next:c,sideEffects:o,renderList:s};let u=_(l,r);if(!u)return c.states.left={kind:`idle`},c.states.right={kind:`idle`},{next:c,sideEffects:o,renderList:s};for(let r of ee){let a=t[r],s=n.pinches[r],l=a.pinch.active,d=n.states[r],f=d;if(l&&!s){let t=a.gazeRay?T(u,a.gazeRay):null,n=t?u.get(t)?.widget??null:null;f=n&&t?ce(n,t,e.bindings,a):{kind:`idle`}}else if(!l&&s){if(d.kind===`pressing`&&!d.cancelPending){let e=d.commit;if(e.kind===`invoke`)o.push({kind:`binding-invoke`,bindingId:d.bindingId});else if(e.kind===`toggle`)o.push({kind:`binding-set`,bindingId:d.bindingId,value:!e.valueAtOrigin});else{let t=Math.max(e.min,Math.min(e.max,e.valueAtOrigin+e.step));o.push({kind:`binding-set`,bindingId:d.bindingId,value:t})}}f={kind:`idle`}}else if(l&&s){if(d.kind===`dragging`){let t=e.bindings.get(d.bindingId);if(t&&t.kind===`continuous`){let e=le(d,a,t,i.gainMultiplier);o.push({kind:`binding-set`,bindingId:d.bindingId,value:e})}f=d}else if(d.kind===`pressing`){let e=!!a.currentRay&&T(u,a.currentRay)===d.widgetId;f={...d,cancelPending:!e}}}else{let e=a.ray?T(u,a.ray):null;f=e?{kind:`hovering`,widgetId:e}:{kind:`idle`}}c.states[r]=f}for(let[t,n]of u){if(!n.widget)continue;let r=n.widget,i=ie(c.states,e=>e.kind===`hovering`&&e.widgetId===t),a=ie(c.states,e=>e.kind===`pressing`&&e.widgetId===t),o=ie(c.states,e=>e.kind===`dragging`&&e.widgetId===t);s.push({widgetId:t,pose:n.pose,visualHalfExtent:n.visualRect.halfExtent,kind:r.kind,state:{hover:i,pressed:a,dragging:o,value:se(r,e.bindings)},label:ae(r,e.bindings)})}return{next:c,sideEffects:o,renderList:s}}function ne(e){return e.kind===`pressing`||e.kind===`dragging`}function re(e,t){for(let n of e){if(n.kind===`tab-switch`)continue;let e=t.bindings.get(n.bindingId);if(e){if(n.kind===`binding-invoke`&&e.kind===`action`){e.invoke();continue}n.kind===`binding-set`&&(e.kind===`continuous`&&typeof n.value==`number`||e.kind===`toggle`&&typeof n.value==`boolean`||e.kind===`enum`&&typeof n.value==`string`)&&e.set(n.value)}}}function ie(e,t){return t(e.left)||t(e.right)}function ae(e,t){if(e.kind===`category-tile`)return;let n=t.get(e.binding);if(n){if(e.kind===`slider`||e.kind===`dial`||e.kind===`readout`||e.kind===`stepper`){if(n.kind!==`continuous`)return n.label;let e=n.get();return n.format?n.format(e):oe(e)}if(e.kind===`toggle`)return n.kind===`toggle`?n.get()?`On`:`Off`:n.label;if(e.kind===`enum-chips`)return n.kind===`enum`?n.get():n.label;if(e.kind===`button`||e.kind===`preset-tile`)return n.label}}function oe(e){if(Number.isInteger(e))return String(e);let t=Math.abs(e);return t>=100?e.toFixed(0):t>=10?e.toFixed(1):t>=1?e.toFixed(2):e.toFixed(3)}function se(e,t){if(e.kind!==`slider`&&e.kind!==`dial`&&e.kind!==`readout`)return;let n=t.get(e.binding);if(!n||n.kind!==`continuous`)return;let r=n.range.max-n.range.min;return r<=0?0:(n.get()-n.range.min)/r}function ce(e,t,n,r){if(e.kind===`button`||e.kind===`preset-tile`){let i=n.get(e.binding);return!i||i.kind!==`action`?{kind:`idle`}:{kind:`pressing`,widgetId:t,bindingId:i.id,startedAt:r.pinch.startTime,cancelPending:!1,commit:{kind:`invoke`}}}if(e.kind===`toggle`){let i=n.get(e.binding);return!i||i.kind!==`toggle`?{kind:`idle`}:{kind:`pressing`,widgetId:t,bindingId:i.id,startedAt:r.pinch.startTime,cancelPending:!1,commit:{kind:`toggle`,valueAtOrigin:i.get()}}}if(e.kind===`stepper`){let i=n.get(e.binding);return!i||i.kind!==`continuous`?{kind:`idle`}:{kind:`pressing`,widgetId:t,bindingId:i.id,startedAt:r.pinch.startTime,cancelPending:!1,commit:{kind:`increment`,valueAtOrigin:i.get(),step:e.step,min:i.range.min,max:i.range.max}}}if(e.kind===`slider`||e.kind===`dial`){let i=n.get(e.binding);return!i||i.kind!==`continuous`?{kind:`idle`}:{kind:`dragging`,widgetId:t,bindingId:i.id,handOriginPos:[...r.pinch.origin],valueAtOrigin:i.get(),interaction:e.interaction,cancelPending:!1}}return{kind:`idle`}}function le(e,t,n,r){let i=t.pinch.current[0]-e.handOriginPos[0],a=t.pinch.current[1]-e.handOriginPos[1],o=t.pinch.current[2]-e.handOriginPos[2],s=n.range.max-n.range.min,c=0;switch(e.interaction.kind){case`direct-drag`:c=(e.interaction.axis===`x`?i:a)*s;break;case`pinch-pull`:{let t=e.interaction.axis;c=(t===`forward`?-o:t===`up`?a:i)*e.interaction.unitsPerMeter;break}case`pinch-twist`:c=0;break;case`expand-to-focus`:c=0;break}let l=e.valueAtOrigin+c*r;return Math.max(n.range.min,Math.min(n.range.max,l))}var ue=`// XR widget renderer.
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
`,de=64,fe=64,pe=208,me=256,he=512,ge=64,O=de,_e=ge*O,ve={slider:0,button:1,readout:2,dial:3,toggle:4,stepper:5,"enum-chips":6,"preset-tile":7,"category-tile":8};function ye(e,t,n){let r=e.createShaderModule({code:ue,label:`xr-widgets`}),i=e.createBindGroupLayout({label:`xr-widgets-bgl`,entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,sampler:{}}]}),a=e.createPipelineLayout({bindGroupLayouts:[i]}),o=e.createBuffer({label:`xr-widgets-instances`,size:fe*de,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),s=new ArrayBuffer(fe*de),c=new Float32Array(s),l=new Uint32Array(s),u=document.createElement(`canvas`);u.width=he,u.height=_e;let d=u.getContext(`2d`);if(!d)throw Error(`xr-widgets: 2D canvas context unavailable`);let f=d;f.font=`600 40px system-ui, -apple-system, sans-serif`,f.textAlign=`center`,f.textBaseline=`middle`;let p=e.createTexture({label:`xr-widgets-label-atlas`,size:[he,_e,1],format:`rgba8unorm`,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),m=p.createView(),h=e.createSampler({label:`xr-widgets-atlas-sampler`,magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`}),g=new Map,_=0;function v(t,n){let r=g.get(t);if(!r){if(_>=O)return-1;r={stripIndex:_++,lastLabel:``},g.set(t,r)}if(r.lastLabel===n)return r.stripIndex;r.lastLabel=n;let i=r.stripIndex*ge;return f.clearRect(0,i,he,ge),f.fillStyle=`rgba(255, 255, 255, 1)`,f.fillText(n,he/2,i+ge/2),e.queue.copyExternalImageToTexture({source:u,origin:{x:0,y:i}},{texture:p,origin:{x:0,y:i}},[he,ge,1]),r.stripIndex}let y=[];for(let n=0;n<2;n++)y.push(e.createBindGroup({label:`xr-widgets-bg-eye${n}`,layout:i,entries:[{binding:0,resource:{buffer:t,offset:n*me,size:pe}},{binding:1,resource:{buffer:o}},{binding:2,resource:m},{binding:3,resource:h}]}));let b=new Map;function x(t){let n=b.get(t);return n||(n=e.createRenderPipeline({label:`xr-widgets-pipeline-${t}`,layout:a,vertex:{module:r,entryPoint:`vs`},fragment:{module:r,entryPoint:`fs`,targets:[{format:t,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`}}),b.set(t,n),n)}function S(e){let t=Math.min(e.length,de);for(let n=0;n<t;n++){let t=e[n],r=fe/4*n;c[r+0]=t.pose.position[0],c[r+1]=t.pose.position[1],c[r+2]=t.pose.position[2],c[r+3]=t.visualHalfExtent.x,c[r+4]=t.pose.orientation[0],c[r+5]=t.pose.orientation[1],c[r+6]=t.pose.orientation[2],c[r+7]=t.pose.orientation[3],c[r+8]=t.visualHalfExtent.y,l[r+9]=ve[t.kind]??0;let i=(t.state.hover?1:0)|(t.state.pressed?2:0)|(t.state.dragging?4:0);l[r+10]=i>>>0,c[r+11]=t.state.value??0;let a=t.label!=null&&t.label.length>0?v(t.widgetId,t.label):-1;l[r+12]=a>=0?a>>>0:0,l[r+13]=a>=0?1:0,l[r+14]=0,l[r+15]=0}return t}return{draw(r,i,a,c,l){e.queue.writeBuffer(t,c*me,n(c));let u=S(l);u>0&&e.queue.writeBuffer(o,0,s,0,u*fe);let d=r.beginRenderPass({label:`xr-widgets-pass-eye${c}`,colorAttachments:[{view:i,loadOp:`load`,storeOp:`store`}]});u>0&&(d.setPipeline(x(a)),d.setBindGroup(0,y[c]),d.draw(6,u)),d.end()},destroy(){o.destroy(),p.destroy()}}}var be=`// [LAW:one-source-of-truth] System-wide statistics computed in one reduction pass.
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
`,De=`// PM force interpolation (CIC-weighted). For each particle, read the
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
`,Oe=`struct Camera {
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
`,ke=`// [LAW:dataflow-not-control-flow] Trail decay always runs in the same shape — only the persistence value varies.
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
`,Ae=`// [LAW:one-source-of-truth] CoD-Advanced-Warfare 13-tap downsample. The first level applies a soft bright-pass.
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
`,je=`// 9-tap tent filter upsample. Reads from a smaller mip; output is additively blended into a larger one.

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
`,Me=`// Final HDR composite: combine scene + bloom, ACES tone-map, color grade, vignette, chromatic aberration,
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
`,Ne=200,Pe=[],k=`boot`;function Fe(e){let t=document.getElementById(`gpu-error-overlay`);t||(t=document.createElement(`div`),t.id=`gpu-error-overlay`,t.style.cssText=`position:fixed;top:60px;left:10px;right:10px;max-height:60vh;overflow:auto;background:rgba(20,0,0,0.92);color:#ff8080;font:11px monospace;padding:10px;border:1px solid #ff4040;border-radius:4px;z-index:9999;white-space:pre-wrap;`,document.body.appendChild(t));let n=new Date().toLocaleTimeString();t.textContent=`[${n}] ${e}\n\n`+t.textContent}function A(e,t,n){let r=t instanceof Error?t:Error(typeof t==`string`?t:JSON.stringify(t)),i=n?`${n}: ${r.message}`:r.message,a={t:performance.now(),kind:e,phase:k,msg:i,stack:r.stack};Pe.push(a),Pe.length>Ne&&Pe.splice(0,Pe.length-Ne),console.error(`[${e}] (phase=${k})`,i,r.stack||``),Fe(`[${e}] (phase=${k}) ${i}`)}function j(e,t,...n){console.info(`[${e}] (phase=${k})`,t,...n)}globalThis.__errorLog=()=>Pe.slice(),globalThis.__gpuPhase=()=>k,window.addEventListener(`error`,e=>{A(`window.error`,e.error??e.message,`at ${e.filename}:${e.lineno}:${e.colno}`)}),window.addEventListener(`unhandledrejection`,e=>{A(`unhandledrejection`,e.reason)});function M(e,t){let n=W.createShaderModule({label:e,code:t});return n.getCompilationInfo().then(n=>{if(n.messages.length===0)return;let r=t.split(`
`),i=!1;for(let t of n.messages){let n=(r[t.lineNum-1]||``).trimEnd(),a=` `.repeat(Math.max(0,t.linePos-1))+`^`,o=`[shader:${e}] ${t.type.toUpperCase()} line ${t.lineNum}:${t.linePos} ${t.message}\n  ${n}\n  ${a}`;t.type===`error`?(i=!0,A(`shader:${e}`,Error(o))):t.type===`warning`?console.warn(o):console.info(o)}i||j(`shader:${e}`,`compiled with ${n.messages.length} non-error messages`)}).catch(t=>A(`shader:${e}:compilationInfo`,t)),n}var N={boids:{count:1e3,separationRadius:25,alignmentRadius:50,cohesionRadius:50,maxSpeed:2,maxForce:.05,visualRange:100},physics:{count:8e4,G:.3,softening:1.5,distribution:`disk`,interactionStrength:1,tidalStrength:.008,attractorDecayTime:2,haloMass:5,haloScale:2,diskMass:3,diskScaleA:1.5,diskScaleB:.3},physics_classic:{count:500,G:1,softening:.5,damping:.999,distribution:`random`},fluid:{resolution:256,viscosity:.1,diffusionRate:.001,forceStrength:100,volumeScale:1.5,dyeMode:`rainbow`,jacobiIterations:40},parametric:{shape:`torus`,scale:1,p1Min:.7,p1Max:1.3,p1Rate:.3,p2Min:.2,p2Max:.55,p2Rate:.5,p3Min:.15,p3Max:.45,p3Rate:.7,p4Min:.5,p4Max:2,p4Rate:.4,twistMin:0,twistMax:.4,twistRate:.15},reaction:{resolution:128,feed:.055,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Spots`}},Ie={boids:{Default:{...N.boids},"Tight Flock":{count:3e3,separationRadius:10,alignmentRadius:30,cohesionRadius:80,maxSpeed:3,maxForce:.08,visualRange:60},Dispersed:{count:2e3,separationRadius:60,alignmentRadius:100,cohesionRadius:20,maxSpeed:1.5,maxForce:.03,visualRange:200},Massive:{count:2e4,separationRadius:15,alignmentRadius:40,cohesionRadius:40,maxSpeed:2.5,maxForce:.04,visualRange:80},"Slow Dance":{count:500,separationRadius:40,alignmentRadius:80,cohesionRadius:100,maxSpeed:.5,maxForce:.01,visualRange:150}},physics:{Default:{...N.physics},"Spiral Galaxy":{count:1e5,G:1.5,softening:.15,distribution:`spiral`,interactionStrength:1,tidalStrength:.005,haloMass:8,haloScale:2.5,diskMass:4,diskScaleA:1.2,diskScaleB:.15},"Cosmic Web":{count:8e4,G:.8,softening:2,distribution:`web`,interactionStrength:1,tidalStrength:.025,haloMass:2,haloScale:4,diskMass:0,diskScaleA:1.5,diskScaleB:.3},"Star Cluster":{count:6e4,G:.3,softening:1.2,distribution:`cluster`,interactionStrength:1,tidalStrength:.001,haloMass:3,haloScale:1.5,diskMass:0,diskScaleA:1,diskScaleB:.5},Maelstrom:{count:12e4,G:.25,softening:2.5,distribution:`maelstrom`,interactionStrength:1.5,tidalStrength:.005,haloMass:6,haloScale:1.8,diskMass:5,diskScaleA:.8,diskScaleB:.2},"Dust Cloud":{count:15e4,G:.08,softening:3.5,distribution:`dust`,interactionStrength:.5,tidalStrength:.003,haloMass:1,haloScale:5,diskMass:0,diskScaleA:2,diskScaleB:.5},Binary:{count:8e4,G:.6,softening:1,distribution:`binary`,interactionStrength:1,tidalStrength:.04,haloMass:4,haloScale:2,diskMass:2,diskScaleA:1,diskScaleB:.25}},physics_classic:{Default:{...N.physics_classic},Galaxy:{count:3e3,G:.5,softening:1,damping:.998,distribution:`disk`},Collapse:{count:2e3,G:10,softening:.1,damping:.995,distribution:`shell`},Gentle:{count:1e3,G:.1,softening:2,damping:.9999,distribution:`random`}},fluid:{Default:{...N.fluid},Thick:{resolution:256,viscosity:.8,diffusionRate:.005,forceStrength:200,volumeScale:1.8,dyeMode:`rainbow`,jacobiIterations:40},Turbulent:{resolution:512,viscosity:.01,diffusionRate:1e-4,forceStrength:300,volumeScale:1.3,dyeMode:`rainbow`,jacobiIterations:60},"Ink Drop":{resolution:256,viscosity:.3,diffusionRate:0,forceStrength:50,volumeScale:2.1,dyeMode:`single`,jacobiIterations:40}},parametric:{Default:{shape:`torus`,scale:1,p1Min:.7,p1Max:1.3,p1Rate:.3,p2Min:.2,p2Max:.55,p2Rate:.5,p3Min:.15,p3Max:.45,p3Rate:.7,p4Min:.5,p4Max:2,p4Rate:.4,twistMin:0,twistMax:.4,twistRate:.15},"Rippling Ring":{shape:`torus`,scale:1,p1Min:.5,p1Max:1.5,p1Rate:.5,p2Min:.15,p2Max:.7,p2Rate:.7,p3Min:.3,p3Max:.8,p3Rate:1,p4Min:1,p4Max:3,p4Rate:.6,twistMin:0,twistMax:1,twistRate:.2},"Wild Möbius":{shape:`mobius`,scale:1.5,p1Min:.8,p1Max:2,p1Rate:.3,p2Min:1,p2Max:3,p2Rate:.15,p3Min:.2,p3Max:.6,p3Rate:.8,p4Min:.5,p4Max:2.5,p4Rate:.5,twistMin:1,twistMax:4,twistRate:.1},"Trefoil Pulse":{shape:`trefoil`,scale:1.2,p1Min:.08,p1Max:.35,p1Rate:.9,p2Min:.25,p2Max:.55,p2Rate:.4,p3Min:.3,p3Max:.9,p3Rate:1.2,p4Min:1,p4Max:4,p4Rate:.7,twistMin:0,twistMax:.5,twistRate:.2},"Klein Chaos":{shape:`klein`,scale:1.2,p1Min:.5,p1Max:1.5,p1Rate:.4,p2Min:0,p2Max:0,p2Rate:0,p3Min:.2,p3Max:.6,p3Rate:.9,p4Min:.8,p4Max:3.5,p4Rate:.5,twistMin:0,twistMax:.8,twistRate:.15}},reaction:{Spots:{resolution:128,feed:.055,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Spots`},Mazes:{resolution:128,feed:.029,kill:.057,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Mazes`},Worms:{resolution:128,feed:.058,kill:.065,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Worms`},Mitosis:{resolution:128,feed:.0367,kill:.0649,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Mitosis`},Coral:{resolution:128,feed:.062,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Coral`}}},Le={boids:[{section:`Flock`,params:[{key:`count`,label:`Count`,min:100,max:3e4,step:100,requiresReset:!0},{key:`visualRange`,label:`Visual Range`,min:10,max:500,step:5}]},{section:`Forces`,params:[{key:`separationRadius`,label:`Separation`,min:1,max:100,step:1},{key:`alignmentRadius`,label:`Alignment`,min:1,max:200,step:1},{key:`cohesionRadius`,label:`Cohesion`,min:1,max:200,step:1},{key:`maxSpeed`,label:`Max Speed`,min:.1,max:10,step:.1},{key:`maxForce`,label:`Max Force`,min:.001,max:.5,step:.001}]}],physics:[{section:`Simulation`,params:[{key:`count`,label:`Bodies`,min:10,max:15e4,step:10,requiresReset:!0},{key:`G`,label:`Gravity (G)`,min:.05,max:5,step:.01},{key:`softening`,label:`Softening`,min:.2,max:4,step:.05},{key:`interactionStrength`,label:`Interaction Pull`,min:.1,max:100,step:.01,logScale:!0},{key:`attractorDecayTime`,label:`Decay Time (s)`,min:.1,max:30,step:.1,maxLabel:`Permanent`},{key:`tidalStrength`,label:`Tidal Field`,min:0,max:.05,step:5e-4}]},{section:`Initial State`,params:[{key:`distribution`,label:`Distribution`,type:`dropdown`,options:[`random`,`disk`,`shell`]}]},{section:`Dark Matter`,params:[{key:`haloMass`,label:`Halo Mass`,min:0,max:15,step:.1},{key:`haloScale`,label:`Halo Scale`,min:.5,max:8,step:.1},{key:`diskMass`,label:`Disk Mass`,min:0,max:10,step:.1},{key:`diskScaleA`,label:`Disk Scale A`,min:.1,max:5,step:.05},{key:`diskScaleB`,label:`Disk Scale B`,min:.05,max:2,step:.01}]}],physics_classic:[{section:`Simulation`,params:[{key:`count`,label:`Bodies`,min:10,max:1e4,step:10,requiresReset:!0},{key:`G`,label:`Gravity (G)`,min:.01,max:100,step:.01},{key:`softening`,label:`Softening`,min:.01,max:10,step:.01},{key:`damping`,label:`Damping`,min:.9,max:1,step:.001}]},{section:`Initial State`,params:[{key:`distribution`,label:`Distribution`,type:`dropdown`,options:[`random`,`disk`,`shell`],requiresReset:!0}]}],fluid:[{section:`Grid`,params:[{key:`resolution`,label:`Resolution`,type:`dropdown`,options:[64,128,256,512],requiresReset:!0}]},{section:`Physics`,params:[{key:`viscosity`,label:`Viscosity`,min:0,max:1,step:.01},{key:`diffusionRate`,label:`Diffusion`,min:0,max:.01,step:1e-4},{key:`forceStrength`,label:`Force`,min:1,max:500,step:1},{key:`jacobiIterations`,label:`Iterations`,min:10,max:80,step:5}]},{section:`Appearance`,params:[{key:`volumeScale`,label:`Volume`,min:.4,max:3,step:.05},{key:`dyeMode`,label:`Dye Mode`,type:`dropdown`,options:[`rainbow`,`single`,`temperature`]}]}],parametric:[{section:`Shape`,params:[{key:`shape`,label:`Equation`,type:`dropdown`,options:[`torus`,`klein`,`mobius`,`sphere`,`trefoil`]}]},{section:`Shape Parameters`,id:`shape-params-section`,params:[],dynamic:!0},{section:`Transform`,params:[{key:`scale`,label:`Scale`,min:.1,max:5,step:.1}]},{section:`Twist`,params:[{key:`twistMin`,label:`Min`,min:0,max:12.56,step:.05},{key:`twistMax`,label:`Max`,min:0,max:12.56,step:.05},{key:`twistRate`,label:`Rate`,min:0,max:3,step:.05}]},{section:`Wave Amplitude`,params:[{key:`p3Min`,label:`Min`,min:0,max:2,step:.05},{key:`p3Max`,label:`Max`,min:0,max:2,step:.05},{key:`p3Rate`,label:`Rate`,min:0,max:3,step:.05}]},{section:`Wave Frequency`,params:[{key:`p4Min`,label:`Min`,min:0,max:5,step:.1},{key:`p4Max`,label:`Max`,min:0,max:5,step:.1},{key:`p4Rate`,label:`Rate`,min:0,max:3,step:.05}]}],reaction:[{section:`Volume`,params:[{key:`resolution`,label:`Resolution`,type:`dropdown`,options:[64,128],requiresReset:!0},{key:`stepsPerFrame`,label:`Steps/Frame`,min:1,max:12,step:1}]},{section:`Reaction`,params:[{key:`feed`,label:`Feed`,min:.01,max:.1,step:5e-4},{key:`kill`,label:`Kill`,min:.03,max:.08,step:5e-4},{key:`Du`,label:`Du`,min:.05,max:.35,step:.001},{key:`Dv`,label:`Dv`,min:.02,max:.2,step:.001}]},{section:`Render`,params:[{key:`isoThreshold`,label:`Iso Threshold`,min:.05,max:.6,step:.01}]}]},Re={Dracula:{primary:`#BD93F9`,secondary:`#FF79C6`,accent:`#50FA7B`,bg:`#282A36`,fg:`#F8F8F2`},Nord:{primary:`#88C0D0`,secondary:`#81A1C1`,accent:`#A3BE8C`,bg:`#2E3440`,fg:`#D8DEE9`},Monokai:{primary:`#AE81FF`,secondary:`#F82672`,accent:`#A5E22E`,bg:`#272822`,fg:`#D6D6D6`},"Rose Pine":{primary:`#C4A7E7`,secondary:`#EBBCBA`,accent:`#9CCFD8`,bg:`#191724`,fg:`#E0DEF4`},Gruvbox:{primary:`#85A598`,secondary:`#F9BD2F`,accent:`#B7BB26`,bg:`#282828`,fg:`#FBF1C7`},Solarized:{primary:`#268BD2`,secondary:`#2AA198`,accent:`#849900`,bg:`#002B36`,fg:`#839496`},"Tokyo Night":{primary:`#BB9AF7`,secondary:`#7AA2F7`,accent:`#9ECE6A`,bg:`#1A1B26`,fg:`#A9B1D6`},Catppuccin:{primary:`#F5C2E7`,secondary:`#CBA6F7`,accent:`#ABE9B3`,bg:`#181825`,fg:`#CDD6F4`},"Atom One":{primary:`#61AFEF`,secondary:`#C678DD`,accent:`#62F062`,bg:`#282C34`,fg:`#ABB2BF`},Flexoki:{primary:`#205EA6`,secondary:`#24837B`,accent:`#65800B`,bg:`#100F0F`,fg:`#FFFCF0`}},ze=`Dracula`,Be=12e3,Ve={r:.02,g:.02,b:.025,a:1};function He(e){let t=parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function Ue(e){let t=Re[e]||Re[ze];return{primary:He(t.primary),secondary:He(t.secondary),accent:He(t.accent),bg:He(t.bg),fg:He(t.fg),clearColor:{r:He(t.bg)[0],g:He(t.bg)[1],b:He(t.bg)[2],a:1}}}function We(e,t,n){return e.map((e,r)=>e+(t[r]-e)*n)}function Ge(e,t,n){let r=We(e.bg,t.bg,n);return{primary:We(e.primary,t.primary,n),secondary:We(e.secondary,t.secondary,n),accent:We(e.accent,t.accent,n),bg:r,fg:We(e.fg,t.fg,n),clearColor:{r:r[0],g:r[1],b:r[2],a:1}}}var Ke={from:Ue(ze),to:Ue(ze),startedAtMs:0},P=Ue(ze);function qe(e){let t=Math.max(0,Math.min(1,(e-Ke.startedAtMs)/Be));return Ge(Ke.from,Ke.to,t)}function Je(){return P}function Ye(e){P=qe(e)}function Xe(e){let t=Ue(e);Ke.from=t,Ke.to=t,Ke.startedAtMs=0,P=t}function Ze(e,t=performance.now()){let n=Ue(e),r=qe(t);Ke.from=r,Ke.to=n,Ke.startedAtMs=t,P=r}function F(e){return I[e]}var I={mode:`physics`,colorTheme:`Dracula`,xrEnabled:!1,paused:!1,boids:{...N.boids},physics:{...N.physics},physics_classic:{...N.physics_classic},fluid:{...N.fluid},parametric:{...N.parametric},reaction:{...N.reaction},camera:{distance:5,fov:60,rotX:.3,rotY:0,panX:0,panY:0},mouse:{down:!1,x:0,y:0,dx:0,dy:0,worldX:0,worldY:0,worldZ:0},attractors:[],pointerToAttractor:new Map,fx:{bloomIntensity:.7,bloomThreshold:4,bloomRadius:1,trailPersistence:0,exposure:1,vignette:.35,chromaticAberration:.25,grading:.5,timeScale:1},debug:{xrLog:!1}},Qe=.016,$e=1/Qe,et=90,tt=32,nt=3,rt=30;function it(){let e=K.physics;return e&&`getSimStep`in e?e.getSimStep():0}function at(){let e=K.physics;return e&&`getTimeDirection`in e?e.getTimeDirection():1}function ot(e){let t=I.physics.attractorDecayTime??2;return t>=rt?1/0:Math.max(nt,t*$e)}function st(e,t,n){if(e.releaseStep<0||t<e.releaseStep){let r=Math.max(0,t-e.chargeStep),i=Math.min(1,r/et);return i*i*n}let r=Math.min(1,e.holdSteps/et),i=r*r*n,a=t-e.releaseStep,o=ot(e);if(a>=o)return 0;let s=1-a/o;return i*s*s}function ct(e,t){return e.releaseStep<0?!1:t-e.releaseStep>=ot(e)}function lt(e){if(at()<0)return;let t=[],n=new Map;for(let r=0;r<I.attractors.length;r++){let i=I.attractors[r];ct(i,e)||(n.set(r,t.length),t.push(i))}I.attractors=t;let r=new Map;I.pointerToAttractor.forEach((e,t)=>{let i=n.get(e);i!==void 0&&r.set(t,i)}),I.pointerToAttractor=r}function ut(e,t){if(at()<0)return;if(I.attractors.length>=tt){I.attractors.shift();let e=new Map;I.pointerToAttractor.forEach((t,n)=>{t>0&&e.set(n,t-1)}),I.pointerToAttractor=e}let n=it();I.attractors.push({x:t[0],y:t[1],z:t[2],chargeStep:n,releaseStep:-1,holdSteps:-1}),I.pointerToAttractor.set(e,I.attractors.length-1)}function dt(e,t){let n=I.pointerToAttractor.get(e);if(n===void 0)return;let r=I.attractors[n];!r||r.releaseStep>=0||(r.x=t[0],r.y=t[1],r.z=t[2])}function ft(e){let t=I.pointerToAttractor.get(e);if(t===void 0)return;I.pointerToAttractor.delete(e);let n=I.attractors[t];if(!n||n.releaseStep>=0)return;let r=it();n.releaseStep=r,n.holdSteps=Math.max(1,r-n.chargeStep)}var pt=96,L=4,mt=208,R=256,ht=500,gt={torus:0,klein:1,mobius:2,sphere:3,trefoil:4},_t={torus:{p1:{label:`Major Radius`,animMin:.7,animMax:1.3,animRate:.3,min:.2,max:2.5,step:.05},p2:{label:`Minor Radius`,animMin:.2,animMax:.6,animRate:.5,min:.05,max:1.2,step:.05}},klein:{p1:{label:`Bulge`,animMin:.7,animMax:1.5,animRate:.4,min:.2,max:3,step:.05}},mobius:{p1:{label:`Width`,animMin:.5,animMax:1.8,animRate:.35,min:.1,max:3,step:.05},p2:{label:`Half-Twists`,animMin:1,animMax:3,animRate:.15,min:.5,max:5,step:.5}},sphere:{p1:{label:`XY Stretch`,animMin:.6,animMax:1.5,animRate:.4,min:.1,max:3,step:.05},p2:{label:`Z Stretch`,animMin:.5,animMax:1.8,animRate:.6,min:.1,max:3,step:.05}},trefoil:{p1:{label:`Tube Radius`,animMin:.08,animMax:.35,animRate:.6,min:.05,max:1,step:.05},p2:{label:`Knot Scale`,animMin:.25,animMax:.5,animRate:.35,min:.1,max:1,step:.05}}},z={identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])},perspective(e,t,n,r){let i=1/Math.tan(e*.5),a=1/(n-r),o=new Float32Array(16);return o[0]=i/t,o[5]=i,o[10]=r*a,o[11]=-1,o[14]=n*r*a,o},lookAt(e,t,n){let r=B(vt(e,t)),i=B(V(n,r)),a=V(r,i);return new Float32Array([i[0],a[0],r[0],0,i[1],a[1],r[1],0,i[2],a[2],r[2],0,-yt(i,e),-yt(a,e),-yt(r,e),1])},multiply(e,t){let n=new Float32Array(16);for(let r=0;r<4;r++)for(let i=0;i<4;i++)n[i*4+r]=e[r]*t[i*4]+e[4+r]*t[i*4+1]+e[8+r]*t[i*4+2]+e[12+r]*t[i*4+3];return n},rotateX(e,t){let n=Math.cos(t),r=Math.sin(t),i=z.identity();return i[5]=n,i[6]=r,i[9]=-r,i[10]=n,z.multiply(e,i)},rotateY(e,t){let n=Math.cos(t),r=Math.sin(t),i=z.identity();return i[0]=n,i[2]=-r,i[8]=r,i[10]=n,z.multiply(e,i)},rotateZ(e,t){let n=Math.cos(t),r=Math.sin(t),i=z.identity();return i[0]=n,i[1]=r,i[4]=-r,i[5]=n,z.multiply(e,i)},translate(e,t,n,r){let i=z.identity();return i[12]=t,i[13]=n,i[14]=r,z.multiply(e,i)}};function B(e){let t=Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);return t>0?[e[0]/t,e[1]/t,e[2]/t]:[0,0,0]}function V(e,t){return[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]]}function vt(e,t){return[e[0]-t[0],e[1]-t[1],e[2]-t[2]]}function yt(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function bt(){let e=I.camera,t=[e.distance*Math.cos(e.rotX)*Math.sin(e.rotY),e.distance*Math.sin(e.rotX),e.distance*Math.cos(e.rotX)*Math.cos(e.rotY)];return{eye:t,view:z.lookAt(t,[e.panX,e.panY,0],[0,1,0]),proj:null}}var xt=null,St=null,H={scene:[],sceneIdx:0,depth:null,bloomMips:[],width:0,height:0,needsClear:!0,linSampler:null,fadePipeline:null,downsamplePipeline:null,upsamplePipelineAdditive:null,upsamplePipelineReplace:null,compositePipelines:new Map,fadeBGL:null,downsampleBGL:null,upsampleBGL:null,compositeBGL:null,fadeUBO:null,downsampleUBO:[],upsampleUBO:[],compositeUBO:null,sceneViews:[],bloomMipViews:[],fadeBGs:[],downsampleBGs:[],upsampleBGs:[],fadeParams:new Float32Array(4),downsampleParams:[],upsampleParams:[],compositeBGs:[],compositeParams:new Float32Array(148)},Ct=`rgba16float`,wt=3;function U(){H.linSampler=W.createSampler({magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`}),H.fadeBGL=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),H.downsampleBGL=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),H.upsampleBGL=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),H.compositeBGL=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]});let e=M(`post.fade`,ke),t=M(`post.downsample`,Ae),n=M(`post.upsample`,je);H.fadePipeline=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[H.fadeBGL]}),vertex:{module:e,entryPoint:`vs_main`},fragment:{module:e,entryPoint:`fs_main`,targets:[{format:Ct}]},primitive:{topology:`triangle-list`}}),H.downsamplePipeline=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[H.downsampleBGL]}),vertex:{module:t,entryPoint:`vs_main`},fragment:{module:t,entryPoint:`fs_main`,targets:[{format:Ct}]},primitive:{topology:`triangle-list`}}),H.upsamplePipelineAdditive=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[H.upsampleBGL]}),vertex:{module:n,entryPoint:`vs_main`},fragment:{module:n,entryPoint:`fs_main`,targets:[{format:Ct,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`}}),H.upsamplePipelineReplace=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[H.upsampleBGL]}),vertex:{module:n,entryPoint:`vs_main`},fragment:{module:n,entryPoint:`fs_main`,targets:[{format:Ct}]},primitive:{topology:`triangle-list`}}),H.fadeUBO=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),H.downsampleUBO=[],H.upsampleUBO=[];for(let e=0;e<wt;e++)H.downsampleUBO.push(W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})),H.upsampleUBO.push(W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));H.compositeUBO=W.createBuffer({size:592,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),H.fadeParams=new Float32Array(4),H.compositeParams=new Float32Array(148),H.downsampleParams=[],H.upsampleParams=[];for(let e=0;e<wt;e++)H.downsampleParams.push(new Float32Array(4)),H.upsampleParams.push(new Float32Array(4))}function Tt(e){let t=H.compositePipelines.get(e);if(t)return t;let n=M(`post.composite`,Me);return t=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[H.compositeBGL]}),vertex:{module:n,entryPoint:`vs_main`},fragment:{module:n,entryPoint:`fs_main`,targets:[{format:e}]},primitive:{topology:`triangle-list`}}),H.compositePipelines.set(e,t),t}function Et(e,t){if(H.width===e&&H.height===t&&H.scene.length===2)return;for(let e of H.scene)e.destroy();for(let e of H.bloomMips)e.destroy();H.depth?.destroy(),H.scene=[],H.bloomMips=[],H.width=e,H.height=t;for(let n=0;n<2;n++)H.scene.push(W.createTexture({size:[e,t],format:Ct,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));H.depth=W.createTexture({size:[e,t],format:`depth24plus`,usage:GPUTextureUsage.RENDER_ATTACHMENT});let n=Math.max(1,Math.floor(e/2)),r=Math.max(1,Math.floor(t/2));for(let e=0;e<wt;e++)H.bloomMips.push(W.createTexture({size:[n,r],format:Ct,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING})),n=Math.max(1,Math.floor(n/2)),r=Math.max(1,Math.floor(r/2));H.needsClear=!0,H.sceneViews=H.scene.map(e=>e.createView()),H.bloomMipViews=H.bloomMips.map(e=>e.createView()),H.fadeBGs=H.sceneViews.map(e=>W.createBindGroup({layout:H.fadeBGL,entries:[{binding:0,resource:e},{binding:1,resource:H.linSampler},{binding:2,resource:{buffer:H.fadeUBO}}]})),H.downsampleBGs=[];for(let e=0;e<2;e++)H.downsampleBGs.push(W.createBindGroup({layout:H.downsampleBGL,entries:[{binding:0,resource:H.sceneViews[e]},{binding:1,resource:H.linSampler},{binding:2,resource:{buffer:H.downsampleUBO[0]}}]}));for(let e=1;e<wt;e++)H.downsampleBGs.push(W.createBindGroup({layout:H.downsampleBGL,entries:[{binding:0,resource:H.bloomMipViews[e-1]},{binding:1,resource:H.linSampler},{binding:2,resource:{buffer:H.downsampleUBO[e]}}]}));H.upsampleBGs=H.bloomMipViews.map((e,t)=>W.createBindGroup({layout:H.upsampleBGL,entries:[{binding:0,resource:e},{binding:1,resource:H.linSampler},{binding:2,resource:{buffer:H.upsampleUBO[t]}}]})),H.compositeBGs=H.sceneViews.map(e=>W.createBindGroup({layout:H.compositeBGL,entries:[{binding:0,resource:e},{binding:1,resource:H.bloomMipViews[0]},{binding:2,resource:H.linSampler},{binding:3,resource:{buffer:H.compositeUBO}}]}))}function Dt(){return H.scene[H.sceneIdx].createView()}function Ot(e,t,n){let r=I.fx.trailPersistence>.001&&!H.needsClear;return{view:Dt(),clearValue:Ve,loadOp:r?`load`:`clear`,storeOp:`store`}}function kt(e,t){return{view:St??H.depth.createView(),depthClearValue:1,depthLoadOp:`clear`,depthStoreOp:`store`}}function At(e){return e}function jt(e){let t=Je(),n=new Float32Array(52);if(xt)n.set(xt.viewMatrix,0),n.set(xt.projMatrix,16),n.set(xt.eye,32);else{let t=bt(),r=I.camera.fov*Math.PI/180,i=z.perspective(r,e,.01,ht);n.set(t.view,0),n.set(i,16),n.set(t.eye,32)}n.set(t.primary,36),n.set(t.secondary,40),n.set(t.accent,44);let r=I.mouse;return n[48]=r.worldX,n[49]=r.worldY,n[50]=r.worldZ,n[51]=r.down?1:0,n}var W,G,Mt,Nt,Pt,Ft=1;async function It(){let e=document.getElementById(`fallback`),t=t=>{e.querySelector(`p`).textContent=t,e.classList.add(`visible`)};if(!navigator.gpu)return t(`navigator.gpu not found. This browser may not support WebGPU, or it may need to be enabled in settings.`),!1;let n;try{n=await navigator.gpu.requestAdapter({powerPreference:`high-performance`,xrCompatible:!0})}catch(e){return t(`requestAdapter() failed: ${e.message}`),!1}if(!n)return t(`requestAdapter() returned null. WebGPU may be available but no suitable GPU adapter was found.`),!1;try{let e=[];n.features.has(`timestamp-query`)&&e.push(`timestamp-query`),W=await n.requestDevice({requiredFeatures:e})}catch(e){return t(`requestDevice() failed: ${e.message}`),!1}return Ki(),W.lost.then(e=>{A(`webgpu:device-lost`,Error(e.message),`reason=${e.reason}`),e.reason!==`destroyed`&&It().then(e=>{e&&(Ut(),Zi(),requestAnimationFrame(ia))})}),W.onuncapturederror=e=>{A(`webgpu:uncaptured`,e.error)},G=document.getElementById(`gpu-canvas`),Mt=G.getContext(`webgpu`),Nt=navigator.gpu.getPreferredCanvasFormat(),Pt=`rgba16float`,Ft=1,Mt.configure({device:W,format:Nt,alphaMode:`opaque`}),U(),!0}function Lt(e,t){H.needsClear=!0}var Rt,zt,Bt,Vt,Ht=0;function Ut(){Bt?.destroy(),Vt?.destroy(),Bt=W.createBuffer({size:R*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),Vt=W.createBuffer({size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let e=M(`grid`,Oe),t=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]});Rt=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[t]}),vertex:{module:e,entryPoint:`vs_main`},fragment:{module:e,entryPoint:`fs_main`,targets:[{format:Pt,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:Ft}}),zt=[0,1].map(e=>W.createBindGroup({layout:t,entries:[{binding:0,resource:{buffer:Bt,offset:e*R,size:mt}},{binding:1,resource:{buffer:Vt}}]}))}function Wt(e,t,n=0){Ht+=.016,W.queue.writeBuffer(Bt,n*R,jt(t)),W.queue.writeBuffer(Vt,0,new Float32Array([Ht])),e.setPipeline(Rt),e.setBindGroup(0,zt[n]),e.draw(30)}var K={};function Gt(){let e=I.boids.count,t=e*32,n=new Float32Array(e*8);for(let t=0;t<e;t++){let e=t*8;n[e]=(Math.random()-.5)*2*2,n[e+1]=(Math.random()-.5)*2*2,n[e+2]=(Math.random()-.5)*2*2,n[e+4]=(Math.random()-.5)*.5,n[e+5]=(Math.random()-.5)*.5,n[e+6]=(Math.random()-.5)*.5}let r=W.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(r.getMappedRange()).set(n),r.unmap();let i=W.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),a=W.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),o=W.createBuffer({size:R*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),s=M(`boids.compute`,lr||`struct Particle {
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
`),c=M(`boids.render`,ur||`struct Camera {
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
`),l=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),u=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[l]}),compute:{module:s,entryPoint:`main`}}),d=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),f=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[d]}),vertex:{module:c,entryPoint:`vs_main`},fragment:{module:c,entryPoint:`fs_main`,targets:[{format:Pt}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:Ft}}),p=[W.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:r}},{binding:1,resource:{buffer:i}},{binding:2,resource:{buffer:a}}]}),W.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:i}},{binding:1,resource:{buffer:r}},{binding:2,resource:{buffer:a}}]})],m=[0,1].map(e=>[r,i].map(t=>W.createBindGroup({layout:d,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:o,offset:e*R,size:mt}}]}))),h=0,g={};return{compute(t){let n=I.boids,r=I.mouse,i=new Float32Array(16);i[0]=.016*I.fx.timeScale,i[1]=n.separationRadius/50,i[2]=n.alignmentRadius/50,i[3]=n.cohesionRadius/50,i[4]=n.maxSpeed,i[5]=n.maxForce,i[6]=n.visualRange/50,i[8]=2,i[9]=r.worldX,i[10]=r.worldY,i[11]=r.worldZ,i[12]=r.down?1:0,new Uint32Array(i.buffer)[7]=e,W.queue.writeBuffer(a,0,i);let o=t.beginComputePass();o.setPipeline(u),o.setBindGroup(0,p[h]),o.dispatchWorkgroups(Math.ceil(e/64)),o.end(),h=1-h},render(t,n,r,i=0){let a=r?r[2]/r[3]:G.width/G.height;W.queue.writeBuffer(o,i*R,jt(a));let s=t.beginRenderPass({colorAttachments:[Ot(g,n,r)],depthStencilAttachment:kt(g,r)}),c=At(r);c&&s.setViewport(c[0],c[1],c[2],c[3],0,1),Wt(s,a,i),s.setPipeline(f),s.setBindGroup(0,m[i][h]),s.draw(3,e),s.end()},getCount(){return e},destroy(){r.destroy(),i.destroy(),a.destroy(),o.destroy()}}}function Kt(){let e=I.physics.count,t=e*48,n=.2,r=.18,i=I.physics.haloMass??5,a=I.physics.haloScale??2,o=I.physics.diskMass??3,s=I.physics.diskScaleA??1.5,c=I.physics.diskScaleB??.3;function l(e){let t=e*e,n=t+a*a,r=i*t/(n*Math.sqrt(n)),l=s+c,u=t+l*l;return r+o*t/(u*Math.sqrt(u))}let u=new Float32Array(e*12),d=I.physics.distribution,f=B([.18,1,-.12]),p=B(V([0,1,0],f)),m=V(f,p),h=1/e;for(let t=0;t<e;t++){let i=t*12,a,o,s,c=0,g=0,_=0,v=h,y=t/e;if(d===`spiral`){let e=3.5;if(y<.04){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=.3+Math.random()**.5*4;a=n*Math.sin(t)*Math.cos(e),o=n*Math.sin(t)*Math.sin(e),s=n*Math.cos(t);let r=.12+Math.random()*.1,i=B(V(B([a,o,s]),[.3,1,-.2]));c=i[0]*r,g=i[1]*r,_=i[2]*r,v=.01+Math.random()*.05}else{let t=Math.exp(-5*Math.random())*e,n=Math.random()*Math.PI*2,r=(-1/5*Math.exp(-5*t/e)+1/5)/(-1/5*Math.exp(-5)+1/5)*1,i=(I.physics.G??.3)*.001,u=Math.sqrt(Math.max(.001,i*r/Math.max(t,.05)+l(t))),d=(Math.random()-.5)*(.25+t*.05);a=p[0]*Math.cos(n)*t+m[0]*Math.sin(n)*t+f[0]*d,o=p[1]*Math.cos(n)*t+m[1]*Math.sin(n)*t+f[1]*d,s=p[2]*Math.cos(n)*t+m[2]*Math.sin(n)*t+f[2]*d,c=(-Math.sin(n)*p[0]+Math.cos(n)*m[0])*u,g=(-Math.sin(n)*p[1]+Math.cos(n)*m[1])*u,_=(-Math.sin(n)*p[2]+Math.cos(n)*m[2])*u,v=Math.random()**2*.8}}else if(d===`disk`){let e=Math.random()*Math.PI*2,t=Math.sqrt(Math.random())*4.5;if(v=Math.random()**3*.8,y<.03){let r=(Math.random()-.5)*n*.5;a=p[0]*Math.cos(e)*t+m[0]*Math.sin(e)*t+f[0]*r,o=p[1]*Math.cos(e)*t+m[1]*Math.sin(e)*t+f[1]*r,s=p[2]*Math.cos(e)*t+m[2]*Math.sin(e)*t+f[2]*r;let i=Math.sqrt(Math.max(.001,l(t)));c=(Math.sin(e)*p[0]-Math.cos(e)*m[0])*i,g=(Math.sin(e)*p[1]-Math.cos(e)*m[1])*i,_=(Math.sin(e)*p[2]-Math.cos(e)*m[2])*i,v=.1+Math.random()*.3}else if(y<.12){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=.5+Math.sqrt(Math.random())*3.5;a=n*Math.sin(t)*Math.cos(e),o=n*Math.sin(t)*Math.sin(e),s=n*Math.cos(t);let r=.15+Math.random()*.15,i=B(V(B([a,o,s]),[.3,1,-.2]));c=i[0]*r,g=i[1]*r,_=i[2]*r,v=.02+Math.random()*.1}else{let i=(Math.random()-.5)*n*(.35+t*.4);a=p[0]*Math.cos(e)*t+m[0]*Math.sin(e)*t+f[0]*i,o=p[1]*Math.cos(e)*t+m[1]*Math.sin(e)*t+f[1]*i,s=p[2]*Math.cos(e)*t+m[2]*Math.sin(e)*t+f[2]*i;let u=Math.sqrt(Math.max(.001,l(t)));c=(-Math.sin(e)*p[0]+Math.cos(e)*m[0])*u+f[0]*i*r,g=(-Math.sin(e)*p[1]+Math.cos(e)*m[1])*u+f[1]*i*r,_=(-Math.sin(e)*p[2]+Math.cos(e)*m[2])*u+f[2]*i*r}}else if(d===`web`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=3+(Math.random()-.5)*1.5;a=n*Math.sin(t)*Math.cos(e),o=n*Math.sin(t)*Math.sin(e),s=n*Math.cos(t);let r=2.5,i=Math.round(a/r)*r,l=Math.round(o/r)*r,u=Math.round(s/r)*r,d=.15+Math.random()*.1;a+=(i-a)*d,o+=(l-o)*d,s+=(u-s)*d;let f=B([a,o,s]),p=.02+Math.random()*.03;c=-f[0]*p,g=-f[1]*p,_=-f[2]*p,v=Math.random()**2*.6}else if(d===`cluster`){let e=t%5,n=e/5*Math.PI*2+.7,r=1.2+e*.3,i=Math.cos(n)*r,l=(e-2)*.4,u=Math.sin(n)*r,d=Math.random(),f=.6*d**.33/(1-d*d+.01)**.25,p=Math.random()*Math.PI*2,m=Math.acos(2*Math.random()-1);a=i+f*Math.sin(m)*Math.cos(p),o=l+f*Math.sin(m)*Math.sin(p),s=u+f*Math.cos(m);let h=.1+Math.random()*.12,y=B(V(B([a-i,o-l,s-u]),[.2,1,-.3]));c=y[0]*h,g=y[1]*h,_=y[2]*h,v=Math.random()**2.5*1}else if(d===`maelstrom`){let e=t%4,n=1+e*1.2+(Math.random()-.5)*.4,r=(e-1.5)*.35,i=B([Math.sin(r*1.3),Math.cos(r),Math.sin(r*.7)]),l=B(V([0,1,0],i)),u=V(i,l),d=Math.random()*Math.PI*2,f=(Math.random()-.5)*.15;a=l[0]*Math.cos(d)*n+u[0]*Math.sin(d)*n+i[0]*f,o=l[1]*Math.cos(d)*n+u[1]*Math.sin(d)*n+i[1]*f,s=l[2]*Math.cos(d)*n+u[2]*Math.sin(d)*n+i[2]*f;let p=(e%2==0?1:-1)*(1.2+e*.3)/Math.sqrt(n+.1);c=(-Math.sin(d)*l[0]+Math.cos(d)*u[0])*p,g=(-Math.sin(d)*l[1]+Math.cos(d)*u[1])*p,_=(-Math.sin(d)*l[2]+Math.cos(d)*u[2])*p,v=Math.random()**3*.5}else if(d===`dust`){a=(Math.random()-.5)*6,o=(Math.random()-.5)*6,s=(Math.random()-.5)*6;let e=.8,t=.08;c=Math.sin(o*e+1.3)*Math.cos(s*e+.7)*t,g=Math.sin(s*e+2.1)*Math.cos(a*e+1.1)*t,_=Math.sin(a*e+.5)*Math.cos(o*e+2.5)*t,v=Math.random()**4*.4}else if(d===`binary`){let e=Math.random()<.45,t=Math.sqrt(Math.random())*2.2,n=Math.random()*Math.PI*2,r=e?.25:-.15,i=B([r,1,r*.5]),l=B(V([0,1,0],i)),u=V(i,l),d=(Math.random()-.5)*.15;a=l[0]*Math.cos(n)*t+u[0]*Math.sin(n)*t+i[0]*d+(e?1.8:-1.8),o=l[1]*Math.cos(n)*t+u[1]*Math.sin(n)*t+i[1]*d+(e?.3:-.3),s=l[2]*Math.cos(n)*t+u[2]*Math.sin(n)*t+i[2]*d;let f=.7/Math.sqrt(t+.15),p=e?.12:-.12;if(c=(-Math.sin(n)*l[0]+Math.cos(n)*u[0])*f+p*.3,g=(-Math.sin(n)*l[1]+Math.cos(n)*u[1])*f,_=(-Math.sin(n)*l[2]+Math.cos(n)*u[2])*f+p,Math.random()<.1){let e=Math.random();a=-1.8+e*3.6+(Math.random()-.5)*.8,o=-.3+e*.6+(Math.random()-.5)*.5,s=(Math.random()-.5)*.6,c=(Math.random()-.5)*.1,g=(Math.random()-.5)*.05,_=(Math.random()-.5)*.1}v=Math.random()**2.5*.7}else if(d===`shell`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=1.5+Math.random()*.1;a=n*Math.sin(t)*Math.cos(e),o=n*Math.sin(t)*Math.sin(e),s=n*Math.cos(t);let r=B([a,o,s]),i=B(V(r,[.3,1,-.2])),l=V(r,i),u=.18+Math.random()*.08;c=(i[0]+l[0]*.35)*u,g=(i[1]+l[1]*.35)*u,_=(i[2]+l[2]*.35)*u,v=Math.random()**3*.8}else a=(Math.random()-.5)*4,o=(Math.random()-.5)*4,s=(Math.random()-.5)*4,c=(Math.random()-.5)*.12,g=(Math.random()-.5)*.12,_=(Math.random()-.5)*.12,v=Math.random()**3*.8;u[i]=a,u[i+1]=o,u[i+2]=s,u[i+3]=v,u[i+4]=c,u[i+5]=g,u[i+6]=_,u[i+8]=0,u[i+9]=0,u[i+10]=0}let g=W.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,mappedAtCreation:!0});new Float32Array(g.getMappedRange()).set(u),g.unmap();let _=W.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC}),v=W.createBuffer({size:608,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),y=W.createBuffer({size:R*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),b=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),x=new Float32Array(4);W.queue.writeBuffer(b,0,x);let S=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,C=16384*128,w=W.createBuffer({size:C*4,usage:S}),T=W.createBuffer({size:C*4,usage:S}),E=[],D=[];for(let e=0;e<6;e++){let t=128>>e,n=t*t*t*4;E.push(W.createBuffer({size:n,usage:S})),D.push(W.createBuffer({size:n,usage:S}))}let ee=W.createBuffer({size:e*16,usage:S}),te=W.createBuffer({size:16,usage:S}),ne=[T];for(let e=1;e<6;e++){let t=128>>e;ne.push(W.createBuffer({size:t*t*t*4,usage:S}))}let re=W.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),ie=new ArrayBuffer(32),ae=new Float32Array(ie),oe=new Uint32Array(ie);oe[1]=e,oe[2]=128,ae[3]=64,ae[4]=1,ae[5]=65536,oe[6]=C;let se=M(`pm.deposit`,xe),ce=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),le=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[ce]}),compute:{module:se,entryPoint:`main`}}),ue=M(`pm.density_convert`,Se),de=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),fe=W.createPipelineLayout({bindGroupLayouts:[de]}),pe=W.createComputePipeline({layout:fe,compute:{module:ue,entryPoint:`reduce`}}),me=W.createComputePipeline({layout:fe,compute:{module:ue,entryPoint:`convert`}}),he=W.createBindGroup({layout:de,entries:[{binding:0,resource:{buffer:w}},{binding:1,resource:{buffer:T}},{binding:2,resource:{buffer:te}},{binding:3,resource:{buffer:re}}]}),ge=[W.createBindGroup({layout:ce,entries:[{binding:0,resource:{buffer:g}},{binding:1,resource:{buffer:w}},{binding:2,resource:{buffer:re}}]}),W.createBindGroup({layout:ce,entries:[{binding:0,resource:{buffer:_}},{binding:1,resource:{buffer:w}},{binding:2,resource:{buffer:re}}]})],O=W.createBuffer({size:C*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),_e=!1,ve=M(`pm.smooth`,Ce),ye=M(`pm.residual`,we),Oe=M(`pm.restrict`,Te),ke=M(`pm.prolong`,Ee),Ae=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),je=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),Me=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),Ne=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),Pe=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[Ae]}),compute:{module:ve,entryPoint:`main`}}),k=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[je]}),compute:{module:ye,entryPoint:`main`}}),Fe=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[Me]}),compute:{module:Oe,entryPoint:`main`}}),A=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[Ne]}),compute:{module:ke,entryPoint:`main`}}),j=M(`pm.interpolate`,De),N=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),Ie=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[N]}),compute:{module:j,entryPoint:`main`}}),Le=[W.createBindGroup({layout:N,entries:[{binding:0,resource:{buffer:g}},{binding:1,resource:{buffer:E[0]}},{binding:2,resource:{buffer:ee}},{binding:3,resource:{buffer:re}}]}),W.createBindGroup({layout:N,entries:[{binding:0,resource:{buffer:_}},{binding:1,resource:{buffer:E[0]}},{binding:2,resource:{buffer:ee}},{binding:3,resource:{buffer:re}}]})],Re=4*Math.PI*(I.physics.G??.3)*.001,ze=[],Be=[],Ve=[],He=[];for(let e=0;e<6;e++){let t=128>>e,n=128/t,r=n*n;ze.push([0,1].map(e=>{let n=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),i=new ArrayBuffer(16);return new Uint32Array(i,0,2).set([t,e]),new Float32Array(i,8,2).set([r,Re]),W.queue.writeBuffer(n,0,i),n}));{let e=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),n=new ArrayBuffer(16);new Uint32Array(n,0,2).set([t,0]),new Float32Array(n,8,2).set([r,Re]),W.queue.writeBuffer(e,0,n),Be.push(e)}if(e+1<6){let n=128>>e+1;{let e=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),t=new ArrayBuffer(16);new Uint32Array(t,0,1).set([n]),W.queue.writeBuffer(e,0,t),Ve.push(e)}{let e=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),n=new ArrayBuffer(16);new Uint32Array(n,0,1).set([t]),W.queue.writeBuffer(e,0,n),He.push(e)}}}let Ue=[],We=[],Ge=[],Ke=[];for(let e=0;e<6;e++)Ue.push([0,1].map(t=>W.createBindGroup({layout:Ae,entries:[{binding:0,resource:{buffer:E[e]}},{binding:1,resource:{buffer:ne[e]}},{binding:2,resource:{buffer:ze[e][t]}}]}))),We.push(W.createBindGroup({layout:je,entries:[{binding:0,resource:{buffer:E[e]}},{binding:1,resource:{buffer:ne[e]}},{binding:2,resource:{buffer:D[e]}},{binding:3,resource:{buffer:Be[e]}}]})),e+1<6&&(Ge.push(W.createBindGroup({layout:Me,entries:[{binding:0,resource:{buffer:D[e]}},{binding:1,resource:{buffer:ne[e+1]}},{binding:2,resource:{buffer:Ve[e]}}]})),Ke.push(W.createBindGroup({layout:Ne,entries:[{binding:0,resource:{buffer:E[e+1]}},{binding:1,resource:{buffer:E[e]}},{binding:2,resource:{buffer:He[e]}}]})));let P=[];for(let e=0;e<6;e++)P.push(Math.max(1,(128>>e)/4));let qe=M(`nbody.compute`,dr||`// [LAW:one-source-of-truth] DKD leapfrog integrator with ALL conservative forces.
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
`),Je=M(`nbody.render`,fr||`struct Camera {
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
`),Ye=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}}]}),Xe=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[Ye]}),compute:{module:qe,entryPoint:`main`}}),Ze=M(`nbody.stats`,be),F=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),$e=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[F]}),compute:{module:Ze,entryPoint:`main`}}),et=W.createBuffer({size:32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),nt=W.createBuffer({size:32,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),rt=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),it=[W.createBindGroup({layout:F,entries:[{binding:0,resource:{buffer:_}},{binding:1,resource:{buffer:et}},{binding:2,resource:{buffer:rt}}]}),W.createBindGroup({layout:F,entries:[{binding:0,resource:{buffer:g}},{binding:1,resource:{buffer:et}},{binding:2,resource:{buffer:rt}}]})],at=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),ot=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[at]}),vertex:{module:Je,entryPoint:`vs_main`},fragment:{module:Je,entryPoint:`fs_main`,targets:[{format:Pt,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:Ft}}),ct=[W.createBindGroup({layout:Ye,entries:[{binding:0,resource:{buffer:g}},{binding:1,resource:{buffer:_}},{binding:2,resource:{buffer:v}},{binding:3,resource:{buffer:ee}}]}),W.createBindGroup({layout:Ye,entries:[{binding:0,resource:{buffer:_}},{binding:1,resource:{buffer:g}},{binding:2,resource:{buffer:v}},{binding:3,resource:{buffer:ee}}]})],lt=[0,1].map(e=>[g,_].map(t=>W.createBindGroup({layout:at,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:y,offset:e*R,size:mt}},{binding:2,resource:{buffer:b}}]}))),ut=2048,dt=Math.min(e,ut)*48,ft=W.createBuffer({size:dt,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),pt=!1,L=0,ht={},gt=0,_t=1,z=[0,1,0],vt=18e3,yt=1+tt*4,bt=new Float32Array(vt*yt),xt=0,St=!1,H=0,Ct={ke:0,pe:0,virial:0,rmsR:0,rmsH:0},wt=new ArrayBuffer(608),U=new Float32Array(wt),Tt=new Uint32Array(wt),Et=new Uint8Array(wt);return{setTimeDirection(e){_t=e},getSimStep(){return gt},getTimeDirection(){return _t},setBlurTime(e){x[0]=e,x[1]=0,x[2]=0,x[3]=0,W.queue.writeBuffer(b,0,x)},getJournalCapacity(){return vt},getJournalHighWater(){return xt},compute(t){if(_t<0&&gt<=0){I.paused=!0;return}_t<0&&gt--;let n=I.physics,r=Qe*I.fx.timeScale,i=r*_t;if(U[0]=i,U[1]=n.G*.001,U[2]=n.softening,U[3]=n.haloMass??5,Tt[4]=e,Tt[5]=0,U[6]=n.haloScale??2,U[7]=gt*r,U[12]=z[0],U[13]=z[1],U[14]=z[2],U[16]=n.diskMass??3,U[17]=n.diskScaleA??1.5,U[18]=n.diskScaleB??.3,U[19]=0,U[20]=0,U[21]=0,U[22]=0,U[23]=n.tidalStrength??.005,_t>0){let e=n.interactionStrength??1,t=I.attractors,r=Math.min(t.length,tt);Tt[8]=r,Tt[9]=0,Tt[10]=0,Tt[11]=0;for(let n=0;n<r;n++){let r=t[n],i=24+n*4;U[i]=r.x,U[i+1]=r.y,U[i+2]=r.z,U[i+3]=st(r,gt,e)}for(let e=r;e<tt;e++){let t=24+e*4;U[t]=0,U[t+1]=0,U[t+2]=0,U[t+3]=0}let i=gt%vt*yt;bt[i]=r;for(let e=0;e<tt*4;e++)bt[i+1+e]=U[24+e];xt=Math.max(xt,gt),gt++}else{let e=gt%vt*yt;Tt[8]=bt[e],Tt[9]=0,Tt[10]=0,Tt[11]=0;for(let t=0;t<tt*4;t++)U[24+t]=bt[e+1+t]}W.queue.writeBuffer(v,0,Et),ae[0]=i,W.queue.writeBuffer(re,0,ie),t.clearBuffer(w),t.clearBuffer(te);let a=t.beginComputePass();a.setPipeline(le),a.setBindGroup(0,ge[L]),a.dispatchWorkgroups(Math.ceil(e/256)),a.setPipeline(pe),a.setBindGroup(0,he),a.dispatchWorkgroups(Math.ceil(C/256)),a.setPipeline(me),a.dispatchWorkgroups(Math.ceil(C/256)),a.end();for(let e=0;e<1;e++){for(let e=1;e<6;e++)t.clearBuffer(E[e]);let e=t.beginComputePass();for(let t=0;t<5;t++){e.setPipeline(Pe);for(let n=0;n<2;n++)e.setBindGroup(0,Ue[t][0]),e.dispatchWorkgroups(P[t],P[t],P[t]),e.setBindGroup(0,Ue[t][1]),e.dispatchWorkgroups(P[t],P[t],P[t]);e.setPipeline(k),e.setBindGroup(0,We[t]),e.dispatchWorkgroups(P[t],P[t],P[t]),e.setPipeline(Fe),e.setBindGroup(0,Ge[t]),e.dispatchWorkgroups(P[t+1],P[t+1],P[t+1])}e.setPipeline(Pe);for(let t=0;t<16;t++)e.setBindGroup(0,Ue[5][0]),e.dispatchWorkgroups(P[5],P[5],P[5]),e.setBindGroup(0,Ue[5][1]),e.dispatchWorkgroups(P[5],P[5],P[5]);for(let t=4;t>=0;t--){e.setPipeline(A),e.setBindGroup(0,Ke[t]),e.dispatchWorkgroups(P[t],P[t],P[t]),e.setPipeline(Pe);for(let n=0;n<2;n++)e.setBindGroup(0,Ue[t][0]),e.dispatchWorkgroups(P[t],P[t],P[t]),e.setBindGroup(0,Ue[t][1]),e.dispatchWorkgroups(P[t],P[t],P[t])}e.end()}let o=t.beginComputePass();o.setPipeline(Ie),o.setBindGroup(0,Le[L]),o.dispatchWorkgroups(Math.ceil(e/256)),o.end();let s=qi(0),c=t.beginComputePass(s?{timestampWrites:s}:void 0);c.setPipeline(Xe),c.setBindGroup(0,ct[L]),c.dispatchWorkgroups(Math.ceil(e/256)),c.end();let l=1-L,u=performance.now();if(!St&&u-H>1e3){H=u;let r=(n.G??.3)*.001,i=new Float32Array(4),a=new Uint32Array(i.buffer);a[0]=e,a[1]=e,i[2]=(n.softening??.15)*(n.softening??.15),i[3]=r,W.queue.writeBuffer(rt,0,i);let o=t.beginComputePass();o.setPipeline($e),o.setBindGroup(0,it[l]),o.dispatchWorkgroups(1),o.end(),t.copyBufferToBuffer(et,0,nt,0,32),St=!0,W.queue.onSubmittedWorkDone().then(()=>{nt.mapAsync(GPUMapMode.READ).then(()=>{let t=new Float32Array(nt.getMappedRange().slice(0));nt.unmap(),St=!1;let n=t[0],r=t[1];Ct={ke:n,pe:r,virial:Math.abs(r)>.001?2*n/Math.abs(r):1,rmsR:Math.sqrt(t[2]/Math.max(e,1)),rmsH:Math.sqrt(t[3]/Math.max(e,1))}}).catch(()=>{St=!1})})}L=1-L},render(t,n,r,i=0){let a=r?r[2]/r[3]:G.width/G.height;W.queue.writeBuffer(y,i*R,jt(a));let o=qi(1),s=t.beginRenderPass({colorAttachments:[Ot(ht,n,r)],depthStencilAttachment:kt(ht,r),...o?{timestampWrites:o}:{}}),c=At(r);c&&s.setViewport(c[0],c[1],c[2],c[3],0,1),Wt(s,a,i),s.setPipeline(ot),s.setBindGroup(0,lt[i][L]),s.draw(6,e),s.end()},getCount(){return e},getStats(){return Ct},async diagnose(){if(pt)return{error:1};pt=!0;let t=Math.min(e,ut),n=Math.floor(t/8),r=Math.floor(e/8),i=L===0?g:_,a=W.createCommandEncoder();for(let e=0;e<8;e++){let t=e*r;a.copyBufferToBuffer(i,t*48,ft,e*n*48,n*48)}W.queue.submit([a.finish()]),await W.queue.onSubmittedWorkDone(),await ft.mapAsync(GPUMapMode.READ);let o=new Float32Array(ft.getMappedRange().slice(0));ft.unmap(),pt=!1;let s=z,c=0,l=0,u=0,d=0,f=0,h=0,v=0,y=0,b=0,x=0,S=new Float64Array(10),C=new Float64Array(12);for(let e=0;e<t;e++){let t=e*12,n=o[t],r=o[t+1],i=o[t+2],a=o[t+3],g=o[t+4],_=o[t+5],w=o[t+6];c+=n,l+=r,u+=i,v+=a;let T=Math.sqrt(n*n+r*r+i*i);T>y&&(y=T),f+=T*T;let E=n*s[0]+r*s[1]+i*s[2];d+=E*E;let D=Math.sqrt(g*g+_*_+w*w);if(h+=D*D,T>.1){let e=n-E*s[0],t=r-E*s[1],a=i-E*s[2],o=Math.sqrt(e*e+t*t+a*a);if(o>.05){let n=e/o,r=t/o,i=a/o,c=s[1]*i-s[2]*r,l=s[2]*n-s[0]*i,u=s[0]*r-s[1]*n,d=Math.sqrt(c*c+l*l+u*u)||1,f=c/d,p=l/d,m=u/d,h=g*f+_*p+w*m;b+=Math.abs(h)/(D+.001),x++}}let ee=Math.min(9,Math.floor(T*2));S[ee]++;let te=n-E*s[0],ne=r-E*s[1],re=i-E*s[2],ie=Math.atan2(te*m[0]+ne*m[1]+re*m[2],te*p[0]+ne*p[1]+re*p[2]),ae=Math.floor((ie+Math.PI)/(2*Math.PI)*12)%12;C[ae]++}let w=1/t,T=Array.from(C),E=T.reduce((e,t)=>e+t,0)/12,D=T.reduce((e,t)=>e+(t-E)**2,0)/12,ee=E>0?Math.sqrt(D)/E:0;return{count:e,sampleCount:t,comX:c*w,comY:l*w,comZ:u*w,rmsHeight:Math.sqrt(d*w),rmsRadius:Math.sqrt(f*w),rmsSpeed:Math.sqrt(h*w),maxRadius:y,totalMass:e/t*v,tangentialFraction:x>0?b/x:0,armContrast:ee,radialProfile:Array.from(S),angularProfile:T,diskNormalX:s[0],diskNormalY:s[1],diskNormalZ:s[2]}},async dumpDensity(){if(_e)return null;_e=!0;let e=W.createCommandEncoder();e.copyBufferToBuffer(T,0,O,0,C*4),W.queue.submit([e.finish()]),await W.queue.onSubmittedWorkDone(),await O.mapAsync(GPUMapMode.READ);let t=new Float32Array(O.getMappedRange().slice(0));return O.unmap(),_e=!1,t},async dumpPotential(){if(_e)return null;_e=!0;let e=W.createCommandEncoder();e.copyBufferToBuffer(E[0],0,O,0,C*4),W.queue.submit([e.finish()]),await W.queue.onSubmittedWorkDone(),await O.mapAsync(GPUMapMode.READ);let t=new Float32Array(O.getMappedRange().slice(0));return O.unmap(),_e=!1,t},async maxResidual(){if(_e)return null;_e=!0;let e=W.createCommandEncoder();e.copyBufferToBuffer(D[0],0,O,0,C*4),W.queue.submit([e.finish()]),await W.queue.onSubmittedWorkDone(),await O.mapAsync(GPUMapMode.READ);let t=new Float32Array(O.getMappedRange()),n=0;for(let e=0;e<t.length;e++){let r=Math.abs(t[e]);r>n&&(n=r)}return O.unmap(),_e=!1,n},async reversibilityTest(t){if(_e)return null;let n=e*48;if(n>O.size)return null;_e=!0;let r=I.paused,i=_t;I.paused=!0;let a=async()=>{let e=W.createCommandEncoder(),t=L===0?g:_;e.copyBufferToBuffer(t,0,O,0,n),W.queue.submit([e.finish()]),await W.queue.onSubmittedWorkDone(),await O.mapAsync(GPUMapMode.READ);let r=new Float32Array(O.getMappedRange(0,n).slice(0));return O.unmap(),r},o=await a();_t=1;for(let e=0;e<t;e++){let e=W.createCommandEncoder();this.compute(e),W.queue.submit([e.finish()])}_t=-1;for(let e=0;e<t;e++){let e=W.createCommandEncoder();this.compute(e),W.queue.submit([e.finish()])}_t=i,I.paused=r;let s=await a(),c=0,l=0;for(let t=0;t<e;t++){let e=t*12,n=s[e]-o[e],r=s[e+1]-o[e+1],i=s[e+2]-o[e+2],a=Math.sqrt(n*n+r*r+i*i);a>c&&(c=a),l+=a}return _e=!1,{maxErr:c,meanErr:l/e,count:e}},destroy(){g.destroy(),_.destroy(),v.destroy(),y.destroy(),b.destroy(),et.destroy(),nt.destroy(),rt.destroy(),ft.destroy(),w.destroy(),T.destroy();for(let e of E)e.destroy();for(let e of D)e.destroy();ee.destroy(),te.destroy(),re.destroy(),O.destroy();for(let e=1;e<ne.length;e++)ne[e].destroy();for(let e of ze)for(let t of e)t.destroy();for(let e of Be)e.destroy();for(let e of Ve)e.destroy();for(let e of He)e.destroy()},pmDensityU32:w,pmDensityF32:T,pmPotential:E,pmResidual:D,pmForce:ee,pmMeanScratch:te}}function qt(){let e=I.physics_classic.count,t=e*32,n=new Float32Array(e*8),r=I.physics_classic.distribution;for(let t=0;t<e;t++){let e=t*8,i,a,o,s=0,c=0;if(r===`disk`){let e=Math.random()*Math.PI*2,t=Math.random()*2;i=Math.cos(e)*t,a=(Math.random()-.5)*.1,o=Math.sin(e)*t;let n=.5/Math.sqrt(t+.1);s=-Math.sin(e)*n,c=Math.cos(e)*n}else if(r===`shell`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=1.5+Math.random()*.1;i=n*Math.sin(t)*Math.cos(e),a=n*Math.sin(t)*Math.sin(e),o=n*Math.cos(t)}else i=(Math.random()-.5)*4,a=(Math.random()-.5)*4,o=(Math.random()-.5)*4;n[e]=i,n[e+1]=a,n[e+2]=o,n[e+3]=.5+Math.random()*2,n[e+4]=s,n[e+5]=0,n[e+6]=c}let i=W.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(i.getMappedRange()).set(n),i.unmap();let a=W.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),o=W.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),s=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),c=W.createBuffer({size:R*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),l=M(`nbody.classic.compute`,pr||`// Classic n-body compute — preserved verbatim from the original shader-playground for A/B comparison.
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
`),u=M(`nbody.classic.render`,mr||`// Classic n-body render — preserved verbatim for A/B comparison. World-space billboards, soft fuzzy falloff.
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
`),d=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),f=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[d]}),compute:{module:l,entryPoint:`main`}}),p=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),m=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[p]}),vertex:{module:u,entryPoint:`vs_main`},fragment:{module:u,entryPoint:`fs_main`,targets:[{format:Pt,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:Ft}}),h=[W.createBindGroup({layout:d,entries:[{binding:0,resource:{buffer:i}},{binding:1,resource:{buffer:a}},{binding:2,resource:{buffer:o}}]}),W.createBindGroup({layout:d,entries:[{binding:0,resource:{buffer:a}},{binding:1,resource:{buffer:i}},{binding:2,resource:{buffer:o}}]})],g=[0,1].map(e=>[i,a].map(t=>W.createBindGroup({layout:p,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:c,offset:e*R,size:mt}},{binding:2,resource:{buffer:s}}]}))),_=0,v={};return{compute(t){let n=I.physics_classic,r=I.mouse,i=new ArrayBuffer(48),a=new Float32Array(i),c=new Uint32Array(i);a[0]=.016*I.fx.timeScale,a[1]=n.G*.001,a[2]=n.softening,a[3]=n.damping,c[4]=e,a[8]=r.down?r.worldX:0,a[9]=r.down?r.worldY:0,a[10]=r.down?r.worldZ:0,a[11]=r.down?1:0,W.queue.writeBuffer(o,0,new Uint8Array(i)),W.queue.writeBuffer(s,0,new Float32Array([r.down?r.worldX:0,r.down?r.worldY:0,r.down?r.worldZ:0,r.down?1:0]));let l=t.beginComputePass();l.setPipeline(f),l.setBindGroup(0,h[_]),l.dispatchWorkgroups(Math.ceil(e/64)),l.end(),_=1-_},render(t,n,r,i=0){let a=r?r[2]/r[3]:G.width/G.height;W.queue.writeBuffer(c,i*R,jt(a));let o=t.beginRenderPass({colorAttachments:[Ot(v,n,r)],depthStencilAttachment:kt(v,r)}),s=At(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),Wt(o,a,i),o.setPipeline(m),o.setBindGroup(0,g[i][_]),o.draw(6,e),o.end()},getCount(){return e},destroy(){i.destroy(),a.destroy(),o.destroy(),s.destroy(),c.destroy()}}}function Jt(){let e=I.fluid.resolution,t=e*e,n=t*8,r=t*4,i=t*16,a=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,o=W.createBuffer({size:n,usage:a}),s=W.createBuffer({size:n,usage:a}),c=W.createBuffer({size:r,usage:a}),l=W.createBuffer({size:r,usage:a}),u=W.createBuffer({size:r,usage:a}),d=W.createBuffer({size:i,usage:a}),f=W.createBuffer({size:i,usage:a}),p=W.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),m=W.createBuffer({size:R*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),h=new Float32Array(t*4),g=new Float32Array(t*2);for(let t=0;t<e;t++)for(let n=0;n<e;n++){let r=t*e+n,i=n/e,a=t/e,o=i-.5,s=a-.5;g[r*2]=-s*3,g[r*2+1]=o*3}W.queue.writeBuffer(d,0,h),W.queue.writeBuffer(o,0,g);let _=M(`fluid.forces`,hr||`struct Params {
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
`),v=M(`fluid.diffuse`,gr||`struct Params {
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
`),y=M(`fluid.pressure`,vr||`struct Params {
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
`),b=M(`fluid.divergence`,_r||`struct Params {
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
`),x=M(`fluid.gradient`,yr||`struct Params {
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
`),S=M(`fluid.render`,br||`struct Camera {
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
`),C=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),w=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[C]}),compute:{module:_,entryPoint:`main`}}),T=W.createBindGroup({layout:C,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:d}},{binding:3,resource:{buffer:f}},{binding:4,resource:{buffer:p}}]}),E=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),D=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[E]}),compute:{module:v,entryPoint:`main`}}),ee=[W.createBindGroup({layout:E,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:p}}]}),W.createBindGroup({layout:E,entries:[{binding:0,resource:{buffer:s}},{binding:1,resource:{buffer:o}},{binding:2,resource:{buffer:p}}]})],te=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),ne=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[te]}),compute:{module:b,entryPoint:`main`}}),re=W.createBindGroup({layout:te,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:u}},{binding:2,resource:{buffer:p}}]}),ie=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),ae=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[ie]}),compute:{module:y,entryPoint:`main`}}),oe=[W.createBindGroup({layout:ie,entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:u}},{binding:3,resource:{buffer:p}}]}),W.createBindGroup({layout:ie,entries:[{binding:0,resource:{buffer:l}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:u}},{binding:3,resource:{buffer:p}}]})],se=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),ce=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[se]}),compute:{module:x,entryPoint:`main`}}),le=W.createBindGroup({layout:se,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:c}},{binding:3,resource:{buffer:p}}]}),ue=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});W.queue.writeBuffer(ue,0,new Float32Array([e,pt,I.fluid.volumeScale,L]));let de=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),fe=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[de]}),vertex:{module:S,entryPoint:`vs_main`},fragment:{module:S,entryPoint:`fs_main`,targets:[{format:Pt}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:Ft}}),pe=[0,1].map(e=>W.createBindGroup({layout:de,entries:[{binding:0,resource:{buffer:d}},{binding:1,resource:{buffer:ue}},{binding:2,resource:{buffer:m,offset:e*R,size:mt}}]})),me=Math.ceil(e/8),he={},ge=0;return{compute(t){let a=I.fluid,u=a.dyeMode===`rainbow`?0:a.dyeMode===`single`?1:2;ge+=.016*I.fx.timeScale;let m=new Float32Array([.22*I.fx.timeScale,a.viscosity,a.diffusionRate,a.forceStrength,e,I.mouse.x,I.mouse.y,I.mouse.dx,I.mouse.dy,I.mouse.down?1:0,u,ge]);W.queue.writeBuffer(p,0,m);{let e=t.beginComputePass();e.setPipeline(w),e.setBindGroup(0,T),e.dispatchWorkgroups(me,me),e.end()}t.copyBufferToBuffer(s,0,o,0,n),t.copyBufferToBuffer(f,0,d,0,i);let h=0;for(let e=0;e<a.jacobiIterations;e++){let e=t.beginComputePass();e.setPipeline(D),e.setBindGroup(0,ee[h]),e.dispatchWorkgroups(me,me),e.end(),h=1-h}h===1&&t.copyBufferToBuffer(s,0,o,0,n);{let e=t.beginComputePass();e.setPipeline(ne),e.setBindGroup(0,re),e.dispatchWorkgroups(me,me),e.end()}let g=0;for(let e=0;e<a.jacobiIterations;e++){let e=t.beginComputePass();e.setPipeline(ae),e.setBindGroup(0,oe[g]),e.dispatchWorkgroups(me,me),e.end(),g=1-g}g===1&&t.copyBufferToBuffer(l,0,c,0,r);{let e=t.beginComputePass();e.setPipeline(ce),e.setBindGroup(0,le),e.dispatchWorkgroups(me,me),e.end()}t.copyBufferToBuffer(s,0,o,0,n)},render(t,n,r,i=0){let a=r?r[2]/r[3]:G.width/G.height;W.queue.writeBuffer(m,i*R,jt(a)),W.queue.writeBuffer(ue,0,new Float32Array([e,pt,I.fluid.volumeScale,L]));let o=t.beginRenderPass({colorAttachments:[Ot(he,n,r)],depthStencilAttachment:kt(he,r)}),s=At(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),Wt(o,a,i),o.setPipeline(fe),o.setBindGroup(0,pe[i]),o.draw(36,pt*pt),o.end()},getCount(){return e+`x`+e},destroy(){o.destroy(),s.destroy(),c.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),ue.destroy(),m.destroy()}}}function Yt(){let e=65025*6,t=W.createBuffer({size:2097152,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.VERTEX}),n=W.createBuffer({size:e*4,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});{let t=new Uint32Array(e),r=0;for(let e=0;e<255;e++)for(let n=0;n<255;n++){let i=e*256+n,a=i+1,o=(e+1)*256+n,s=o+1;t[r++]=i,t[r++]=o,t[r++]=a,t[r++]=a,t[r++]=o,t[r++]=s}W.queue.writeBuffer(n,0,t)}let r=W.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),i=W.createBuffer({size:R*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),a=W.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),o=0,s=0,c=M(`parametric.compute`,xr||`struct Params {
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
`),l=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),u=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[l]}),compute:{module:c,entryPoint:`main`}}),d=W.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:r}}]}),f=M(`parametric.render`,Sr||`struct Camera {
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
`),p=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),m=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[p]}),vertex:{module:f,entryPoint:`vs_main`},fragment:{module:f,entryPoint:`fs_main`,targets:[{format:Pt}]},primitive:{topology:`triangle-list`,cullMode:`none`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:Ft}}),h=[0,1].map(e=>W.createBindGroup({layout:p,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:i,offset:e*R,size:mt}},{binding:2,resource:{buffer:a}}]})),g={};return{compute(e){let t=I.parametric;o+=.016*I.fx.timeScale;let n=Math.max(t.p1Rate,t.p2Rate,t.p3Rate,t.p4Rate,t.twistRate);s+=.016*I.fx.timeScale*(n>0?1:0);let i=(e,t,n,r)=>e+(t-e)*(.5+.5*Math.sin(o*n+r)),a=i(t.p1Min,t.p1Max,t.p1Rate,0),c=i(t.p2Min,t.p2Max,t.p2Rate,Math.PI*.7),l=i(t.p3Min,t.p3Max,t.p3Rate,Math.PI*1.3),f=i(t.p4Min,t.p4Max,t.p4Rate,Math.PI*.4),p=i(t.twistMin,t.twistMax,t.twistRate,Math.PI*.9),m=I.mouse,h=new ArrayBuffer(64),g=new Uint32Array(h),_=new Float32Array(h);g[0]=256,g[1]=256,_[2]=t.scale,_[3]=p,_[4]=s,g[5]=gt[t.shape]||0,_[6]=a,_[7]=c,_[8]=l,_[9]=f,_[10]=m.worldX,_[11]=m.worldY,_[12]=m.worldZ,_[13]=m.down?1:0,W.queue.writeBuffer(r,0,new Uint8Array(h));let v=e.beginComputePass();v.setPipeline(u),v.setBindGroup(0,d),v.dispatchWorkgroups(32,32),v.end()},render(t,r,o,c=0){let l=o?o[2]/o[3]:G.width/G.height;W.queue.writeBuffer(i,c*R,jt(l));let u=z.rotateX(z.rotateY(z.identity(),s*.1),s*.03);W.queue.writeBuffer(a,0,u);let d=t.beginRenderPass({colorAttachments:[Ot(g,r,o)],depthStencilAttachment:kt(g,o)}),f=At(o);f&&d.setViewport(f[0],f[1],f[2],f[3],0,1),Wt(d,l,c),d.setPipeline(m),d.setBindGroup(0,h[c]),d.setIndexBuffer(n,`uint32`),d.drawIndexed(e),d.end()},getCount(){return`256×256 (${I.parametric.shape})`},destroy(){t.destroy(),n.destroy(),r.destroy(),i.destroy(),a.destroy()}}}function Xt(){let e=I.reaction.resolution,t={size:[e,e,e],dimension:`3d`,format:`rgba16float`,usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST},n=W.createTexture(t),r=W.createTexture(t),i=new Uint16Array(e*e*e*4),a=e=>{let t=new Float32Array(1),n=new Int32Array(t.buffer);t[0]=e;let r=n[0],i=r>>16&32768,a=(r>>23&255)-112,o=r&8388607;return a<=0?i:a>=31?i|31744:i|a<<10|o>>13},o=a(1),s=a(0),c=a(.5);for(let t=0;t<e;t++)for(let n=0;n<e;n++)for(let r=0;r<e;r++){let a=(t*e*e+n*e+r)*4;i[a]=o,i[a+1]=s,i[a+2]=s,i[a+3]=s}let l=.3,u=.7;for(let t=0;t<80;t++){let t=Math.floor(e*(l+Math.random()*(u-l))),n=Math.floor(e*(l+Math.random()*(u-l))),r=Math.floor(e*(l+Math.random()*(u-l))),a=Math.random()<.5?1:2;for(let o=-a;o<=a;o++)for(let s=-a;s<=a;s++)for(let l=-a;l<=a;l++){if(l*l+s*s+o*o>a*a)continue;let u=t+l,d=n+s,f=r+o;if(u<0||d<0||f<0||u>=e||d>=e||f>=e)continue;let p=(f*e*e+d*e+u)*4;i[p]=c,i[p+1]=c}}W.queue.writeTexture({texture:n},i.buffer,{bytesPerRow:e*8,rowsPerImage:e},[e,e,e]),W.queue.writeTexture({texture:r},i.buffer,{bytesPerRow:e*8,rowsPerImage:e},[e,e,e]);let d=M(`reaction.compute`,Cr||`// Gray-Scott reaction-diffusion on a 3D volume.
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
`),f=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:`float`,viewDimension:`3d`}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:`write-only`,format:`rgba16float`,viewDimension:`3d`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),p=W.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),m=W.createComputePipeline({layout:W.createPipelineLayout({bindGroupLayouts:[f]}),compute:{module:d,entryPoint:`main`}}),h=[W.createBindGroup({layout:f,entries:[{binding:0,resource:n.createView({dimension:`3d`})},{binding:1,resource:r.createView({dimension:`3d`})},{binding:2,resource:{buffer:p}}]}),W.createBindGroup({layout:f,entries:[{binding:0,resource:r.createView({dimension:`3d`})},{binding:1,resource:n.createView({dimension:`3d`})},{binding:2,resource:{buffer:p}}]})],g=M(`reaction.render`,wr||`// Raymarched volume render of the Gray-Scott v-field.
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
`),_=W.createSampler({magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`,addressModeW:`clamp-to-edge`}),v=W.createBuffer({size:R*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),y=W.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),b=W.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`,viewDimension:`3d`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),x=W.createRenderPipeline({layout:W.createPipelineLayout({bindGroupLayouts:[b]}),vertex:{module:g,entryPoint:`vs_main`},fragment:{module:g,entryPoint:`fs_main`,targets:[{format:Pt,blend:{color:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`less`},multisample:{count:Ft}}),S=[0,1].map(e=>[0,1].map(t=>W.createBindGroup({layout:b,entries:[{binding:0,resource:(t===0?n:r).createView({dimension:`3d`})},{binding:1,resource:_},{binding:2,resource:{buffer:v,offset:e*R,size:mt}},{binding:3,resource:{buffer:y}}]}))),C=Math.ceil(e/8),w=Math.ceil(e/8),T=Math.ceil(e/4),E={},D=0;return{compute(t){let n=I.reaction,r=Math.max(1,Math.floor(n.stepsPerFrame)),i=Math.max(0,I.fx.timeScale),a=Math.max(0,Math.round(r*i));W.queue.writeBuffer(p,0,new Float32Array([n.feed,n.kill,n.Du,n.Dv,.65,e,0,0]));for(let e=0;e<a;e++){let e=t.beginComputePass();e.setPipeline(m),e.setBindGroup(0,h[D]),e.dispatchWorkgroups(C,w,T),e.end(),D=1-D}},render(t,n,r,i=0){let a=r?r[2]/r[3]:G.width/G.height;W.queue.writeBuffer(v,i*R,jt(a)),W.queue.writeBuffer(y,0,new Float32Array([e,I.reaction.isoThreshold,3,256]));let o=t.beginRenderPass({colorAttachments:[Ot(E,n,r)],depthStencilAttachment:kt(E,r)}),s=At(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),Wt(o,a,i),o.setPipeline(x),o.setBindGroup(0,S[i][1-D]),o.draw(3),o.end()},getCount(){return`${e}³`},destroy(){n.destroy(),r.destroy(),p.destroy(),v.destroy(),y.destroy()}}}var Zt=[{key:`timeScale`,label:`Time`,min:-2,max:2,step:.05},{key:`bloomIntensity`,label:`Bloom`,min:0,max:4,step:.01},{key:`bloomThreshold`,label:`Threshold`,min:0,max:8,step:.01},{key:`bloomRadius`,label:`Bloom Radius`,min:.5,max:2,step:.01},{key:`trailPersistence`,label:`Trails`,min:0,max:.995,step:.001},{key:`exposure`,label:`Exposure`,min:.2,max:4,step:.01},{key:`vignette`,label:`Vignette`,min:0,max:1.5,step:.01},{key:`chromaticAberration`,label:`Chromatic`,min:0,max:2,step:.01},{key:`grading`,label:`Color Grade`,min:0,max:1.5,step:.01}];function Qt(e){let t=document.createElement(`div`);t.className=`param-section`;let n=document.createElement(`div`);n.className=`param-section-title`,n.textContent=`Visual FX`,t.appendChild(n);for(let e of Zt){let n=document.createElement(`div`);n.className=`control-row`;let r=document.createElement(`span`);r.className=`control-label`,r.textContent=e.label,n.appendChild(r);let i=document.createElement(`input`);i.type=`range`,i.min=String(e.min),i.max=String(e.max),i.step=String(e.step),i.value=String(I.fx[e.key]);let a=document.createElement(`span`);a.className=`control-value`,a.textContent=rn(I.fx[e.key],e.step),i.addEventListener(`input`,()=>{let t=Number(i.value);I.fx[e.key]=t,a.textContent=rn(t,e.step),oa()}),n.appendChild(i),n.appendChild(a),t.appendChild(n)}e.appendChild(t)}function $t(){for(let[e,t]of Object.entries(Le)){let n=e,r=document.getElementById(`params-${n}`),i=document.createElement(`div`);i.className=`presets`;for(let e of Object.keys(Ie[n])){let t=document.createElement(`button`);t.className=`preset-btn`+(e===`Default`?` active`:``),t.textContent=e,t.dataset.preset=e,t.dataset.mode=n,t.addEventListener(`click`,()=>ln(n,e)),i.appendChild(t)}r.appendChild(i);for(let e of t){let t=document.createElement(`div`);t.className=`param-section`;let i=document.createElement(`div`);if(i.className=`param-section-title`,i.textContent=e.section,t.appendChild(i),e.dynamic){t.id=e.id??``,r.appendChild(t);continue}for(let r of e.params)en(t,n,r);r.appendChild(t)}Qt(r)}}function en(e,t,n){let r=document.createElement(`div`);r.className=`control-row`;let i=document.createElement(`span`);if(i.className=`control-label`,i.textContent=n.label,r.appendChild(i),n.type===`dropdown`){let e=document.createElement(`select`);e.dataset.mode=t,e.dataset.key=n.key;for(let t of n.options??[]){let n=document.createElement(`option`);n.value=String(t),n.textContent=String(t),e.appendChild(n)}e.value=String(F(t)[n.key]),e.addEventListener(`change`,()=>{let r=Number.isNaN(Number(e.value))?e.value:Number(e.value);F(t)[n.key]=r,n.requiresReset&&Qi(),n.key===`shape`&&(tn(String(r)),nn()),Xn()}),r.appendChild(e)}else{let e=document.createElement(`input`);e.type=`range`,n.logScale&&n.min!==void 0&&n.max!==void 0?(e.min=`0`,e.max=String(on),e.step=`1`,e.value=String(sn(Number(F(t)[n.key]),n.min,n.max)),e.dataset.logScale=`1`):(e.min=String(n.min),e.max=String(n.max),e.step=String(n.step),e.value=String(F(t)[n.key])),e.dataset.mode=t,e.dataset.key=n.key;let i=document.createElement(`span`);i.className=`control-value`,i.textContent=an(Number(F(t)[n.key]),n),e.addEventListener(`input`,()=>{let r=n.logScale&&n.min!==void 0&&n.max!==void 0?cn(Number(e.value),n.min,n.max):Number(e.value);F(t)[n.key]=r,i.textContent=an(r,n),n.requiresReset&&(e.dataset.needsReset=`1`),Xn()}),e.addEventListener(`change`,()=>{e.dataset.needsReset===`1`&&(e.dataset.needsReset=`0`,Qi())}),r.appendChild(e),r.appendChild(i)}return e.appendChild(r),r}function tn(e){let t=_t[e]??{},n=I.parametric;t.p1?(n.p1Min=t.p1.animMin,n.p1Max=t.p1.animMax,n.p1Rate=t.p1.animRate):(n.p1Min=0,n.p1Max=0,n.p1Rate=0),t.p2?(n.p2Min=t.p2.animMin,n.p2Max=t.p2.animMax,n.p2Rate=t.p2.animRate):(n.p2Min=0,n.p2Max=0,n.p2Rate=0)}function nn(){let e=document.getElementById(`shape-params-section`);if(!e)return;for(;e.children.length>1;)e.removeChild(e.lastChild);let t=_t[I.parametric.shape]??{};for(let[n,r]of Object.entries(t)){let t=document.createElement(`div`);t.className=`anim-param-label`,t.textContent=r.label,e.appendChild(t),en(e,`parametric`,{key:`${n}Min`,label:`Min`,min:r.min,max:r.max,step:r.step}),en(e,`parametric`,{key:`${n}Max`,label:`Max`,min:r.min,max:r.max,step:r.step}),en(e,`parametric`,{key:`${n}Rate`,label:`Rate`,min:0,max:3,step:.05})}}function rn(e,t){if(t>=1)return String(Math.round(e));let n=Math.max(0,-Math.floor(Math.log10(t)));return e.toFixed(n)}function an(e,t){let n=t?.step??.01;return t?.maxLabel!==void 0&&t.max!==void 0&&e>=t.max-n/2?t.maxLabel:rn(e,n)}var on=1e3;function sn(e,t,n){let r=(Math.log(e)-Math.log(t))/(Math.log(n)-Math.log(t));return Math.round(on*Math.max(0,Math.min(1,r)))}function cn(e,t,n){let r=e/on;return Math.exp(Math.log(t)+r*(Math.log(n)-Math.log(t)))}function ln(e,t){let n=Ie[e][t];Object.assign(F(e),n);let r=document.getElementById(`params-${e}`);r.querySelectorAll(`input[type="range"]`).forEach(t=>{let r=t.dataset.key;if(r in n){let i=un(e,r),a=Number(n[r]);t.value=i?.logScale&&i.min!==void 0&&i.max!==void 0?String(sn(a,i.min,i.max)):String(n[r]);let o=t.parentElement?.querySelector(`.control-value`);o&&(o.textContent=an(a,i))}}),r.querySelectorAll(`select`).forEach(e=>{let t=e.dataset.key;t in n&&(e.value=String(n[t]))}),r.querySelectorAll(`.preset-btn`).forEach(e=>{e.classList.toggle(`active`,e.dataset.preset===t)}),e===`parametric`&&nn(),Qi(),Xn()}function un(e,t){for(let n of Le[e])for(let e of n.params)if(e.key===t)return e;return null}var dn={boids:`Boids`,physics:`N-Body`,physics_classic:`N-Body Classic`,fluid:`Fluid`,parametric:`Shapes`,reaction:`Reaction`};function fn(e){I.mode=e,document.querySelectorAll(`.mode-tab`).forEach(t=>t.classList.toggle(`active`,t.dataset.mode===e)),document.querySelectorAll(`.param-group`).forEach(t=>t.classList.toggle(`active`,t.dataset.mode===e)),document.querySelectorAll(`.debug-panel`).forEach(t=>t.classList.toggle(`active`,t.dataset.mode===e));let t=document.getElementById(`mode-stepper-label`);t&&(t.textContent=dn[e]),Zi(),Xn()}function pn(){document.querySelectorAll(`.mode-tab`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.mode;fn(t)})})}function mn(){let e=document.getElementById(`btn-pause`);e&&(e.textContent=I.paused?`Resume`:`Pause`,e.classList.toggle(`active`,I.paused));let t=document.getElementById(`fab-pause`);t&&(t.textContent=I.paused?`▶`:`⏸`,t.classList.toggle(`active`,I.paused))}function hn(){document.getElementById(`btn-pause`).addEventListener(`click`,()=>{I.paused=!I.paused,I.paused&&Tn(),mn()}),document.getElementById(`btn-reset`).addEventListener(`click`,()=>{Qi()}),document.getElementById(`copy-btn`).addEventListener(`click`,()=>{let e=document.getElementById(`prompt-text`).textContent??``;navigator.clipboard.writeText(e).then(()=>{let e=document.getElementById(`copy-btn`);e.textContent=`Copied!`,setTimeout(()=>{e.textContent=`Copy`},1500)})}),document.getElementById(`btn-reset-all`).addEventListener(`click`,()=>{localStorage.removeItem(aa),location.reload()}),gn();let e=document.getElementById(`toggle-xr-log`);e.addEventListener(`change`,()=>{I.debug.xrLog=e.checked,ii(I.debug.xrLog),oa()}),ji()}function gn(){let e=document.getElementById(`btn-xr-record`);if(!e)return;let t=()=>{if(X.status().phase===`idle`){e.textContent=`Record XR Session`,e.disabled=!!Z;return}e.textContent=`Recording — exit XR to stop`,e.disabled=!0,requestAnimationFrame(t)};e.addEventListener(`click`,async()=>{if(X.status().phase!==`idle`||Z)return;X.record({}).then(e=>{window.__xrLastRecording=e;let t={};for(let n of e)t[n.channel]=(t[n.channel]??0)+1;let n=Object.entries(t).map(([e,t])=>`${e}: ${t}`).join(`, `);console.group(`[xr] recording — ${e.length} samples (${n})`);for(let t of e){if(t.channel===`xr.snap`||t.channel===`xr.gesture`&&t.payload.gesture.kind===`pinch-hold`)continue;let e=t.channel;if(t.channel===`xr.gesture`){let n=t.payload;e=`xr.gesture:${n.gesture.kind}${n.hand?`(${n.hand})`:``}`}else if(t.channel===`xr.state`){let n=t.payload;e=`xr.state:${n.hand} ${n.from}→${n.to}`}console.log(`[t=${t.t.toFixed(0).padStart(5)}ms] ${e}`,t.payload)}console.groupEnd()}),requestAnimationFrame(t),await Mi();let e=Z;if(!e){X.stop();return}e.addEventListener(`end`,()=>X.stop(),{once:!0})})}function _n(){let e=e=>{let t=K[I.mode];!t||!(`setTimeDirection`in t)||(t.setTimeDirection(e?-1:1),!e&&I.paused&&(I.paused=!1))};document.addEventListener(`keydown`,t=>{if(t.key===`r`||t.key===`R`){if(t.repeat)return;let n=t.target?.tagName;if(n===`INPUT`||n===`TEXTAREA`||n===`SELECT`)return;e(!0)}}),document.addEventListener(`keyup`,t=>{(t.key===`r`||t.key===`R`)&&e(!1)});let t=document.getElementById(`fab-rewind`);t&&(t.addEventListener(`pointerdown`,()=>e(!0)),t.addEventListener(`pointerup`,()=>e(!1)),t.addEventListener(`pointercancel`,()=>e(!1)),t.addEventListener(`pointerleave`,()=>e(!1)))}var q={skipTarget:null,targetStepsPerSec:6e3,adaptiveChunk:8,breakAtStep:null,manualStepsRemaining:0,manualDirection:1,lastSkipDispatches:0},vn=20,yn=14,bn=1.3,xn=.7,Sn=1,Cn=5e3;function wn(e){if(q.lastSkipDispatches<=0)return;let t=Math.max(1,Math.ceil(q.targetStepsPerSec/60));e>vn?q.adaptiveChunk=Math.max(Sn,Math.floor(q.adaptiveChunk*xn)):e<yn&&q.adaptiveChunk<t&&(q.adaptiveChunk=Math.min(Cn,Math.ceil(q.adaptiveChunk*bn)))}function Tn(){q.skipTarget=null,q.manualStepsRemaining=0,q.lastSkipDispatches=0}function En(e,t){if(I.mode!==`physics`||!(`getSimStep`in e)){q.lastSkipDispatches=0,I.paused||e.compute(t);return}let n=e,r=0,i=null,a=!1;if(q.skipTarget!==null){let e=q.skipTarget-n.getSimStep();if(e===0){q.skipTarget=null,q.lastSkipDispatches=0,n.setBlurTime(0),I.paused=!0,mn();return}i=e>0?1:-1;let t=Math.max(1,Math.ceil(q.targetStepsPerSec/60));r=Math.min(t,q.adaptiveChunk,Math.abs(e)),a=!0}else q.manualStepsRemaining>0?(i=q.manualDirection,r=Math.min(q.adaptiveChunk,q.manualStepsRemaining),q.manualStepsRemaining-=r):I.paused||(r=1);if(r===0){n.setBlurTime(0),q.lastSkipDispatches=0;return}let o=n.getTimeDirection(),s=i!==null&&i!==o;s&&n.setTimeDirection(i);let c=i===null?o:i,l=.016*I.fx.timeScale,u=a?r*l*c:0;n.setBlurTime(u),q.lastSkipDispatches=a?r:0;for(let e=0;e<r;e++){n.compute(t);let e=n.getSimStep();if(q.breakAtStep!==null&&e===q.breakAtStep){q.breakAtStep=null,Tn(),I.paused=!0,mn(),Dn(),n.setBlurTime(0);break}if(q.skipTarget!==null&&e===q.skipTarget){q.skipTarget=null,I.paused=!0,mn(),n.setBlurTime(0),q.lastSkipDispatches=0;break}}s&&n.setTimeDirection(o)}function Dn(){let e=document.getElementById(`debug-break-status`),t=document.getElementById(`debug-break-val`);!e||!t||(q.breakAtStep===null?e.style.display=`none`:(t.textContent=String(q.breakAtStep),e.style.display=``))}function On(){let e=e=>document.getElementById(e),t=(e,t)=>{Tn(),I.paused=!0,mn(),q.manualStepsRemaining=e,q.manualDirection=t};e(`debug-rev60`)?.addEventListener(`click`,()=>t(60,-1)),e(`debug-rev10`)?.addEventListener(`click`,()=>t(10,-1)),e(`debug-rev1`)?.addEventListener(`click`,()=>t(1,-1)),e(`debug-fwd1`)?.addEventListener(`click`,()=>t(1,1)),e(`debug-fwd10`)?.addEventListener(`click`,()=>t(10,1)),e(`debug-fwd60`)?.addEventListener(`click`,()=>t(60,1));let n=e(`debug-skip-chunk`);if(n){let e=parseInt(n.value,10);Number.isFinite(e)&&e>0&&(q.targetStepsPerSec=e),n.addEventListener(`change`,()=>{let e=parseInt(n.value,10);Number.isFinite(e)&&e>0&&(q.targetStepsPerSec=e)})}let r=e=>{e<0||(Tn(),I.paused=!0,mn(),q.skipTarget=e)},i=e(`debug-skip-target`);e(`debug-skip-btn`)?.addEventListener(`click`,()=>{let e=parseInt(i?.value??``,10);Number.isFinite(e)&&r(e)}),i?.addEventListener(`keydown`,e=>{if(e.key===`Enter`){let e=parseInt(i.value,10);Number.isFinite(e)&&r(e)}});let a=e(`debug-break-step`);e(`debug-break-btn`)?.addEventListener(`click`,()=>{let e=parseInt(a?.value??``,10);Number.isFinite(e)&&e>=0&&(q.breakAtStep=e,Dn())}),a?.addEventListener(`keydown`,e=>{if(e.key===`Enter`){let e=parseInt(a.value,10);Number.isFinite(e)&&e>=0&&(q.breakAtStep=e,Dn())}}),e(`debug-break-clear`)?.addEventListener(`click`,()=>{q.breakAtStep=null,Dn()});let o=e(`debug-scrub`);o?.addEventListener(`change`,()=>{let e=parseInt(o.value,10);Number.isFinite(e)&&r(e)}),e(`debug-screenshot`)?.addEventListener(`click`,()=>{let e=K.physics,t=e&&`getSimStep`in e?e.getSimStep():0;G.toBlob(e=>{if(!e)return;let n=URL.createObjectURL(e),r=document.createElement(`a`);r.href=n,r.download=`shader-playground-step-${t}.png`,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(n)},`image/png`)})}function kn(){if(I.mode!==`physics`)return;let e=K.physics;if(!e||!(`getSimStep`in e))return;let t=e,n=t.getSimStep(),r=t.getTimeDirection(),i=t.getJournalHighWater(),a=document.getElementById(`debug-step-num`);a&&(a.textContent=String(n));let o=document.getElementById(`debug-step-dir`);o&&(o.textContent=r<0?`◀`:`▶`);let s=document.getElementById(`debug-scrub`),c=document.getElementById(`debug-scrub-high`);if(s&&c){let e=Math.max(i,n);s.max!==String(e)&&(s.max=String(e)),document.activeElement!==s&&(s.value=String(n)),c.textContent=String(e)}}function An(){let e=document.getElementById(`theme-presets`);for(let t of Object.keys(Re)){let n=Re[t],r=document.createElement(`button`);r.className=`preset-btn`+(t===I.colorTheme?` active`:``),r.textContent=t,r.dataset.theme=t,r.style.borderLeftWidth=`3px`,r.style.borderLeftColor=n.primary,r.addEventListener(`click`,()=>{I.colorTheme!==t&&(I.colorTheme=t,Ze(t),e.querySelectorAll(`.preset-btn`).forEach(e=>e.classList.toggle(`active`,e.dataset.theme===t)),Xn())}),e.appendChild(r)}}function jn(){let e=I.camera,t=Math.cos(e.rotX),n=Math.sin(e.rotX),r=Math.cos(e.rotY),i=Math.sin(e.rotY),a=[e.distance*t*i,e.distance*n,e.distance*t*r],o=B(vt([0,0,0],a)),s=B(V(o,[0,1,0]));return{eye:a,forward:o,right:s,up:V(s,o)}}function Mn(e,t){let n=I.camera.fov*Math.PI/180,r=G.width/G.height,{eye:i,forward:a,right:o,up:s}=jn(),c=Math.tan(n*.5),l=(e*2-1)*c*r,u=(t*2-1)*c;return{eye:i,dir:B([a[0]+o[0]*l+s[0]*u,a[1]+o[1]*l+s[1]*u,a[2]+o[2]*l+s[2]*u])}}function Nn(e,t){let{dir:n}=Mn(e,t),r=I.camera.distance*.5;return[n[0]*r,n[1]*r,n[2]*r]}function Pn(e,t){let{eye:n,dir:r}=Mn(e,t),i=B(n),a=yt(r,i);if(Math.abs(a)<1e-4)return Rn(n,r);let o=-yt(n,i)/a;return[n[0]+r[0]*o,n[1]+r[1]*o,n[2]+r[2]*o]}function Fn(e,t){let{eye:n,dir:r}=Mn(e,t);if(Math.abs(r[1])<1e-4)return null;let i=-n[1]/r[1];if(i<0)return null;let a=n[0]+r[0]*i,o=n[2]+r[2]*i,s=L*.5;return Math.abs(a)>s||Math.abs(o)>s?null:[(a+s)/L,(o+s)/L]}function In(e){let t=L*.5;return Math.abs(e[0])>t||Math.abs(e[2])>t?null:[(e[0]+t)/L,(e[2]+t)/L]}function Ln(e,t,n){if(Math.abs(t[1])<1e-4)return null;let r=(n-e[1])/t[1];return r<0?null:[e[0]+t[0]*r,e[1]+t[1]*r,e[2]+t[2]*r]}function Rn(e,t){let n=yt(t,t)||1,r=Math.max(0,-yt(e,t)/n);return[e[0]+t[0]*r,e[1]+t[1]*r,e[2]+t[2]*r]}function zn(){I.mouse.down=!1,I.mouse.dx=0,I.mouse.dy=0}function Bn(){let e=G,t=!1,n=!1;e.addEventListener(`pointerdown`,r=>{if(I.xrEnabled)return;t=!0,n=!(r.ctrlKey||r.metaKey);let i=e.getBoundingClientRect(),a=(r.clientX-i.left)/i.width,o=1-(r.clientY-i.top)/i.height;if(I.mouse.dx=0,I.mouse.dy=0,n)if(I.mode===`fluid`){let e=Fn(a,o);if(!e)zn();else{I.mouse.down=!0;let t=Nn(a,o);I.mouse.worldX=t[0],I.mouse.worldY=t[1],I.mouse.worldZ=t[2],I.mouse.x=e[0],I.mouse.y=e[1]}}else{let e=Pn(a,o);I.mouse.down=!0,I.mouse.worldX=e[0],I.mouse.worldY=e[1],I.mouse.worldZ=e[2],I.mouse.x=a,I.mouse.y=o,I.mode===`physics`&&ut(r.pointerId,e)}else I.mouse.x=a,I.mouse.y=o;r.preventDefault()}),e.addEventListener(`pointermove`,r=>{if(I.xrEnabled||!t)return;let i=e.getBoundingClientRect(),a=(r.clientX-i.left)/i.width,o=1-(r.clientY-i.top)/i.height;if(n)if(I.mode===`fluid`){let e=Fn(a,o);if(!e)zn();else{I.mouse.down=!0;let t=Nn(a,o);I.mouse.worldX=t[0],I.mouse.worldY=t[1],I.mouse.worldZ=t[2],I.mouse.dx=(e[0]-I.mouse.x)*10,I.mouse.dy=(e[1]-I.mouse.y)*10,I.mouse.x=e[0],I.mouse.y=e[1]}}else{let e=Pn(a,o);I.mouse.down=!0,I.mouse.worldX=e[0],I.mouse.worldY=e[1],I.mouse.worldZ=e[2],I.mouse.dx=(a-I.mouse.x)*10,I.mouse.dy=(o-I.mouse.y)*10,I.mouse.x=a,I.mouse.y=o,I.mode===`physics`&&dt(r.pointerId,e)}else I.camera.rotY+=r.movementX*.005,I.camera.rotX+=r.movementY*.005,I.camera.rotX=Math.max(-Math.PI*.45,Math.min(Math.PI*.45,I.camera.rotX)),I.mouse.down=!1});let r=e=>{I.xrEnabled||(t=!1,n=!1,I.mouse.down=!1,I.mouse.dx=0,I.mouse.dy=0,ft(e.pointerId))};e.addEventListener(`pointerup`,r),e.addEventListener(`pointercancel`,r),e.addEventListener(`pointerleave`,r),e.addEventListener(`contextmenu`,e=>e.preventDefault()),e.addEventListener(`wheel`,e=>{I.xrEnabled||(I.camera.distance*=1+e.deltaY*.001,I.camera.distance=Math.max(.5,Math.min(200,I.camera.distance)),e.preventDefault())},{passive:!1})}var Vn=matchMedia(`(max-width: 768px)`),Hn=Vn.matches;function Un(){let e=G,t=new Map,n=0,r=0,i=0;function a(e,t,n,r){if(I.mode===`fluid`){let e=Fn(t,n);if(!e)zn();else{I.mouse.down=!0;let i=Nn(t,n);I.mouse.worldX=i[0],I.mouse.worldY=i[1],I.mouse.worldZ=i[2],I.mouse.dx=r?(e[0]-I.mouse.x)*10:0,I.mouse.dy=r?(e[1]-I.mouse.y)*10:0,I.mouse.x=e[0],I.mouse.y=e[1]}}else{let i=Pn(t,n);I.mouse.down=!0,I.mouse.worldX=i[0],I.mouse.worldY=i[1],I.mouse.worldZ=i[2],I.mouse.dx=r?(t-I.mouse.x)*10:0,I.mouse.dy=r?(n-I.mouse.y)*10:0,I.mouse.x=t,I.mouse.y=n,I.mode===`physics`&&(r?dt(e,i):ut(e,i))}}e.addEventListener(`pointerdown`,o=>{if(!I.xrEnabled){if(o.preventDefault(),t.set(o.pointerId,{x:o.clientX,y:o.clientY}),t.size===1){let t=e.getBoundingClientRect(),n=(o.clientX-t.left)/t.width,r=1-(o.clientY-t.top)/t.height;I.mouse.dx=0,I.mouse.dy=0,a(o.pointerId,n,r,!1)}if(t.size===2){zn(),t.forEach((e,t)=>ft(t));let e=[...t.values()];r=(e[0].x+e[1].x)/2,i=(e[0].y+e[1].y)/2,n=Math.hypot(e[0].x-e[1].x,e[0].y-e[1].y)}}},{passive:!1}),e.addEventListener(`pointermove`,o=>{if(!I.xrEnabled&&t.has(o.pointerId)){if(o.preventDefault(),t.set(o.pointerId,{x:o.clientX,y:o.clientY}),t.size===1){let t=e.getBoundingClientRect(),n=(o.clientX-t.left)/t.width,r=1-(o.clientY-t.top)/t.height;a(o.pointerId,n,r,!0)}else if(t.size===2){let e=[...t.values()],a=(e[0].x+e[1].x)/2,o=(e[0].y+e[1].y)/2,s=Math.hypot(e[0].x-e[1].x,e[0].y-e[1].y);I.camera.rotY+=(a-r)*.005,I.camera.rotX+=(o-i)*.005,I.camera.rotX=Math.max(-Math.PI*.45,Math.min(Math.PI*.45,I.camera.rotX)),n>0&&(I.camera.distance*=n/s,I.camera.distance=Math.max(.5,Math.min(200,I.camera.distance))),r=a,i=o,n=s,I.mouse.down=!1}}},{passive:!1});let o=r=>{if(t.delete(r.pointerId),ft(r.pointerId),t.size===0&&(I.mouse.down=!1,I.mouse.dx=0,I.mouse.dy=0,n=0),t.size===1){let[n,r]=[...t.entries()][0],i=e.getBoundingClientRect(),o=(r.x-i.left)/i.width,s=1-(r.y-i.top)/i.height;I.mouse.dx=0,I.mouse.dy=0,a(n,o,s,!1)}};e.addEventListener(`pointerup`,o),e.addEventListener(`pointercancel`,o),e.addEventListener(`contextmenu`,e=>e.preventDefault())}function Wn(){document.getElementById(`fab-pause`).addEventListener(`click`,()=>{I.paused=!I.paused,I.paused&&Tn(),mn()}),document.getElementById(`fab-reset`).addEventListener(`click`,()=>{Qi()});let e=[`physics`,`boids`,`physics_classic`,`fluid`,`parametric`,`reaction`],t=t=>{let n=e[(e.indexOf(I.mode)+t+e.length)%e.length];fn(n)};document.getElementById(`mode-prev`).addEventListener(`click`,()=>t(-1)),document.getElementById(`mode-next`).addEventListener(`click`,()=>t(1)),document.getElementById(`mode-stepper-label`).textContent=dn[I.mode]}function Gn(){let e=document.getElementById(`controls`),t=0,n=0,r=!1;e.addEventListener(`touchstart`,i=>{t=i.touches[0].clientY,n=e.scrollTop,r=!e.classList.contains(`mobile-expanded`)||n<=0},{passive:!0}),e.addEventListener(`touchmove`,i=>{if(!r)return;let a=i.touches[0].clientY-t,o=e.classList.contains(`mobile-expanded`);!o&&a<0&&i.preventDefault(),o&&n<=0&&a>0&&i.preventDefault()},{passive:!1}),e.addEventListener(`touchend`,i=>{if(!r)return;r=!1;let a=i.changedTouches[0].clientY-t,o=e.classList.contains(`mobile-expanded`);if(!o&&a<-30)e.classList.add(`mobile-expanded`);else if(o&&n<=0&&a>30)e.classList.remove(`mobile-expanded`);else if(Math.abs(a)<10){let t=e.querySelector(`.mobile-drag-handle`).getBoundingClientRect();i.changedTouches[0].clientY>=t.top&&i.changedTouches[0].clientY<=t.bottom&&e.classList.toggle(`mobile-expanded`)}}),G.addEventListener(`pointerdown`,()=>{e.classList.remove(`mobile-expanded`)},{capture:!0})}function Kn(){localStorage.getItem(aa)||(I.boids.count=500,I.physics.count=2e3,I.physics_classic.count=200,I.reaction.resolution=64)}var qn={boids:`boids/flocking`,physics:`N-body gravitational`,physics_classic:`classic N-body (vintage shader)`,fluid:`fluid dynamics`,parametric:`parametric shape`,reaction:`Gray-Scott reaction-diffusion (3D)`};function Jn(){let e=I.mode,t=F(e),n=N[e],r=[];for(let[i,a]of Object.entries(t))a!==n[i]&&r.push(Yn(e,i,a));let i=`WebGPU ${qn[e]} simulation`;I.colorTheme!==`Dracula`&&(i+=` (${I.colorTheme} theme)`),r.length>0&&(i+=` with ${r.filter(Boolean).join(`, `)}`),i+=`.`,document.getElementById(`prompt-text`).textContent=i}function Yn(e,t,n){let r=Number(n),i={count:()=>`${n} particles`,separationRadius:()=>r<15?`tight separation (${n})`:r>50?`wide separation (${n})`:`separation radius ${n}`,alignmentRadius:()=>`alignment range ${n}`,cohesionRadius:()=>r>80?`strong cohesion (${n})`:`cohesion range ${n}`,maxSpeed:()=>r>4?`high speed (${n})`:r<1?`slow movement (${n})`:`speed ${n}`,maxForce:()=>r>.1?`strong steering (${n})`:`steering force ${n}`,visualRange:()=>`visual range ${n}`,G:()=>r>5?`strong gravity (G=${n})`:r<.5?`weak gravity (G=${n})`:`G=${n}`,softening:()=>`softening ${n}`,damping:()=>r<.995?`high damping (${n})`:`damping ${n}`,haloMass:()=>r>8?`heavy halo (${n})`:r<2?`light halo (${n})`:`halo mass ${n}`,haloScale:()=>`halo scale ${n}`,diskMass:()=>r<.1?`no disk potential`:`disk mass ${n}`,diskScaleA:()=>`disk scale A ${n}`,diskScaleB:()=>`disk scale B ${n}`,distribution:()=>`${n} distribution`,resolution:()=>`${n}x${n} grid`,viscosity:()=>r>.5?`thick fluid (viscosity ${n})`:r<.05?`thin fluid (viscosity ${n})`:`viscosity ${n}`,diffusionRate:()=>`diffusion ${n}`,forceStrength:()=>r>200?`strong forces (${n})`:`force strength ${n}`,volumeScale:()=>r>2?`large volume (${n})`:r<1?`compact volume (${n})`:`volume scale ${n}`,dyeMode:()=>`${n} dye`,jacobiIterations:()=>`${n} solver iterations`,shape:()=>`${n} shape`,scale:()=>r===1?null:`scale ${n}`,p1Min:()=>null,p1Max:()=>null,p1Rate:()=>null,p2Min:()=>null,p2Max:()=>null,p2Rate:()=>null,p3Min:()=>null,p3Max:()=>null,p3Rate:()=>null,p4Min:()=>null,p4Max:()=>null,p4Rate:()=>null,twistMin:()=>null,twistMax:()=>null,twistRate:()=>null}[t];return i?i():`${t}: ${n}`}function Xn(){Jn(),$i(),ar(),oa()}function Zn(e){return{boids:{"Compute (Flocking)":`struct Particle {
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
`}}[e]||{}}var Qn=!1,J=null,$n={},er={};function tr(){let e=document.getElementById(`shader-toggle`),t=document.getElementById(`shader-panel`);e.addEventListener(`click`,()=>{Qn=!Qn,t.classList.toggle(`open`,Qn),e.classList.toggle(`active`,Qn),Qn&&nr()}),document.getElementById(`shader-compile`).addEventListener(`click`,or),document.getElementById(`shader-reset`).addEventListener(`click`,sr),document.getElementById(`shader-editor`).addEventListener(`keydown`,e=>{if(e.key===`Tab`){e.preventDefault();let t=e.target,n=t.selectionStart;t.value=t.value.substring(0,n)+`  `+t.value.substring(t.selectionEnd),t.selectionStart=t.selectionEnd=n+2}})}function nr(){let e=Zn(I.mode);er={...e},(!$n._mode||$n._mode!==I.mode)&&($n={...e,_mode:I.mode});let t=document.getElementById(`shader-tabs`);t.innerHTML=``;let n=Object.keys(e);J=J&&n.includes(J)?J:n[0];for(let e of n){let n=document.createElement(`button`);n.className=`shader-tab`+(e===J?` active`:``),n.textContent=e,n.addEventListener(`click`,()=>{rr(),J=e,t.querySelectorAll(`.shader-tab`).forEach(t=>t.classList.toggle(`active`,t.textContent===e)),ir()}),t.appendChild(n)}ir()}function rr(){J&&($n[J]=document.getElementById(`shader-editor`).value)}function ir(){let e=document.getElementById(`shader-editor`);e.value=$n[J]||``,document.getElementById(`shader-status`).textContent=``,document.getElementById(`shader-status`).className=`shader-success`}function ar(){Qn&&$n._mode!==I.mode&&nr()}function or(){rr();let e=$n[J],t=document.getElementById(`shader-status`);try{W.createShaderModule({code:e}).getCompilationInfo().then(n=>{let r=n.messages.filter(e=>e.type===`error`);r.length>0?(t.className=`shader-error`,t.textContent=r.map(e=>`Line ${e.lineNum}: ${e.message}`).join(`; `),t.title=r.map(e=>`Line ${e.lineNum}: ${e.message}`).join(`
`)):(t.className=`shader-success`,t.textContent=`Compiled OK — reset simulation to apply`,t.title=``,cr(I.mode,J,e))})}catch(e){t.className=`shader-error`,t.textContent=e.message,t.title=e.message}}function sr(){J&&er[J]&&($n[J]=er[J],ir(),cr(I.mode,J,er[J]),document.getElementById(`shader-status`).className=`shader-success`,document.getElementById(`shader-status`).textContent=`Shader reset to original`)}function cr(e,t,n){let r={boids:{"Compute (Flocking)":()=>{lr=n},"Render (Vert+Frag)":()=>{ur=n}},physics:{"Compute (Gravity)":()=>{dr=n},"Render (Vert+Frag)":()=>{fr=n}},physics_classic:{"Compute (Classic)":()=>{pr=n},"Render (Classic)":()=>{mr=n}},fluid:{"Forces + Advect":()=>{hr=n},Diffuse:()=>{gr=n},Divergence:()=>{_r=n},"Pressure Solve":()=>{vr=n},"Gradient Sub":()=>{yr=n},Render:()=>{br=n}},parametric:{"Compute (Mesh Gen)":()=>{xr=n},"Render (Phong)":()=>{Sr=n}},reaction:{"Compute (Gray-Scott)":()=>{Cr=n},"Render (Raymarch)":()=>{wr=n}}}[e]?.[t];r&&r()}var lr=null,ur=null,dr=null,fr=null,pr=null,mr=null,hr=null,gr=null,_r=null,vr=null,yr=null,br=null,xr=null,Sr=null,Cr=null,wr=null,Tr=new Map,Y={phase:`idle`,phaseDeadline:0,bounded:!1,samples:[],startedAt:0,unsubs:[],preDelayTimer:null,stopTimer:null,resolve:null},X={channel(e){let t=Tr.get(e);if(t)return t;let n={name:e,subscribers:new Set};return Tr.set(e,n),n},subscribe(e,t){return e.subscribers.add(t),()=>{e.subscribers.delete(t)}},emit(e,t){for(let n of e.subscribers)n(t)},record(e){if(Y.phase!==`idle`)return Promise.reject(Error(`metrics.record: recording already in progress`));let t=e.preDelayMs??0;return Y.samples=[],Y.bounded=e.durationMs!==void 0,new Promise(n=>{Y.resolve=n;let r=()=>{let t=e.channels??Array.from(Tr.values());Y.startedAt=performance.now(),Y.phase=`recording`,Y.phaseDeadline=e.durationMs===void 0?0:Y.startedAt+e.durationMs,Y.preDelayTimer=null;for(let e of t){let t=e.name;Y.unsubs.push(X.subscribe(e,e=>{Y.samples.push({t:performance.now()-Y.startedAt,channel:t,payload:e})}))}e.durationMs!==void 0&&(Y.stopTimer=setTimeout(()=>X.stop(),e.durationMs))};t>0?(Y.phase=`pre-delay`,Y.phaseDeadline=performance.now()+t,Y.preDelayTimer=setTimeout(r,t)):r()})},stop(){if(Y.phase===`idle`)return;Y.preDelayTimer&&=(clearTimeout(Y.preDelayTimer),null),Y.stopTimer&&=(clearTimeout(Y.stopTimer),null);for(let e of Y.unsubs)e();Y.unsubs=[];let e=Y.samples;Y.samples=[],Y.phase=`idle`,Y.phaseDeadline=0,Y.bounded=!1;let t=Y.resolve;Y.resolve=null,t&&t(e)},status(){return Y.phase===`idle`?{phase:`idle`,remainingMs:0,bounded:!1}:{phase:Y.phase,remainingMs:Y.phaseDeadline===0?0:Math.max(0,Y.phaseDeadline-performance.now()),bounded:Y.bounded}}},Z=null,Er=null,Dr=null,Or=null,kr=null,Ar=!1,jr=[`wrist`,`thumb-metacarpal`,`thumb-phalanx-proximal`,`thumb-phalanx-distal`,`thumb-tip`,`index-finger-metacarpal`,`index-finger-phalanx-proximal`,`index-finger-phalanx-intermediate`,`index-finger-phalanx-distal`,`index-finger-tip`,`middle-finger-metacarpal`,`middle-finger-phalanx-proximal`,`middle-finger-phalanx-intermediate`,`middle-finger-phalanx-distal`,`middle-finger-tip`,`ring-finger-metacarpal`,`ring-finger-phalanx-proximal`,`ring-finger-phalanx-intermediate`,`ring-finger-phalanx-distal`,`ring-finger-tip`,`pinky-finger-metacarpal`,`pinky-finger-phalanx-proximal`,`pinky-finger-phalanx-intermediate`,`pinky-finger-phalanx-distal`,`pinky-finger-tip`];function Mr(e){return{hand:e,tracked:!1,source:null,pinch:{active:!1,startTime:0,origin:[0,0,0],current:[0,0,0]},gazeRay:null,currentRay:null,ray:null,palmNormal:null,joints:null,grip:null}}var Q={left:Mr(`left`),right:Mr(`right`)},Nr={left:{kind:`idle`},right:{kind:`idle`}},Pr=[],Fr={gainMultiplier:1},Ir=`left`,Lr={bindings:r,layouts:new Map,activeLayoutId:null},Rr=D(),zr=[],Br={left:!1,right:!1},Vr=null,Hr=null,Ur={x:0,y:0,z:-5},Wr=0,Gr={startDistance:0,startOffset:{x:0,y:0,z:0}},Kr={left:!1,right:!1};function qr(){return{fineModifier:!1,palmUp:!1,wristOrient:null,wristTime:0,flickArmed:!1,lastFlickAt:0}}var Jr={left:qr(),right:qr()},Yr=.7,Xr=.4,Zr=4,Qr=300,$r=X.channel(`xr.gesture`),ei=X.channel(`xr.state`),ti=X.channel(`xr.snap`),ni={unsubs:[],lastSnapMs:{left:0,right:0}},ri=200;function ii(e){for(let e of ni.unsubs)e();ni.unsubs.length=0,ni.lastSnapMs.left=0,ni.lastSnapMs.right=0,e&&(ni.unsubs.push(X.subscribe($r,e=>{if(e.gesture.kind===`pinch-hold`)return;let t=e.hand?`(${e.hand})`:``;console.log(`[xr] gesture:${e.gesture.kind}${t}`,e.gesture)})),ni.unsubs.push(X.subscribe(ei,e=>{console.log(`[xr] state:${e.hand} ${e.from}→${e.to}`)})),ni.unsubs.push(X.subscribe(ti,e=>{let t=performance.now();if(t-ni.lastSnapMs[e.hand]<ri)return;ni.lastSnapMs[e.hand]=t;let n=e.palmDot===null?`—`:e.palmDot.toFixed(2);console.log(`[xr] snap:${e.hand} tracked=${e.handTracked} pinch=${e.pinching} palm=${n} palmUp=${e.palmUp} fine=${e.fineModifier} flick=${e.flickSpeed.toFixed(2)}`)})))}function ai(e,t){let n=Nr[e];Nr[e]=t,ei.subscribers.size>0&&n.kind!==t.kind&&X.emit(ei,{hand:e,from:n.kind,to:t.kind})}var oi={left:-1,right:-2},si=150;function ci(e){let t=e.matrix;return B([-t[8],-t[9],-t[10]])}function li(e,t){if(!Er)return null;let n=e.getPose(t.targetRaySpace,Er);if(!n)return null;let r=n.transform.position;return{origin:[r.x,r.y,r.z],dir:ci(n.transform)}}function ui(e,t){if(!Er)return null;let n=e.getPose(t.gripSpace||t.targetRaySpace,Er);if(!n)return null;let r=n.transform.position;return[r.x,r.y,r.z]}function di(e){let t=!Q.left.source,n=!Q.right.source;return e.handedness===`left`&&t?`left`:e.handedness===`right`&&n?`right`:t?`left`:n?`right`:null}function fi(e){return Q.left.source===e?`left`:Q.right.source===e?`right`:null}var pi=.03,mi=pi*pi;function hi(e){return[-e[0],-e[1],-e[2],e[3]]}function gi(e,t){return[e[3]*t[0]+e[0]*t[3]+e[1]*t[2]-e[2]*t[1],e[3]*t[1]-e[0]*t[2]+e[1]*t[3]+e[2]*t[0],e[3]*t[2]+e[0]*t[1]-e[1]*t[0]+e[2]*t[3],e[3]*t[3]-e[0]*t[0]-e[1]*t[1]-e[2]*t[2]]}function _i(e,t,n){let r={};for(let i of jr){let a=t.get(i),o=a?e.getJointPose(a,n):null;if(!o){r[i]=null;continue}let s=o.transform.position,c=o.transform.orientation;r[i]={position:[s.x,s.y,s.z],orientation:[c.x,c.y,c.z,c.w],radius:o.radius}}return r}function vi(e,t){let n=e.wrist,r=e[`index-finger-metacarpal`],i=e[`pinky-finger-metacarpal`];if(!n||!r||!i)return null;let a=vt(r.position,n.position),o=vt(i.position,n.position),s=B(t===`right`?V(o,a):V(a,o));return s[0]===0&&s[1]===0&&s[2]===0?null:s}function yi(e){let t=e[`thumb-tip`];if(!t)return null;let n=e=>{if(!e)return null;let n=vt(t.position,e.position);return yt(n,n)<mi};return{thumbIndex:n(e[`index-finger-tip`]),thumbMiddle:n(e[`middle-finger-tip`]),thumbRing:n(e[`ring-finger-tip`]),thumbPinky:n(e[`pinky-finger-tip`])}}function bi(){if(!Dr)return;let e=globalThis.XRRigidTransform;Er=Dr.getOffsetReferenceSpace(new e({x:Ur.x,y:Ur.y+Wr,z:Ur.z}))}function xi(e){for(let t=Pr.length-1;t>=0;t--){let n=Pr[t],r=li(e,n);if(!r)continue;Pr.splice(t,1);let i=di(n);if(!i)continue;let a=ui(e,n)??r.origin,o=Q[i];o.tracked=!0,o.source=n,o.pinch.active=!0,o.pinch.startTime=performance.now(),o.pinch.origin=a,o.pinch.current=a,o.gazeRay={origin:[...r.origin],dir:[...r.dir]},o.currentRay=r}for(let t of[`left`,`right`]){let n=Q[t];if(!n.pinch.active||!n.source)continue;let r=li(e,n.source);r&&(n.currentRay=r);let i=ui(e,n.source);i&&(n.pinch.current=i)}for(let e of[`left`,`right`]){let t=Q[e];t.joints=null,t.palmNormal=null,t.grip=null,t.ray=null}if(Er)for(let t of e.session.inputSources){if(t.handedness===`none`||!t.hand)continue;let n=t.handedness,r=Q[n],i=_i(e,t.hand,Er);r.joints=i,r.palmNormal=vi(i,n),r.grip=yi(i),r.ray=Si(i)}}function Si(e){let t=e.wrist,n=e[`index-finger-metacarpal`];if(!t||!n)return null;let r=B(vt(n.position,t.position));return r[0]===0&&r[1]===0&&r[2]===0?null:{origin:[...n.position],dir:r}}function Ci(){let e=[],t=Q.left.pinch.active,n=Q.right.pinch.active,r=t&&n,i=Kr.left&&Kr.right,a=performance.now();for(let t of[`left`,`right`]){let n=Q[t],r=Kr[t],i=n.pinch.active;i&&!r&&n.gazeRay?e.push({kind:`pinch-start`,hand:t,gazeRay:n.gazeRay}):i&&r?e.push({kind:`pinch-hold`,hand:t,dur:a-n.pinch.startTime}):!i&&r&&e.push({kind:`pinch-end`,hand:t,dur:a-n.pinch.startTime});let o=Jr[t];if(n.grip){let r=n.grip.thumbRing===!0;r&&!o.fineModifier?e.push({kind:`fine-modifier-on`,hand:t}):!r&&o.fineModifier&&e.push({kind:`fine-modifier-off`,hand:t}),o.fineModifier=r}if(n.palmNormal){let r=n.palmNormal[1],i=o.palmUp?r>Xr:r>Yr;i&&!o.palmUp?e.push({kind:`palm-up`,hand:t}):!i&&o.palmUp&&e.push({kind:`palm-down`,hand:t}),o.palmUp=i}let s=n.joints?.wrist?.orientation??null,c=0;if(s&&o.wristOrient&&!n.pinch.active){let n=Math.max(.001,(a-o.wristTime)/1e3),r=gi(s,hi(o.wristOrient)),i=Math.min(1,Math.abs(r[3])),l=2*Math.acos(i),u=Math.sqrt(Math.max(0,1-i*i)),d=r[3]<0?-1:1,f=u>1e-6?r[0]*d/u:0,p=u>1e-6?r[1]*d/u:0,m=u>1e-6?r[2]*d/u:0;c=l/n;let h=c>Zr;if(h&&o.flickArmed&&a-o.lastFlickAt>Qr){let n=Math.abs(f),r=Math.abs(p),i=Math.abs(m),s=n>=r&&n>=i?`pitch`:r>=i?`yaw`:`roll`,c=(s===`pitch`?f:s===`yaw`?p:m)>=0?1:-1;e.push({kind:`wrist-flick`,hand:t,axis:s,sign:c}),o.lastFlickAt=a}o.flickArmed=h}else o.flickArmed=!1;o.wristOrient=s?[...s]:null,o.wristTime=a,ti.subscribers.size>0&&X.emit(ti,{hand:t,handTracked:n.joints!==null,pinching:n.pinch.active,palmDot:n.palmNormal?n.palmNormal[1]:null,palmUp:o.palmUp,fineModifier:o.fineModifier,flickSpeed:c,grip:n.grip})}if(r&&!i?e.push({kind:`two-hand-pinch-start`}):!r&&i&&e.push({kind:`two-hand-pinch-end`}),Kr.left=t,Kr.right=n,$r.subscribers.size>0)for(let t of e)X.emit($r,{hand:`hand`in t?t.hand:null,gesture:t});return e}function wi(e,t){for(let t of e)switch(t.kind){case`pinch-start`:ai(t.hand,{kind:`pending`,deadline:performance.now()+si});break;case`two-hand-pinch-start`:if(Nr.left.kind===`pending`&&Nr.right.kind===`pending`){let e=vt(Q.left.pinch.current,Q.right.pinch.current);Gr.startDistance=Math.max(.01,Math.sqrt(yt(e,e))),Gr.startOffset={...Ur},ai(`left`,{kind:`two-hand-scale`}),ai(`right`,{kind:`two-hand-scale`})}break;case`two-hand-pinch-end`:Nr.left.kind===`two-hand-scale`&&ai(`left`,{kind:`idle`}),Nr.right.kind===`two-hand-scale`&&ai(`right`,{kind:`idle`});break;case`pinch-end`:Ti(t.hand);break;case`pinch-hold`:break;case`fine-modifier-on`:Fr.gainMultiplier=.1;break;case`fine-modifier-off`:Fr.gainMultiplier=1;break;case`palm-up`:case`palm-down`:case`wrist-flick`:break}let n=performance.now();for(let e of[`left`,`right`]){let t=Nr[e];t.kind===`pending`&&n>=t.deadline&&(Br[e]?ai(e,{kind:`idle`}):ai(e,{kind:`dragging`,handOrigin:[...Q[e].pinch.origin],hasSample:!1}))}}function Ti(e){switch(Nr[e].kind){case`dragging`:zn(),ft(oi[e]);break;case`pending`:case`two-hand-scale`:case`idle`:break}ai(e,{kind:`idle`});let t=Q[e];t.pinch.active||(t.source=null,t.gazeRay=null,t.currentRay=null)}function Ei(e){if(Nr.left.kind===`two-hand-scale`&&Nr.right.kind===`two-hand-scale`){let e=vt(Q.left.pinch.current,Q.right.pinch.current),t=Math.sqrt(yt(e,e));if(Gr.startDistance>=.01){let e=t/Gr.startDistance;Ur.z=Math.max(-200,Math.min(-1,Gr.startOffset.z/e)),bi()}return}let t=!1;for(let e of[`left`,`right`]){let n=Nr[e],r=Q[e];if(n.kind!==`dragging`||!r.source)continue;let i=r.currentRay;if(!i)continue;t=!0;let a=I.mode===`fluid`?Ln(i.origin,i.dir,0):Rn(i.origin,i.dir);if(!a){zn(),n.hasSample=!1;continue}if(I.mouse.down=!0,I.mouse.worldX=a[0],I.mouse.worldY=a[1],I.mouse.worldZ=a[2],I.mode===`fluid`){let e=In(a);if(!e){zn(),n.hasSample=!1;continue}I.mouse.dx=n.hasSample?(e[0]-I.mouse.x)*10:0,I.mouse.dy=n.hasSample?(e[1]-I.mouse.y)*10:0,I.mouse.x=e[0],I.mouse.y=e[1]}else I.mouse.dx=0,I.mouse.dy=0,I.mouse.x=a[0],I.mouse.y=a[1];if(I.mode===`physics`){let t=oi[e];I.pointerToAttractor.has(t)?dt(t,a):ut(t,a)}n.hasSample=!0}t||I.xrEnabled&&I.mouse.down&&zn()}function Di(e){if(!Er)return null;let t=e.getViewerPose(Er);if(!t)return null;let n=t.transform;return{position:[n.position.x,n.position.y,n.position.z],orientation:[n.orientation.x,n.orientation.y,n.orientation.z,n.orientation.w]}}function Oi(e){xi(e);let t=Di(e),n=te(Lr,Q,Rr,{hands:Q,headPose:t},Fr,16);re(n.sideEffects,Lr),Rr=n.next,zr=n.renderList,Br.left=ne(n.next.states.left),Br.right=ne(n.next.states.right),wi(Ci(),e),Ei(e)}function ki(e){let t=fi(e);if(t){let e=Q[t];e.pinch.active=!1,e.tracked=!1}let n=Pr.indexOf(e);n>=0&&Pr.splice(n,1)}function Ai(){Pr.length=0,Q.left=Mr(`left`),Q.right=Mr(`right`),ai(`left`,{kind:`idle`}),ai(`right`,{kind:`idle`}),Kr.left=!1,Kr.right=!1,Jr.left=qr(),Jr.right=qr(),Fr.gainMultiplier=1,Rr=D(),zr=[],Br.left=!1,Br.right=!1,zn(),ft(oi.left),ft(oi.right)}function ji(){let e=document.getElementById(`btn-xr`);if(!navigator.xr){e.textContent=`VR Not Available`;return}navigator.xr.isSessionSupported(`immersive-vr`).then(t=>{t?(e.disabled=!1,e.addEventListener(`click`,Mi)):e.textContent=`VR Not Supported`}).catch(()=>{e.textContent=`VR Check Failed`})}async function Mi(){if(Z){j(`xr`,`exiting session (user clicked Exit VR)`),k=`xr:session.end`,Z.end();return}let e=document.getElementById(`btn-xr`);e.textContent=`Starting...`,j(`xr`,`toggleXR start`,{hasWebXR:!!navigator.xr,userAgent:navigator.userAgent});try{k=`xr:requestSession`,Z=await navigator.xr.requestSession(`immersive-vr`,{requiredFeatures:[`webgpu`],optionalFeatures:[`layers`,`local-floor`,`hand-tracking`]});let t=Z.enabledFeatures;Ar=!!t&&t.includes(`hand-tracking`),j(`xr`,`session acquired`,{environmentBlendMode:Z.environmentBlendMode,interactionMode:Z.interactionMode,visibilityState:Z.visibilityState,handTracking:Ar,enabledFeatures:t});let n=!1;try{k=`xr:requestReferenceSpace(local-floor)`,Er=await Z.requestReferenceSpace(`local-floor`),n=!0,j(`xr`,`reference space = local-floor`)}catch(e){j(`xr`,`local-floor unavailable, falling back to local`,e.message),k=`xr:requestReferenceSpace(local)`,Er=await Z.requestReferenceSpace(`local`)}Dr=Er,Wr=n?1.6:0,Ur.x=0,Ur.y=0,Ur.z=-5,bi(),k=`xr:new XRGPUBinding`,Or=new XRGPUBinding(Z,W);let r=Or.getPreferredColorFormat(),i=Or.nativeProjectionScaleFactor;j(`xr`,`binding ready`,{preferredFormat:r,nativeProjectionScaleFactor:i}),Lt(r,1);let a=[{colorFormat:r,depthStencilFormat:`depth24plus`,scaleFactor:i,textureType:`texture-array`},{colorFormat:r,depthStencilFormat:`depth24plus`,textureType:`texture-array`},{colorFormat:r,scaleFactor:i,textureType:`texture-array`},{colorFormat:r,textureType:`texture-array`},{colorFormat:r,scaleFactor:i},{colorFormat:r}];k=`xr:createProjectionLayer`;let o=null,s=[];for(let e of a)try{kr=Or.createProjectionLayer(e),o=e;break}catch(t){let n=t.message;s.push({config:e,error:n}),j(`xr`,`projection layer config rejected`,{config:e,error:n}),kr=null}if(!kr)throw Error(`All projection layer configurations failed. Attempts: ${JSON.stringify(s)}`);j(`xr`,`projection layer created`,{config:o,textureWidth:kr.textureWidth,textureHeight:kr.textureHeight,textureArrayLength:kr.textureArrayLength,ignoreDepthValues:kr.ignoreDepthValues});try{kr.fixedFoveation=0,j(`xr`,`fixedFoveation set to 0`)}catch(e){j(`xr`,`fixedFoveation unsupported on this platform`,e.message)}k=`xr:updateRenderState`;try{Z.updateRenderState({layers:[kr]}),j(`xr`,`render state updated with projection layer`)}catch(e){throw A(`xr:updateRenderState`,e),e}Z.addEventListener(`selectstart`,e=>{Pr.push(e.inputSource)}),Z.addEventListener(`selectend`,e=>{ki(e.inputSource)}),e.textContent=`Exit VR`,I.xrEnabled=!0,k=`xr:awaiting first frame`;let c=[0,0,0,1],l={x:.16,y:.06},u={x:.02,y:.02};Lr.layouts.set(`debug`,{id:`debug-panel`,kind:`panel`,anchor:{kind:`head-hud`,distance:.7,offset:{position:[0,-.15,0],orientation:c}},size:{x:1.1,y:.5},children:[{id:`debug-row-1`,kind:`group`,layout:`row`,children:[{id:`debug-s1`,kind:`slider`,binding:`physics.G`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:l,hitPadding:u},{id:`debug-b1`,kind:`button`,binding:`preset.physics.Default`,style:`primary`,visualSize:l,hitPadding:u},{id:`debug-r1`,kind:`readout`,binding:`physics.G`,visualSize:l,hitPadding:u},{id:`debug-d1`,kind:`dial`,binding:`physics.softening`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:l,hitPadding:u}]},{id:`debug-row-2`,kind:`group`,layout:`row`,children:[{id:`debug-tg1`,kind:`toggle`,binding:`app.paused`,style:`switch`,visualSize:l,hitPadding:u},{id:`debug-st1`,kind:`stepper`,binding:`physics.count`,step:1e3,visualSize:l,hitPadding:u},{id:`debug-en1`,kind:`enum-chips`,binding:`physics.distribution`,visualSize:l,hitPadding:u},{id:`debug-pt1`,kind:`preset-tile`,binding:`preset.physics.Spiral Galaxy`,visualSize:l,hitPadding:u},{id:`debug-ct1`,kind:`category-tile`,targetTabId:`physics`,summary:{},visualSize:l,hitPadding:u}]}]});let d={kind:`held`,hand:Ir,offset:{position:[0,.15,-.1],orientation:[Math.sin(Math.PI*.33),0,0,Math.cos(Math.PI*.33)]}},f={x:.17,y:.03};Lr.layouts.set(`clipboard`,{id:`clipboard-panel`,kind:`panel`,anchor:d,size:{x:.2,y:.28},children:[{id:`clipboard-col`,kind:`group`,layout:`column`,gap:.015,children:[{id:`clipboard-title`,kind:`readout`,binding:`physics.G`,visualSize:{x:.18,y:.025},hitPadding:{x:0,y:0}},{id:`clipboard-G`,kind:`slider`,binding:`physics.G`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:f,hitPadding:m.defaultHitPadding},{id:`clipboard-soft`,kind:`slider`,binding:`physics.softening`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:f,hitPadding:m.defaultHitPadding},{id:`clipboard-int`,kind:`slider`,binding:`physics.interactionStrength`,orientation:`horizontal`,interaction:{kind:`direct-drag`,axis:`x`},visualSize:f,hitPadding:m.defaultHitPadding}]}]}),Lr.activeLayoutId=`clipboard`,Z.addEventListener(`visibilitychange`,()=>{j(`xr`,`visibilitychange`,{visibilityState:Z?.visibilityState})}),Z.requestAnimationFrame(Pi),j(`xr`,`first frame requested; waiting for xrFrame callback`),Z.addEventListener(`end`,()=>{j(`xr`,`session ended`,{finalPhase:k,framesRendered:$}),Z=null,Er=null,Dr=null,Or=null,kr=null,Ar=!1,I.xrEnabled=!1,$=0,k=`desktop`,Lt(Nt,1),Ai(),e.textContent=`Enter VR`,requestAnimationFrame(ia)})}catch(t){if(A(`xr:toggle`,t,`session failed to start (phase=${k})`),e.textContent=`XR Error: ${t.message}`,Z)try{Z.end()}catch(e){A(`xr:cleanup-end`,e)}Z=null,k=`desktop`,setTimeout(()=>{e.textContent=`Enter VR`},4e3)}}var $=0,Ni=3;function Pi(e,t){if(!Z)return;Z.requestAnimationFrame(Pi),Ye(e);let n=$<Ni;n&&j(`xr:frame`,`xrFrame #${$} entered`,{mode:I.mode}),lt(it()),Fi++,e-Ii>=1e3&&(Li=Fi,Fi=0,Ii=e),k=`xr:frame:${$}:pre-encode`,W.pushErrorScope(`validation`);try{let e=t.getViewerPose(Er);if(!e){n&&j(`xr:frame`,`no viewer pose yet`);return}let r=K[I.mode];if(!r){A(`xr:frame`,Error(`simulation for mode=${I.mode} is not initialized`));return}Oi(t),k=`xr:frame:${$}:createCommandEncoder`;let i=W.createCommandEncoder({label:`xr-frame-${$}`});I.paused||(k=`xr:frame:${$}:sim.compute(${I.mode})`,r.compute(i)),n&&j(`xr:frame`,`pose has ${e.views.length} views`);for(let t=0;t<e.views.length;t++){let a=e.views[t];k=`xr:frame:${$}:getViewSubImage(eye=${t})`;let o=Or,s=o.getViewSubImage?o.getViewSubImage(kr,a):o.getSubImage(kr,a);if(!s){A(`xr:frame`,Error(`subImage null for eye ${t}`));continue}n&&t===0&&j(`xr:frame`,`subImage`,{viewport:s.viewport,colorFormat:s.colorTexture.format,hasDepth:!!s.depthStencilTexture}),k=`xr:frame:${$}:createView(color,eye=${t})`;let c=s.getViewDescriptor?s.getViewDescriptor():{},l=s.colorTexture.createView(c);k=`xr:frame:${$}:createView(depth,eye=${t})`;let u=(kr.textureArrayLength??1)>1,d=s.depthStencilTexture;St=d&&u?d.createView(c):null;let f=a.transform.position;xt={viewMatrix:new Float32Array(a.transform.inverse.matrix),projMatrix:new Float32Array(a.projectionMatrix),eye:[f.x,f.y,f.z]};let{x:p,y:m,width:h,height:g}=s.viewport;k=`xr:frame:${$}:ensureHdrTargets(${h}x${g})`,Et(h,g),H.needsClear=!0;let _=H.sceneIdx;k=`xr:frame:${$}:sim.render(${I.mode},eye=${t})`;let v=H.scene[_].createView();r.render(i,v,null,t),Vr||=(Hr=W.createBuffer({label:`xr-widgets-camera`,size:R*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),ye(W,Hr,()=>jt(h/g))),k=`xr:frame:${$}:xr-widgets(eye=${t})`,Vr.draw(i,v,H.scene[_].format,t,zr),k=`xr:frame:${$}:bloom(eye=${t})`,na(i),k=`xr:frame:${$}:composite(eye=${t})`;let y=s.colorTexture.format;ra(i,l,y,[p,m,h,g])}k=`xr:frame:${$}:submit`,W.queue.submit([i.finish()]),n&&j(`xr:frame`,`frame #${$} submitted OK`)}catch(e){A(`xr:frame`,e,`frame #${$} threw synchronously`)}finally{xt=null,St=null,W.popErrorScope().then(e=>{e&&A(`xr:frame:validation`,e,`frame #${$}`)}).catch(e=>A(`xr:frame:popScope`,e)),$++}}var Fi=0,Ii=0,Li=0,Ri=-1,zi=0,Bi={compute:0,render:0,post:0},Vi=!1,Hi=0,Ui=2e3,Wi=6,Gi=null;function Ki(){W.features.has(`timestamp-query`)&&(Gi={querySet:W.createQuerySet({type:`timestamp`,count:Wi}),resolveBuf:W.createBuffer({size:Wi*8,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),stagingBuf:W.createBuffer({size:Wi*8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),pending:!1})}function qi(e){if(Gi)return{querySet:Gi.querySet,beginningOfPassWriteIndex:e*2,endOfPassWriteIndex:e*2+1}}function Ji(e,t){if(!Gi||Gi.pending||t-Hi<Ui)return;Hi=t,e.resolveQuerySet(Gi.querySet,0,Wi,Gi.resolveBuf,0),e.copyBufferToBuffer(Gi.resolveBuf,0,Gi.stagingBuf,0,Wi*8),Gi.pending=!0;let n=Gi;W.queue.onSubmittedWorkDone().then(()=>{n.stagingBuf.mapAsync(GPUMapMode.READ).then(()=>{let e=new BigUint64Array(n.stagingBuf.getMappedRange().slice(0));n.stagingBuf.unmap(),n.pending=!1;let t=(e,t)=>Number(t-e)/1e6;Bi={compute:t(e[0],e[1]),render:t(e[2],e[3]),post:t(e[4],e[5])},zi=t(e[0],e[5])}).catch(()=>{n.pending=!1})})}function Yi(e){if(Gi||Vi||e-Hi<Ui)return;Hi=e,Vi=!0;let t=performance.now();W.queue.onSubmittedWorkDone().then(()=>{zi=performance.now()-t,Vi=!1}).catch(()=>{Vi=!1})}function Xi(e,t){console.error(`[sim:${e}]`,t);let n=document.getElementById(`gpu-error-overlay`);n||(n=document.createElement(`div`),n.id=`gpu-error-overlay`,n.style.cssText=`position:fixed;top:60px;left:10px;right:10px;max-height:60vh;overflow:auto;background:rgba(20,0,0,0.92);color:#ff8080;font:11px monospace;padding:10px;border:1px solid #ff4040;border-radius:4px;z-index:9999;white-space:pre-wrap;`,document.body.appendChild(n));let r=new Date().toLocaleTimeString();n.textContent=`[${r}] [sim:${e}] ${t}\n\n`+n.textContent}function Zi(){let e=I.mode;if(K[e])return;let t={boids:Gt,physics:Kt,physics_classic:qt,fluid:Jt,parametric:Yt,reaction:Xt};W.pushErrorScope(`validation`),W.pushErrorScope(`internal`),W.pushErrorScope(`out-of-memory`);let n=null;try{n=t[e]()}catch(t){Xi(e,`factory threw: ${t.message}`)}let r=n,i=e,a=e=>{if(Xi(i,e),r&&K[i]===r){try{r.destroy()}catch{}delete K[i]}};W.popErrorScope().then(e=>{e&&a(`OOM: ${e.message}`)}),W.popErrorScope().then(e=>{e&&a(`internal: ${e.message}`)}),W.popErrorScope().then(e=>{e&&a(`validation: ${e.message}`)}),n&&(K[e]=n)}function Qi(){let e=I.mode;K[e]&&(K[e].destroy(),delete K[e]),Zi()}function $i(){let e=Li>0?(1e3/Li).toFixed(1):`--`,t=Bi,n=t.compute>0?` (C:${t.compute.toFixed(1)} R:${t.render.toFixed(1)} P:${t.post.toFixed(1)})`:zi>0?` gpu:${zi.toFixed(1)}ms`:``;document.getElementById(`stat-fps`).textContent=`${Li} fps ${e}ms${n}`;let r=K[I.mode],i=r?r.getCount():`--`;document.getElementById(`stat-count`).textContent=I.mode===`fluid`||I.mode===`reaction`?`Grid: ${i}`:`Particles: ${i}`;let a=document.getElementById(`stat-step`);if(a)if(I.mode===`physics`&&r&&`getSimStep`in r){let e=r.getSimStep(),t=r.getTimeDirection();a.style.display=``,a.textContent=`Step: ${e} ${t<0?`◀`:`▶`}`}else a.style.display=`none`}function ea(){let e=document.getElementById(`canvas-container`),t=window.devicePixelRatio||1,n=Math.floor(e.clientWidth*t),r=Math.floor(e.clientHeight*t);(G.width!==n||G.height!==r)&&(G.width=n,G.height=r),Et(G.width,G.height)}function ta(e,t,n){if(H.needsClear)return;let r=I.fx.trailPersistence;if(r<.001)return;H.fadeParams[0]=r,W.queue.writeBuffer(H.fadeUBO,0,H.fadeParams);let i=e.beginRenderPass({colorAttachments:[{view:H.sceneViews[n],clearValue:Ve,loadOp:`clear`,storeOp:`store`}]});i.setPipeline(H.fadePipeline),i.setBindGroup(0,H.fadeBGs[t]),i.draw(3),i.end()}function na(e){let t=I.fx,n=H.sceneIdx;for(let r=0;r<wt;r++){let i=r===0?H.scene[n]:H.bloomMips[r-1],a=H.downsampleParams[r];a[0]=1/i.width,a[1]=1/i.height,a[2]=t.bloomThreshold,a[3]=r===0?1:0,W.queue.writeBuffer(H.downsampleUBO[r],0,a);let o=H.downsampleBGs[r===0?n:r+1],s=e.beginRenderPass({colorAttachments:[{view:H.bloomMipViews[r],clearValue:{r:0,g:0,b:0,a:1},loadOp:`clear`,storeOp:`store`}]});s.setPipeline(H.downsamplePipeline),s.setBindGroup(0,o),s.draw(3),s.end()}for(let n=wt-1;n>0;n--){let r=H.bloomMips[n],i=H.upsampleParams[n];i[0]=1/r.width,i[1]=1/r.height,i[2]=t.bloomRadius,W.queue.writeBuffer(H.upsampleUBO[n],0,i);let a=e.beginRenderPass({colorAttachments:[{view:H.bloomMipViews[n-1],clearValue:{r:0,g:0,b:0,a:1},loadOp:`load`,storeOp:`store`}]});a.setPipeline(H.upsamplePipelineAdditive),a.setBindGroup(0,H.upsampleBGs[n]),a.draw(3),a.end()}}function ra(e,t,n,r=null){let i=I.fx,a=Je(),o=H.compositeParams,s=new Uint32Array(o.buffer);o[0]=i.bloomIntensity,o[1]=i.exposure,o[2]=i.vignette,o[3]=i.chromaticAberration,o[4]=i.grading;let c=r?r[2]/r[3]:G.width/G.height,l=I.camera.fov*Math.PI/180,u=bt(),d=xt?xt.viewMatrix:u.view,f=xt?xt.projMatrix:z.perspective(l,c,.01,ht),p=performance.now()*.001,m=Math.max(0,it()-(at()>0?1:0)),h=I.physics.interactionStrength??1,g=I.attractors,_=Math.min(g.length,tt);s[5]=_,o[6]=0,o[7]=0,o[8]=a.primary[0],o[9]=a.primary[1],o[10]=a.primary[2],o[12]=a.accent[0],o[13]=a.accent[1],o[14]=a.accent[2],o[16]=p;for(let e=0;e<_;e++){let t=g[e],n=t.x,r=t.y,i=t.z,a=d[0]*n+d[4]*r+d[8]*i+d[12],s=d[1]*n+d[5]*r+d[9]*i+d[13],c=d[2]*n+d[6]*r+d[10]*i+d[14],l=d[3]*n+d[7]*r+d[11]*i+d[15],u=f[0]*a+f[4]*s+f[8]*c+f[12]*l,p=f[1]*a+f[5]*s+f[9]*c+f[13]*l,_=f[3]*a+f[7]*s+f[11]*c+f[15]*l,v=_===0?0:u/_,y=_===0?0:p/_,b=20+e*4;o[b]=v*.5+.5,o[b+1]=1-(y*.5+.5),o[b+2]=st(t,m,h),o[b+3]=0}for(let e=_;e<tt;e++){let t=20+e*4;o[t]=0,o[t+1]=0,o[t+2]=0,o[t+3]=0}W.queue.writeBuffer(H.compositeUBO,0,o);let v=Tt(n),y=H.compositeBGs[H.sceneIdx],b=qi(2),x=e.beginRenderPass({colorAttachments:[{view:t,clearValue:{r:0,g:0,b:0,a:1},loadOp:`clear`,storeOp:`store`}],...b?{timestampWrites:b}:{}});x.setPipeline(v),x.setBindGroup(0,y),r&&x.setViewport(r[0],r[1],r[2],r[3],0,1),x.draw(3),x.end()}function ia(e){if(I.xrEnabled)return;requestAnimationFrame(ia),Ri>=0&&wn(e-Ri),Ri=e,Ye(e),ea(),lt(it()),Fi++,e-Ii>=1e3&&(Li=Fi,Fi=0,Ii=e,$i());let t=K[I.mode];if(!t)return;let n=I.mode;try{let n=W.createCommandEncoder();En(t,n),kn();let r=H.sceneIdx,i=1-r;H.sceneIdx=i,ta(n,r,i),t.render(n,H.sceneViews[i],null),na(n),ra(n,Mt.getCurrentTexture().createView(),Nt),Ji(n,e),W.queue.submit([n.finish()]),Yi(e),H.needsClear=!1}catch(e){if(Xi(n,`frame threw: ${e.message}`),K[n]===t){try{t.destroy()}catch{}delete K[n]}}}var aa=`shader-playground-state`;function oa(){try{let e={};for(let t of Object.keys(N))e[t]=F(t);let t={mode:I.mode,colorTheme:I.colorTheme,camera:I.camera,fx:I.fx,debug:I.debug,...e};localStorage.setItem(aa,JSON.stringify(t))}catch{}}function sa(){try{let e=localStorage.getItem(aa);if(!e)return;let t=JSON.parse(e);t.mode&&t.mode in N&&(I.mode=t.mode),t.colorTheme&&Re[t.colorTheme]&&(I.colorTheme=t.colorTheme);for(let e of Object.keys(N))t[e]&&Object.assign(F(e),t[e]);t.camera&&Object.assign(I.camera,t.camera),t.fx&&Object.assign(I.fx,t.fx),t.debug&&Object.assign(I.debug,t.debug),Xe(I.colorTheme)}catch{}}function ca(){document.querySelectorAll(`.mode-tab`).forEach(e=>e.classList.toggle(`active`,e.dataset.mode===I.mode)),document.querySelectorAll(`.param-group`).forEach(e=>e.classList.toggle(`active`,e.dataset.mode===I.mode)),document.querySelectorAll(`.debug-panel`).forEach(e=>e.classList.toggle(`active`,e.dataset.mode===I.mode));for(let e of Object.keys(Le)){let t=e,n=document.getElementById(`params-${t}`),r=F(t);n.querySelectorAll(`input[type="range"]`).forEach(e=>{let n=e.dataset.key;if(n&&n in r){let i=un(t,n),a=Number(r[n]);e.value=i?.logScale&&i.min!==void 0&&i.max!==void 0?String(sn(a,i.min,i.max)):String(r[n]);let o=e.parentElement?.querySelector(`.control-value`);o&&(o.textContent=an(a,i))}}),n.querySelectorAll(`select`).forEach(e=>{let t=e.dataset.key;t&&t in r&&(e.value=String(r[t]))})}document.querySelectorAll(`#theme-presets .preset-btn`).forEach(e=>e.classList.toggle(`active`,e.dataset.theme===I.colorTheme));let e=document.getElementById(`toggle-xr-log`);e&&(e.checked=I.debug.xrLog),ii(I.debug.xrLog),nn()}function la(){for(let e of Object.keys(Le))for(let t of Le[e])if(!t.dynamic)for(let n of t.params)n.type===`dropdown`?r.register({kind:`enum`,id:`${e}.${n.key}`,label:n.label,group:e,get:()=>String(F(e)[n.key]),set:t=>{let r=F(e),i=r[n.key];r[n.key]=typeof i==`number`?Number(t):t},options:(n.options??[]).map(e=>({value:String(e),label:String(e)}))}):n.min!==void 0&&n.max!==void 0&&r.register({kind:`continuous`,id:`${e}.${n.key}`,label:n.label,group:e,get:()=>Number(F(e)[n.key]),set:t=>{F(e)[n.key]=t},range:{min:n.min,max:n.max},step:n.step,scale:n.logScale?`log`:`linear`});for(let e of Object.keys(Ie))for(let t of Object.keys(Ie[e]))r.register({kind:`action`,id:`preset.${e}.${t}`,label:t,group:`presets`,invoke:()=>ln(e,t)});r.register({kind:`enum`,id:`app.mode`,label:`Mode`,group:`app`,get:()=>I.mode,set:e=>fn(e),options:Object.keys(dn).map(e=>({value:e,label:dn[e]}))}),r.register({kind:`enum`,id:`app.theme`,label:`Theme`,group:`app`,get:()=>I.colorTheme,set:e=>{I.colorTheme=e,Ze(e)},options:Object.keys(Re).map(e=>({value:e,label:e}))}),r.register({kind:`toggle`,id:`app.paused`,label:`Pause`,group:`app`,get:()=>I.paused,set:e=>{I.paused=e,mn()}})}async function ua(){t(),await It()&&(Hn=Vn.matches,document.body.classList.toggle(`mobile`,Hn),Vn.addEventListener(`change`,e=>{let t=e.matches;t!==Hn&&(Hn=t,document.body.classList.toggle(`mobile`,Hn),window.location.reload())}),Ut(),sa(),Hn&&Kn(),Xe(I.colorTheme),la(),$t(),An(),pn(),hn(),Hn?(Un(),Wn(),Gn()):Bn(),tr(),_n(),On(),ca(),ea(),Zi(),Xn(),new ResizeObserver(()=>ea()).observe(document.getElementById(`canvas-container`)),requestAnimationFrame(ia),window.__simDiagnose=()=>{let e=K[I.mode];return e?.diagnose?e.diagnose():Promise.resolve({error:1,msg:`no diagnose on this sim`})},window.__simPreset=e=>{let t=document.querySelectorAll(`button`);for(let n of t)if(n.textContent?.trim()===e)return n.click(),`ok`;return`preset not found`},window.__simState=()=>({mode:I.mode,...I[I.mode],fps:Li,gpuMs:zi,gpuDetail:Bi}),window.__pmDumpDensity=()=>{let e=K[I.mode];return e?.dumpDensity?e.dumpDensity():Promise.resolve(null)},window.__pmDumpPotential=()=>{let e=K[I.mode];return e?.dumpPotential?e.dumpPotential():Promise.resolve(null)},window.__pmMaxResidual=()=>{let e=K[I.mode];return e?.maxResidual?e.maxResidual():Promise.resolve(null)},window.__pmReversibilityTest=(e=1e3)=>{let t=K[I.mode];return t?.reversibilityTest?t.reversibilityTest(e):Promise.resolve(null)},window.__bindings=r,window.__anchors={evaluateAnchor:o,handFrames:Q},window.__xrUi={layout:_,hitTestWidgets:T,step:te,applyEffects:re,registry:Lr,makeIdlePrev:D,getRenderList:()=>zr,getPrev:()=>Rr,getClaimed:()=>({...Br})},window.__simStats=()=>{let e=K[I.mode];return{...e?.getStats?e.getStats():{error:`no stats on this sim`},gpuMs:zi,gpuDetail:Bi}})}ua();