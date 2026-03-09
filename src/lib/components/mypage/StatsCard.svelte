<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		games = 128,
		wins = 87,
		streak = 9
	}: { games?: number; wins?: number; streak?: number } = $props();

	const winRate = $derived(games > 0 ? Math.round((wins / games) * 100) : 0);

	const stats = $derived([
		{ label: m.mypage_stats_games(), value: games, icon: 'sports_esports' },
		{ label: m.mypage_stats_wins(), value: wins, icon: 'emoji_events' },
		{ label: m.mypage_stats_win_rate(), value: `${winRate}%`, icon: 'bar_chart' },
		{ label: m.mypage_stats_streak(), value: streak, icon: 'local_fire_department' }
	]);
</script>

<div class="comic-border rounded-xl bg-white p-5">
	<h3 class="mb-4 text-sm font-black tracking-widest text-slate-500 uppercase">
		{m.mypage_stats_title()}
	</h3>
	<div class="grid grid-cols-4 gap-2">
		{#each stats as stat (stat.label)}
			<div class="flex flex-col items-center gap-1 rounded-lg bg-background-light p-3">
				<span class="material-symbols-outlined text-2xl text-primary">{stat.icon}</span>
				<span class="text-xl font-black text-slate-900">{stat.value}</span>
				<span class="text-center text-[10px] font-bold text-slate-500 uppercase">{stat.label}</span>
			</div>
		{/each}
	</div>
</div>
