<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type BanRecord = {
		id: string;
		banStart: string | null;
		banEnd: string;
		banReason: string;
		createdAt: string;
	};

	let {
		isOpen = false,
		userName = '',
		userId = '',
		onclose
	}: {
		isOpen?: boolean;
		userName?: string;
		userId?: string;
		onclose?: () => void;
	} = $props();

	let history: BanRecord[] = $state([]);
	let loading = $state(false);

	$effect(() => {
		if (isOpen && userId) {
			loading = true;
			fetch(`/api/admin/ban-history/${userId}`)
				.then((r) => r.json())
				.then((data) => {
					history = data;
				})
				.finally(() => {
					loading = false;
				});
		} else {
			history = [];
		}
	});
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
	>
		<div class="comic-border w-full max-w-lg rounded-2xl bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="flex items-center gap-2 text-lg font-black text-slate-900 uppercase">
					<span class="material-symbols-outlined text-red-500">history</span>
					{m.admin_ban_history()} — {userName}
				</h2>
				<button
					class="flex size-8 items-center justify-center rounded-full hover:bg-slate-100"
					onclick={onclose}
				>
					<span class="material-symbols-outlined text-slate-500">close</span>
				</button>
			</div>

			{#if loading}
				<div class="flex items-center justify-center py-8">
					<span class="material-symbols-outlined animate-spin text-2xl text-slate-400"
						>progress_activity</span
					>
				</div>
			{:else if history.length === 0}
				<div class="flex flex-col items-center gap-2 py-8 text-slate-400">
					<span class="material-symbols-outlined text-3xl">block</span>
					<p class="text-sm font-bold">{m.admin_ban_history_empty()}</p>
				</div>
			{:else}
				<div class="max-h-80 space-y-2 overflow-y-auto">
					{#each history as record (record.id)}
						<div class="comic-border rounded-xl bg-slate-50 p-3">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<p class="text-sm font-black text-slate-800">{record.banReason}</p>
									<p class="mt-1 text-[11px] font-bold text-slate-500">
										{record.banStart ?? '?'} ~ {record.banEnd}
									</p>
								</div>
								<span class="shrink-0 text-[10px] font-bold text-slate-400">
									{m.admin_ban_history_date()}: {record.createdAt}
								</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<div class="mt-6">
				<button
					class="comic-button w-full rounded-lg border-2 border-slate-900 bg-slate-200 px-4 py-2 text-sm font-black text-slate-700 uppercase"
					onclick={onclose}
				>
					{m.admin_cancel()}
				</button>
			</div>
		</div>
	</div>
{/if}
