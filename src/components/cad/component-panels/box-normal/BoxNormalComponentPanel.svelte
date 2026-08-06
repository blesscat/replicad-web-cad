<script lang="ts">
  import { boxNormalDefinition } from '../../../../features/cad/model-catalog'
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
  <legend class="text-muted">標準開口盒參數</legend>
  <p class="m-0 text-sm text-muted">
    X/Y 依底版格數調整，X 為 2–40 格、Y 為 2–35 格；盒體高度為 10–500 mm，
    footprint X/Y 各內縮 0.15 mm。預設在四角加入 7 mm 六角定位柱。
  </p>
  {#each boxNormalDefinition.parameterSchema as field (field.key)}
    <label class="grid gap-[0.3rem]">
      <span class="flex justify-between font-[650]">
        <span>{field.label}（{field.axis}）</span>
        <span>{field.unit}</span>
      </span>
      <ParameterControl
        {field}
        value={rawParameters[field.key] ?? String(field.defaultValue)}
        error={fieldErrors[field.key]}
        onChange={(value) => onInputChange(field.key, value)}
      />
      {#if fieldErrors[field.key]}
        <span class="text-sm text-error" id={`${field.key}-error`} role="alert"
          >{fieldErrors[field.key]}</span
        >
      {/if}
    </label>
  {/each}
  <label
    class="flex items-start gap-2 rounded-lg border border-border-field p-3"
  >
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
  {#if fieldErrors.cornerPosts}
    <span class="text-sm text-error" id="cornerPosts-error" role="alert"
      >{fieldErrors.cornerPosts}</span
    >
  {/if}
</fieldset>
