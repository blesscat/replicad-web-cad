<script lang="ts">
  import {
    boxNormalDefinition,
    displayParameterLabel,
  } from '../../../../features/cad/model-catalog'
  import ParameterField from '../ParameterField.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import type { ComponentPanelProps } from '../types'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()

  function handleCornerPostsChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onInputChange('cornerPosts', String(event.currentTarget.checked))
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <p class="m-0 text-sm text-muted">
    X/Y 依底版格數調整，X 為 2–40 格、Y 為 2–35 格；盒體高度文字輸入為 10–500
    mm、slider 為 10–200 mm，footprint X/Y 各內縮 0.15 mm。預設在四角加入 7 mm
    六角定位柱。
  </p>
  {#each boxNormalDefinition.parameterSchema as field (field.key)}
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
  <div class="grid gap-2 rounded-lg border border-border-field p-3">
    <div class="relative min-w-0 flex items-start justify-between gap-2">
      <label class="flex min-w-0 grow items-start gap-2">
        <input
          aria-describedby={fieldErrors.cornerPosts
            ? 'cornerPosts-error'
            : undefined}
          aria-invalid={Boolean(fieldErrors.cornerPosts)}
          aria-label="四角六角定位柱"
          class="mt-1 accent-primary"
          type="checkbox"
          checked={rawParameters.cornerPosts !== 'false'}
          onchange={handleCornerPostsChange}
        />
        <span class="grid gap-1">
          <span class="font-[650]">四角六角定位柱</span>
          <span class="text-sm text-muted">
            四角各一支，固定 7 mm 高，與盒體合成單一 solid。
          </span>
        </span>
      </label>
    </div>
  </div>
  {#if fieldErrors.cornerPosts}
    <span class="text-sm text-error" id="cornerPosts-error" role="alert"
      >{fieldErrors.cornerPosts}</span
    >
  {/if}
</fieldset>
