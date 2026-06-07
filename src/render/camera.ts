import type { CameraState, MouseState, RGBThemeColors, XRCameraOverride } from '../types';

import { mat4 } from '../math/mat4';

const DESKTOP_CAMERA_FAR = 500.0;

export interface CameraSystem {
  clearXrOverride(): void;
  getOrbitCamera(): { eye: number[]; proj: null; view: Float32Array };
  getUniformData(aspect: number, themeColors: RGBThemeColors, mouse: MouseState): Float32Array<ArrayBuffer>;
  setXrOverride(override: XRCameraOverride): void;
}

export function createCameraSystem(state: CameraState): CameraSystem {
  let xrCameraOverride: XRCameraOverride | null = null;

  return {
    setXrOverride(override) {
      xrCameraOverride = override;
    },
    clearXrOverride() {
      xrCameraOverride = null;
    },
    getOrbitCamera() {
      const eye = [
        state.distance * Math.cos(state.rotX) * Math.sin(state.rotY),
        state.distance * Math.sin(state.rotX),
        state.distance * Math.cos(state.rotX) * Math.cos(state.rotY),
      ];
      return {
        eye,
        view: mat4.lookAt(eye, [state.panX, state.panY, 0], [0, 1, 0]),
        proj: null,
      };
    },
    getUniformData(aspect, themeColors, mouse) {
      const data = new Float32Array(52);

      if (xrCameraOverride) {
        // [LAW:one-source-of-truth] XR and desktop both feed the same camera
        // uniform layout; only the active source matrices differ.
        data.set(xrCameraOverride.viewMatrix, 0);
        data.set(xrCameraOverride.projMatrix, 16);
        data.set(xrCameraOverride.eye, 32);
      } else {
        const cam = this.getOrbitCamera();
        const fovRad = state.fov * Math.PI / 180;
        const proj = mat4.perspective(fovRad, aspect, 0.01, DESKTOP_CAMERA_FAR);
        data.set(cam.view, 0);
        data.set(proj, 16);
        data.set(cam.eye, 32);
      }

      data.set(themeColors.primary, 36);
      data.set(themeColors.secondary, 40);
      data.set(themeColors.accent, 44);
      data[48] = mouse.worldX;
      data[49] = mouse.worldY;
      data[50] = mouse.worldZ;
      data[51] = mouse.down ? 1.0 : 0.0;
      return data;
    },
  };
}
