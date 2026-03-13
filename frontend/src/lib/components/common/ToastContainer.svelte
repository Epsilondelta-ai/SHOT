<script lang="ts">
	import { getToasts, removeToast } from '$lib/toast.svelte';
</script>

<div class="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
	{#each getToasts() as toast (toast.id)}
		<div class="pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
			<span class="flex-1 break-words">{toast.message}</span>
			<button onclick={() => removeToast(toast.id)} class="ml-2 shrink-0 opacity-70 hover:opacity-100">✕</button>
		</div>
	{/each}
</div>
