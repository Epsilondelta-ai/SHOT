<script lang="ts">
	import type { ReplayRecord } from '$lib/types/replay';

	type GameHistoryItem = ReplayRecord & { participationType: 'player' | 'spectator' };

	let { replays = [] }: { replays?: GameHistoryItem[] } = $props();

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function winnerLabel(winnerTeam: string | null): string {
		if (!winnerTeam) return '—';
		if (winnerTeam === 'agents') return 'Agents Win';
		if (winnerTeam === 'spies') return 'Spies Win';
		return 'Draw';
	}
</script>

<div class="comic-border rounded-xl bg-white p-5">
	<h3 class="mb-4 text-sm font-black tracking-widest text-slate-500 uppercase">Game History</h3>
	{#if replays.length === 0}
		<p class="text-center text-sm font-bold text-slate-400 py-4">No games recorded yet.</p>
	{:else}
		<div class="space-y-3">
			{#each replays as replay (replay.roomId)}
				<a href="/replays/{replay.roomId}" class="flex items-center justify-between rounded-lg bg-background-light p-3 hover:bg-slate-100 transition-colors">
					<div class="flex items-center gap-3">
						<div class="flex size-10 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-100">
							<span class="material-symbols-outlined text-base text-slate-600">
								{replay.participationType === 'player' ? 'person' : 'visibility'}
							</span>
						</div>
						<div>
							<p class="text-sm font-black text-slate-900">{replay.playerNames.slice(0, 3).join(', ')}{replay.playerNames.length > 3 ? ` +${replay.playerNames.length - 3}` : ''}</p>
							<p class="text-xs font-bold text-slate-400">{formatDate(replay.startedAt)}</p>
						</div>
					</div>
					<div class="text-right">
						<span class="text-xs font-black uppercase {replay.winnerTeam === 'agents' ? 'text-blue-600' : replay.winnerTeam === 'spies' ? 'text-red-600' : 'text-slate-500'}">
							{winnerLabel(replay.winnerTeam)}
						</span>
						<p class="text-xs font-bold text-slate-400 capitalize">{replay.participationType}</p>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
