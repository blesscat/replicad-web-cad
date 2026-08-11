import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'

export type HalfCellX = 'none' | 'left' | 'right'
export type HalfCellY = 'none' | 'top' | 'bottom'

export type HalfCellDirection = HalfCellX | HalfCellY

export const HALF_CELL_CONFIGURATION = {
  halfPitch: OPENGRID_GRID_CONFIGURATION.halfPitch,
  fullPitch: OPENGRID_GRID_CONFIGURATION.fullPitch,
  fullSnapNominalSize: 25.6,
  halfSnapNominalSize: 12.8,
  fullSnapFixedCoreSize: 24.8,
  halfSnapFixedCoreSize: 12,
} as const

export function isHalfCellX(value: unknown): value is HalfCellX {
  return value === 'none' || value === 'left' || value === 'right'
}

export function isHalfCellY(value: unknown): value is HalfCellY {
  return value === 'none' || value === 'top' || value === 'bottom'
}

export function hasHalfCellX(value: HalfCellX): boolean {
  return value !== 'none'
}

export function hasHalfCellY(value: HalfCellY): boolean {
  return value !== 'none'
}

export function halfCellExtensionFor(value: HalfCellDirection): number {
  return value === 'none' ? 0 : HALF_CELL_CONFIGURATION.halfPitch
}

export function fullGridCenterOffsetX(direction: HalfCellX): number {
  if (direction === 'left') return HALF_CELL_CONFIGURATION.halfPitch / 2
  if (direction === 'right') return -HALF_CELL_CONFIGURATION.halfPitch / 2
  return 0
}

export function fullGridCenterOffsetY(direction: HalfCellY): number {
  if (direction === 'top') return -HALF_CELL_CONFIGURATION.halfPitch / 2
  if (direction === 'bottom') return HALF_CELL_CONFIGURATION.halfPitch / 2
  return 0
}

export function openGridAxisSize(
  count: number,
  direction: HalfCellDirection,
): number {
  return (
    count * HALF_CELL_CONFIGURATION.fullPitch + halfCellExtensionFor(direction)
  )
}

export function snapNominalAxisSize(direction: HalfCellDirection): number {
  return direction === 'none'
    ? HALF_CELL_CONFIGURATION.fullSnapNominalSize
    : HALF_CELL_CONFIGURATION.halfSnapNominalSize
}

export function snapFixedCoreAxisSize(direction: HalfCellDirection): number {
  return direction === 'none'
    ? HALF_CELL_CONFIGURATION.fullSnapFixedCoreSize
    : HALF_CELL_CONFIGURATION.halfSnapFixedCoreSize
}

export function halfCellHostPitch(direction: HalfCellDirection): number {
  return direction === 'none'
    ? HALF_CELL_CONFIGURATION.fullPitch
    : HALF_CELL_CONFIGURATION.halfPitch
}

export function halfCellDirectionLabel(direction: HalfCellDirection): string {
  if (direction === 'none') return 'none'
  return direction
}
