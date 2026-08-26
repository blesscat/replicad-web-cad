import {
  boundsForOpenGridSnap,
  OPENGRID_SNAP_CONFIGURATION,
} from './opengrid-snap'

export type OpenGridWallCoverParameters = Record<never, never>

export type OpenGridWallCoverValidation =
  | { valid: true; value: OpenGridWallCoverParameters }
  | {
      valid: false
      issues: [{ field: 'parameters'; messageId: 'validation.invalid' }]
    }

export const OPENGRID_WALL_COVER_CONFIGURATION = {
  defaultParameters: {} as OpenGridWallCoverParameters,
  fileNames: {
    step: 'opengrid-wall-cover.step',
    stl: 'opengrid-wall-cover.stl',
    threeMf: 'opengrid-wall-cover.3mf',
  },
} as const

function isPlainEmptyObject(
  value: unknown,
): value is OpenGridWallCoverParameters {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return false
  return Object.keys(value).length === 0
}

export function validateOpenGridWallCoverParameters(
  value: unknown,
): OpenGridWallCoverValidation {
  if (!isPlainEmptyObject(value)) {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  return { valid: true, value }
}

export function isOpenGridWallCoverParameters(
  value: unknown,
): value is OpenGridWallCoverParameters {
  return validateOpenGridWallCoverParameters(value).valid
}

export function boundsForOpenGridWallCover(
  parameters: OpenGridWallCoverParameters,
) {
  if (!isOpenGridWallCoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
  }

  return boundsForOpenGridSnap({
    ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
    variant: 'Lite',
    profile: 'Standard',
    offset: 0,
    footprint: 'full',
  })
}

function fileNameFor(
  parameters: OpenGridWallCoverParameters,
  format: keyof typeof OPENGRID_WALL_COVER_CONFIGURATION.fileNames,
): string {
  if (!isOpenGridWallCoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
  }
  return OPENGRID_WALL_COVER_CONFIGURATION.fileNames[format]
}

export function openGridWallCoverFileName(
  parameters: OpenGridWallCoverParameters,
): string {
  return fileNameFor(parameters, 'step')
}

export function openGridWallCoverStlFileName(
  parameters: OpenGridWallCoverParameters,
): string {
  return fileNameFor(parameters, 'stl')
}

export function openGridWallCoverThreeMfFileName(
  parameters: OpenGridWallCoverParameters,
): string {
  return fileNameFor(parameters, 'threeMf')
}
