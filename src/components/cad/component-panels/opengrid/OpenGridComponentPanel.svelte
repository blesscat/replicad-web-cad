<script lang="ts">
  import { calculateOpenGridPrintPlan } from '../../../../features/cad/grid-dimensions'
  import {
    OPENGRID_CONFIGURATION,
    openGridBoardConfiguration,
    type HalfCellX,
    type HalfCellY,
    type OpenGridCornerFlags,
    type OpenGridParameterKey,
    type OpenGridParameters,
    type OpenGridSideFlags,
    type OpenGridScrewDimensions,
    type OpenGridScrewPreset,
  } from '../../../../cad-contract/units'
  import OpenGridPrintPlanCalculator from './OpenGridPrintPlanCalculator.svelte'
  import ParameterField from '../ParameterField.svelte'
  import RestoreButton from '../RestoreButton.svelte'
  import Slider from '../Slider.svelte'
  import type { OpenGridComponentPanelProps } from '../types'

  let {
    parameters,
    fieldErrors,
    onParametersChange,
    onDimensionCalculationInvalid,
  }: OpenGridComponentPanelProps = $props()

  let board = $derived(openGridBoardConfiguration(parameters))
  let width = $derived(board.width)
  let depth = $derived(board.depth)
  let thickness = $derived(
    OPENGRID_CONFIGURATION.variants[parameters.variant]?.thickness ?? 0,
  )
  let latticeRows = $derived(Math.max(parameters.rows - 1, 0))
  let latticeColumns = $derived(Math.max(parameters.columns - 1, 0))
  let selectedCount = $derived(parameters.customScrewPositions.length)

  type ScrewPresetOption = 'official-default' | OpenGridScrewPreset | 'custom'

  const screwPresetKeys: readonly OpenGridScrewPreset[] = [
    'm3',
    'm4',
    'm5',
    'm6',
    'm7',
  ]

  function screwDimensionsMatch(dimensions: OpenGridScrewDimensions): boolean {
    return (
      parameters.screwDiameter === dimensions.diameter &&
      parameters.screwHeadDiameter === dimensions.headDiameter &&
      parameters.screwHeadInset === dimensions.headInset &&
      parameters.screwHeadIsCountersunk === dimensions.headIsCountersunk &&
      parameters.screwHeadCountersunkDegree === dimensions.headCountersunkDegree
    )
  }

  function currentScrewPreset(): ScrewPresetOption {
    if (parameters.screwKind === 'official-default') {
      return 'official-default'
    }
    for (const preset of screwPresetKeys) {
      if (screwDimensionsMatch(OPENGRID_CONFIGURATION.screwPresets[preset])) {
        return preset
      }
    }
    return 'custom'
  }

  let selectedScrewPreset = $derived.by(() => currentScrewPreset())
  let showAdvancedScrewSettings = $state(false)

  $effect(() => {
    showAdvancedScrewSettings = parameters.screwKind === 'custom'
  })

  function valuesEqual(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) return true
    if (Array.isArray(left) && Array.isArray(right)) {
      return (
        left.length === right.length &&
        left.every((value, index) => valuesEqual(value, right[index]))
      )
    }
    if (
      typeof left === 'object' &&
      left !== null &&
      typeof right === 'object' &&
      right !== null
    ) {
      const leftRecord = left as Record<string, unknown>
      const rightRecord = right as Record<string, unknown>
      const leftKeys = Object.keys(leftRecord)
      const rightKeys = Object.keys(rightRecord)
      return (
        leftKeys.length === rightKeys.length &&
        leftKeys.every(
          (key) =>
            Object.prototype.hasOwnProperty.call(rightRecord, key) &&
            valuesEqual(leftRecord[key], rightRecord[key]),
        )
      )
    }
    return false
  }

  function parameterChanged(field: OpenGridParameterKey): boolean {
    return !valuesEqual(
      parameters[field],
      OPENGRID_CONFIGURATION.defaultParameters[field],
    )
  }

  function screwConfigurationChanged(): boolean {
    return (
      parameterChanged('screwKind') ||
      parameterChanged('screwDiameter') ||
      parameterChanged('screwHeadDiameter') ||
      parameterChanged('screwHeadInset') ||
      parameterChanged('screwHeadIsCountersunk') ||
      parameterChanged('screwHeadCountersunkDegree')
    )
  }

  function restoreParameter(field: OpenGridParameterKey): void {
    const defaultValue = OPENGRID_CONFIGURATION.defaultParameters[field]
    updateParameters({ [field]: defaultValue } as Partial<OpenGridParameters>)
  }

  function restoreGridCount(field: 'rows' | 'columns'): void {
    const defaultValue = OPENGRID_CONFIGURATION.defaultParameters[field]
    updateGridCounts({
      rows: field === 'rows' ? defaultValue : parameters.rows,
      columns: field === 'columns' ? defaultValue : parameters.columns,
    })
  }

  function restoreScrewMode(): void {
    updateParameters({
      screwMode: OPENGRID_CONFIGURATION.defaultParameters.screwMode,
      customScrewPositions: [],
    })
  }

  function restoreScrewConfiguration(): void {
    showAdvancedScrewSettings = false
    applyScrewDimensions(
      OPENGRID_CONFIGURATION.defaultParameters.screwKind,
      OPENGRID_CONFIGURATION.defaultScrew,
    )
  }

  function isScrewPreset(value: string): value is OpenGridScrewPreset {
    return screwPresetKeys.includes(value as OpenGridScrewPreset)
  }

  function isScrewPresetOption(value: string): value is ScrewPresetOption {
    return (
      value === 'official-default' || value === 'custom' || isScrewPreset(value)
    )
  }

  function screwPresetFitsCurrentBoard(
    dimensions: OpenGridScrewDimensions,
  ): boolean {
    const boardThickness =
      OPENGRID_CONFIGURATION.variants[parameters.variant].thickness
    return (
      dimensions.diameter > 0 &&
      dimensions.diameter <= dimensions.headDiameter &&
      dimensions.headDiameter <= OPENGRID_CONFIGURATION.tileInnerSize &&
      dimensions.headInset >= 0 &&
      dimensions.headInset <= boardThickness
    )
  }

  function applyScrewDimensions(
    screwKind: OpenGridParameters['screwKind'],
    dimensions: OpenGridScrewDimensions,
  ): void {
    updateParameters({
      screwKind,
      screwDiameter: dimensions.diameter,
      screwHeadDiameter: dimensions.headDiameter,
      screwHeadInset: dimensions.headInset,
      screwHeadIsCountersunk: dimensions.headIsCountersunk,
      screwHeadCountersunkDegree: dimensions.headCountersunkDegree,
    })
  }

  function applyScrewPreset(preset: OpenGridScrewPreset): void {
    applyScrewDimensions('custom', OPENGRID_CONFIGURATION.screwPresets[preset])
  }

  function clonePositions(): OpenGridParameters['customScrewPositions'] {
    return parameters.customScrewPositions.map((position) => ({ ...position }))
  }

  function centerScrewAvailable(rows: number, columns: number): boolean {
    return rows >= 2 && columns >= 2
  }

  type GridAxis = 'x' | 'y'

  function axisHasHalfCell(axis: GridAxis): boolean {
    return axis === 'x'
      ? parameters.halfCellX !== 'none'
      : parameters.halfCellY !== 'none'
  }

  function displayedGridCount(axis: GridAxis): number {
    const fullCount = axis === 'x' ? parameters.columns : parameters.rows
    return fullCount + (axisHasHalfCell(axis) ? 0.5 : 0)
  }

  function formatGridCount(axis: GridAxis): string {
    return displayedGridCount(axis).toFixed(1).replace(/\.0$/, '')
  }

  function gridCountMinimum(axis: GridAxis): number {
    return 1
  }

  function gridCountMaximum(axis: GridAxis): number {
    return (
      OPENGRID_CONFIGURATION.maxGridCount + (axisHasHalfCell(axis) ? 0.5 : 0)
    )
  }

  function fullGridCountFromSlider(axis: GridAxis, value: number): number {
    if (!axisHasHalfCell(axis)) return Math.round(value)

    // Half-cell mode exposes only 1.5, 2.5, ... as committed total counts.
    // The range keeps a 0.5 step and briefly visits the integer between two
    // valid half counts while the thumb moves in either direction.
    const currentValue = displayedGridCount(axis)
    const fullCount =
      value < currentValue ? Math.floor(value - 0.5) : Math.ceil(value - 0.5)
    return Math.max(1, fullCount)
  }

  function gridCountStep(axis: GridAxis): number {
    return axisHasHalfCell(axis) ? 0.5 : 1
  }

  function updateGridCounts(
    changes: Pick<OpenGridParameters, 'rows' | 'columns'>,
  ): void {
    const positions = clonePositions().filter(
      (position) =>
        position.row < changes.rows && position.column < changes.columns,
    )
    updateParameters({
      ...changes,
      screwCenter: centerScrewAvailable(changes.rows, changes.columns)
        ? parameters.screwCenter
        : false,
      customScrewPositions: positions,
    })
  }

  function updateParameters(changes: Partial<OpenGridParameters>): void {
    const next: OpenGridParameters = {
      ...parameters,
      ...changes,
      chamferCorners: {
        ...parameters.chamferCorners,
        ...(changes.chamferCorners ?? {}),
      },
      connectorSides: {
        ...parameters.connectorSides,
        ...(changes.connectorSides ?? {}),
      },
      customScrewPositions: (
        changes.customScrewPositions ?? clonePositions()
      ).map((position) => ({ ...position })),
    }
    onParametersChange(next)
  }

  function updateNumber(
    field:
      | 'rows'
      | 'columns'
      | 'screwEvery'
      | 'screwEveryRows'
      | 'screwEveryColumns'
      | 'screwDiameter'
      | 'screwHeadDiameter'
      | 'screwHeadInset'
      | 'screwHeadCountersunkDegree',
    event: Event,
  ): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateNumberValue(field, event.currentTarget.value)
  }

  function updateNumberValue(
    field:
      | 'rows'
      | 'columns'
      | 'screwEvery'
      | 'screwEveryRows'
      | 'screwEveryColumns'
      | 'screwDiameter'
      | 'screwHeadDiameter'
      | 'screwHeadInset'
      | 'screwHeadCountersunkDegree',
    value: string,
  ): void {
    const numericValue = Number(value)
    if (field !== 'rows' && field !== 'columns') {
      updateParameters({ [field]: numericValue })
      return
    }

    const axis: GridAxis = field === 'columns' ? 'x' : 'y'
    const fullCount = fullGridCountFromSlider(axis, numericValue)
    updateGridCounts({
      rows: field === 'rows' ? fullCount : parameters.rows,
      columns: field === 'columns' ? fullCount : parameters.columns,
    })
  }

  function handlePrintPlanCalculation(changes: {
    rows: number
    columns: number
  }): void {
    // Planning changes only the primary piece dimensions. Keep screw settings
    // and custom positions intact; manual slider edits retain their existing
    // position-cleanup behavior through updateGridCounts.
    updateParameters(changes)
  }

  function updateHalfCellX(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    updateParameters({ halfCellX: event.currentTarget.value as HalfCellX })
  }

  function updateHalfCellY(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    updateParameters({ halfCellY: event.currentTarget.value as HalfCellY })
  }

  function updateSelect(
    field:
      'variant' | 'chamfers' | 'screwKind' | 'screwMode' | 'connectorHoles',
    event: Event,
  ): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    const value = event.currentTarget.value
    if (field === 'variant') {
      updateParameters({ variant: value as OpenGridParameters['variant'] })
      return
    }
    if (field === 'chamfers') {
      updateParameters({ chamfers: value as OpenGridParameters['chamfers'] })
      return
    }
    if (field === 'screwKind') {
      if (!isScrewPresetOption(value)) return
      if (value === 'official-default') {
        showAdvancedScrewSettings = false
        applyScrewDimensions(
          'official-default',
          OPENGRID_CONFIGURATION.defaultScrew,
        )
      } else if (value === 'custom') {
        showAdvancedScrewSettings = true
        updateParameters({ screwKind: 'custom' })
      } else {
        showAdvancedScrewSettings = true
        applyScrewPreset(value)
      }
      return
    }
    if (field === 'screwMode') {
      const screwMode = value as OpenGridParameters['screwMode']
      updateParameters({
        screwMode,
        customScrewPositions: screwMode === 'custom' ? clonePositions() : [],
      })
      return
    }
    updateParameters({
      connectorHoles: value as OpenGridParameters['connectorHoles'],
    })
  }

  function updateCorner(field: keyof OpenGridCornerFlags, event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateParameters({
      chamferCorners: { [field]: event.currentTarget.checked },
    })
  }

  function updateSide(field: keyof OpenGridSideFlags, event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateParameters({
      connectorSides: { [field]: event.currentTarget.checked },
    })
  }

  function updateCountersunk(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateParameters({ screwHeadIsCountersunk: event.currentTarget.checked })
  }

  function updateScrewCenter(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    updateParameters({ screwCenter: event.currentTarget.checked })
  }

  function updateAdvancedScrewSettings(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    showAdvancedScrewSettings = event.currentTarget.checked
  }

  function hasPosition(row: number, column: number): boolean {
    return parameters.customScrewPositions.some(
      (position) => position.row === row && position.column === column,
    )
  }

  function togglePosition(row: number, column: number): void {
    const positions = clonePositions()
    const index = positions.findIndex(
      (position) => position.row === row && position.column === column,
    )
    if (index >= 0) {
      positions.splice(index, 1)
    } else {
      positions.push({ row, column })
    }
    updateParameters({ customScrewPositions: positions })
  }

  function fieldError(field: keyof OpenGridParameters | 'parameters') {
    return fieldErrors[field]
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0" data-testid="opengrid-panel">
  <ParameterField
    label="板型"
    changed={parameterChanged('variant')}
    error={fieldError('variant')}
    errorId="opengrid-variant-error"
    restoreLabel="OpenGrid 板型"
    onRestore={() => restoreParameter('variant')}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label="OpenGrid 板型"
      aria-describedby={fieldError('variant')
        ? 'opengrid-variant-error'
        : undefined}
      aria-invalid={Boolean(fieldError('variant'))}
      value={parameters.variant}
      onchange={(event) => updateSelect('variant', event)}
    >
      <option value="Lite">Lite（4 mm）</option>
      <option value="Full">Full（6.8 mm）</option>
      <option value="Heavy">Heavy（13.8 mm，雙面）</option>
      <option value="Hybrid"
        >Hybrid（13.8 mm max，外圍 Heavy／內部 Full）</option
      >
    </select>
  </ParameterField>

  <OpenGridPrintPlanCalculator
    calculate={calculateOpenGridPrintPlan}
    onApply={handlePrintPlanCalculation}
    onInvalid={onDimensionCalculationInvalid}
  />

  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
    <ParameterField
      label="X 半格方向"
      changed={parameterChanged('halfCellX')}
      error={fieldError('halfCellX')}
      errorId="opengrid-half-cell-x-error"
      restoreLabel="OpenGrid X 半格方向"
      onRestore={() => restoreParameter('halfCellX')}
    >
      <select
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label="OpenGrid X 半格方向"
        aria-describedby={fieldError('halfCellX')
          ? 'opengrid-half-cell-x-error'
          : undefined}
        aria-invalid={Boolean(fieldError('halfCellX'))}
        value={parameters.halfCellX}
        onchange={updateHalfCellX}
      >
        <option value="none">無</option>
        <option value="left">左</option>
        <option value="right">右</option>
      </select>
    </ParameterField>

    <ParameterField
      label="Y 半格方向"
      changed={parameterChanged('halfCellY')}
      error={fieldError('halfCellY')}
      errorId="opengrid-half-cell-y-error"
      restoreLabel="OpenGrid Y 半格方向"
      onRestore={() => restoreParameter('halfCellY')}
    >
      <select
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label="OpenGrid Y 半格方向"
        aria-describedby={fieldError('halfCellY')
          ? 'opengrid-half-cell-y-error'
          : undefined}
        aria-invalid={Boolean(fieldError('halfCellY'))}
        value={parameters.halfCellY}
        onchange={updateHalfCellY}
      >
        <option value="none">無</option>
        <option value="top">上</option>
        <option value="bottom">下</option>
      </select>
    </ParameterField>
  </div>

  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
    <ParameterField
      label="X"
      unit={`${formatGridCount('x')} 格`}
      unitAriaLive
      changed={parameterChanged('columns')}
      error={fieldError('columns')}
      errorId="opengrid-columns-error"
      restoreLabel="X"
      onRestore={() => restoreGridCount('columns')}
    >
      <Slider
        value={displayedGridCount('x')}
        label="X"
        min={gridCountMinimum('x')}
        max={gridCountMaximum('x')}
        step={gridCountStep('x')}
        error={fieldError('columns')}
        describedBy={fieldError('columns')
          ? 'opengrid-columns-error'
          : undefined}
        onChange={(value) => updateNumberValue('columns', value)}
      />
    </ParameterField>
    <ParameterField
      label="Y"
      unit={`${formatGridCount('y')} 格`}
      unitAriaLive
      changed={parameterChanged('rows')}
      error={fieldError('rows')}
      errorId="opengrid-rows-error"
      restoreLabel="Y"
      onRestore={() => restoreGridCount('rows')}
    >
      <Slider
        value={displayedGridCount('y')}
        label="Y"
        min={gridCountMinimum('y')}
        max={gridCountMaximum('y')}
        step={gridCountStep('y')}
        error={fieldError('rows')}
        describedBy={fieldError('rows') ? 'opengrid-rows-error' : undefined}
        onChange={(value) => updateNumberValue('rows', value)}
      />
    </ParameterField>
  </div>

  <p class="m-0 text-sm text-muted">
    尺寸：{width} × {depth} × {thickness} mm
  </p>
  {#if parameters.variant === 'Hybrid'}
    <p class="m-0 text-sm text-muted" data-testid="opengrid-hybrid-description">
      Hybrid：13.8 mm 最大包絡；外圍使用 Heavy 雙層，內部保留標準 Full 介面。
    </p>
  {/if}

  <ParameterField
    label="倒角模式"
    changed={parameterChanged('chamfers')}
    restoreLabel="OpenGrid 倒角模式"
    onRestore={() => restoreParameter('chamfers')}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label="OpenGrid 倒角模式"
      value={parameters.chamfers}
      onchange={(event) => updateSelect('chamfers', event)}
    >
      <option value="corners">Corners（官方預設）</option>
      <option value="everywhere">Everywhere</option>
      <option value="none">None</option>
    </select>
  </ParameterField>

  {#if parameters.chamfers !== 'none'}
    <div class="grid gap-2 rounded-lg border border-border-card p-2">
      <span class="font-[650]">外角倒角</span>
      <div class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {#each [['topLeft', '左上'], ['topRight', '右上'], ['bottomLeft', '左下'], ['bottomRight', '右下']] as item}
          {@const corner = item[0] as keyof OpenGridCornerFlags}
          <div class="relative min-w-0 flex items-center gap-2">
            <label class="flex min-w-0 grow items-center gap-2">
              <input
                type="checkbox"
                checked={parameters.chamferCorners[corner]}
                onchange={(event) => updateCorner(corner, event)}
              />
              {item[1]}
            </label>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <ParameterField
    label="連接孔"
    changed={parameterChanged('connectorHoles')}
    error={fieldError('connectorHoles')}
    errorId="opengrid-connector-holes-error"
    restoreLabel="OpenGrid 連接孔"
    onRestore={() => restoreParameter('connectorHoles')}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label="OpenGrid 連接孔"
      aria-describedby={fieldError('connectorHoles')
        ? 'opengrid-connector-holes-error'
        : undefined}
      aria-invalid={Boolean(fieldError('connectorHoles'))}
      value={parameters.connectorHoles}
      onchange={(event) => updateSelect('connectorHoles', event)}
    >
      <option value="enabled">啟用官方接頭孔</option>
      <option value="none">無</option>
    </select>
  </ParameterField>

  {#if parameters.connectorHoles === 'enabled'}
    <div class="grid gap-2 rounded-lg border border-border-card p-2">
      <span class="font-[650]">接頭孔側邊</span>
      <div class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {#each [['top', '上'], ['right', '右'], ['bottom', '下'], ['left', '左']] as item}
          {@const side = item[0] as keyof OpenGridSideFlags}
          <div class="relative min-w-0 flex items-center gap-2">
            <label class="flex min-w-0 grow items-center gap-2">
              <input
                type="checkbox"
                checked={parameters.connectorSides[side]}
                onchange={(event) => updateSide(side, event)}
              />
              {item[1]}
            </label>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <ParameterField
    label="螺絲尺寸來源"
    changed={screwConfigurationChanged()}
    restoreLabel="OpenGrid 螺絲尺寸來源"
    onRestore={restoreScrewConfiguration}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label="OpenGrid 螺絲尺寸來源"
      value={selectedScrewPreset}
      onchange={(event) => updateSelect('screwKind', event)}
    >
      <option value="official-default">
        官方 SCAD 預設（Ø4.1 / 頭Ø7.2）
      </option>
      <optgroup label="常見沉頭木螺絲（DIN 7997）">
        {#each screwPresetKeys as preset}
          {@const dimensions = OPENGRID_CONFIGURATION.screwPresets[preset]}
          <option
            value={preset}
            disabled={!screwPresetFitsCurrentBoard(dimensions)}
          >
            {preset.toUpperCase()} 木螺絲（通孔 Ø{dimensions.diameter} / 頭Ø{dimensions.headDiameter}）
          </option>
        {/each}
      </optgroup>
      <option value="custom">custom（自訂尺寸）</option>
    </select>
    {#if isScrewPreset(selectedScrewPreset)}
      <p class="m-0 text-sm text-muted">
        木螺絲預設採 90° 沉頭；板厚或格內淨空不足的規格會停用。
      </p>
    {/if}
  </ParameterField>

  {#if parameters.screwKind === 'custom'}
    <label class="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        aria-label="進階設定"
        checked={showAdvancedScrewSettings}
        onchange={updateAdvancedScrewSettings}
      />
      進階設定
    </label>

    {#if showAdvancedScrewSettings}
      <div class="grid gap-2" data-testid="opengrid-advanced-screw-settings">
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            aria-label="OpenGrid 是否沉頭"
            checked={parameters.screwHeadIsCountersunk}
            onchange={updateCountersunk}
          />
          使用沉頭孔
        </label>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ParameterField label="通孔直徑（mm）">
            <input
              class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
              aria-label="OpenGrid 螺絲通孔直徑"
              type="number"
              min="0.1"
              step="0.1"
              value={parameters.screwDiameter}
              oninput={(event) => updateNumber('screwDiameter', event)}
            />
          </ParameterField>
          <ParameterField label="頭部直徑（mm）">
            <input
              class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
              aria-label="OpenGrid 螺絲頭直徑"
              type="number"
              min="0.1"
              step="0.1"
              value={parameters.screwHeadDiameter}
              oninput={(event) => updateNumber('screwHeadDiameter', event)}
            />
          </ParameterField>
          <ParameterField label="頭部內縮（mm）">
            <input
              class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
              aria-label="OpenGrid 螺絲頭內縮"
              type="number"
              min="0"
              step="0.1"
              value={parameters.screwHeadInset}
              oninput={(event) => updateNumber('screwHeadInset', event)}
            />
          </ParameterField>
          <ParameterField label="沉頭角度（°）">
            <input
              class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
              aria-label="OpenGrid 螺絲沉頭角度"
              type="number"
              min="1"
              max="179"
              step="1"
              value={parameters.screwHeadCountersunkDegree}
              oninput={(event) =>
                updateNumber('screwHeadCountersunkDegree', event)}
            />
          </ParameterField>
        </div>
      </div>
    {/if}
  {/if}

  <ParameterField
    label="螺絲孔模式"
    changed={parameterChanged('screwMode')}
    error={fieldError('screwMode')}
    errorId="opengrid-screw-mode-error"
    restoreLabel="OpenGrid 螺絲孔模式"
    onRestore={restoreScrewMode}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label="OpenGrid 螺絲孔模式"
      aria-describedby={fieldError('screwMode')
        ? 'opengrid-screw-mode-error'
        : undefined}
      aria-invalid={Boolean(fieldError('screwMode'))}
      value={parameters.screwMode}
      onchange={(event) => updateSelect('screwMode', event)}
    >
      <option value="corners">Corners（官方預設）</option>
      <option value="everywhere">Everywhere（內部交界）</option>
      <option value="by-row-column">By Row and Column</option>
      <option value="custom">Custom</option>
      <option value="none">None</option>
    </select>
  </ParameterField>

  {#if parameters.screwMode === 'by-row-column'}
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <ParameterField
        label="Every X Rows"
        changed={parameterChanged('screwEveryRows')}
        restoreLabel="OpenGrid 每幾行螺絲孔"
        onRestore={() => restoreParameter('screwEveryRows')}
      >
        <input
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
          aria-label="OpenGrid 每幾行螺絲孔"
          type="number"
          min="1"
          max={OPENGRID_CONFIGURATION.maxGridCount}
          step="1"
          value={parameters.screwEveryRows}
          oninput={(event) => updateNumber('screwEveryRows', event)}
        />
      </ParameterField>
      <ParameterField
        label="Every X Columns"
        changed={parameterChanged('screwEveryColumns')}
        restoreLabel="OpenGrid 每幾列螺絲孔"
        onRestore={() => restoreParameter('screwEveryColumns')}
      >
        <input
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
          aria-label="OpenGrid 每幾列螺絲孔"
          type="number"
          min="1"
          max={OPENGRID_CONFIGURATION.maxGridCount}
          step="1"
          value={parameters.screwEveryColumns}
          oninput={(event) => updateNumber('screwEveryColumns', event)}
        />
      </ParameterField>
    </div>
  {/if}

  <div class="grid gap-3">
    <div class="grid gap-1 text-sm">
      <label class="flex min-w-0 grow items-center gap-2">
        <input
          type="checkbox"
          aria-label="OpenGrid 正中心螺絲孔"
          checked={parameters.screwCenter}
          disabled={!centerScrewAvailable(parameters.rows, parameters.columns)}
          onchange={updateScrewCenter}
        />
        正中心螺絲孔
      </label>
    </div>
    <ParameterField
      label="每隔幾格一個孔（0=關閉）"
      changed={parameterChanged('screwEvery')}
      restoreLabel="OpenGrid 每隔幾格一個螺絲孔"
      onRestore={() => restoreParameter('screwEvery')}
    >
      <input
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label="OpenGrid 每隔幾格一個螺絲孔"
        type="number"
        min="0"
        max={OPENGRID_CONFIGURATION.maxGridCount}
        step="1"
        value={parameters.screwEvery}
        oninput={(event) => updateNumber('screwEvery', event)}
      />
    </ParameterField>
  </div>
  {#if parameters.screwMode === 'custom'}
    <div class="grid gap-2" data-testid="opengrid-custom-matrix">
      <div class="relative flex items-center justify-between gap-2">
        <span class="min-w-0 font-[650]">自訂內部交界螺絲孔</span>
        <div class="flex shrink-0 items-center gap-1">
          <RestoreButton
            label="OpenGrid 自訂內部交界螺絲孔"
            visible={parameterChanged('customScrewPositions')}
            onRestore={() => restoreParameter('customScrewPositions')}
          />
          <span class="text-sm text-muted" aria-live="polite"
            >已選 {selectedCount} 孔</span
          >
        </div>
      </div>
      <p class="m-0 text-sm text-muted">
        按官方 SCAD 的左至右、上至下順序選取；只有內部格線交界可選。
      </p>
      {#if latticeRows === 0 || latticeColumns === 0}
        <p class="m-0 text-sm text-muted">目前沒有內部交界格點。</p>
      {:else}
        <div class="grid max-h-96 gap-2 overflow-auto pr-1">
          {#each Array.from({ length: latticeRows }) as _, row}
            {#each Array.from({ length: latticeColumns }) as _, column}
              <button
                class="rounded-lg border border-border-card px-2 py-2 text-left text-xs"
                class:border-primary={hasPosition(row, column)}
                class:bg-primary={hasPosition(row, column)}
                class:text-white={hasPosition(row, column)}
                type="button"
                aria-pressed={hasPosition(row, column)}
                aria-label={`內部交界第 ${row + 1} 行第 ${column + 1} 列`}
                onclick={() => togglePosition(row, column)}
              >
                交界 {row + 1} × {column + 1}
              </button>
            {/each}
          {/each}
        </div>
      {/if}
      {#if fieldError('customScrewPositions')}<span
          class="text-sm text-error"
          role="alert">{fieldError('customScrewPositions')}</span
        >{/if}
    </div>
  {/if}

  {#each ['variant', 'chamfers', 'connectorHoles', 'screwKind', 'screwMode', 'screwCenter', 'screwEvery', 'screwDiameter', 'screwHeadDiameter', 'screwHeadInset', 'screwHeadCountersunkDegree'] as field}
    {#if fieldError(field as keyof OpenGridParameters)}<span
        class="text-sm text-error"
        role="alert">{fieldError(field as keyof OpenGridParameters)}</span
      >{/if}
  {/each}
  {#if fieldError('parameters')}<span class="text-sm text-error" role="alert"
      >{fieldError('parameters')}</span
    >{/if}
</fieldset>
