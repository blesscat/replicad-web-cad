<script lang="ts">
  import {
    normalizeOpenGridWallCoverText,
    OPENGRID_WALL_COVER_CONFIGURATION,
  } from '../../../../cad-contract/units'
  import { translate } from '../../../../i18n'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  let rawText = $derived(
    rawParameters.text ?? OPENGRID_WALL_COVER_CONFIGURATION.defaultText,
  )
  let normalizedText = $derived(normalizeOpenGridWallCoverText(rawText))
  let textLength = $derived(Array.from(normalizedText).length)
  let rawOpenConnect = $derived(
    rawParameters.openConnect ??
      String(OPENGRID_WALL_COVER_CONFIGURATION.defaultOpenConnect),
  )

  function handleTextInput(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return

    const limitedText = Array.from(event.currentTarget.value)
      .slice(0, OPENGRID_WALL_COVER_CONFIGURATION.maxTextLength)
      .join('')
    if (event.currentTarget.value !== limitedText) {
      event.currentTarget.value = limitedText
    }
    onInputChange('text', limitedText)
  }

  function handleOpenConnectInput(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onInputChange('openConnect', String(event.currentTarget.checked))
  }
</script>

<fieldset
  class="m-0 grid gap-3 border-0 p-0"
  data-testid="opengrid-wall-cover-panel"
>
  <p
    class="m-0 text-sm leading-6 text-muted-foreground"
    data-testid="opengrid-wall-cover-details"
  >
    {translate(locale, 'panel.wallCover.details')}
  </p>

  <ParameterField
    {locale}
    label={translate(locale, 'parameter.text')}
    changed={rawText !== OPENGRID_WALL_COVER_CONFIGURATION.defaultText}
    error={fieldErrors.text}
    errorId="opengrid-wall-cover-text-error"
    restoreLabel={translate(locale, 'parameter.text')}
    onRestore={() =>
      onInputChange('text', OPENGRID_WALL_COVER_CONFIGURATION.defaultText)}
  >
    <div class="grid gap-1">
      <input
        aria-describedby="opengrid-wall-cover-text-help"
        aria-invalid={fieldErrors.text ? 'true' : undefined}
        aria-label={translate(locale, 'panel.wallCover.inputAria')}
        autocomplete="off"
        class="min-w-0 rounded-lg border border-border-field bg-page px-3 py-2 text-base text-ink outline-none focus:border-primary"
        data-testid="opengrid-wall-cover-text"
        maxlength={OPENGRID_WALL_COVER_CONFIGURATION.maxTextLength}
        spellcheck="false"
        type="text"
        value={rawText}
        oninput={handleTextInput}
      />
      <span
        aria-live="polite"
        class="text-right text-sm text-muted-foreground"
        data-testid="opengrid-wall-cover-text-count"
      >
        {translate(locale, 'panel.wallCover.characterCount', {
          count: textLength,
          max: OPENGRID_WALL_COVER_CONFIGURATION.maxTextLength,
        })}
      </span>
    </div>
  </ParameterField>

  <label class="flex items-center gap-2 text-sm text-ink">
    <input
      type="checkbox"
      aria-label={translate(locale, 'panel.wallCover.openConnect')}
      aria-describedby={fieldErrors.openConnect
        ? 'opengrid-wall-cover-open-connect-error'
        : undefined}
      aria-invalid={Boolean(fieldErrors.openConnect)}
      checked={rawOpenConnect === 'true'}
      data-testid="opengrid-wall-cover-open-connect"
      onchange={handleOpenConnectInput}
    />
    {translate(locale, 'panel.wallCover.openConnect')}
  </label>
  {#if fieldErrors.openConnect}
    <span
      id="opengrid-wall-cover-open-connect-error"
      class="text-sm text-error"
      role="alert"
      >{formatValidationIssue(locale, fieldErrors.openConnect)}</span
    >
  {/if}

  <p
    id="opengrid-wall-cover-text-help"
    class="m-0 text-sm leading-6 text-muted-foreground"
  >
    {translate(locale, 'panel.wallCover.font', {
      font: OPENGRID_WALL_COVER_CONFIGURATION.fontFamily,
    })}
  </p>
</fieldset>
