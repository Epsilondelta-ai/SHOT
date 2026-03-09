<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type SettingItem = {
		key: string;
		label: string;
		icon: string;
		value?: string;
		onclick?: () => void;
	};

	let { items }: { items: SettingItem[] } = $props();
</script>

<div class="comic-border rounded-xl bg-white p-5">
	<h3 class="mb-4 text-sm font-black tracking-widest text-slate-500 uppercase">
		{m.mypage_settings_title()}
	</h3>
	<div class="divide-y divide-slate-100">
		{#each items as item (item.key)}
			<button
				class="flex w-full items-center justify-between py-3 first:pt-0 last:pb-0"
				onclick={item.onclick}
			>
				<div class="flex items-center gap-3">
					<span class="material-symbols-outlined text-xl text-primary">{item.icon}</span>
					<span class="font-bold text-slate-900">{item.label}</span>
				</div>
				<div class="flex items-center gap-2">
					{#if item.value}
						<span class="text-sm font-bold text-slate-400">{item.value}</span>
					{/if}
					<span class="material-symbols-outlined text-slate-400">chevron_right</span>
				</div>
			</button>
		{/each}
	</div>
</div>
