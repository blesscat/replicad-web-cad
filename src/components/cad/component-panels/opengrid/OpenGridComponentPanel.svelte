<script lang="ts">
  import {
    OPENGRID_CONFIGURATION,
    type OpenGridCornerFlags,
    type OpenGridParameters,
    type OpenGridSideFlags,
  } from '../../../../cad-contract/units'
  import type { OpenGridComponentPanelProps } from '../types'

  let {
    parameters,
    fieldErrors,
    onParametersChange,
  }: OpenGridComponentPanelProps = $props()

  let width = $derived(parameters.columns * OPENGRID_CONFIGURATION.gridPitch)
  let depth = $derived(parameters.rows * OPENGRID_CONFIGURATION.gridPitch)
  let thickness = $derived(
    OPENGRID_CONFIGURATION.variants[parameters.variant]?.thickness ?? 0,
  )
  let latticeRows = $derived(Math.max(parameters.rows - 1, 0))
  let latticeColumns = $derived(Math.max(parameters.columns - 1, 0))
  let selectedCount = $derived(parameters.customScrewPositions.length)

  function clonePositions(): OpenGridParameters['customScrewPositions'] {
    return parameters.customScrewPositions.map((position) => ({ ...position }))
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
      | 'screwEveryRows'
      | 'screwEveryColumns'
      | 'screwDiameter'
      | 'screwHeadDiameter'
      | 'screwHeadInset'
      | 'screwHeadCountersunkDegree',
    event: Event,
  ): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    const numericValue = Number(event.currentTarget.value)
    if (field !== 'rows' && field !== 'columns') {
      updateParameters({ [field]: numericValue })
      return
    }

    const nextRows = field === 'rows' ? numericValue : parameters.rows
    const nextColumns = field === 'columns' ? numericValue : parameters.columns
    const positions = clonePositions().filter(
      (position) => position.row < nextRows && position.column < nextColumns,
    )
    updateParameters({
      [field]: numericValue,
      customScrewPositions: positions,
    })
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
      if (value === 'official-default') {
        updateParameters({
          screwKind: 'official-default',
          ...OPENGRID_CONFIGURATION.defaultScrew,
        })
      } else {
        updateParameters({ screwKind: 'custom' })
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
  <legend class="text-muted">OpenGrid 官方參數</legend>

  <label class="grid gap-1">
    <span class="font-[650]">板型</span>
    <select
      class="rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label="OpenGrid 板型"
      aria-invalid={Boolean(fieldError('variant'))}
      value={parameters.variant}
      onchange={(event) => updateSelect('variant', event)}
    >
      <option value="Full">Full（6.8 mm）</option>
      <option value="Lite">Lite（4 mm）</option>
      <option value="Heavy">Heavy（13.8 mm，雙面）</option>
    </select>
    {#if fieldError('variant')}<span class="text-sm text-error" role="alert"
        >{fieldError('variant')}</span
      >{/if}
  </label>

  <div class="grid grid-cols-2 gap-2">
    <label class="grid gap-1">
      <span class="font-[650]">行數（Y）</span>
      <input
        class="rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label="OpenGrid 行數"
        aria-invalid={Boolean(fieldError('rows'))}
        type="number"
        min="1"
        max={OPENGRID_CONFIGURATION.maxGridCount}
        step="1"
        value={parameters.rows}
        oninput={(event) => updateNumber('rows', event)}
      />
      {#if fieldError('rows')}<span class="text-sm text-error" role="alert"
          >{fieldError('rows')}</span
        >{/if}
    </label>
    <label class="grid gap-1">
      <span class="font-[650]">列數（X）</span>
      <input
        class="rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label="OpenGrid 列數"
        aria-invalid={Boolean(fieldError('columns'))}
        type="number"
        min="1"
        max={OPENGRID_CONFIGURATION.maxGridCount}
        step="1"
        value={parameters.columns}
        oninput={(event) => updateNumber('columns', event)}
      />
      {#if fieldError('columns')}<span class="text-sm text-error" role="alert"
          >{fieldError('columns')}</span
        >{/if}
    </label>
  </div>

  <p class="m-0 text-sm text-muted">
    尺寸：{width} × {depth} × {thickness} mm（官方 28 mm pitch；內部淨空 25 mm）
  </p>

  <label class="grid gap-1">
    <span class="font-[650]">倒角模式</span>
    <select
      class="rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label="OpenGrid 倒角模式"
      value={parameters.chamfers}
      onchange={(event) => updateSelect('chamfers', event)}
    >
      <option value="corners">Corners（官方預設）</option>
      <option value="everywhere">Everywhere</option>
      <option value="none">None</option>
    </select>
  </label>

  {#if parameters.chamfers !== 'none'}
    <div class="grid gap-2 rounded-lg border border-border-card p-2">
      <span class="font-[650]">外角倒角</span>
      <div class="grid grid-cols-2 gap-2 text-sm">
        {#each [['topLeft', '左上'], ['topRight', '右上'], ['bottomLeft', '左下'], ['bottomRight', '右下']] as item}
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              checked={parameters.chamferCorners[
                item[0] as keyof OpenGridCornerFlags
              ]}
              onchange={(event) =>
                updateCorner(item[0] as keyof OpenGridCornerFlags, event)}
            />
            {item[1]}
          </label>
        {/each}
      </div>
    </div>
  {/if}

  <label class="grid gap-1">
    <span class="font-[650]">連接孔</span>
    <select
      class="rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label="OpenGrid 連接孔"
      aria-invalid={Boolean(fieldError('connectorHoles'))}
      value={parameters.connectorHoles}
      onchange={(event) => updateSelect('connectorHoles', event)}
    >
      <option value="enabled">啟用官方接頭孔</option>
      <option value="none">無</option>
    </select>
  </label>

  {#if parameters.connectorHoles === 'enabled'}
    <div class="grid gap-2 rounded-lg border border-border-card p-2">
      <span class="font-[650]">接頭孔側邊</span>
      <div class="grid grid-cols-2 gap-2 text-sm">
        {#each [['top', '上'], ['right', '右'], ['bottom', '下'], ['left', '左']] as item}
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              checked={parameters.connectorSides[
                item[0] as keyof OpenGridSideFlags
              ]}
              onchange={(event) =>
                updateSide(item[0] as keyof OpenGridSideFlags, event)}
            />
            {item[1]}
          </label>
        {/each}
      </div>
    </div>
  {/if}

  <label class="grid gap-1">
    <span class="font-[650]">螺絲尺寸來源</span>
    <select
      class="rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label="OpenGrid 螺絲尺寸來源"
      value={parameters.screwKind}
      onchange={(event) => updateSelect('screwKind', event)}
    >
      <option value="official-default">官方預設（Ø4.1 / 頭Ø7.2）</option>
      <option value="custom">Custom 尺寸</option>
    </select>
  </label>

  <label class="grid gap-1">
    <span class="font-[650]">螺絲孔模式</span>
    <select
      class="rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label="OpenGrid 螺絲孔模式"
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
  </label>

  {#if parameters.screwMode === 'by-row-column'}
    <div class="grid grid-cols-2 gap-2">
      <label class="grid gap-1">
        <span class="text-sm">Every X Rows</span>
        <input
          class="rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
          aria-label="OpenGrid 每幾行螺絲孔"
          type="number"
          min="1"
          max={OPENGRID_CONFIGURATION.maxGridCount}
          step="1"
          value={parameters.screwEveryRows}
          oninput={(event) => updateNumber('screwEveryRows', event)}
        />
      </label>
      <label class="grid gap-1">
        <span class="text-sm">Every X Columns</span>
        <input
          class="rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
          aria-label="OpenGrid 每幾列螺絲孔"
          type="number"
          min="1"
          max={OPENGRID_CONFIGURATION.maxGridCount}
          step="1"
          value={parameters.screwEveryColumns}
          oninput={(event) => updateNumber('screwEveryColumns', event)}
        />
      </label>
    </div>
  {/if}

  <div class="grid grid-cols-2 gap-2">
    <label class="grid gap-1">
      <span class="text-sm">通孔直徑（mm）</span>
      <input
        class="rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label="OpenGrid 螺絲通孔直徑"
        type="number"
        min="0.1"
        step="0.1"
        value={parameters.screwDiameter}
        oninput={(event) => updateNumber('screwDiameter', event)}
      />
    </label>
    <label class="grid gap-1">
      <span class="text-sm">頭部直徑（mm）</span>
      <input
        class="rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label="OpenGrid 螺絲頭直徑"
        type="number"
        min="0.1"
        step="0.1"
        value={parameters.screwHeadDiameter}
        oninput={(event) => updateNumber('screwHeadDiameter', event)}
      />
    </label>
    <label class="grid gap-1">
      <span class="text-sm">頭部內縮（mm）</span>
      <input
        class="rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label="OpenGrid 螺絲頭內縮"
        type="number"
        min="0"
        step="0.1"
        value={parameters.screwHeadInset}
        oninput={(event) => updateNumber('screwHeadInset', event)}
      />
    </label>
    <label class="grid gap-1">
      <span class="text-sm">沉頭角度（°）</span>
      <input
        class="rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label="OpenGrid 螺絲沉頭角度"
        type="number"
        min="1"
        max="179"
        step="1"
        value={parameters.screwHeadCountersunkDegree}
        oninput={(event) => updateNumber('screwHeadCountersunkDegree', event)}
      />
    </label>
  </div>
  <label class="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      aria-label="OpenGrid 是否沉頭"
      checked={parameters.screwHeadIsCountersunk}
      onchange={updateCountersunk}
    />
    使用沉頭孔
  </label>

  {#if parameters.screwMode === 'custom'}
    <div class="grid gap-2" data-testid="opengrid-custom-matrix">
      <div class="flex items-center justify-between gap-2">
        <span class="font-[650]">自訂內部交界螺絲孔</span>
        <span class="text-sm text-muted" aria-live="polite"
          >已選 {selectedCount} 孔</span
        >
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

  {#each ['variant', 'chamfers', 'connectorHoles', 'screwKind', 'screwMode', 'screwDiameter', 'screwHeadDiameter', 'screwHeadInset', 'screwHeadCountersunkDegree'] as field}
    {#if fieldError(field as keyof OpenGridParameters)}<span
        class="text-sm text-error"
        role="alert">{fieldError(field as keyof OpenGridParameters)}</span
      >{/if}
  {/each}
  {#if fieldError('parameters')}<span class="text-sm text-error" role="alert"
      >{fieldError('parameters')}</span
    >{/if}
</fieldset>
