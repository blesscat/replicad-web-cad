import { describe, expect, it } from 'vitest'
import { validateBoxParameters } from '../../src/cad-contract/units'
import {
  isWorkerEvent,
  PROTOCOL_VERSION,
} from '../../src/cad-contract/messages'
import {
  formatDiagnostic,
  formatValidationIssue,
} from '../../src/i18n/diagnostics'
import { isDiagnosticParams } from '../../src/cad-contract/diagnostics'
import { errorForInput } from '../../src/components/cad/workspace/validation'

describe('locale-neutral CAD diagnostics', () => {
  it('returns a stable descriptor with JSON-safe parameters', () => {
    const result = validateBoxParameters({
      width: 'bad',
      depth: 20,
      height: 20,
    })

    expect(result.valid).toBe(false)
    if (result.valid) return
    expect(result.issues[0]).toEqual(
      expect.objectContaining({
        field: 'width',
        messageId: expect.any(String),
      }),
    )
    expect(result.issues[0]).not.toHaveProperty('message')
    expect(JSON.stringify(result.issues[0])).not.toContain('必須')
  })

  it('formats known diagnostics in the active locale and hides unknown IDs', () => {
    expect(
      formatDiagnostic('en', {
        messageId: 'validation.invalidNumber',
        params: { field: 'width' },
      }),
    ).toContain('width')
    expect(
      formatDiagnostic('zh-Hant', { messageId: 'diagnostic.not-registered' }),
    ).toBe('CAD 輸入無效，請檢查參數後重試。')
    expect(
      formatValidationIssue('zh-Hant', {
        field: 'width',
        messageId: 'validation.invalid',
      }),
    ).toContain('寬度 輸入無效')
  })

  it('accepts descriptor-based Worker errors and rejects sentence transport', () => {
    const base = {
      version: PROTOCOL_VERSION,
      kind: 'operation.error' as const,
      requestId: 'event-1',
      operationId: 'operation-1',
      terminalForRequestId: 'request-1',
      stage: 'building' as const,
      code: 'MODEL_BUILD_FAILED' as const,
      messageId: 'diagnostic.modelBuildFailed',
      messageParams: { modelId: 'box' },
      recoverable: true,
    }

    expect(isWorkerEvent(base)).toBe(true)
    expect(isWorkerEvent({ ...base, userMessage: '模型失敗' })).toBe(false)
  })

  it('rejects non-JSON-safe numeric diagnostic parameters', () => {
    expect(isDiagnosticParams({ value: Number.NaN })).toBe(false)
    expect(isDiagnosticParams({ value: Number.POSITIVE_INFINITY })).toBe(false)
    expect(isDiagnosticParams({ value: 12 })).toBe(true)
  })

  it('preserves validation descriptor parameters when creating runtime errors', () => {
    expect(
      errorForInput({
        field: 'width',
        messageId: 'validation.invalid',
        params: { min: 1, max: 200, unit: 'mm' },
      }).message,
    ).toEqual({
      messageId: 'validation.invalid',
      params: { min: 1, max: 200, unit: 'mm', field: 'width' },
    })
  })
})
