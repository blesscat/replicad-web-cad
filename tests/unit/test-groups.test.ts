import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  classifyTestFile,
  nativeCadUnitTests,
} from '../../scripts/test-groups.mjs'

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))

function listVitestFiles(directory = 'tests'): string[] {
  const entries = readdirSync(resolve(repositoryRoot, directory), {
    withFileTypes: true,
  })
  const testFiles: string[] = []

  for (const entry of entries) {
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) {
      testFiles.push(...listVitestFiles(path))
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      testFiles.push(path)
    }
  }

  return testFiles.sort()
}

describe('Vitest resource groups', () => {
  it('assigns every existing Vitest file to exactly one resource group', () => {
    const testFiles = listVitestFiles()
    const assignments = testFiles.map((path) => [path, classifyTestFile(path)])

    expect(testFiles.length).toBeGreaterThan(0)
    expect(assignments.filter(([, group]) => group === null)).toEqual([])
  })

  it('assigns every Worker test to the bounded CAD group', () => {
    const workerTests = listVitestFiles().filter((path) =>
      path.startsWith('tests/worker/'),
    )

    expect(workerTests.length).toBeGreaterThan(0)
    expect(workerTests.every((path) => classifyTestFile(path) === 'cad')).toBe(
      true,
    )
  })

  it('assigns native OpenCascade unit tests to CAD and ordinary units to fast', () => {
    expect(
      nativeCadUnitTests.every((path) => classifyTestFile(path) === 'cad'),
    ).toBe(true)
    expect(classifyTestFile('tests/unit/units.test.ts')).toBe('fast')
    expect(classifyTestFile('tests/unit/affected-test-selection.test.ts')).toBe(
      'fast',
    )
  })

  it('does not classify non-test files', () => {
    expect(classifyTestFile('src/lib/units.ts')).toBeNull()
  })
})
