import type { ExportReadyEvent } from '../../../cad-contract/messages'
import { PROTOTYPE_CONFIGURATION } from '../../../cad-contract/units'

export type ExportFormat = 'step' | 'stl'

export type FixedFileDownload = {
  url: string
  fileName: string
}

export function validateStepResponse(
  event: ExportReadyEvent,
  expectedRevision: string,
  expectedWorkerEpoch?: string,
  expectedFileName?: string,
): { valid: true } | { valid: false; message: string } {
  if (event.modelRevision !== expectedRevision)
    return { valid: false, message: 'STEP revision 已過期。' }
  if (expectedWorkerEpoch && event.workerEpoch !== expectedWorkerEpoch) {
    return { valid: false, message: 'STEP Worker revision 已過期。' }
  }
  if (
    event.format !== 'step' ||
    event.mime !== PROTOTYPE_CONFIGURATION.stepMime
  ) {
    return { valid: false, message: 'STEP metadata 不正確。' }
  }
  if (!event.fileName.endsWith(PROTOTYPE_CONFIGURATION.stepExtension)) {
    return { valid: false, message: 'STEP 副檔名不正確。' }
  }
  if (expectedFileName && event.fileName !== expectedFileName) {
    return { valid: false, message: 'STEP 檔名與目前模型不一致。' }
  }
  if (!(event.bytes instanceof ArrayBuffer) || event.bytes.byteLength === 0) {
    return { valid: false, message: 'STEP 檔案是空的。' }
  }
  return { valid: true }
}

export function triggerStepDownload(event: ExportReadyEvent): () => void {
  const blob = new Blob([event.bytes], { type: event.mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = event.fileName
  anchor.click()
  return () => URL.revokeObjectURL(url)
}

export function triggerFixedStepDownload(download: FixedFileDownload): void {
  const anchor = document.createElement('a')
  anchor.href = download.url
  anchor.download = download.fileName
  anchor.click()
}

export function validateStlResponse(
  event: ExportReadyEvent,
  expectedRevision: string,
  expectedWorkerEpoch?: string,
  expectedFileName?: string,
): { valid: true } | { valid: false; message: string } {
  if (event.modelRevision !== expectedRevision)
    return { valid: false, message: 'STL revision 已過期。' }
  if (expectedWorkerEpoch && event.workerEpoch !== expectedWorkerEpoch) {
    return { valid: false, message: 'STL Worker revision 已過期。' }
  }
  if (
    event.format !== 'stl' ||
    event.mime !== PROTOTYPE_CONFIGURATION.stlMime
  ) {
    return { valid: false, message: 'STL metadata 不正確。' }
  }
  if (!event.fileName.endsWith(PROTOTYPE_CONFIGURATION.stlExtension)) {
    return { valid: false, message: 'STL 副檔名不正確。' }
  }
  if (expectedFileName && event.fileName !== expectedFileName) {
    return { valid: false, message: 'STL 檔名與目前模型不一致。' }
  }
  if (!(event.bytes instanceof ArrayBuffer) || event.bytes.byteLength === 0) {
    return { valid: false, message: 'STL 檔案是空的。' }
  }

  const structuralValidation = validateBinaryStl(event.bytes)
  if (!structuralValidation.valid) return structuralValidation
  return { valid: true }
}

function validateBinaryStl(
  bytes: ArrayBuffer,
): { valid: true } | { valid: false; message: string } {
  const headerBytes = 80
  const countBytes = 4
  const facetBytes = 50
  const minimumBytes = headerBytes + countBytes
  if (bytes.byteLength < minimumBytes) {
    return { valid: false, message: 'STL 檔案結構不正確。' }
  }

  const triangleCount = new DataView(bytes).getUint32(headerBytes, true)
  if (triangleCount === 0) {
    return { valid: false, message: 'STL 檔案沒有三角形。' }
  }
  const expectedByteLength = minimumBytes + triangleCount * facetBytes
  if (expectedByteLength !== bytes.byteLength) {
    return { valid: false, message: 'STL 檔案結構不正確。' }
  }
  return { valid: true }
}

export function triggerStlDownload(event: ExportReadyEvent): () => void {
  const blob = new Blob([event.bytes], { type: event.mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = event.fileName
  anchor.click()
  return () => URL.revokeObjectURL(url)
}
