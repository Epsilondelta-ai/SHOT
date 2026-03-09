<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Tab = 'all' | 'in_progress' | 'waiting';

	let { active = 'all' as Tab, onchange }: { active?: Tab; onchange?: (tab: Tab) => void } =
		$props();

	const tabs: { key: Tab; label: () => string }[] = [
		{ key: 'all', label: () => m.lobby_tab_all() },
		{ key: 'in_progress', label: () => m.lobby_tab_in_progress() },
		{ key: 'waiting', label: () => m.lobby_tab_waiting() }
	];
</script>

<div class="comic-border flex gap-2 rounded-xl border-none bg-slate-200 p-1">
	{#each tabs as tab}
		<button
			class="flex-1 rounded-lg px-2 py-3 text-sm font-bold uppercase tracking-wider
				{active === tab.key
				? 'bg-primary text-white shadow-sm'
				: 'text-slate-600 hover:bg-white/50'}"
			onclick={() => onchange?.(tab.key)}
		>
			{tab.label()}
		</button>
	{/each}
</div>
