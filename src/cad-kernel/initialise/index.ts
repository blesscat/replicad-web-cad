import opencascade from "replicad-opencascadejs"
import { setOC } from "replicad"

type OpenCascadeOptions = {
  locateFile?: (fileName: string) => string
}

type OpenCascadeInitializer = (options?: OpenCascadeOptions) => Promise<unknown>

export async function initialiseCadKernel(wasmUrl: string): Promise<unknown> {
  const initializer = opencascade as unknown as OpenCascadeInitializer
  const oc = await initializer({ locateFile: () => wasmUrl })
  setOC(oc as Parameters<typeof setOC>[0])
  return oc
}
