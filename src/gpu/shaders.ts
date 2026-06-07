import type { SimMode } from '../types';

import SHADER_BOIDS_COMPUTE from '../shaders/boids.compute.wgsl?raw';
import SHADER_BOIDS_RENDER from '../shaders/boids.render.wgsl?raw';
import SHADER_NBODY_COMPUTE from '../shaders/nbody.compute.wgsl?raw';
import SHADER_NBODY_STATS from '../shaders/nbody.stats.wgsl?raw';
import SHADER_NBODY_RENDER from '../shaders/nbody.render.wgsl?raw';
import SHADER_MARKERS_RENDER from '../shaders/markers.render.wgsl?raw';
import SHADER_NBODY_CLASSIC_COMPUTE from '../shaders/nbody.classic.compute.wgsl?raw';
import SHADER_PM_DEPOSIT from '../shaders/pm.deposit.wgsl?raw';
import SHADER_PM_DENSITY_CONVERT from '../shaders/pm.density_convert.wgsl?raw';
import SHADER_PM_SMOOTH from '../shaders/pm.smooth.wgsl?raw';
import SHADER_PM_RESIDUAL from '../shaders/pm.residual.wgsl?raw';
import SHADER_PM_RESTRICT from '../shaders/pm.restrict.wgsl?raw';
import SHADER_PM_PROLONG from '../shaders/pm.prolong.wgsl?raw';
import SHADER_PM_INTERPOLATE from '../shaders/pm.interpolate.wgsl?raw';
import SHADER_NBODY_CLASSIC_RENDER from '../shaders/nbody.classic.render.wgsl?raw';
import SHADER_FLUID_FORCES_ADVECT from '../shaders/fluid.forces.wgsl?raw';
import SHADER_FLUID_DIFFUSE from '../shaders/fluid.diffuse.wgsl?raw';
import SHADER_FLUID_PRESSURE from '../shaders/fluid.pressure.wgsl?raw';
import SHADER_FLUID_DIVERGENCE from '../shaders/fluid.divergence.wgsl?raw';
import SHADER_FLUID_GRADIENT from '../shaders/fluid.gradient.wgsl?raw';
import SHADER_FLUID_RENDER from '../shaders/fluid.render.wgsl?raw';
import SHADER_PARAMETRIC_COMPUTE from '../shaders/parametric.compute.wgsl?raw';
import SHADER_PARAMETRIC_RENDER from '../shaders/parametric.render.wgsl?raw';
import SHADER_REACTION_COMPUTE from '../shaders/reaction.compute.wgsl?raw';
import SHADER_REACTION_RENDER from '../shaders/reaction.render.wgsl?raw';
import SHADER_GRID from '../shaders/grid.wgsl?raw';
import SHADER_POST_FADE from '../shaders/post.fade.wgsl?raw';
import SHADER_POST_DOWNSAMPLE from '../shaders/post.downsample.wgsl?raw';
import SHADER_POST_UPSAMPLE from '../shaders/post.upsample.wgsl?raw';
import SHADER_POST_COMPOSITE from '../shaders/post.composite.wgsl?raw';

export type ShaderId =
  | 'boids.compute' | 'boids.render'
  | 'nbody.compute' | 'nbody.stats' | 'nbody.render' | 'markers.render'
  | 'nbody.classic.compute' | 'nbody.classic.render'
  | 'pm.deposit' | 'pm.density_convert' | 'pm.smooth' | 'pm.residual' | 'pm.restrict' | 'pm.prolong' | 'pm.interpolate'
  | 'fluid.forces' | 'fluid.diffuse' | 'fluid.pressure' | 'fluid.divergence' | 'fluid.gradient' | 'fluid.render'
  | 'parametric.compute' | 'parametric.render'
  | 'reaction.compute' | 'reaction.render'
  | 'grid'
  | 'post.fade' | 'post.downsample' | 'post.upsample' | 'post.composite';

const originals: Record<ShaderId, string> = {
  'boids.compute': SHADER_BOIDS_COMPUTE,
  'boids.render': SHADER_BOIDS_RENDER,
  'nbody.compute': SHADER_NBODY_COMPUTE,
  'nbody.stats': SHADER_NBODY_STATS,
  'nbody.render': SHADER_NBODY_RENDER,
  'markers.render': SHADER_MARKERS_RENDER,
  'nbody.classic.compute': SHADER_NBODY_CLASSIC_COMPUTE,
  'nbody.classic.render': SHADER_NBODY_CLASSIC_RENDER,
  'pm.deposit': SHADER_PM_DEPOSIT,
  'pm.density_convert': SHADER_PM_DENSITY_CONVERT,
  'pm.smooth': SHADER_PM_SMOOTH,
  'pm.residual': SHADER_PM_RESIDUAL,
  'pm.restrict': SHADER_PM_RESTRICT,
  'pm.prolong': SHADER_PM_PROLONG,
  'pm.interpolate': SHADER_PM_INTERPOLATE,
  'fluid.forces': SHADER_FLUID_FORCES_ADVECT,
  'fluid.diffuse': SHADER_FLUID_DIFFUSE,
  'fluid.pressure': SHADER_FLUID_PRESSURE,
  'fluid.divergence': SHADER_FLUID_DIVERGENCE,
  'fluid.gradient': SHADER_FLUID_GRADIENT,
  'fluid.render': SHADER_FLUID_RENDER,
  'parametric.compute': SHADER_PARAMETRIC_COMPUTE,
  'parametric.render': SHADER_PARAMETRIC_RENDER,
  'reaction.compute': SHADER_REACTION_COMPUTE,
  'reaction.render': SHADER_REACTION_RENDER,
  grid: SHADER_GRID,
  'post.fade': SHADER_POST_FADE,
  'post.downsample': SHADER_POST_DOWNSAMPLE,
  'post.upsample': SHADER_POST_UPSAMPLE,
  'post.composite': SHADER_POST_COMPOSITE,
};

const edits = new Map<ShaderId, string>();

const modeTabs: Record<SimMode, Record<string, ShaderId>> = {
  boids: {
    'Compute (Flocking)': 'boids.compute',
    'Render (Vert+Frag)': 'boids.render',
  },
  physics: {
    'Compute (Gravity)': 'nbody.compute',
    'Render (Vert+Frag)': 'nbody.render',
  },
  physics_classic: {
    'Compute (Classic)': 'nbody.classic.compute',
    'Render (Classic)': 'nbody.classic.render',
  },
  fluid: {
    'Forces + Advect': 'fluid.forces',
    Diffuse: 'fluid.diffuse',
    Divergence: 'fluid.divergence',
    'Pressure Solve': 'fluid.pressure',
    'Gradient Sub': 'fluid.gradient',
    Render: 'fluid.render',
  },
  parametric: {
    'Compute (All Shapes)': 'parametric.compute',
    'Render (Phong)': 'parametric.render',
  },
  reaction: {
    'Compute (Gray-Scott)': 'reaction.compute',
    'Render (Raymarch)': 'reaction.render',
  },
};

// [LAW:one-source-of-truth] Shader originals and live edits are owned here; render/sim/UI callers request sources by id.
export function shaderSource(id: ShaderId): string {
  return edits.get(id) ?? originals[id];
}

export function getShaderSources(mode: SimMode): Record<string, string> {
  const tabs = modeTabs[mode];
  return Object.fromEntries(Object.entries(tabs).map(([label, id]) => [label, shaderSource(id)]));
}

export function applyShaderEdit(mode: SimMode, tabName: string, code: string): void {
  const id = modeTabs[mode][tabName];
  if (id) edits.set(id, code);
}

export function resetShaderEdit(mode: SimMode, tabName: string): string | null {
  const id = modeTabs[mode][tabName];
  if (!id) return null;
  edits.delete(id);
  return originals[id];
}
