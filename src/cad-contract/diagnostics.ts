export type DiagnosticParam = string | number | boolean

export type DiagnosticParams = Readonly<Record<string, DiagnosticParam>>

export type DiagnosticDescriptor = {
  messageId: string
  params?: DiagnosticParams
}

export type FieldDiagnostic = DiagnosticDescriptor & {
  field: string
}

export function diagnostic(
  messageId: string,
  params?: DiagnosticParams,
): DiagnosticDescriptor {
  return params === undefined ? { messageId } : { messageId, params }
}

export function isDiagnosticParams(value: unknown): value is DiagnosticParams {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  return Object.values(value).every(
    (item) =>
      typeof item === 'string' ||
      (typeof item === 'number' && Number.isFinite(item)) ||
      typeof item === 'boolean',
  )
}

export function isDiagnosticDescriptor(
  value: unknown,
): value is DiagnosticDescriptor {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const descriptor = value as Record<string, unknown>
  return (
    typeof descriptor.messageId === 'string' &&
    descriptor.messageId.length > 0 &&
    (descriptor.params === undefined || isDiagnosticParams(descriptor.params))
  )
}
