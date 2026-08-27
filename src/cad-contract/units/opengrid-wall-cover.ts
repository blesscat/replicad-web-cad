import {
  boundsForOpenGridSnap,
  OPENGRID_SNAP_CONFIGURATION,
} from './opengrid-snap'
import type { DiagnosticParams } from '../diagnostics'

export type OpenGridWallCoverParameterKey = 'text'

export type OpenGridWallCoverParameters = {
  text: string
}

export const OPENGRID_WALL_COVER_CONFIGURATION = {
  coverWidth: OPENGRID_SNAP_CONFIGURATION.nominalWidth,
  coverDepth: OPENGRID_SNAP_CONFIGURATION.nominalDepth,
  coverGap: 3,
  maxTextLength: 8,
  defaultText: 'A',
  fontFamily: 'Noto Sans CJK TC Bold',
  fontFileName: 'NotoSansCJKtc-Bold.otf',
  defaultParameters: { text: 'A' } as OpenGridWallCoverParameters,
  fileNames: {
    step: 'opengrid-wall-cover.step',
    stl: 'opengrid-wall-cover.stl',
    threeMf: 'opengrid-wall-cover.3mf',
  },
} as const

export type OpenGridWallCoverValidation =
  | {
      valid: true
      value: OpenGridWallCoverParameters
    }
  | {
      valid: false
      issues: Array<{
        field: OpenGridWallCoverParameterKey | 'parameters'
        messageId: string
        params?: DiagnosticParams
      }>
    }

export function normalizeOpenGridWallCoverText(value: string): string {
  return value.normalize('NFC').replace(/\s/gu, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function invalid(
  field: OpenGridWallCoverParameterKey | 'parameters',
  messageId = 'validation.invalid',
  params?: DiagnosticParams,
) {
  return {
    valid: false as const,
    issues: [{ field, messageId, ...(params ? { params } : {}) }],
  }
}

export function validateOpenGridWallCoverParameters(
  value: unknown,
): OpenGridWallCoverValidation {
  if (!isRecord(value)) return invalid('parameters')

  const keys = Object.keys(value)
  if (keys.length === 0) {
    return {
      valid: true,
      value: { ...OPENGRID_WALL_COVER_CONFIGURATION.defaultParameters },
    }
  }
  if (keys.length !== 1 || keys[0] !== 'text') return invalid('parameters')
  if (typeof value.text !== 'string') return invalid('text')

  const text = normalizeOpenGridWallCoverText(value.text)
  const textLength = Array.from(text).length
  if (textLength < 1) {
    return invalid('text', 'validation.wallCoverTextRequired')
  }
  if (textLength > OPENGRID_WALL_COVER_CONFIGURATION.maxTextLength) {
    return invalid('text', 'validation.wallCoverTextTooLong', {
      max: OPENGRID_WALL_COVER_CONFIGURATION.maxTextLength,
    })
  }

  return { valid: true, value: { text } }
}

export function isOpenGridWallCoverParameters(
  value: unknown,
): value is OpenGridWallCoverParameters {
  return validateOpenGridWallCoverParameters(value).valid
}

export function boundsForOpenGridWallCover(
  parameters: OpenGridWallCoverParameters,
) {
  const validation = validateOpenGridWallCoverParameters(parameters)
  if (!validation.valid) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
  }

  const coverBounds = boundsForOpenGridSnap({
    ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
    variant: 'Lite',
    profile: 'Standard',
    offset: 0,
    footprint: 'full',
  })
  const coverCount = Array.from(validation.value.text).length
  const width =
    coverCount * OPENGRID_WALL_COVER_CONFIGURATION.coverWidth +
    (coverCount - 1) * OPENGRID_WALL_COVER_CONFIGURATION.coverGap
  const halfWidth = Number((width / 2).toFixed(6))
  return {
    min: [-halfWidth, coverBounds.min[1], coverBounds.min[2]] as [
      number,
      number,
      number,
    ],
    max: [halfWidth, coverBounds.max[1], coverBounds.max[2]] as [
      number,
      number,
      number,
    ],
  }
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
