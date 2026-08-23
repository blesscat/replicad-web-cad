import { describe, expect, it } from 'vitest'
import {
  boundsForBox,
  boundsForOpenGrid,
  OPENGRID_CONFIGURATION,
  type BoxBounds,
  type BoxParameters,
  type OpenGridParameters,
} from '../../src/cad-contract/units'
import {
  createDimensionAnnotations,
  type DimensionAnnotation,
  type Point3,
} from '../../src/features/cad/viewport/dimensions'

function distanceAlong(first: Point3, second: Point3, axis: number): number {
  return Math.abs(second[axis] - first[axis])
}

function isOutsideBounds(point: Point3, bounds: BoxBounds): boolean {
  return (
    point[0] < bounds.min[0] ||
    point[0] > bounds.max[0] ||
    point[1] < bounds.min[1] ||
    point[1] > bounds.max[1] ||
    point[2] < bounds.min[2] ||
    point[2] > bounds.max[2]
  )
}

function annotationMap(
  annotations: DimensionAnnotation[],
): Map<DimensionAnnotation['key'], DimensionAnnotation> {
  return new Map(annotations.map((annotation) => [annotation.key, annotation]))
}

describe('CAD dimension annotation geometry', () => {
  it('creates readable X, Y and Z annotations for the prototype box', () => {
    const parameters: BoxParameters = { width: 20, depth: 30, height: 40 }
    const bounds = boundsForBox(parameters)
    const annotations = createDimensionAnnotations(bounds, parameters)
    const byKey = annotationMap(annotations)
    const width = byKey.get('width')
    const depth = byKey.get('depth')
    const height = byKey.get('height')

    expect(annotations.map((annotation) => annotation.key)).toEqual([
      'width',
      'depth',
      'height',
    ])
    expect(width).toMatchObject({
      axis: 'X',
      value: 20,
      valueLabel: '20 mm',
      ariaLabel: '寬度 X 20 mm',
    })
    expect(depth).toMatchObject({
      axis: 'Y',
      value: 30,
      valueLabel: '30 mm',
      ariaLabel: '深度 Y 30 mm',
    })
    expect(height).toMatchObject({
      axis: 'Z',
      value: 40,
      valueLabel: '40 mm',
      ariaLabel: '高度 Z 40 mm',
    })
    expect(width?.extensionLines).toHaveLength(2)
    expect(width?.endTicks).toHaveLength(2)
    expect(depth?.extensionLines).toHaveLength(2)
    expect(height?.endTicks).toHaveLength(2)
  })

  it('keeps each dimension line aligned to its axis and outside the box', () => {
    const parameters: BoxParameters = { width: 7, depth: 13, height: 29 }
    const bounds: BoxBounds = {
      min: [-3.75, -7, 0],
      max: [3.75, 7, 29],
    }
    const annotations = createDimensionAnnotations(bounds, parameters)
    const byKey = annotationMap(annotations)

    const width = byKey.get('width')
    const depth = byKey.get('depth')
    const height = byKey.get('height')

    expect(width).toBeDefined()
    expect(depth).toBeDefined()
    expect(height).toBeDefined()
    expect(width?.valueLabel).toBe('7.5 mm')
    expect(depth?.valueLabel).toBe('14 mm')
    expect(height?.valueLabel).toBe('29 mm')
    expect(
      distanceAlong(width!.dimensionLine[0], width!.dimensionLine[1], 0),
    ).toBe(7.5)
    expect(
      distanceAlong(depth!.dimensionLine[0], depth!.dimensionLine[1], 1),
    ).toBe(14)
    expect(
      distanceAlong(height!.dimensionLine[0], height!.dimensionLine[1], 2),
    ).toBe(29)
    expect(width!.dimensionLine[0][2]).toBe(0)
    expect(width!.dimensionLine[1][2]).toBe(0)
    expect(depth!.dimensionLine[0][2]).toBe(0)
    expect(depth!.dimensionLine[1][2]).toBe(0)
    expect(height!.dimensionLine[0][2]).toBe(0)
    expect(height!.dimensionLine[1][2]).toBe(29)

    for (const annotation of annotations) {
      expect(isOutsideBounds(annotation.dimensionLine[0], bounds)).toBe(true)
      expect(isOutsideBounds(annotation.dimensionLine[1], bounds)).toBe(true)
      expect(isOutsideBounds(annotation.labelPosition, bounds)).toBe(true)
    }
  })

  it('uses committed OpenGrid bounds for the three viewport dimensions', () => {
    const parameters: OpenGridParameters = {
      ...OPENGRID_CONFIGURATION.defaultParameters,
      variant: 'Lite',
      rows: 2,
      columns: 3,
      screwMode: 'none',
      connectorHoles: 'none',
      chamferCorners: {
        ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
      },
      connectorSides: {
        ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
      },
    }
    const annotations = createDimensionAnnotations(
      boundsForOpenGrid(parameters),
      parameters,
    )
    const byKey = annotationMap(annotations)

    expect(byKey.get('width')).toMatchObject({
      value: 84,
      ariaLabel: '寬度 X 84 mm',
    })
    expect(byKey.get('depth')).toMatchObject({
      value: 56,
      ariaLabel: '深度 Y 56 mm',
    })
    expect(byKey.get('height')).toMatchObject({
      value: 4,
      ariaLabel: '高度 Z 4 mm',
    })
  })
})
