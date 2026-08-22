import { displayParameterLabel } from './labels'
import type { Locale } from '../../../i18n'
import type { ModelDefinition, ModelParameterPresentation } from './types'

export function parameterPresentationFor(
  definition: Pick<
    ModelDefinition,
    'parameterSchema' | 'parameterPresentation'
  >,
): ModelParameterPresentation {
  if (definition.parameterPresentation) {
    return definition.parameterPresentation
  }

  if (definition.parameterSchema.length > 0) {
    return { kind: 'adjustable' }
  }

  return { kind: 'fixed' }
}

export function adjustableParameterLabelsFor(
  definition: Pick<ModelDefinition, 'parameterSchema'>,
  locale: Locale,
): string[] {
  const labels = definition.parameterSchema.map((field) =>
    displayParameterLabel(field, locale),
  )

  return [...new Set(labels)]
}

export function parameterStaticSummaryKeysFor(
  definition: Pick<
    ModelDefinition,
    'parameterSchema' | 'parameterPresentation'
  >,
): string[] {
  const presentation = parameterPresentationFor(definition)
  if (presentation.kind !== 'adjustable') return []

  return [presentation.summaryKey, presentation.detailsKey].filter(
    (key): key is string => key !== undefined,
  )
}

export function joinParameterLabels(
  labels: ReadonlyArray<string>,
  locale: Locale,
): string {
  return new Intl.ListFormat(locale, {
    type: 'conjunction',
    style: 'long',
  }).format(labels)
}
