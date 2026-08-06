import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { hexagonalColumnReferenceUrl } from '../../src/cad-kernel/components/hexagonal-column/builder'

describe('hexagonal-column reference asset', () => {
  it('keeps the mm STEP source in the component-local boundary', () => {
    const sourcePath = fileURLToPath(hexagonalColumnReferenceUrl)
    const source = readFileSync(sourcePath, 'utf8')
    expect(existsSync(sourcePath)).toBe(true)
    expect(hexagonalColumnReferenceUrl.pathname).toContain(
      '/hexagonal-column/hexagonal.step',
    )
    expect(source).toMatch(/^ISO-10303-21;/)
    expect(source.replace(/\s+/g, '')).toContain(
      'LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.)',
    )
  })
})
