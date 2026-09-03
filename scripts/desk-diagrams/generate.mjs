#!/usr/bin/env node
/**
 * Desk System documentation diagram generator.
 *
 * Emits every diagram variant (3 diagrams x 2 locales x 2 appearances) into
 * public/docs/desk-system/. Data modules under ./data are the single source
 * of truth; the light output must stay byte-identical to the committed light
 * SVGs so regeneration with no data changes is an empty diff.
 *
 * Usage:
 *   node scripts/desk-diagrams/generate.mjs          # write all variants
 *   node scripts/desk-diagrams/generate.mjs --check  # diff without writing
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { PALETTE, LOCALES, FONTS } from './palette.mjs'
import { flowDiagram } from './data/desk-system-flow.mjs'
import { boardSnapDiagram } from './data/desk-system-board-snap.mjs'
import { locatingOptionsDiagram } from './data/desk-system-locating-options.mjs'

export const DIAGRAMS = [flowDiagram, boardSnapDiagram, locatingOptionsDiagram]

const APPEARANCES = ['light', 'dark']
const HEX_PATTERN = /^#[0-9a-f]{6}$/i
const assetDir = fileURLToPath(
  new URL('../../public/docs/desk-system/', import.meta.url),
)

export function validateAll() {
  const errors = []
  for (const [slot, values] of Object.entries(PALETTE)) {
    for (const appearance of APPEARANCES) {
      if (
        typeof values?.[appearance] !== 'string' ||
        !HEX_PATTERN.test(values[appearance])
      ) {
        errors.push(`palette slot "${slot}" missing valid ${appearance} value`)
      }
    }
  }
  for (const diagram of DIAGRAMS) {
    if (typeof diagram.template !== 'function') {
      errors.push(`${diagram.name}: missing template`)
      continue
    }
    for (const [key, entry] of Object.entries(diagram.strings ?? {})) {
      for (const locale of LOCALES) {
        if (typeof entry?.[locale] !== 'string' || entry[locale] === '') {
          errors.push(
            `${diagram.name}: string "${key}" missing ${locale} value`,
          )
        }
      }
    }
    for (const [key, overrides] of Object.entries(
      diagram.fontSizeOverrides ?? {},
    )) {
      for (const locale of Object.keys(overrides)) {
        if (!LOCALES.includes(locale) || !/^\d+$/.test(overrides[locale])) {
          errors.push(
            `${diagram.name}: font-size override "${key}" has invalid ${locale} value`,
          )
        }
      }
    }
  }
  if (errors.length > 0) {
    throw new Error(
      `diagram data validation failed:\n  - ${errors.join('\n  - ')}`,
    )
  }
}

function makeContext(diagram, locale, appearance) {
  return {
    font: FONTS[locale],
    color(slot) {
      const values = PALETTE[slot]
      if (!values)
        throw new Error(`${diagram.name}: unknown color slot "${slot}"`)
      const value = values[appearance]
      if (typeof value !== 'string' || value === '') {
        throw new Error(
          `${diagram.name}: palette slot "${slot}" missing ${appearance} value`,
        )
      }
      return value
    },
    t(key) {
      const value = diagram.strings?.[key]?.[locale]
      if (typeof value !== 'string' || value === '') {
        throw new Error(
          `${diagram.name}: string "${key}" missing ${locale} value`,
        )
      }
      return value
    },
    fs(key, defaultValue) {
      return diagram.fontSizeOverrides?.[key]?.[locale] ?? defaultValue
    },
  }
}

export function fileNameFor(diagram, locale, appearance) {
  return `${diagram.name}.${locale}${appearance === 'dark' ? '-dark' : ''}.svg`
}

export function renderDiagram(diagram, locale, appearance) {
  if (!LOCALES.includes(locale)) throw new Error(`unsupported locale ${locale}`)
  return diagram.template(makeContext(diagram, locale, appearance))
}

/** Validates everything (fail closed) and returns fileName -> svg content. */
export function generateAll() {
  validateAll()
  const output = new Map()
  for (const diagram of DIAGRAMS) {
    for (const locale of LOCALES) {
      for (const appearance of APPEARANCES) {
        output.set(
          fileNameFor(diagram, locale, appearance),
          renderDiagram(diagram, locale, appearance),
        )
      }
    }
  }
  return output
}

function firstDiffLine(generated, committed) {
  const a = generated.split('\n')
  const b = committed.split('\n')
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return `line ${i + 1}:\n    generated: ${a[i] ?? '<eof>'}\n    committed: ${b[i] ?? '<eof>'}`
    }
  }
  return 'files differ'
}

async function main() {
  const check = process.argv.includes('--check')
  let output
  try {
    output = generateAll()
  } catch (error) {
    console.error(String(error.message ?? error))
    process.exit(1)
  }

  let failures = 0
  for (const [fileName, content] of output) {
    const path = `${assetDir}${fileName}`
    let committed = null
    try {
      committed = await readFile(path, 'utf8')
    } catch {
      // reported as missing below
    }
    if (check) {
      if (committed === null) {
        console.error(`✗ ${fileName}: missing on disk`)
        failures++
      } else if (committed !== content) {
        console.error(`✗ ${fileName}: ${firstDiffLine(content, committed)}`)
        failures++
      } else {
        console.log(`✓ ${fileName}`)
      }
    } else {
      await writeFile(path, content)
      const changed = committed !== content ? ' (changed)' : ''
      console.log(`wrote ${fileName}${changed}`)
    }
  }

  if (check && failures > 0) {
    console.error(
      `\n${failures} file(s) differ. Edit scripts/desk-diagrams/ data instead of the SVGs.`,
    )
    process.exit(1)
  }
  if (!check) console.log(`\n${output.size} files written to ${assetDir}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main()
}
