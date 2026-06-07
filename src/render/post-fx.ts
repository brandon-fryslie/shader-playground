import type { DepthRef, FxParams, RGBThemeColors } from '../types';

import SHADER_POST_COMPOSITE from '../shaders/post.composite.wgsl?raw';
import SHADER_POST_DOWNSAMPLE from '../shaders/post.downsample.wgsl?raw';
import SHADER_POST_FADE from '../shaders/post.fade.wgsl?raw';
import SHADER_POST_UPSAMPLE from '../shaders/post.upsample.wgsl?raw';

type ShaderFactory = (label: string, source: string) => GPUShaderModule;
type PostFxState = {
  scene: GPUTexture[];
  sceneIdx: number;
  depth: GPUTexture | null;
  nullColor: GPUTexture | null;
  nullDepth: GPUTexture | null;
  nullColorView: GPUTextureView | null;
  nullDepthView: GPUTextureView | null;
  bloomMips: GPUTexture[];
  width: number;
  height: number;
  needsClear: boolean;
  linSampler: GPUSampler | null;
  fadePipeline: GPURenderPipeline | null;
  downsamplePipeline: GPURenderPipeline | null;
  upsamplePipelineAdditive: GPURenderPipeline | null;
  upsamplePipelineReplace: GPURenderPipeline | null;
  compositePipelines: Map<string, GPURenderPipeline>;
  fadeBGL: GPUBindGroupLayout | null;
  downsampleBGL: GPUBindGroupLayout | null;
  upsampleBGL: GPUBindGroupLayout | null;
  compositeBGL: GPUBindGroupLayout | null;
  fadeUBO: GPUBuffer | null;
  downsampleUBO: GPUBuffer[];
  upsampleUBO: GPUBuffer[];
  compositeUBO: GPUBuffer | null;
  sceneViews: GPUTextureView[];
  bloomMipViews: GPUTextureView[];
  fadeBGs: GPUBindGroup[];
  downsampleBGs: GPUBindGroup[];
  upsampleBGs: GPUBindGroup[];
  fadeParams: Float32Array<ArrayBuffer>;
  downsampleParams: Float32Array<ArrayBuffer>[];
  upsampleParams: Float32Array<ArrayBuffer>[];
  compositeParams: Float32Array<ArrayBuffer>;
  compositeBGs: GPUBindGroup[];
};

export interface PostFxServiceDependencies {
  createShaderModuleChecked: ShaderFactory;
  device: GPUDevice;
  renderSampleCount: number;
}

export interface PostFxService {
  ensureHdrTargets(width: number, height: number): void;
  getColorAttachment(
    _simDepthRef: DepthRef,
    _resolveTarget: GPUTextureView,
    _viewport: number[] | null,
    trailPersistence: number,
    clearColor: GPUColor,
  ): GPURenderPassColorAttachment;
  getCurrentSceneView(): GPUTextureView;
  getDepthAttachment(_simDepthRef: DepthRef, _viewport: number[] | null, xrDepthOverride: GPUTextureView | null): GPURenderPassDepthStencilAttachment;
  getDepthView(): GPUTextureView;
  getNullColorView(): GPUTextureView;
  getNullDepthView(): GPUTextureView;
  getSceneFormat(index: number): GPUTextureFormat;
  getSceneIndex(): number;
  getSceneView(index: number): GPUTextureView;
  init(): void;
  markNeedsClear(): void;
  runBloomChain(
    encoder: GPUCommandEncoder,
    fx: FxParams,
    timingWritesBegin?: GPURenderPassTimestampWrites,
  ): void;
  runComposite(
    encoder: GPUCommandEncoder,
    finalView: GPUTextureView,
    finalFormat: GPUTextureFormat,
    viewport: number[] | null,
    fx: FxParams,
    themeColors: RGBThemeColors,
    timingWritesEnd?: GPURenderPassTimestampWrites,
  ): void;
  runFadePass(
    encoder: GPUCommandEncoder,
    prevSceneIdx: number,
    currSceneIdx: number,
    trailPersistence: number,
    clearColor: GPUColor,
  ): void;
  setSceneIndex(index: number): void;
}

const HDR_FORMAT: GPUTextureFormat = 'rgba16float';
const BLOOM_LEVELS = 3;

export function createPostFxService(deps: PostFxServiceDependencies): PostFxService {
  const state: PostFxState = {
    scene: [],
    sceneIdx: 0,
    depth: null,
    nullColor: null,
    nullDepth: null,
    nullColorView: null,
    nullDepthView: null,
    bloomMips: [],
    width: 0,
    height: 0,
    needsClear: true,
    linSampler: null,
    fadePipeline: null,
    downsamplePipeline: null,
    upsamplePipelineAdditive: null,
    upsamplePipelineReplace: null,
    compositePipelines: new Map(),
    fadeBGL: null,
    downsampleBGL: null,
    upsampleBGL: null,
    compositeBGL: null,
    fadeUBO: null,
    downsampleUBO: [],
    upsampleUBO: [],
    compositeUBO: null,
    sceneViews: [],
    bloomMipViews: [],
    fadeBGs: [],
    downsampleBGs: [],
    upsampleBGs: [],
    fadeParams: new Float32Array(4),
    downsampleParams: [],
    upsampleParams: [],
    compositeParams: new Float32Array(16),
    compositeBGs: [],
  };

  function ensureCompositePipeline(format: GPUTextureFormat): GPURenderPipeline {
    let p = state.compositePipelines.get(format);
    if (p) return p;
    const mod = deps.createShaderModuleChecked('post.composite', SHADER_POST_COMPOSITE);
    p = deps.device.createRenderPipeline({
      layout: deps.device.createPipelineLayout({ bindGroupLayouts: [state.compositeBGL!] }),
      vertex: { module: mod, entryPoint: 'vs_main' },
      fragment: { module: mod, entryPoint: 'fs_main', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });
    state.compositePipelines.set(format, p);
    return p;
  }

  return {
    init() {
      // [LAW:dataflow-not-control-flow] Hidden optional render layers still
      // encode their pass; the null attachments make that path data-selected.
      state.nullColor = deps.device.createTexture({
        size: [1, 1],
        format: HDR_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      state.nullDepth = deps.device.createTexture({
        size: [1, 1],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      state.nullColorView = state.nullColor.createView();
      state.nullDepthView = state.nullDepth.createView();

      state.linSampler = deps.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
      });

      state.fadeBGL = deps.device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ]});
      state.downsampleBGL = deps.device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ]});
      state.upsampleBGL = deps.device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ]});
      state.compositeBGL = deps.device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ]});

      const fadeMod = deps.createShaderModuleChecked('post.fade', SHADER_POST_FADE);
      const downMod = deps.createShaderModuleChecked('post.downsample', SHADER_POST_DOWNSAMPLE);
      const upMod = deps.createShaderModuleChecked('post.upsample', SHADER_POST_UPSAMPLE);

      state.fadePipeline = deps.device.createRenderPipeline({
        layout: deps.device.createPipelineLayout({ bindGroupLayouts: [state.fadeBGL] }),
        vertex: { module: fadeMod, entryPoint: 'vs_main' },
        fragment: { module: fadeMod, entryPoint: 'fs_main', targets: [{ format: HDR_FORMAT }] },
        primitive: { topology: 'triangle-list' },
      });
      state.downsamplePipeline = deps.device.createRenderPipeline({
        layout: deps.device.createPipelineLayout({ bindGroupLayouts: [state.downsampleBGL] }),
        vertex: { module: downMod, entryPoint: 'vs_main' },
        fragment: { module: downMod, entryPoint: 'fs_main', targets: [{ format: HDR_FORMAT }] },
        primitive: { topology: 'triangle-list' },
      });
      state.upsamplePipelineAdditive = deps.device.createRenderPipeline({
        layout: deps.device.createPipelineLayout({ bindGroupLayouts: [state.upsampleBGL] }),
        vertex: { module: upMod, entryPoint: 'vs_main' },
        fragment: {
          module: upMod,
          entryPoint: 'fs_main',
          targets: [{
            format: HDR_FORMAT,
            blend: {
              color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
            },
          }],
        },
        primitive: { topology: 'triangle-list' },
      });
      state.upsamplePipelineReplace = deps.device.createRenderPipeline({
        layout: deps.device.createPipelineLayout({ bindGroupLayouts: [state.upsampleBGL] }),
        vertex: { module: upMod, entryPoint: 'vs_main' },
        fragment: { module: upMod, entryPoint: 'fs_main', targets: [{ format: HDR_FORMAT }] },
        primitive: { topology: 'triangle-list' },
      });

      state.fadeUBO = deps.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      state.downsampleUBO = [];
      state.upsampleUBO = [];
      for (let i = 0; i < BLOOM_LEVELS; i++) {
        state.downsampleUBO.push(deps.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }));
        state.upsampleUBO.push(deps.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }));
      }
      state.compositeUBO = deps.device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      state.fadeParams = new Float32Array(4);
      state.compositeParams = new Float32Array(16);
      state.downsampleParams = [];
      state.upsampleParams = [];
      for (let i = 0; i < BLOOM_LEVELS; i++) {
        state.downsampleParams.push(new Float32Array(4));
        state.upsampleParams.push(new Float32Array(4));
      }
    },
    ensureHdrTargets(width, height) {
      if (state.width === width && state.height === height && state.scene.length === 2) return;
      for (const t of state.scene) t.destroy();
      for (const t of state.bloomMips) t.destroy();
      state.depth?.destroy();
      state.scene = [];
      state.bloomMips = [];

      state.width = width;
      state.height = height;
      for (let i = 0; i < 2; i++) {
        state.scene.push(deps.device.createTexture({
          size: [width, height],
          format: HDR_FORMAT,
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        }));
      }
      state.depth = deps.device.createTexture({
        size: [width, height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      let w = Math.max(1, Math.floor(width / 2));
      let h = Math.max(1, Math.floor(height / 2));
      for (let i = 0; i < BLOOM_LEVELS; i++) {
        state.bloomMips.push(deps.device.createTexture({
          size: [w, h],
          format: HDR_FORMAT,
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        }));
        w = Math.max(1, Math.floor(w / 2));
        h = Math.max(1, Math.floor(h / 2));
      }
      state.needsClear = true;
      state.sceneViews = state.scene.map((t) => t.createView());
      state.bloomMipViews = state.bloomMips.map((t) => t.createView());
      state.fadeBGs = state.sceneViews.map((view) => deps.device.createBindGroup({
        layout: state.fadeBGL!,
        entries: [
          { binding: 0, resource: view },
          { binding: 1, resource: state.linSampler! },
          { binding: 2, resource: { buffer: state.fadeUBO! } },
        ],
      }));
      state.downsampleBGs = [];
      for (let s = 0; s < 2; s++) {
        state.downsampleBGs.push(deps.device.createBindGroup({
          layout: state.downsampleBGL!,
          entries: [
            { binding: 0, resource: state.sceneViews[s] },
            { binding: 1, resource: state.linSampler! },
            { binding: 2, resource: { buffer: state.downsampleUBO[0] } },
          ],
        }));
      }
      for (let i = 1; i < BLOOM_LEVELS; i++) {
        state.downsampleBGs.push(deps.device.createBindGroup({
          layout: state.downsampleBGL!,
          entries: [
            { binding: 0, resource: state.bloomMipViews[i - 1] },
            { binding: 1, resource: state.linSampler! },
            { binding: 2, resource: { buffer: state.downsampleUBO[i] } },
          ],
        }));
      }
      state.upsampleBGs = state.bloomMipViews.map((view, i) => deps.device.createBindGroup({
        layout: state.upsampleBGL!,
        entries: [
          { binding: 0, resource: view },
          { binding: 1, resource: state.linSampler! },
          { binding: 2, resource: { buffer: state.upsampleUBO[i] } },
        ],
      }));
      state.compositeBGs = state.sceneViews.map((sceneView) => deps.device.createBindGroup({
        layout: state.compositeBGL!,
        entries: [
          { binding: 0, resource: sceneView },
          { binding: 1, resource: state.bloomMipViews[0] },
          { binding: 2, resource: state.linSampler! },
          { binding: 3, resource: { buffer: state.compositeUBO! } },
        ],
      }));
    },
    markNeedsClear() {
      state.needsClear = true;
    },
    getSceneIndex() {
      return state.sceneIdx;
    },
    setSceneIndex(index) {
      state.sceneIdx = index;
    },
    getSceneView(index) {
      return state.sceneViews[index];
    },
    getSceneFormat(index) {
      return state.scene[index].format;
    },
    getCurrentSceneView() {
      return state.scene[state.sceneIdx].createView();
    },
    getColorAttachment(_simDepthRef, _resolveTarget, _viewport, trailPersistence, clearColor) {
      const trails = trailPersistence > 0.001;
      const useLoad = trails && !state.needsClear;
      return {
        view: this.getCurrentSceneView(),
        clearValue: clearColor,
        loadOp: useLoad ? 'load' : 'clear',
        storeOp: 'store',
      };
    },
    getDepthAttachment(_simDepthRef, _viewport, xrDepthOverride) {
      return {
        view: xrDepthOverride ?? state.depth!.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      };
    },
    getDepthView() {
      return state.depth!.createView();
    },
    getNullColorView() {
      return state.nullColorView!;
    },
    getNullDepthView() {
      return state.nullDepthView!;
    },
    runFadePass(encoder, prevSceneIdx, currSceneIdx, trailPersistence, clearColor) {
      if (state.needsClear) return;
      if (trailPersistence < 0.001) return;
      state.fadeParams[0] = trailPersistence;
      deps.device.queue.writeBuffer(state.fadeUBO!, 0, state.fadeParams);
      const pass = encoder.beginRenderPass({ colorAttachments: [{
        view: state.sceneViews[currSceneIdx],
        clearValue: clearColor,
        loadOp: 'clear',
        storeOp: 'store',
      }]});
      pass.setPipeline(state.fadePipeline!);
      pass.setBindGroup(0, state.fadeBGs[prevSceneIdx]);
      pass.draw(3);
      pass.end();
    },
    runBloomChain(encoder, fx, timingWritesBegin) {
      const sceneIdx = state.sceneIdx;
      for (let i = 0; i < BLOOM_LEVELS; i++) {
        const src = i === 0 ? state.scene[sceneIdx] : state.bloomMips[i - 1];
        const p = state.downsampleParams[i];
        p[0] = 1.0 / src.width;
        p[1] = 1.0 / src.height;
        p[2] = fx.bloomThreshold;
        p[3] = i === 0 ? 1.0 : 0.0;
        deps.device.queue.writeBuffer(state.downsampleUBO[i], 0, p);
        const bg = state.downsampleBGs[i === 0 ? sceneIdx : i + 1];
        const pass = encoder.beginRenderPass({
          colorAttachments: [{
            view: state.bloomMipViews[i],
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          }],
          ...(timingWritesBegin && i === 0 ? { timestampWrites: timingWritesBegin } : {}),
        });
        pass.setPipeline(state.downsamplePipeline!);
        pass.setBindGroup(0, bg);
        pass.draw(3);
        pass.end();
      }
      for (let i = BLOOM_LEVELS - 1; i > 0; i--) {
        const src = state.bloomMips[i];
        const p = state.upsampleParams[i];
        p[0] = 1.0 / src.width;
        p[1] = 1.0 / src.height;
        p[2] = fx.bloomRadius;
        deps.device.queue.writeBuffer(state.upsampleUBO[i], 0, p);
        const pass = encoder.beginRenderPass({ colorAttachments: [{
          view: state.bloomMipViews[i - 1],
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'load',
          storeOp: 'store',
        }]});
        pass.setPipeline(state.upsamplePipelineAdditive!);
        pass.setBindGroup(0, state.upsampleBGs[i]);
        pass.draw(3);
        pass.end();
      }
    },
    runComposite(encoder, finalView, finalFormat, viewport, fx, themeColors, timingWritesEnd) {
      const buf = state.compositeParams;
      buf[0] = fx.bloomIntensity;
      buf[1] = fx.exposure;
      buf[2] = fx.vignette;
      buf[3] = fx.chromaticAberration;
      buf[4] = fx.grading;
      buf[8] = themeColors.primary[0];
      buf[9] = themeColors.primary[1];
      buf[10] = themeColors.primary[2];
      buf[12] = themeColors.accent[0];
      buf[13] = themeColors.accent[1];
      buf[14] = themeColors.accent[2];
      deps.device.queue.writeBuffer(state.compositeUBO!, 0, buf);
      const pipeline = ensureCompositePipeline(finalFormat);
      const bg = state.compositeBGs[state.sceneIdx];
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: finalView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
        ...(timingWritesEnd ? { timestampWrites: timingWritesEnd } : {}),
      });
      if (viewport) pass.setViewport(viewport[0], viewport[1], viewport[2], viewport[3], 0, 1);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bg);
      pass.draw(3);
      pass.end();
      state.needsClear = false;
    },
  };
}
