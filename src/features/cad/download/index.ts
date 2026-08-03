import type { ExportReadyEvent } from "../../../cad-contract/messages";
import { PROTOTYPE_CONFIGURATION } from "../../../cad-contract/units";

export function validateStepResponse(
  event: ExportReadyEvent,
  expectedRevision: string,
  expectedWorkerEpoch?: string,
  expectedFileName?: string
): { valid: true } | { valid: false; message: string } {
  if (event.modelRevision !== expectedRevision) return { valid: false, message: "STEP revision 已過期。" };
  if (expectedWorkerEpoch && event.workerEpoch !== expectedWorkerEpoch) {
    return { valid: false, message: "STEP Worker revision 已過期。" };
  }
  if (event.format !== "step" || event.mime !== PROTOTYPE_CONFIGURATION.stepMime) {
    return { valid: false, message: "STEP metadata 不正確。" };
  }
  if (!event.fileName.endsWith(PROTOTYPE_CONFIGURATION.stepExtension)) {
    return { valid: false, message: "STEP 副檔名不正確。" };
  }
  if (expectedFileName && event.fileName !== expectedFileName) {
    return { valid: false, message: "STEP 檔名與目前模型不一致。" };
  }
  if (!(event.bytes instanceof ArrayBuffer) || event.bytes.byteLength === 0) {
    return { valid: false, message: "STEP 檔案是空的。" };
  }
  return { valid: true };
}

export function triggerStepDownload(event: ExportReadyEvent): () => void {
  const blob = new Blob([event.bytes], { type: event.mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = event.fileName;
  anchor.click();
  return () => URL.revokeObjectURL(url);
}
