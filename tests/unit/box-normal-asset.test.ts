import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { boxNormalReferenceUrl } from '../../src/cad-kernel/components/box-normal/builder'

const sourceAssetPath = fileURLToPath(boxNormalReferenceUrl)
const productionAssetDirectory = fileURLToPath(
  new URL('../../dist/_astro/', import.meta.url),
)

function productionAssetPath(): string | undefined {
  if (!existsSync(productionAssetDirectory)) return undefined
  const fileName = readdirSync(productionAssetDirectory).find((name) =>
    /^box-normal-.*\.step$/.test(name),
  )
  if (!fileName) return undefined
  return `${productionAssetDirectory}/${fileName}`
}

describe('box-normal asset packaging', () => {
  it('keeps the canonical STEP asset in its independent component directory', () => {
    const bytes = readFileSync(sourceAssetPath)

    expect(bytes.byteLength).toBeGreaterThan(0)
    expect(boxNormalReferenceUrl.pathname).toContain(
      '/box-normal/box-normal.step',
    )
  })

  it.skipIf(!productionAssetPath())(
    'copies the canonical asset into the production build output',
    () => {
      const builtPath = productionAssetPath()
      if (!builtPath)
        throw new Error('box-normal production asset was not emitted')

      expect(readFileSync(builtPath)).toEqual(readFileSync(sourceAssetPath))
    },
  )
})
