<script lang="ts">
  import {
    displayParameterLabel,
    opengridStackableBoxDefinition,
  } from '../../../../features/cad/model-catalog'
  import {
    openGridStackableBoxOpeningBottomLengthMaximumFor,
    OPENGRID_STACKABLE_BOX_CONFIGURATION,
    OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
    type OpenGridStackableBoxOpeningDirection,
    type OpenGridStackableBoxOpeningParameterKey,
    type OpenGridStackableBoxParameters,
  } from '../../../../cad-contract/units'
  import { calculateOpenGridStackableBoxCounts } from '../../../../features/cad/grid-dimensions'
  import GridDimensionCalculator from '../GridDimensionCalculator.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'
  import type { ParameterField as ParameterFieldDefinition } from '../../../../features/cad/model-catalog'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()

  function handleDimensionCalculation(parameters: {
    rows: number
    columns: number
  }): void {
    onInputChange('x', String(parameters.columns))
    onInputChange('y', String(parameters.rows))
  }

  type BoxMode = 'default' | 'thin-shell'

  function handleModeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    const mode = event.currentTarget.value as BoxMode
    onInputChange('basePlateMode', 'false')
    onInputChange('thinShellMode', String(mode === 'thin-shell'))
  }

  function modeErrorDescriptionId(): string | undefined {
    const ids: string[] = []
    if (fieldErrors.basePlateMode) ids.push('basePlateMode-error')
    if (fieldErrors.thinShellMode) ids.push('thinShellMode-error')
    return ids.length > 0 ? ids.join(' ') : undefined
  }

  const openingGroups = [
    {
      direction: '-Y',
      label: '前方',
      defaultOpen: true,
      keys: [
        'openingMinusYDepth',
        'openingMinusYBottomLength',
        'openingMinusYAngle',
      ],
    },
    {
      direction: '+Y',
      label: '後方',
      defaultOpen: false,
      keys: [
        'openingPlusYDepth',
        'openingPlusYBottomLength',
        'openingPlusYAngle',
      ],
    },
    {
      direction: '-X',
      label: '左方',
      defaultOpen: false,
      keys: [
        'openingMinusXDepth',
        'openingMinusXBottomLength',
        'openingMinusXAngle',
      ],
    },
    {
      direction: '+X',
      label: '右方',
      defaultOpen: false,
      keys: [
        'openingPlusXDepth',
        'openingPlusXBottomLength',
        'openingPlusXAngle',
      ],
    },
  ] as const

  function rawNumberFor(key: string): number | null {
    const rawValue = rawParameters[key as keyof typeof rawParameters]
    if (rawValue === undefined || rawValue.trim() === '') return null
    const value = Number(rawValue)
    return Number.isFinite(value) ? value : null
  }

  function parametersForRange(): OpenGridStackableBoxParameters | null {
    const x = rawNumberFor('x')
    const y = rawNumberFor('y')
    const height = rawNumberFor('height')
    if (x === null || y === null || height === null) return null

    const openingValues = {} as Record<
      OpenGridStackableBoxOpeningParameterKey,
      number
    >
    for (const key of OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS) {
      openingValues[key] =
        rawNumberFor(key) ?? OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS[key]
    }

    return {
      x,
      y,
      height,
      cornerBottomHoles: rawParameters.cornerBottomHoles === 'true',
      fullBottomHoleGrid: rawParameters.fullBottomHoleGrid === 'true',
      basePlateMode: rawParameters.basePlateMode === 'true',
      thinShellMode: rawParameters.thinShellMode === 'true',
      ...openingValues,
    }
  }

  function fieldsFor(
    keys: readonly OpenGridStackableBoxOpeningParameterKey[],
    direction: OpenGridStackableBoxOpeningDirection,
    displayDirection: string,
  ): ParameterFieldDefinition[] {
    return keys.flatMap((key) => {
      const field = opengridStackableBoxDefinition.parameterSchema.find(
        (candidate) => candidate.key === key,
      )
      if (!field) return []
      const displayedField = { ...field, axis: displayDirection }
      if (field.key.endsWith('BottomLength')) {
        const depth = rawNumberFor(keys[0])
        const minimum =
          depth !== null && depth > 0
            ? 1
            : OPENGRID_STACKABLE_BOX_CONFIGURATION.openingBottomLengthMin
        const parameters = parametersForRange()
        let calculatedMaximum = field.max
        if (parameters) {
          calculatedMaximum = openGridStackableBoxOpeningBottomLengthMaximumFor(
            parameters,
            direction,
          )
        }
        const maximum = Math.max(
          minimum,
          Math.min(field.max, calculatedMaximum),
        )
        return [
          {
            ...displayedField,
            min: minimum,
            max: maximum,
            sliderMin: minimum,
            sliderMax: maximum,
          },
        ]
      }
      if (!field.key.endsWith('Depth')) return [displayedField]

      const height = rawNumberFor('height')
      if (height === null) return [displayedField]
      const maximum = Math.max(field.min, Math.min(field.max, height))
      return [{ ...displayedField, max: maximum, sliderMax: maximum }]
    })
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <GridDimensionCalculator
    calculate={calculateOpenGridStackableBoxCounts}
    description=""
    onApply={handleDimensionCalculation}
  />
  <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
    <label class="flex min-w-0 items-start gap-2">
      <input
        aria-describedby={fieldErrors.cornerBottomHoles
          ? 'cornerBottomHoles-error'
          : undefined}
        aria-invalid={Boolean(fieldErrors.cornerBottomHoles)}
        aria-label="底部四角孔"
        class="mt-1 accent-primary"
        type="checkbox"
        checked={rawParameters.cornerBottomHoles === 'true'}
        onchange={(event) => {
          if (!(event.currentTarget instanceof HTMLInputElement)) return
          onInputChange(
            'cornerBottomHoles',
            String(event.currentTarget.checked),
          )
        }}
      />
      <span class="font-[650]">底部四角孔</span>
    </label>
    <label class="flex min-w-0 items-start gap-2">
      <input
        aria-describedby={fieldErrors.fullBottomHoleGrid
          ? 'fullBottomHoleGrid-error'
          : undefined}
        aria-invalid={Boolean(fieldErrors.fullBottomHoleGrid)}
        aria-label="底部全孔模式"
        class="mt-1 accent-primary"
        type="checkbox"
        checked={rawParameters.fullBottomHoleGrid === 'true'}
        onchange={(event) => {
          if (!(event.currentTarget instanceof HTMLInputElement)) return
          onInputChange(
            'fullBottomHoleGrid',
            String(event.currentTarget.checked),
          )
        }}
      />
      <span class="font-[650]">底部全孔模式</span>
    </label>
  </div>
  <div
    aria-describedby={modeErrorDescriptionId()}
    aria-invalid={Boolean(
      fieldErrors.basePlateMode || fieldErrors.thinShellMode,
    )}
    aria-label="盒體模式"
    class="grid gap-1"
    role="radiogroup"
  >
    <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
      <label class="flex min-w-0 items-start gap-2">
        <input
          aria-describedby={modeErrorDescriptionId()}
          aria-label="薄殼模式"
          class="mt-1 accent-primary"
          data-testid="opengrid-stackable-box-thin-shell-mode"
          name="opengrid-stackable-box-mode"
          type="radio"
          value="thin-shell"
          checked={rawParameters.thinShellMode === 'true'}
          onchange={handleModeChange}
        />
        <span class="font-[650]">薄殼模式</span>
      </label>
      <label class="flex min-w-0 items-start gap-2">
        <input
          aria-describedby={modeErrorDescriptionId()}
          aria-label="堆疊模式"
          class="mt-1 accent-primary"
          data-testid="opengrid-stackable-box-default-mode"
          name="opengrid-stackable-box-mode"
          type="radio"
          value="default"
          checked={rawParameters.basePlateMode !== 'true' &&
            rawParameters.thinShellMode !== 'true'}
          onchange={handleModeChange}
        />
        <span class="font-[650]">堆疊模式</span>
      </label>
    </div>
    {#if rawParameters.thinShellMode === 'true'}
      <span class="text-sm text-muted">
        薄殼模式：不可堆疊，使用6mm定位柱
      </span>
    {:else}
      <span class="text-sm text-muted">
        預設模式：可堆疊滑動，使用9mm定位柱
      </span>
    {/if}
  </div>
  {#if fieldErrors.cornerBottomHoles}
    <span class="text-sm text-error" id="cornerBottomHoles-error" role="alert"
      >{fieldErrors.cornerBottomHoles}</span
    >
  {/if}
  {#if fieldErrors.fullBottomHoleGrid}
    <span class="text-sm text-error" id="fullBottomHoleGrid-error" role="alert"
      >{fieldErrors.fullBottomHoleGrid}</span
    >
  {/if}
  {#if fieldErrors.basePlateMode}
    <span class="text-sm text-error" id="basePlateMode-error" role="alert"
      >{fieldErrors.basePlateMode}</span
    >
  {/if}
  {#if fieldErrors.thinShellMode}
    <span class="text-sm text-error" id="thinShellMode-error" role="alert"
      >{fieldErrors.thinShellMode}</span
    >
  {/if}
  {#each opengridStackableBoxDefinition.parameterSchema.slice(0, 3) as field (field.key)}
    {@const value = rawParameters[field.key] ?? String(field.defaultValue)}
    <ParameterField
      label={displayParameterLabel(field)}
      unit={field.unit}
      changed={value !== String(field.defaultValue)}
      error={fieldErrors[field.key]}
      errorId={`${field.key}-error`}
      onRestore={() => onInputChange(field.key, String(field.defaultValue))}
    >
      <ParameterControl
        {field}
        {value}
        error={fieldErrors[field.key]}
        onChange={(nextValue) => onInputChange(field.key, nextValue)}
      />
    </ParameterField>
  {/each}
  <details
    class="grid gap-3 rounded-lg border border-border-field p-3"
    data-testid="opengrid-stackable-box-opening-disclosure"
  >
    <summary class="cursor-pointer font-[650]">四個方向開口設定</summary>
    <div class="grid gap-3 pt-1">
      {#each openingGroups as group (group.direction)}
        <details
          class="grid gap-3 rounded-lg border border-border-field p-3"
          data-direction={group.direction}
          data-testid={`opengrid-stackable-box-opening-group-${group.direction}`}
          open={group.defaultOpen}
        >
          <summary class="cursor-pointer font-[650]">{group.label}</summary>
          <fieldset class="grid gap-3 border-0 p-0 pt-1">
            {#each fieldsFor(group.keys, group.direction, group.label) as field (field.key)}
              {@const value =
                rawParameters[field.key] ?? String(field.defaultValue)}
              <ParameterField
                label={displayParameterLabel(field)}
                unit={field.unit}
                changed={value !== String(field.defaultValue)}
                error={fieldErrors[field.key]}
                errorId={`${field.key}-error`}
                onRestore={() =>
                  onInputChange(field.key, String(field.defaultValue))}
              >
                <ParameterControl
                  {field}
                  {value}
                  error={fieldErrors[field.key]}
                  onChange={(nextValue) => onInputChange(field.key, nextValue)}
                />
              </ParameterField>
            {/each}
          </fieldset>
        </details>
      {/each}
    </div>
  </details>
</fieldset>
