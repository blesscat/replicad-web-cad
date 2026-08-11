<script lang="ts">
  import type { CadError } from '../../cad-contract/errors'

  type Props = {
    error: CadError
    onDismiss: () => void
  }

  let { error, onDismiss }: Props = $props()

  function titleForError(error: CadError): string {
    if (error.stage === 'initializing') return 'CAD engine 載入失敗'
    if (error.stage === 'exporting') return 'CAD 匯出失敗'
    if (error.stage === 'worker') return 'CAD Worker 發生錯誤'
    return '模型建立失敗'
  }
</script>

<section
  class="fixed right-4 top-4 z-50 grid w-[min(28rem,calc(100vw-2rem))] gap-2 rounded-2xl border border-error-border bg-panel p-4 text-ink shadow-card"
  role="alert"
  aria-atomic="true"
  aria-live="assertive"
  data-error-code={error.code}
  data-testid="cad-error-toast"
>
  <div class="flex items-start justify-between gap-4">
    <strong class="text-error">{titleForError(error)}</strong>
    <button
      class="rounded-md px-2 py-1 text-lg leading-none text-muted hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      type="button"
      aria-label="關閉錯誤通知"
      onclick={onDismiss}
    >
      ×
    </button>
  </div>
  <p class="m-0 break-words text-sm" data-testid="cad-error-toast-message">
    原因：{error.userMessage}
  </p>
</section>
