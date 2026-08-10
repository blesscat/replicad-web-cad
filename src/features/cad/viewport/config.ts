import type { ViewportVector } from './coordinates'

export const CAD_VIEWPORT_CONFIG = {
  modelColor: '#4e7cff',
  modelEmissiveIntensity: 0.2,
  edgeThresholdAngle: 20,
  edgeColor: '#1f3b74',
  edgeOpacity: 0.72,
} as const

export const CAD_VIEWPORT_GIZMO = {
  id: 'cad-viewport-xyz-gizmo',
  className: 'cad-viewport-xyz-gizmo',
  type: 'sphere',
  placement: 'top-right',
  size: 76,
  offset: {
    top: 10,
    right: 10,
  },
  animated: false,
  background: {
    enabled: true,
    color: '#eef2f8',
    opacity: 0.84,
  },
  x: {
    label: 'X',
    color: '#c0392b',
    labelColor: '#7f1d1d',
  },
  y: {
    label: 'Y',
    color: '#198754',
    labelColor: '#166534',
  },
  z: {
    label: 'Z',
    color: '#2563eb',
    labelColor: '#1e3a8a',
  },
} as const

export const CAD_VIEWPORT_LIGHTING = {
  hemisphere: {
    skyColor: '#ffffff',
    groundColor: '#c5cfdf',
    intensity: 1.2,
    position: [0, 0, 1] as ViewportVector,
  },
  key: {
    color: '#ffffff',
    intensity: 2.2,
    position: [100, 120, 80] as ViewportVector,
  },
  oppositeFill: {
    color: '#dbe7ff',
    intensity: 1.05,
    position: [-100, -120, -70] as ViewportVector,
  },
} as const
