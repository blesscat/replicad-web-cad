<script lang="ts">
  import { PILLAR_CONFIGURATION } from '../../../../cad-contract/units'
  import type { ComponentPanelProps } from '../types'

  const PILLAR_MODE_OPTIONS = [
    {
      value: 'standard',
      label: '標準版',
      length: PILLAR_CONFIGURATION.standardLength,
      description: '適合標準底板。',
    },
    {
      value: 'thin-shell',
      label: '薄殼版',
      length: PILLAR_CONFIGURATION.thinShellLength,
      description: '適合薄殼板。',
    },
  ] as const

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()

  function handleModeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onInputChange('mode', event.currentTarget.value)
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <p class="m-0 text-sm text-muted">
    主體固定 Ø{PILLAR_CONFIGURATION.bodyDiameter} mm，底部為 Ø{PILLAR_CONFIGURATION.baseDiameter}
    mm ×
    {PILLAR_CONFIGURATION.baseHeight} mm 平底凸台，肩部保持銳角，頂端保留
    {PILLAR_CONFIGURATION.upperChamfer} mm、45° chamfer。請選擇支柱版本；總長度與幾何尺寸固定，不提供手動輸入。
  </p>

  <div
    aria-label="支柱版本"
    class="grid gap-2 rounded-lg border border-border-field p-3"
    role="radiogroup"
  >
    {#each PILLAR_MODE_OPTIONS as option, index (option.value)}
      <label class="flex min-w-0 grow items-start gap-2">
        <input
          aria-describedby={fieldErrors.mode ? 'pillar-mode-error' : undefined}
          aria-label={option.label}
          class="mt-1 accent-primary"
          data-testid={`opengrid-pillar-mode-${option.value}`}
          name="opengrid-pillar-mode"
          type="radio"
          value={option.value}
          checked={rawParameters.mode === option.value}
          required={index === 0}
          onchange={handleModeChange}
        />
        <span class="grid gap-1">
          <span class="font-[650]">{option.label}</span>
          <span class="text-sm text-muted">
            固定總長 {option.length} mm，{option.description}
          </span>
        </span>
      </label>
    {/each}
  </div>

  {#if fieldErrors.mode}
    <span class="text-sm text-error" id="pillar-mode-error" role="alert">
      {fieldErrors.mode}
    </span>
  {/if}
</fieldset>
