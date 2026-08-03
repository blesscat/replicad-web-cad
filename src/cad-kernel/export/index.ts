import type { Shape3D } from "replicad";

export async function exportStepBytes(shape: Shape3D): Promise<ArrayBuffer> {
  const blob = shape.blobSTEP();
  const bytes = await blob.arrayBuffer();
  if (bytes.byteLength === 0) throw new Error("STEP_EMPTY");
  return bytes;
}
