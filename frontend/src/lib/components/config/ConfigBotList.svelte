<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Bot = {
		id: string;
		name: string;
		active: boolean;
		clientMode: 'autonomous' | 'follow-owner' | null;
		followUserId: string | null;
		presenceStatus: 'online' | 'offline';
		created: string | null;
		updated: string | null;
		lastSeenAt: string | null;
		busy?: boolean;
	};

	let {
		bots = [],
		onedit,
		ondelete
	}: {
		bots?: Bot[];
		onedit?: (bot: Bot) => void;
		ondelete?: (botId: string) => void;
	} = $props();

	function presenceClass(status: 'online' | 'offline') {
		return status === 'online' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600';
	}

	function clientModeLabel(mode: 'autonomous' | 'follow-owner' | null) {
		if (mode === 'follow-owner') return '팔로우';
		return '자율';
	}
</script>

<div class="space-y-3">
	{#if bots.length === 0}
		<div class="comic-border rounded-lg border-2 border-slate-900 bg-slate-100 p-6 text-center">
			<div class="mb-2 flex justify-center">
				<span class="material-symbols-outlined text-4xl text-slate-400">smart_toy</span>
			</div>
			<p class="text-sm font-bold text-slate-600 uppercase">{m.config_bot_empty()}</p>
		</div>
	{:else}
		{#each bots as bot (bot.id)}
			<div class="comic-border rounded-lg border-2 border-slate-900 bg-white p-4">
				<div class="mb-3 flex items-start justify-between gap-3">
					<div class="flex-1">
						<h3 class="font-black text-slate-900 uppercase">{bot.name}</h3>
						<div class="mt-2 flex flex-wrap gap-2">
							<span class={`rounded-full px-2 py-1 text-xs font-black uppercase ${presenceClass(bot.presenceStatus)}`}>
								{bot.presenceStatus === 'online' ? '온라인' : '오프라인'}
							</span>
							<span class="rounded-full bg-indigo-100 px-2 py-1 text-xs font-black text-indigo-700 uppercase">
								{clientModeLabel(bot.clientMode)}
							</span>
							{#if bot.active}
								<span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-black text-blue-700 uppercase">
									{m.config_bot_active()}
								</span>
							{:else}
								<span class="rounded-full bg-gray-100 px-2 py-1 text-xs font-black text-gray-700 uppercase">
									{m.config_bot_inactive()}
								</span>
							{/if}
							{#if bot.busy}
								<span class="rounded-full bg-orange-100 px-2 py-1 text-xs font-black text-orange-700 uppercase">
									in room
								</span>
							{/if}
						</div>
					</div>
					<div class="flex gap-2">
						<button
							class="material-symbols-outlined rounded-lg border-2 border-slate-900 bg-slate-200 p-2 hover:bg-slate-300"
							title="Edit"
							onclick={() => onedit?.(bot)}
						>
							edit
						</button>
						<button
							class="material-symbols-outlined rounded-lg border-2 border-slate-900 bg-red-100 p-2 text-red-700 hover:bg-red-200"
							title="Delete"
							onclick={() => ondelete?.(bot.id)}
						>
							delete
						</button>
					</div>
				</div>

				<div class="rounded-lg bg-slate-50 p-3 text-xs font-bold text-slate-600 space-y-1">
					{#if bot.clientMode === 'follow-owner' && bot.followUserId}
						<p>팔로우 대상: <span class="font-mono text-slate-800">{bot.followUserId}</span></p>
					{/if}
					<p>Last seen: {bot.lastSeenAt ?? '기록 없음'}</p>
				</div>

				<div class="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-500">
					<p>생성: {bot.created ?? '-'} | 수정: {bot.updated ?? '-'}</p>
				</div>
			</div>
		{/each}
	{/if}
</div>
