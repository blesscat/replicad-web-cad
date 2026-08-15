import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL } from './helpers'

test('CAD UI shows face progress and clears it at terminal state', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.addInitScript(() => {
    class FakeWorker extends EventTarget {
      postMessage(message: Record<string, any>): void {
        if (message.kind === 'engine.init') {
          window.setTimeout(() => {
            this.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  version: 2,
                  kind: 'engine.ready',
                  requestId: message.requestId,
                  operationId: message.operationId,
                  workerEpoch: 'e2e-worker',
                  engine: { name: 'replicad', wasm: true },
                },
              }),
            )
          }, 10)
          return
        }

        if (message.kind !== 'model.generate') return

        const progress = {
          version: 2,
          kind: 'operation.progress',
          requestId: 'e2e-face-progress-request',
          operationId: message.operationId,
          stage: 'meshing',
          generation: message.generation,
          completed: 0,
          total: 100,
          unit: 'faces',
        }
        window.setTimeout(() => {
          this.dispatchEvent(new MessageEvent('message', { data: progress }))
        }, 10)
        window.setTimeout(() => {
          this.dispatchEvent(
            new MessageEvent('message', {
              data: { ...progress, completed: 40 },
            }),
          )
        }, 40)
        window.setTimeout(() => {
          this.dispatchEvent(
            new MessageEvent('message', {
              data: {
                version: 2,
                kind: 'operation.superseded',
                requestId: 'e2e-face-progress-terminal',
                operationId: message.operationId,
                terminalForRequestId: message.requestId,
                generation: message.generation,
                reason: 'STALE_GENERATION',
              },
            }),
          )
        }, 250)
      }

      terminate(): void {}
    }

    window.Worker = FakeWorker as unknown as typeof Worker
  })
  await page.goto('/cad/box')

  const progress = page.getByTestId('cad-progress')
  const count = page.getByTestId('cad-progress-count')

  await expect(progress).not.toContainText('正在產生預覽 mesh', {
    timeout: 30_000,
  })
  await expect(count).toHaveText(/\d+ \/ 100 面/, { timeout: 30_000 })
  await expect(
    page.getByRole('progressbar', { name: '產生預覽 mesh' }),
  ).toHaveAttribute('aria-valuetext', /面/)

  await expect(progress).toBeHidden({ timeout: 30_000 })
})
