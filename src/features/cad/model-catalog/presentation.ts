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
