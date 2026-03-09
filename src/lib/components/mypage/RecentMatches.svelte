<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Match = {
		id: string;
		name: string;
		result: 'win' | 'loss';
		score: string;
		date: string;
	};

	let {
		matches = []
	}: {
		matches?: Match[];
	} = $props();
</script>

<div class="comic-border rounded-xl bg-white p-5">
	<h3 class="mb-4 text-sm font-black tracking-widest text-slate-500 uppercase">
		{m.mypage_recent_title()}
	</h3>
	<div class="space-y-3">
		{#each matches as match (match.id)}
			<div class="flex items-center justify-between rounded-lg bg-background-light p-3">
				<div class="flex items-center gap-3">
					<div
						class="flex size-10 items-center justify-center rounded-full border-2 border-slate-900
							{match.result === 'win' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}"
					>
						<span class="material-symbols-outlined text-base">
							{match.result === 'win' ? 'emoji_events' : 'close'}
						</span>
					</div>
					<div>
						<p class="text-sm font-black text-slate-900">{match.name}</p>
						<p class="text-xs font-bold text-slate-400">{match.date}</p>
					</div>
				</div>
				<div class="text-right">
					<span
						class="text-xs font-black uppercase
							{match.result === 'win' ? 'text-green-600' : 'text-red-600'}"
					>
						{match.result === 'win' ? m.mypage_match_win() : m.mypage_match_loss()}
					</span>
					<p class="text-sm font-bold text-slate-500">{match.score}</p>
				</div>
			</div>
		{/each}
	</div>
</div>
