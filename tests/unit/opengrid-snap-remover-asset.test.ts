import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { openGridSnapRemoverAssetUrl } from '../../src/cad-kernel/components/opengrid-snap-remover/builder'

const EXPECTED_SIZE = 54_347
const EXPECTED_SHA256 =
  '8f34c88dfea6b2c3352301d68dadc0b43665c0f8424f7da2b61c8dcda38ac41b'

describe('OpenGrid Snap Remover STEP asset', () => {
  it('keeps the supplied non-empty STEP bytes unchanged', () => {
    expect(openGridSnapRemoverAssetUrl.href).toContain(
      '/opengrid-snap-remover/snap%20remover.step',
    )
    const asset = readFileSync(
      resolve(
        'src',
        'cad-kernel',
        'components',
        'opengrid-snap-remover',
        'snap remover.step',
      ),
    )
    const checksum = createHash('sha256').update(asset).digest('hex')

    expect(asset.byteLength).toBe(EXPECTED_SIZE)
    expect(checksum).toBe(EXPECTED_SHA256)
  })
})
