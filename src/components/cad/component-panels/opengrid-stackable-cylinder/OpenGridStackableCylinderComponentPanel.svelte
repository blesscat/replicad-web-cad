<script lang="ts">
  import {
    displayParameterLabel,
    opengridStackableCylinderDefinition,
  } from '../../../../features/cad/model-catalog'
  import {
    openGridStackableCylinderOpeningBottomLengthMaximumFor,
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
    OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS,
    type OpenGridStackableCylinderOpeningDirection,
    type OpenGridStackableCylinderOpeningParameterKey,
    type OpenGridStackableCylinderParameters,
  } from '../../../../cad-contract/units'
  import HoneycombRenderWarning from '../HoneycombRenderWarning.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'
  import type { ParameterField as ParameterFieldDefinition } from '../../../../features/cad/model-catalog'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()
  let thinBottomMode = $derived(rawParameters.thinBottomMode === 'true')
  let bottomPlateMode = $derived(rawParameters.bottomPlateMode === 'true')

  type CylinderMode = 'default' | 'thin' | 'bottom-plate'
  type CylinderSeatMode = 'none' | 'hole' | 'integrated'

  const seatModeOptions: ReadonlyArray<{
    value: CylinderSeatMode
    label: string
    description: string
  }> = [
    { value: 'none', label: '無角座', description: '不建立底部角座。' },
    {
      value: 'hole',
      label: '角座孔',
      description: '保留中心與安全外圈角座孔。',
    },
    {
      value: 'integrated',
      label: '內建角座',
      description: '建立向下凸出的 Ø5 × 3 mm 內建角座。',
    },
  ]

  function seatModeForRawParameters(): CylinderSeatMode {
    const value = rawParameters.bottomSeatMode
    if (value === 'none' || value === 'integrated') return value
    return 'hole'
  }

  function onSeatModeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    if (!event.currentTarget.checked) return
    onInputChange('bottomSeatMode', event.currentTarget.value)
  }

  function modeFor(isThin: boolean, isBottomPlate: boolean): CylinderMode {
    if (isBottomPlate) return 'bottom-plate'
    if (isThin) return 'thin'
    return 'default'
  }

  function modeSummary(mode: CylinderMode): string {
    if (mode === 'thin') return '薄殼模式：不可堆疊，使用6mm定位柱'
    return '預設模式：可堆疊滑動，使用9mm定位柱'
  }

  function onModeChange(mode: CylinderMode): void {
    if (mode === 'thin') {
      onInputChange('bottomPlateMode', 'false')
      onInputChange('thinBottomMode', 'true')
      return
    }
    if (mode === 'bottom-plate') {
      onInputChange('thinBottomMode', 'false')
      onInputChange('bottomPlateMode', 'true')
      return
    }
    onInputChange('thinBottomMode', 'false')
    onInputChange('bottomPlateMode', 'false')
  }

  function onModeRadioChange(mode: CylinderMode, event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    if (!event.currentTarget.checked) return
    onModeChange(mode)
  }

  let activeMode = $derived(modeFor(thinBottomMode, bottomPlateMode))

  function floorThicknessForMode(mode: CylinderMode): number {
    if (mode === 'default') {
      return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultFloorThickness
    }
    if (mode === 'thin') {
      return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.thinFloorThickness
    }
    return OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.floorThickness
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

  function parametersForRange(): OpenGridStackableCylinderParameters | null {
    const diameter = rawNumberFor('diameter')
    const height = rawNumberFor('height')
    if (diameter === null || height === null) return null

    const openingValues = {} as Record<
      OpenGridStackableCylinderOpeningParameterKey,
      number
    >
    for (const key of OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS) {
      const value = rawNumberFor(key)
      if (value === null) return null
      openingValues[key] = value
    }

    return {
      diameter,
      height,
      thinBottomMode: rawParameters.thinBottomMode === 'true',
      bottomPlateMode: rawParameters.bottomPlateMode === 'true',
      bottomSeatMode: seatModeForRawParameters(),
      honeycombMode: rawParameters.honeycombMode === 'true',
      ...openingValues,
    }
  }

  function fieldsFor(
    keys: readonly string[],
    direction: OpenGridStackableCylinderOpeningDirection,
    displayDirection: string,
  ): ParameterFieldDefinition[] {
    return keys.flatMap((key) => {
      const field = opengridStackableCylinderDefinition.parameterSchema.find(
        (candidate) => candidate.key === key,
      )
      if (!field) return []
      const displayedField = { ...field, axis: displayDirection }
      if (field.key.endsWith('BottomLength')) {
        const depth = rawNumberFor(keys[0] ?? '')
        const minimum =
          depth !== null && depth > 0
            ? 1
            : OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.openingBottomLengthMin
        const parameters = parametersForRange()
        let calculatedMaximum = field.max
        if (parameters) {
          calculatedMaximum =
            openGridStackableCylinderOpeningBottomLengthMaximumFor(
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

      const height = Number(rawParameters.height)
      if (!Number.isFinite(height)) return [displayedField]
      const maximum = Math.max(
        field.min,
        Math.min(field.max, height - floorThicknessForMode(activeMode)),
      )
      return [{ ...displayedField, max: maximum, sliderMax: maximum }]
    })
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0" aria-label="盒體模式">
  <div
    class="flex items-center gap-4 whitespace-nowrap"
    data-testid="opengrid-cylinder-mode-options"
  >
    <label class="flex items-center gap-2 text-sm">
      <input
        type="radio"
        name="opengrid-stackable-cylinder-bottom-mode"
        aria-label="薄殼模式"
        checked={activeMode === 'thin'}
        onchange={(event) => onModeRadioChange('thin', event)}
      />
      <span>薄殼模式</span>
    </label>
    <label class="flex items-center gap-2 text-sm">
      <input
        type="radio"
        name="opengrid-stackable-cylinder-bottom-mode"
        aria-label="堆疊模式"
        checked={activeMode === 'default'}
        onchange={(event) => onModeRadioChange('default', event)}
      />
      <span>堆疊模式</span>
    </label>
  </div>
  <p
    class="m-0 text-sm text-muted"
    data-testid="opengrid-cylinder-mode-description"
    aria-live="polite"
  >
    {modeSummary(activeMode)}
  </p>
  <fieldset
    class="grid gap-2 border-0 p-0"
    aria-describedby={fieldErrors.bottomSeatMode
      ? 'bottomSeatMode-error'
      : undefined}
    aria-invalid={Boolean(fieldErrors.bottomSeatMode)}
    aria-label="角座模式"
    role="radiogroup"
    data-testid="opengrid-stackable-cylinder-seat-mode"
  >
    <legend class="font-[650]">角座模式</legend>
    <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
      {#each seatModeOptions as option (option.value)}
        <label class="flex items-start gap-2 text-sm">
          <input
            class="mt-0.5"
            type="radio"
            name="opengrid-stackable-cylinder-seat-mode"
            aria-label={option.label}
            value={option.value}
            checked={seatModeForRawParameters() === option.value}
            onchange={onSeatModeChange}
          />
          <span>{option.label}</span>
        </label>
      {/each}
    </div>
    <span class="text-sm text-muted">
      {seatModeOptions.find(
        (option) => option.value === seatModeForRawParameters(),
      )?.description}
    </span>
    {#if fieldErrors.bottomSeatMode}
      <span class="text-sm text-error" id="bottomSeatMode-error" role="alert">
        {fieldErrors.bottomSeatMode}
      </span>
    {/if}
  </fieldset>
  <label class="flex items-start gap-2 text-sm">
    <input
      class="mt-0.5"
      type="checkbox"
      aria-label="省料模式（六角鏤空）"
      data-testid="opengrid-stackable-cylinder-honeycomb-mode"
      checked={rawParameters.honeycombMode === 'true'}
      onchange={(event) => {
        if (!(event.currentTarget instanceof HTMLInputElement)) return
        onInputChange('honeycombMode', String(event.currentTarget.checked))
      }}
    />
    <span>省料模式（六角鏤空）</span>
  </label>
  {#if rawParameters.honeycombMode === 'true'}
    <HoneycombRenderWarning />
  {/if}
  {#each opengridStackableCylinderDefinition.parameterSchema.slice(0, 2) as field (field.key)}
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
    data-testid="opengrid-cylinder-opening-disclosure"
  >
    <summary class="cursor-pointer font-[650]">四個方向開口設定</summary>
    <div class="grid gap-3 pt-1">
      {#each openingGroups as group (group.direction)}
        <details
          class="grid gap-3 rounded-lg border border-border-field p-3"
          data-direction={group.direction}
          data-testid={`opengrid-cylinder-opening-group-${group.direction}`}
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
