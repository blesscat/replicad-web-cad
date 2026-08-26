import { isWorkerCommand } from '../cad-contract/messages'

type WorkerRuntimeHandler = {
  handle: (value: unknown) => Promise<void>
}

export function createCadWorkerMessageHandler(
  runtime: WorkerRuntimeHandler,
): (value: unknown) => Promise<void> {
  let queue = Promise.resolve()

  return (value: unknown) => {
    // Invalidation is deliberately handled outside the long-running command
    // queue so an in-flight kernel build can observe the newer generation at
    // its next safe boundary. The atomic OpenCascade call itself remains
    // synchronous and cannot be interrupted.
    if (isWorkerCommand(value) && value.kind === 'model.invalidate') {
      return runtime.handle(value)
    }

    queue = queue.then(() => runtime.handle(value)).catch(() => undefined)
    return queue
  }
}
