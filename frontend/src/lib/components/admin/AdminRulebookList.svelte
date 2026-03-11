<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Rulebook = {
		id: string;
		name: string;
		content: string;
		active: boolean;
		created: string;
		updated: string;
	};

	let {
		rulebooks = [],
		onedit,
		ondelete
	}: {
		rulebooks?: Rulebook[];
		onedit?: (rulebook: Rulebook) => void;
		ondelete?: (rulebookId: string) => void;
	} = $props();

	let expandedId: string | null = $state(null);
</script>

<div class="space-y-2">
	{#each rulebooks as rulebook (rulebook.id)}
		<div class="comic-border rounded-xl bg-white p-4">
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<span class="text-sm font-black text-slate-900 uppercase">{rulebook.name}</span>
						{#if rulebook.active}
							<span
								class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-600 uppercase"
							>
								{m.admin_rulebook_active()}
							</span>
						{:else}
							<span
								class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-400 uppercase"
							>
								{m.admin_rulebook_inactive()}
							</span>
						{/if}
					</div>

					<!-- Content Preview -->
					<p
						class="mt-2 line-clamp-2 text-sm text-slate-600"
						class:hidden={expandedId === rulebook.id}
					>
						{rulebook.content}
					</p>

					<!-- Expanded Content -->
					{#if expandedId === rulebook.id}
						<div class="mt-2 space-y-2 rounded-lg bg-slate-50 p-3">
							<p class="text-sm font-bold text-slate-500 uppercase">{m.admin_rulebook_content()}</p>
							<p class="text-sm whitespace-pre-wrap text-slate-700">{rulebook.content}</p>
						</div>
					{/if}

					<!-- Metadata -->
					<div class="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
						<span class="material-symbols-outlined text-xs">schedule</span>
						<span>{m.admin_rulebook_updated()}: {rulebook.updated}</span>
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<button
						class="comic-button rounded-lg border-2 border-slate-900 bg-slate-100 px-3 py-2 text-xs font-black text-slate-900 uppercase transition-colors hover:bg-blue-100"
						onclick={() => (expandedId = expandedId === rulebook.id ? null : rulebook.id)}
					>
						{#if expandedId === rulebook.id}
							<span class="material-symbols-outlined text-sm">unfold_less</span>
						{:else}
							<span class="material-symbols-outlined text-sm">unfold_more</span>
						{/if}
					</button>
					<button
						class="comic-button rounded-lg border-2 border-slate-900 bg-blue-500 px-3 py-2 text-xs font-black text-white uppercase"
						onclick={() => onedit?.(rulebook)}
					>
						{m.admin_edit()}
					</button>
					<button
						class="comic-button rounded-lg border-2 border-slate-900 bg-red-500 px-3 py-2 text-xs font-black text-white uppercase"
						onclick={() => ondelete?.(rulebook.id)}
					>
						{m.admin_delete()}
					</button>
				</div>
			</div>
		</div>
	{/each}

	{#if rulebooks.length === 0}
		<div class="comic-border rounded-xl border-dashed bg-slate-50 p-8 text-center">
			<span class="material-symbols-outlined text-4xl text-slate-300">menu_book</span>
			<p class="mt-2 text-sm font-bold text-slate-400 uppercase">
				{m.admin_rulebook()}가 없습니다
			</p>
		</div>
	{/if}
</div>
