<script lang="ts">
  type Props = {
    onRestore: () => void
  }

  let { onRestore }: Props = $props()
</script>

<button
  class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border-field bg-panel px-3 py-2 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
  type="button"
  aria-label="全部恢復預設"
  onclick={onRestore}
>
  <svg
    class="size-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 6 6v1" />
  </svg>
  全部恢復預設
</button>
