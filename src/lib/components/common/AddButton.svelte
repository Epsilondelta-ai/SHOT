<script lang="ts">
	let {
		label,
		onclick
	}: {
		label: string;
		onclick: () => void;
	} = $props();
</script>

<button
	class="comic-button inline-flex items-center gap-1 rounded-lg border-2 border-slate-900 bg-primary px-4 py-2 text-xs font-black text-white uppercase transition-colors hover:bg-primary/90"
	{onclick}
>
	<span class="material-symbols-outlined text-sm">add</span>
	{label}
</button>
