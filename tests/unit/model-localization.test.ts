import { describe, expect, it } from 'vitest'
import {
  adjustableParameterLabelsFor,
  displayParameterLabel,
  getModelDefinition,
  joinParameterLabels,
  modelDefinitions,
  parameterPresentationFor,
  unitLabelFor,
} from '../../src/features/cad/model-catalog'
import { translate } from '../../src/i18n'

describe('localized model catalog copy', () => {
  it('resolves names, descriptions, and preview alt text in both locales', () => {
    for (const definition of modelDefinitions) {
      for (const locale of ['zh-Hant', 'en'] as const) {
        expect(translate(locale, definition.displayName)).not.toContain('⟦')
        if (definition.selectionLabel) {
          expect(translate(locale, definition.selectionLabel)).not.toContain(
            '⟦',
          )
        }
        expect(
          translate(locale, definition.selectionDescription),
        ).not.toContain('⟦')
        if (definition.previewImage) {
          expect(translate(locale, definition.previewImage.alt)).not.toContain(
            '⟦',
          )
        }
      }
    }
  })

  it('uses semantic parameter fields rather than translated text for label layout', () => {
    const box = modelDefinitions.find((definition) => definition.id === 'box')!
    const rows = modelDefinitions
      .find((definition) => definition.id === 'hsw-cell')!
      .parameterSchema.find((field) => field.key === 'rows')!

    expect(displayParameterLabel(box.parameterSchema[0]!, 'zh-Hant')).toBe(
      '寬度（X）',
    )
    expect(displayParameterLabel(box.parameterSchema[0]!, 'en')).toBe(
      'Width（X）',
    )
    expect(displayParameterLabel(rows, 'zh-Hant')).toBe('Y')
    expect(displayParameterLabel(rows, 'en')).toBe('Y')
  })

  it('localizes units without changing parameter or model identifiers', () => {
    const definition = modelDefinitions.find(
      (candidate) => candidate.id === 'hexagonal-column',
    )!
    const count = definition.parameterSchema.find(
      (field) => field.key === 'count',
    )!

    expect(unitLabelFor('zh-Hant', count.unit)).toBe('支')
    expect(unitLabelFor('en', count.unit)).toBe('columns')
    expect(definition.id).toBe('hexagonal-column')
    expect(definition.buildKey).toBe('hexagonal-column')
  })

  it('uses explicit presentation metadata for custom controls and schema defaults', () => {
    const board = getModelDefinition('opengrid')!
    const box = getModelDefinition('box')!
    const snapRemover = getModelDefinition('opengrid-snap-remover')!

    expect(parameterPresentationFor(board)).toEqual({
      kind: 'adjustable',
      summaryKey: 'models.model.opengrid.staticParameters',
      detailsKey: 'models.model.opengrid.parameterDetails',
    })
    expect(parameterPresentationFor(box)).toEqual({ kind: 'adjustable' })
    expect(parameterPresentationFor(snapRemover)).toEqual({ kind: 'fixed' })
  })

  it('creates localized concise labels without duplicating conditional fields', () => {
    const cylinder = getModelDefinition('opengrid-stackable-cylinder')!
    const englishLabels = adjustableParameterLabelsFor(cylinder, 'en')
    const traditionalChineseLabels = adjustableParameterLabelsFor(
      cylinder,
      'zh-Hant',
    )

    expect(englishLabels.length).toBeLessThanOrEqual(
      cylinder.parameterSchema.length,
    )
    expect(new Set(englishLabels).size).toBe(englishLabels.length)
    expect(traditionalChineseLabels).toHaveLength(englishLabels.length)
    expect(joinParameterLabels(['Width', 'Height'], 'en')).toBe(
      'Width and Height',
    )
    expect(joinParameterLabels(['寬度', '高度'], 'zh-Hant')).toContain('寬度')
    expect(joinParameterLabels(['寬度', '高度'], 'zh-Hant')).toContain('高度')
  })

  it('provides localized capability and dialog actions', () => {
    expect(
      translate('zh-Hant', 'models.adjustableSettings', { value: '板型' }),
    ).toBe('可調整設定：板型')
    expect(
      translate('en', 'models.adjustableSettings', { value: 'board profile' }),
    ).toBe('Adjustable settings: board profile')
    expect(translate('zh-Hant', 'models.details')).toBe('查看完整資訊')
    expect(translate('en', 'models.close')).toBe('Close')
  })

  it('labels the organizer-box retaining interface as locking corner seats', () => {
    const key = 'panel.organizerBox.interface.detachableCornerSeat'

    expect(translate('zh-Hant', key)).toBe('鎖定角座')
    expect(translate('en', key)).toBe('Locking corner seats')
  })
})
