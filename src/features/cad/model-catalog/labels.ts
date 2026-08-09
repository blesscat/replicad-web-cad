import type { ParameterField } from './types'

export function displayParameterLabel(field: ParameterField): string {
  if (
    field.label === '行數' ||
    field.label === '列數' ||
    field.label.endsWith('格數')
  ) {
    return field.axis
  }

  return `${field.label}（${field.axis}）`
}
