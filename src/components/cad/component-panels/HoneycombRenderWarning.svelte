<script lang="ts">
  import { translate, type Locale } from '../../../i18n'

  let { locale }: { locale: Locale } = $props()
</script>

<span
  class="block text-sm text-error"
  data-testid="honeycomb-render-warning"
  role="status"
  aria-live="polite"
>
  {translate(locale, 'panel.honeycombWarning')}
</span>
