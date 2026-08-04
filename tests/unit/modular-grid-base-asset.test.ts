import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { modularGridBaseTemplateUrl } from '../../src/cad-kernel/components/modular-grid-base/builder'

describe('modular-grid-base runtime asset', () => {
  it('resolves a bundled STEP file that is a valid STEP exchange document', () => {
    expect(modularGridBaseTemplateUrl.href).toContain('/cell-template.step')
    expect(
      readFileSync(fileURLToPath(modularGridBaseTemplateUrl), 'utf8'),
    ).toMatch(/^ISO-10303-21;/)
  })
})
