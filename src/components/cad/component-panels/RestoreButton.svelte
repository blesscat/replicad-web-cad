<script lang="ts">
  type Props = {
    label: string
    onRestore: () => void
    visible?: boolean
  }

  let { label, onRestore, visible = true }: Props = $props()
</script>

{#if visible}
  <button
    class="absolute top-1/2 right-0 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-md border border-border-field bg-panel p-0 text-ink shadow-sm hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    type="button"
    aria-label={`復原${label}`}
    title="復原為預設值"
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
  </button>
{/if}
