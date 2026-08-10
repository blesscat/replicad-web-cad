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
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'
  import type { ParameterField as ParameterFieldDefinition } from '../../../../features/cad/model-catalog'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()
  let thinBottomMode = $derived(rawParameters.thinBottomMode === 'true')
  let bottomPlateMode = $derived(rawParameters.bottomPlateMode === 'true')

  type CylinderMode = 'default' | 'thin' | 'bottom-plate'

  function modeFor(isThin: boolean, isBottomPlate: boolean): CylinderMode {
    if (isBottomPlate) return 'bottom-plate'
    if (isThin) return 'thin'
    return 'default'
  }

  function modeSummary(mode: CylinderMode): string {
    if (mode === 'bottom-plate') {
      return '底版模式：不可堆疊，使用6mm固定柱'
    }
    if (mode === 'thin') return '薄殼模式：可堆疊，使用6mm固定柱'
    return '預設模式：可堆疊，使用標準8mm固定柱'
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
    return mode === 'default'
      ? OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultFloorThickness
      : OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.thinFloorThickness
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
      bottomHolesEnabled: rawParameters.bottomHolesEnabled !== 'false',
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

<fieldset class="m-0 grid gap-3 border-0 p-0" aria-label="底部模式">
  <div
    class="flex items-center gap-4 whitespace-nowrap"
    data-testid="opengrid-cylinder-mode-options"
  >
    <label class="flex items-center gap-2 text-sm">
      <input
        type="radio"
        name="opengrid-stackable-cylinder-bottom-mode"
        aria-label="預設模式"
        checked={activeMode === 'default'}
        onchange={(event) => onModeRadioChange('default', event)}
      />
      <span>預設模式</span>
    </label>
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
        aria-label="底版模式"
        checked={activeMode === 'bottom-plate'}
        onchange={(event) => onModeRadioChange('bottom-plate', event)}
      />
      <span>底版模式</span>
    </label>
  </div>
  <p
    class="m-0 text-sm text-muted"
    data-testid="opengrid-cylinder-mode-description"
    aria-live="polite"
  >
    {modeSummary(activeMode)}
  </p>
  <p class="m-0 text-sm text-muted">
    高度文字輸入為 10–500 mm、slider 為 10–200 mm；外徑維持 20–300 mm。
  </p>
  <label class="flex items-start gap-2 text-sm">
    <input
      class="mt-0.5"
      type="checkbox"
      aria-label="開啟底部全部孔洞"
      checked={rawParameters.bottomHolesEnabled !== 'false'}
      onchange={(event) => {
        if (!(event.currentTarget instanceof HTMLInputElement)) return
        onInputChange('bottomHolesEnabled', String(event.currentTarget.checked))
      }}
    />
    <span>開啟底部全部孔洞</span>
  </label>
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
