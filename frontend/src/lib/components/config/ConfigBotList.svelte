<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Bot = {
		id: string;
		name: string;
		image: string | null;
		active: boolean;
		createdAt: string;
	};

	let {
		bots,
		onAdd,
		onEdit
	}: {
		bots: Bot[];
		onAdd: () => void;
		onEdit: (bot: Bot) => void;
	} = $props();
</script>

<section>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-base font-black uppercase tracking-tighter text-slate-900">
			{m.config_bot_section()}
		</h2>
		<button
			class="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-black uppercase text-white transition-opacity hover:opacity-80"
			onclick={onAdd}
		>
			<span class="material-symbols-outlined text-base">add</span>
			{m.config_add_bot()}
		</button>
	</div>

	{#if bots.length === 0}
		<p class="py-8 text-center text-sm text-slate-400">{m.config_bot_empty()}</p>
	{:else}
		<ul class="space-y-3">
			{#each bots as bot (bot.id)}
				<li class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
						{#if bot.image}
							<img src={bot.image} alt={bot.name} class="h-full w-full object-cover" />
						{:else}
							<span class="material-symbols-outlined text-xl text-slate-400">adb</span>
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate font-black text-slate-900">{bot.name}</p>
						<p class="text-xs text-slate-400">
							{#if bot.active}
								<span class="text-green-500">Active</span>
							{:else}
								<span class="text-slate-400">Inactive</span>
							{/if}
						</p>
					</div>
					<button
						class="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-black uppercase text-slate-700 transition-colors hover:bg-slate-50"
						onclick={() => onEdit(bot)}
					>
						Edit
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>
