export type ViewportVector = [number, number, number]

export type ViewportCameraConfiguration = {
  position: ViewportVector
  up: ViewportVector
  fov: number
}

export const CAD_VIEWPORT_CAMERA: ViewportCameraConfiguration = {
  position: [100, -100, 100],
  up: [0, 0, 1],
  fov: 45,
}

export const CAD_VIEWPORT_GRID_ROTATION: ViewportVector = [Math.PI / 2, 0, 0]
