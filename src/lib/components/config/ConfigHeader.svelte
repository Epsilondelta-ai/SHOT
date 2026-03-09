<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Tab = 'assistant' | 'bot';

	let { activeTab, onchange }: { activeTab: Tab; onchange: (tab: Tab) => void } = $props();

	const tabs: { key: Tab; label: () => string; icon: string }[] = [
		{ key: 'assistant', label: () => m.config_tab_assistant(), icon: 'psychology' },
		{ key: 'bot', label: () => m.config_tab_bot(), icon: 'smart_toy' }
	];
</script>

<header class="sticky top-0 z-50 border-b-3 border-slate-900 bg-white">
	<div class="mx-auto w-full max-w-2xl px-4 py-4">
		<h1 class="mb-4 text-lg font-black uppercase tracking-tighter text-slate-900">
			{m.config_title()}
		</h1>

		<div class="flex gap-2 border-b-3 border-slate-200">
			{#each tabs as tab (tab.key)}
				<button
					class="flex items-center gap-2 border-b-3 px-4 py-3 font-black uppercase transition-colors"
					class:border-primary={activeTab === tab.key}
					class:text-primary={activeTab === tab.key}
					class:border-transparent={activeTab !== tab.key}
					class:text-slate-400={activeTab !== tab.key}
					onclick={() => onchange(tab.key)}
				>
					<span class="material-symbols-outlined text-lg">{tab.icon}</span>
					{tab.label()}
				</button>
			{/each}
		</div>
	</div>
</header>
