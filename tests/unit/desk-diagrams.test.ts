import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  DIAGRAMS,
  fileNameFor,
  generateAll,
  renderDiagram,
  validateAll,
} from '../../scripts/desk-diagrams/generate.mjs'
import { LOCALES, PALETTE } from '../../scripts/desk-diagrams/palette.mjs'

const assetDir = new URL('../../public/docs/desk-system/', import.meta.url)

function committedSvg(fileName: string): string {
  return readFileSync(new URL(fileName, assetDir), 'utf8')
}

describe('desk diagram generation', () => {
  it('emits every diagram for every locale in both appearances', () => {
    const output = generateAll()
    expect(output.size).toBe(DIAGRAMS.length * LOCALES.length * 2)
    for (const diagram of DIAGRAMS) {
      for (const locale of LOCALES) {
        expect(output.get(fileNameFor(diagram, locale, 'light'))).toBeTruthy()
        expect(output.get(fileNameFor(diagram, locale, 'dark'))).toBeTruthy()
      }
    }
  })

  it('keeps light output byte-identical to the committed light SVGs', () => {
    for (const diagram of DIAGRAMS) {
      for (const locale of LOCALES) {
        const fileName = fileNameFor(diagram, locale, 'light')
        expect(renderDiagram(diagram, locale, 'light')).toBe(
          committedSvg(fileName),
        )
      }
    }
  })

  it('renders dark variants from the dark palette only', () => {
    const lightOnlyHexes = [
      'background',
      'cardBlueFill',
      'cardTealFill',
      'cardAmberFill',
      'cardVioletFill',
      'pillFill',
    ].map((slot) => PALETTE[slot as keyof typeof PALETTE].light)
    for (const diagram of DIAGRAMS) {
      for (const locale of LOCALES) {
        const dark = renderDiagram(diagram, locale, 'dark')
        for (const hex of lightOnlyHexes) {
          expect(
            dark,
            `${diagram.name} ${locale} must not use ${hex}`,
          ).not.toContain(hex)
        }
      }
    }
  })

  it('fails closed on incomplete data', () => {
    const brokenString = {
      name: 'broken',
      strings: { key: { en: 'only english' } },
      template: (c: { t: (key: string) => string }) => c.t('key'),
    } as never
    expect(() => renderDiagram(brokenString, 'zh-Hant', 'light')).toThrow(
      /missing zh-Hant value/,
    )

    const unknownSlot = {
      name: 'broken',
      strings: { key: { en: 'a', 'zh-Hant': 'a' } },
      template: (c: { color: (slot: string) => string }) =>
        c.color('not-a-slot'),
    } as never
    expect(() => renderDiagram(unknownSlot, 'en', 'light')).toThrow(
      /unknown color slot/,
    )
  })

  it('fails closed when a palette slot lacks an appearance value', () => {
    const originalDark = PALETTE.background.dark
    const palette = PALETTE as { background: { dark?: string } }
    delete palette.background.dark
    try {
      expect(() => validateAll()).toThrow(
        /palette slot "background" missing valid dark value/,
      )
    } finally {
      palette.background.dark = originalDark
    }
    expect(() => validateAll()).not.toThrow()
  })

  it('validates the real palette and diagram data cleanly', () => {
    expect(() => validateAll()).not.toThrow()
    for (const values of Object.values(PALETTE)) {
      expect(values.light).toMatch(/^#[0-9a-f]{6}$/)
      expect(values.dark).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})
