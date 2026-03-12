<script lang="ts">
	import type { ReplayRecord } from '$lib/types/replay';

	let { data } = $props();
	const records: ReplayRecord[] = data.records;

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleString();
	}

	function winnerLabel(team: string | null): string {
		if (team === 'agents') return '대원 팀 승리';
		if (team === 'spies') return '스파이 팀 승리';
		if (team === 'draw') return '무승부';
		return '알 수 없음';
	}
</script>

<svelte:head>
	<title>다시보기</title>
</svelte:head>

<div class="min-h-screen bg-background-dark font-display text-white">
	<div class="mx-auto max-w-2xl p-6">
		<h1 class="mb-6 text-2xl font-black uppercase tracking-widest text-white">게임 다시보기</h1>

		{#if records.length === 0}
			<div class="rounded-xl bg-slate-800 px-6 py-10 text-center text-slate-400">
				<p class="font-bold">아직 종료된 게임이 없습니다.</p>
			</div>
		{:else}
			<div class="flex flex-col gap-4">
				{#each records as record (record.roomId)}
					<a
						href="/replays/{record.roomId}"
						class="comic-border-sm block rounded-xl bg-slate-800 px-5 py-4 transition-colors hover:bg-slate-700"
					>
						<div class="flex items-center justify-between gap-4">
							<div>
								<p class="text-sm font-black text-white">
									{record.playerNames.join(', ')}
								</p>
								<p class="mt-1 text-xs font-bold text-slate-400">
									{record.playerCount}명 &mdash; {formatDate(record.startedAt)}
								</p>
							</div>
							<span
								class="rounded-lg px-3 py-1 text-xs font-black uppercase"
								class:bg-blue-700={record.winnerTeam === 'agents'}
								class:bg-red-700={record.winnerTeam === 'spies'}
								class:bg-slate-600={record.winnerTeam === 'draw' || !record.winnerTeam}
							>
								{winnerLabel(record.winnerTeam)}
							</span>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
