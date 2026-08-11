import { describe, expect, it } from 'vitest'
import {
  CAD_PROGRESS_STAGES,
  booleanProgressLabel,
  formatProgressElapsed,
  progressCountLabel,
  progressDetails,
  progressMessage,
} from '../../src/features/cad/progress'

describe('CAD progress messages', () => {
  it.each([
    ['loading', '正在載入 CAD engine…'],
    ['building', '正在建立 B-Rep…'],
    ['meshing', '正在產生預覽 mesh…'],
    ['exporting', '正在匯出 STEP…'],
  ] as const)('describes the %s stage', (stage, message) => {
    expect(progressMessage(stage)).toBe(message)
  })

  it.each([
    ['loading', 1, '載入 CAD engine'],
    ['building', 2, '建立 B-Rep'],
    ['meshing', 3, '產生預覽 mesh'],
    ['exporting', 4, '匯出 STEP'],
  ] as const)('exposes ordered details for %s', (stage, step, label) => {
    expect(progressDetails(stage)).toMatchObject({
      stage,
      step,
      totalSteps: CAD_PROGRESS_STAGES.length,
      label,
    })
  })

  it('formats determinate cell progress when counters are available', () => {
    expect(
      progressCountLabel({
        stage: 'building',
        completed: 3,
        total: 10,
        unit: 'cells',
      }),
    ).toBe('3 / 10 格')
    expect(progressCountLabel({ stage: 'meshing' })).toBeNull()
  })

  it('formats boolean subprogress without turning it into a stage percentage', () => {
    expect(
      booleanProgressLabel({
        stage: 'building',
        booleanOperation: {
          kind: 'fuse',
          state: 'running',
          completed: 3,
          total: 8,
          elapsedMs: 1200,
        },
      }),
    ).toBe('合併（Fuse） 3 / 8')
    expect(
      booleanProgressLabel({
        stage: 'building',
        booleanOperation: {
          kind: 'intersect',
          state: 'running',
          elapsedMs: 1200,
        },
      }),
    ).toBe('交集（Intersect）進行中')
    expect(formatProgressElapsed(61_250)).toBe('1:01')
  })
})
