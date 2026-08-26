import type { Shape3D } from 'replicad'
import {
  buildOpenGridCanonicalTile,
  loadOpenGridPrototypeTemplate,
} from '../cad-kernel/components/opengrid/builder'
import { loadHswCellTemplate } from '../cad-kernel/components/hsw-cell/builder'
import { loadModularGridBaseTemplate } from '../cad-kernel/components/modular-grid-base/builder'
import { loadHexagonalColumnReference } from '../cad-kernel/components/hexagonal-column/builder'
import {
  loadOpenGridSnapFixedFootprint,
  loadOpenGridSnapOpenConnectHead,
  loadOpenGridSnapReference,
  type OpenGridSnapFixedFootprint,
} from '../cad-kernel/components/opengrid-snap/builder'
import { loadOpenGridWallCoverReference } from '../cad-kernel/components/opengrid-wall-cover/builder'
import { loadOpenGridSnapRemoverAsset } from '../cad-kernel/components/opengrid-snap-remover/builder'
import {
  loadOpenGridDetachableCornerSeatHolderReference,
  loadOpenGridDetachableCornerSeatReference,
} from '../cad-kernel/components/opengrid-locating-assembly/reference'
import { loadOpenGridOpenConnectShelfLockedSlot } from '../cad-kernel/components/opengrid-openconnect-shelf/slot'
import type { BooleanOperationReporter } from '../cad-kernel/boolean-progress'
import type {
  OpenGridSnapParameters,
  OpenGridSnapVariant,
  OpenGridVariant,
} from '../cad-contract/units'
import type { CadWorkerBuildOptions } from './cad-worker-types'

type ShapePromise = Promise<Shape3D>

export class CadWorkerAssetCache {
  private modularGridBaseTemplate: ShapePromise | null = null
  private hswCellTemplate: ShapePromise | null = null
  private hexagonalColumnReference: ShapePromise | null = null
  private readonly openGridPrototypes = new Map<OpenGridVariant, ShapePromise>()
  private readonly openGridCanonicalTiles = new Map<
    OpenGridVariant,
    ShapePromise
  >()
  private readonly openGridHalfCellPrototypes = new Map<string, ShapePromise>()
  private readonly openGridSnapReferences = new Map<string, ShapePromise>()
  private readonly openGridSnapFixedFootprints = new Map<
    OpenGridSnapFixedFootprint,
    ShapePromise
  >()
  private openGridWallCoverReference: ShapePromise | null = null
  private openGridSnapOpenConnectHeadAsset: ShapePromise | null = null
  private openGridSnapRemoverAsset: ShapePromise | null = null
  private openGridOpenConnectShelfLockedSlot: ShapePromise | null = null
  private openGridDetachableCornerSeatReference: ShapePromise | null = null
  private openGridDetachableCornerSeatHolderReference: ShapePromise | null =
    null

  constructor(
    private readonly isDisposed: () => boolean,
    private readonly buildOptions: CadWorkerBuildOptions,
  ) {}

  getModularGridBaseTemplate(): ShapePromise {
    if (!this.modularGridBaseTemplate) {
      this.modularGridBaseTemplate = loadModularGridBaseTemplate().then(
        (template) => {
          if (this.isDisposed()) {
            template.delete()
            throw new Error('WORKER_TERMINATED')
          }
          return template
        },
      )
    }
    return this.modularGridBaseTemplate!
  }

  getHswCellTemplate(): ShapePromise {
    if (!this.hswCellTemplate) {
      this.hswCellTemplate = loadHswCellTemplate().then((template) => {
        if (this.isDisposed()) {
          template.delete()
          throw new Error('WORKER_TERMINATED')
        }
        return template
      })
    }
    return this.hswCellTemplate!
  }

  getHexagonalColumnReference(): ShapePromise {
    if (!this.hexagonalColumnReference) {
      this.hexagonalColumnReference = loadHexagonalColumnReference().then(
        (reference) => {
          if (this.isDisposed()) {
            reference.delete()
            throw new Error('WORKER_TERMINATED')
          }
          return reference
        },
      )
    }
    return this.hexagonalColumnReference!
  }

  getOpenGridPrototype(variant: OpenGridVariant): ShapePromise {
    const cached = this.openGridPrototypes.get(variant)
    if (cached) return cached

    const prototype = loadOpenGridPrototypeTemplate(variant).then((shape) => {
      if (this.isDisposed()) {
        shape.delete()
        throw new Error('WORKER_TERMINATED')
      }
      return shape
    })
    const recoverable = prototype.catch((error) => {
      this.openGridPrototypes.delete(variant)
      throw error
    })
    this.openGridPrototypes.set(variant, recoverable)
    return recoverable
  }

  getOpenGridCanonicalTile(
    variant: OpenGridVariant,
    _thickness: number,
    isGenerationCurrent: () => boolean,
    booleanOperations?: BooleanOperationReporter,
  ): ShapePromise {
    const cached = this.openGridCanonicalTiles.get(variant)
    if (cached) return cached

    const canonical = buildOpenGridCanonicalTile(variant, {
      balancedFuseBatchSize: this.buildOptions.balancedFuseBatchSize,
      yieldToEventLoop: () => new Promise((resolve) => setTimeout(resolve, 0)),
      isGenerationCurrent: () => isGenerationCurrent(),
      booleanOperations,
    })
    const recoverable = canonical.catch((error) => {
      this.openGridCanonicalTiles.delete(variant)
      throw error
    })
    this.openGridCanonicalTiles.set(variant, recoverable)
    return recoverable
  }

  getOpenGridHalfCellPrototype(
    key: string,
    factory: () => Shape3D | Promise<Shape3D>,
  ): ShapePromise {
    const cached = this.openGridHalfCellPrototypes.get(key)
    if (cached) return cached

    const prototype = Promise.resolve().then(factory)
    const recoverable = prototype.catch((error) => {
      this.openGridHalfCellPrototypes.delete(key)
      throw error
    })
    this.openGridHalfCellPrototypes.set(key, recoverable)
    return recoverable
  }

  getOpenGridSnapReference(
    variant: OpenGridSnapVariant,
    profile: OpenGridSnapParameters['profile'],
  ): ShapePromise {
    const cacheKey = `${profile}:${variant}`
    const cached = this.openGridSnapReferences.get(cacheKey)
    if (cached) return cached

    const reference = loadOpenGridSnapReference(variant, profile).then(
      (shape) => {
        if (this.isDisposed()) {
          shape.delete()
          throw new Error('WORKER_TERMINATED')
        }
        return shape
      },
    )
    const recoverable = reference.catch((error) => {
      this.openGridSnapReferences.delete(cacheKey)
      throw error
    })
    this.openGridSnapReferences.set(cacheKey, recoverable)
    return recoverable
  }

  getOpenGridSnapFixedFootprint(
    footprint: OpenGridSnapFixedFootprint,
  ): ShapePromise {
    const cached = this.openGridSnapFixedFootprints.get(footprint)
    if (cached) return cached

    const fixedFootprint = loadOpenGridSnapFixedFootprint(footprint).then(
      (shape) => {
        if (this.isDisposed()) {
          shape.delete()
          throw new Error('WORKER_TERMINATED')
        }
        return shape
      },
    )
    const recoverable = fixedFootprint.catch((error) => {
      this.openGridSnapFixedFootprints.delete(footprint)
      throw error
    })
    this.openGridSnapFixedFootprints.set(footprint, recoverable)
    return recoverable
  }

  getOpenGridWallCoverReference(): ShapePromise {
    if (!this.openGridWallCoverReference) {
      const referencePromise = loadOpenGridWallCoverReference()
        .then((reference) => {
          if (this.isDisposed()) {
            reference.delete()
            throw new Error('WORKER_TERMINATED')
          }
          return reference
        })
        .catch((error) => {
          if (this.openGridWallCoverReference === referencePromise) {
            this.openGridWallCoverReference = null
          }
          throw error
        })
      this.openGridWallCoverReference = referencePromise
    }
    return this.openGridWallCoverReference
  }

  getOpenGridSnapOpenConnectHead(): ShapePromise {
    if (!this.openGridSnapOpenConnectHeadAsset) {
      const headPromise = loadOpenGridSnapOpenConnectHead()
        .then((head) => {
          if (this.isDisposed()) {
            head.delete()
            throw new Error('WORKER_TERMINATED')
          }
          return head
        })
        .catch((error) => {
          if (this.openGridSnapOpenConnectHeadAsset === headPromise) {
            this.openGridSnapOpenConnectHeadAsset = null
          }
          throw error
        })
      this.openGridSnapOpenConnectHeadAsset = headPromise
    }
    return this.openGridSnapOpenConnectHeadAsset
  }

  getOpenGridSnapRemoverAsset(): ShapePromise {
    if (!this.openGridSnapRemoverAsset) {
      const assetPromise = loadOpenGridSnapRemoverAsset()
        .then((asset) => {
          if (this.isDisposed()) {
            asset.delete()
            throw new Error('WORKER_TERMINATED')
          }
          return asset
        })
        .catch((error) => {
          if (this.openGridSnapRemoverAsset === assetPromise) {
            this.openGridSnapRemoverAsset = null
          }
          throw error
        })
      this.openGridSnapRemoverAsset = assetPromise
    }
    return this.openGridSnapRemoverAsset
  }

  getOpenGridOpenConnectShelfLockedSlot(): ShapePromise {
    if (!this.openGridOpenConnectShelfLockedSlot) {
      const assetPromise = loadOpenGridOpenConnectShelfLockedSlot()
        .then((asset) => {
          if (this.isDisposed()) {
            asset.delete()
            throw new Error('WORKER_TERMINATED')
          }
          return asset
        })
        .catch((error) => {
          if (this.openGridOpenConnectShelfLockedSlot === assetPromise) {
            this.openGridOpenConnectShelfLockedSlot = null
          }
          throw error
        })
      this.openGridOpenConnectShelfLockedSlot = assetPromise
    }
    return this.openGridOpenConnectShelfLockedSlot
  }

  getOpenGridDetachableCornerSeatReference(): ShapePromise {
    if (!this.openGridDetachableCornerSeatReference) {
      const referencePromise = loadOpenGridDetachableCornerSeatReference()
        .then((reference) => {
          if (this.isDisposed()) {
            reference.delete()
            throw new Error('WORKER_TERMINATED')
          }
          return reference
        })
        .catch((error) => {
          if (this.openGridDetachableCornerSeatReference === referencePromise) {
            this.openGridDetachableCornerSeatReference = null
          }
          throw error
        })
      this.openGridDetachableCornerSeatReference = referencePromise
    }
    return this.openGridDetachableCornerSeatReference
  }

  getOpenGridDetachableCornerSeatHolderReference(): ShapePromise {
    if (!this.openGridDetachableCornerSeatHolderReference) {
      const referencePromise = loadOpenGridDetachableCornerSeatHolderReference()
        .then((reference) => {
          if (this.isDisposed()) {
            reference.delete()
            throw new Error('WORKER_TERMINATED')
          }
          return reference
        })
        .catch((error) => {
          if (
            this.openGridDetachableCornerSeatHolderReference ===
            referencePromise
          ) {
            this.openGridDetachableCornerSeatHolderReference = null
          }
          throw error
        })
      this.openGridDetachableCornerSeatHolderReference = referencePromise
    }
    return this.openGridDetachableCornerSeatHolderReference
  }

  dispose(): void {
    this.disposeShapePromise('modularGridBaseTemplate')
    this.disposeShapePromise('hswCellTemplate')
    this.disposeShapePromise('hexagonalColumnReference')
    this.disposeShapeMap(this.openGridPrototypes)
    this.disposeShapeMap(this.openGridCanonicalTiles)
    this.disposeShapeMap(this.openGridHalfCellPrototypes)
    this.disposeShapeMap(this.openGridSnapReferences)
    this.disposeShapeMap(this.openGridSnapFixedFootprints)
    this.disposeShapePromise('openGridWallCoverReference')
    this.disposeShapePromise('openGridSnapOpenConnectHeadAsset')
    this.disposeShapePromise('openGridSnapRemoverAsset')
    this.disposeShapePromise('openGridOpenConnectShelfLockedSlot')
    this.disposeShapePromise('openGridDetachableCornerSeatReference')
    this.disposeShapePromise('openGridDetachableCornerSeatHolderReference')
  }

  private disposeShapePromise(
    property:
      | 'modularGridBaseTemplate'
      | 'hswCellTemplate'
      | 'hexagonalColumnReference'
      | 'openGridWallCoverReference'
      | 'openGridSnapOpenConnectHeadAsset'
      | 'openGridSnapRemoverAsset'
      | 'openGridOpenConnectShelfLockedSlot'
      | 'openGridDetachableCornerSeatReference'
      | 'openGridDetachableCornerSeatHolderReference',
  ): void {
    const promise = this[property]
    this[property] = null
    if (!promise) return
    void promise.then((shape) => shape.delete()).catch(() => undefined)
  }

  private disposeShapeMap(map: Map<unknown, ShapePromise>): void {
    const promises = [...map.values()]
    map.clear()
    for (const promise of promises) {
      void promise.then((shape) => shape.delete()).catch(() => undefined)
    }
  }
}
