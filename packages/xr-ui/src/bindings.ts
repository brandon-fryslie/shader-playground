// Binding abstraction for the XR UI rewrite.
//
// A Binding is a uniform get/set window onto a piece of app state. Widgets
// reference a Binding by id; the Binding holds the closures that read/write
// the underlying field. This decouples controls from state shape so the same
// Widget type can drive any field of any module.
//
// [LAW:one-source-of-truth] Each Binding is a get/set window onto the ONE
// underlying state field. No mirrored copy, no staging value. The registry
// owns id→Binding and nothing else does.
//
// [LAW:one-type-per-behavior] A single ContinuousBinding/ToggleBinding/
// EnumBinding/ActionBinding type — closures capture per-instance differences.
// Do NOT subclass per state field (PhysicsGBinding, BoidsSpeedBinding, ...).
//
// [LAW:one-way-deps] This module imports nothing — it is pure type and class
// definitions. Project-specific bindings (physics/boids/theme fields) are
// registered by app code (src/app/bindings.ts) against a registry instance the
// composition root owns; bindings.ts never reaches back into the app.

export type Binding =
  | ContinuousBinding
  | ToggleBinding
  | EnumBinding
  | ActionBinding;

export interface BindingCommon {
  id: string;
  label: string;
  description?: string;
  group?: string;
}

export interface ContinuousBinding extends BindingCommon {
  kind: 'continuous';
  get: () => number;
  set: (v: number) => void;
  range: { min: number; max: number };
  step?: number;
  scale?: 'linear' | 'log' | 'pow2';
  format?: (v: number) => string;
}

export interface ToggleBinding extends BindingCommon {
  kind: 'toggle';
  get: () => boolean;
  set: (v: boolean) => void;
}

export interface EnumBinding extends BindingCommon {
  kind: 'enum';
  get: () => string;
  set: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}

export interface ActionBinding extends BindingCommon {
  kind: 'action';
  invoke: () => void;
}

export class BindingRegistry {
  private map = new Map<string, Binding>();

  register(b: Binding): void {
    if (this.map.has(b.id)) {
      throw new Error(`BindingRegistry: id "${b.id}" already registered`);
    }
    this.map.set(b.id, b);
  }

  get(id: string): Binding | undefined {
    return this.map.get(id);
  }

  list(): Binding[] {
    return Array.from(this.map.values());
  }

  filterByGroup(group: string): Binding[] {
    return this.list().filter(b => b.group === group);
  }
}

// [LAW:no-shared-mutable-globals] No module-scope singleton. The composition
// root constructs one BindingRegistry and threads it to every consumer, so an
// extracted package ships an API (a class), not ambient global state.
