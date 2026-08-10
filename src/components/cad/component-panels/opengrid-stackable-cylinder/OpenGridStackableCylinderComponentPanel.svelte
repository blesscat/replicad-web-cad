<script lang="ts">
  import {
    displayParameterLabel,
    opengridStackableCylinderDefinition,
  } from '../../../../features/cad/model-catalog'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

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
  {#each opengridStackableCylinderDefinition.parameterSchema as field (field.key)}
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
</fieldset>
