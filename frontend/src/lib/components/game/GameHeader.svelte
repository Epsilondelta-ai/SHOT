<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		round,
		timeLeft,
		totalTime = 15
	}: {
		round: number;
		timeLeft: number;
		totalTime?: number;
	} = $props();

	const timerPercent = $derived(Math.max(0, (timeLeft / totalTime) * 100));
	const timerUrgent = $derived(timeLeft <= 5);
</script>

<header class="sticky top-0 z-50 border-b-4 border-slate-900 bg-background-dark px-4 py-3">
	<div class="mx-auto flex w-full max-w-2xl items-center justify-between">
		<div class="flex items-center gap-2">
			<span
				class="rounded-lg border-2 border-slate-600 bg-slate-800 px-3 py-1 text-xs font-black tracking-widest text-primary uppercase"
			>
				{m.game_round()}
				{round}
			</span>
		</div>

		<h1
			class="text-3xl font-extrabold tracking-tighter text-primary uppercase italic"
			style="text-shadow: 2px 2px 0px #000;"
		>
			SHOT!
		</h1>

		<div class="flex items-center gap-2">
			<span
				class="material-symbols-outlined text-lg {timerUrgent
					? 'animate-pulse text-red-400'
					: 'text-slate-400'}">timer</span
			>
			<span class="text-xl font-black tabular-nums {timerUrgent ? 'text-red-400' : 'text-white'}">
				{timeLeft}s
			</span>
		</div>
	</div>

	<!-- Timer bar -->
	<div class="mx-auto mt-2 h-1.5 w-full max-w-2xl overflow-hidden rounded-full bg-slate-700">
		<div
			class="h-full rounded-full transition-all duration-1000 ease-linear
				{timerUrgent ? 'bg-red-500' : 'bg-primary'}"
			style="width: {timerPercent}%"
		></div>
	</div>
</header>
