<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Assistant = {
		id: string;
		name: string;
		prompt: string;
		active: boolean;
		created: string;
		updated: string;
	};

	let {
		assistants = [],
		onedit,
		ondelete
	}: {
		assistants?: Assistant[];
		onedit?: (assistant: Assistant) => void;
		ondelete?: (assistantId: string) => void;
	} = $props();

	let expandedId: string | null = $state(null);
</script>

<div class="space-y-2">
	{#each assistants as assistant (assistant.id)}
		<div class="comic-border rounded-xl bg-white p-4">
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<span class="text-sm font-black text-slate-900 uppercase">{assistant.name}</span>
						{#if assistant.active}
							<span
								class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-600 uppercase"
							>
								{m.admin_assistant_active()}
							</span>
						{:else}
							<span
								class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-400 uppercase"
							>
								{m.admin_assistant_inactive()}
							</span>
						{/if}
					</div>

					<!-- Prompt Preview -->
					<p
						class="mt-2 line-clamp-2 text-sm text-slate-600"
						class:hidden={expandedId === assistant.id}
					>
						{assistant.prompt}
					</p>

					<!-- Expanded Prompt -->
					{#if expandedId === assistant.id}
						<div class="mt-2 space-y-2 rounded-lg bg-slate-50 p-3">
							<p class="text-sm font-bold text-slate-500 uppercase">{m.admin_assistant_prompt()}</p>
							<p class="whitespace-pre-wrap text-sm text-slate-700">{assistant.prompt}</p>
						</div>
					{/if}

					<!-- Metadata -->
					<div class="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
						<span class="material-symbols-outlined text-xs">schedule</span>
						<span>{m.admin_assistant_updated()}: {assistant.updated}</span>
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<button
						class="comic-button rounded-lg border-2 border-slate-900 bg-slate-100 px-3 py-2 text-xs font-black text-slate-900 uppercase transition-colors hover:bg-blue-100"
						onclick={() => (expandedId = expandedId === assistant.id ? null : assistant.id)}
					>
						{#if expandedId === assistant.id}
							<span class="material-symbols-outlined text-sm">unfold_less</span>
						{:else}
							<span class="material-symbols-outlined text-sm">unfold_more</span>
						{/if}
					</button>
					<button
						class="comic-button rounded-lg border-2 border-slate-900 bg-blue-500 px-3 py-2 text-xs font-black text-white uppercase"
						onclick={() => onedit?.(assistant)}
					>
						{m.admin_edit()}
					</button>
					<button
						class="comic-button rounded-lg border-2 border-slate-900 bg-red-500 px-3 py-2 text-xs font-black text-white uppercase"
						onclick={() => ondelete?.(assistant.id)}
					>
						{m.admin_delete()}
					</button>
				</div>
			</div>
		</div>
	{/each}

	{#if assistants.length === 0}
		<div class="comic-border rounded-xl border-dashed bg-slate-50 p-8 text-center">
			<span class="material-symbols-outlined text-4xl text-slate-300">smart_toy</span>
			<p class="mt-2 text-sm font-bold text-slate-400 uppercase">{m.admin_assistant()}가 없습니다</p>
		</div>
	{/if}
</div>
