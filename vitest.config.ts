import { defineConfig } from 'vitest/config'

import {
  cadTestIncludes,
  fastTestExcludes,
  fastTestIncludes,
} from './scripts/test-groups.mjs'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'fast',
          environment: 'node',
          include: fastTestIncludes,
          exclude: fastTestExcludes,
          maxWorkers: 4,
          sequence: { groupOrder: 0 },
        },
      },
      {
        test: {
          name: 'cad',
          environment: 'node',
          include: cadTestIncludes,
          maxWorkers: 1,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
})
