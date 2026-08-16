import type {
  DiagnosticDescriptor,
  FieldDiagnostic,
} from '../cad-contract/diagnostics'
import { translate, type Locale } from './index'

export function formatDiagnostic(
  locale: Locale,
  descriptor: DiagnosticDescriptor,
): string {
  const message = translate(locale, descriptor.messageId, descriptor.params)
  if (message.startsWith('⟦')) return translate(locale, 'diagnostic.unknown')
  return message
}

export function formatValidationIssue(
  locale: Locale,
  issue: FieldDiagnostic,
): string {
  const translatedField = translate(locale, `parameter.${issue.field}`)
  const field = translatedField.startsWith('⟦')
    ? translate(locale, 'validation.parameter')
    : translatedField

  return formatDiagnostic(locale, {
    messageId: issue.messageId,
    params: { ...issue.params, field },
  })
}
