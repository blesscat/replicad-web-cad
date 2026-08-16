<script lang="ts">
  import type { Snippet } from 'svelte'
  import RestoreButton from './RestoreButton.svelte'
  import { formatValidationIssue } from '../../../i18n/diagnostics'
  import type { Locale } from '../../../i18n'
  import type { ValidationIssue } from '../../../cad-contract/units'

  type Props = {
    locale: Locale
    label: string
    unit?: string
    changed?: boolean
    error?: ValidationIssue
    errorId?: string
    unitAriaLive?: boolean
    restoreLabel?: string
    onRestore?: () => void
    children: Snippet
  }

  let {
    locale,
    label,
    unit = '',
    changed = false,
    error,
    errorId,
    unitAriaLive = false,
    restoreLabel = label,
    onRestore,
    children,
  }: Props = $props()
</script>

<div class="grid min-w-0 gap-[0.3rem]">
  <div class="relative min-w-0 flex items-center gap-2 font-[650]">
    <span class="min-w-0 break-words">{label}</span>
    <span
      class="min-w-0 flex-1 text-center text-sm text-muted"
      aria-live={unitAriaLive ? 'polite' : undefined}>{unit}</span
    >
    {#if onRestore}
      <RestoreButton
        {locale}
        label={restoreLabel}
        visible={changed}
        {onRestore}
      />
    {/if}
  </div>

  {@render children()}

  {#if error}
    <span id={errorId} class="text-sm text-error" role="alert"
      >{formatValidationIssue(locale, error)}</span
    >
  {/if}
</div>
