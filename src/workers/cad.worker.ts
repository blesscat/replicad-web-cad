import type { WorkerEvent } from '../cad-contract/messages'
import { CadWorkerRuntime } from './cad-worker-runtime'
import { createCadWorkerMessageHandler } from './cad-worker-message-handler'

export { CadWorkerRuntime } from './cad-worker-runtime'
export { createCadWorkerMessageHandler } from './cad-worker-message-handler'
export type { CadWorkerBuildOptions } from './cad-worker-types'

if (typeof self !== 'undefined') {
  const workerGlobal = globalThis as unknown as {
    postMessage: (event: WorkerEvent, transfer?: Transferable[]) => void
  }

  const runtime = new CadWorkerRuntime(undefined, (event, transfer) => {
    workerGlobal.postMessage(event, transfer ?? [])
  })

  const handleMessage = createCadWorkerMessageHandler(runtime)
  self.addEventListener('message', (event: MessageEvent<unknown>) => {
    void handleMessage(event.data)
  })
}
