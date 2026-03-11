<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Tab = 'dashboard' | 'users' | 'rooms' | 'llm' | 'assistant' | 'rulebook';

	let {
		activeTab,
		onchange
	}: {
		activeTab: Tab;
		onchange: (tab: Tab) => void;
	} = $props();

	const tabs: { key: Tab; label: () => string; icon: string }[] = [
		{ key: 'dashboard', label: () => m.admin_tab_dashboard(), icon: 'dashboard' },
		{ key: 'users', label: () => m.admin_tab_users(), icon: 'group' },
		{ key: 'rooms', label: () => m.admin_tab_rooms(), icon: 'meeting_room' },
		{ key: 'llm', label: () => m.admin_tab_llm(), icon: 'smart_toy' },
		{ key: 'assistant', label: () => m.admin_tab_assistant(), icon: 'psychology' },
		{ key: 'rulebook', label: () => m.admin_tab_rulebook(), icon: 'menu_book' }
	];
</script>

<header class="sticky top-0 z-50 border-b-4 border-slate-900 bg-white">
	<div class="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
		<a
			href="/lobby"
			class="comic-button flex items-center gap-1 rounded-lg border-2 border-slate-900 bg-accent-beige px-3 py-2 text-sm font-bold transition-colors hover:bg-primary hover:text-white"
		>
			<span class="material-symbols-outlined text-lg">arrow_back</span>
			{m.admin_back()}
		</a>

		<h1
			class="text-2xl font-extrabold tracking-tighter text-primary uppercase italic"
			style="text-shadow: 2px 2px 0px #221910;"
		>
			ADMIN
		</h1>

		<div class="w-[72px]"></div>
	</div>

	<div class="mx-auto flex w-full max-w-2xl px-4 pb-1">
		{#each tabs as tab (tab.key)}
			<button
				class="flex flex-1 items-center justify-center gap-1.5 border-b-3 px-3 py-2 text-xs font-black tracking-wider uppercase transition-colors
					{activeTab === tab.key
					? 'border-primary text-primary'
					: 'border-transparent text-slate-400 hover:text-slate-600'}"
				onclick={() => onchange(tab.key)}
			>
				<span class="material-symbols-outlined text-base">{tab.icon}</span>
				{tab.label()}
			</button>
		{/each}
	</div>
</header>
