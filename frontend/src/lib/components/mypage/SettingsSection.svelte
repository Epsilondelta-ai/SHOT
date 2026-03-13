<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type SelectOption = { value: string; label: string };

	type SettingItem = {
		key: string;
		label: string;
		icon: string;
		value?: string;
		onclick?: () => void;
		options?: SelectOption[];
		onchange?: (value: string) => void;
	};

	let { items }: { items: SettingItem[] } = $props();
</script>

<div class="comic-border rounded-xl bg-white p-5">
	<h3 class="mb-4 text-sm font-black tracking-widest text-slate-500 uppercase">
		{m.mypage_settings_title()}
	</h3>
	<div class="divide-y divide-slate-100">
		{#each items as item (item.key)}
			{#if item.options}
				<div class="flex w-full items-center justify-between py-3 first:pt-0 last:pb-0">
					<div class="flex items-center gap-3">
						<span class="material-symbols-outlined text-xl text-primary">{item.icon}</span>
						<span class="font-bold text-slate-900">{item.label}</span>
					</div>
					<select
						class="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary"
						value={item.value}
						onchange={(e) => item.onchange?.((e.target as HTMLSelectElement).value)}
					>
						{#each item.options as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</div>
			{:else}
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
			{/if}
		{/each}
	</div>
</div>
