<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>{m.home_title()}</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-background-light px-4 py-12 font-display text-slate-900"
>
	<!-- Background Decorations -->
	<div class="fixed top-8 left-8 hidden opacity-15 lg:block">
		<span class="material-symbols-outlined text-9xl font-bold text-primary">flare</span>
	</div>
	<div class="fixed right-8 bottom-32 hidden opacity-15 lg:block">
		<span class="material-symbols-outlined text-9xl font-bold text-primary"
			>local_fire_department</span
		>
	</div>

	<!-- Hero Content -->
	<div class="relative z-10 w-full max-w-2xl space-y-8 text-center">
		<!-- Title -->
		<div class="space-y-4">
			<h1 class="text-6xl font-black tracking-tighter text-primary uppercase italic drop-shadow-lg">
				{m.home_title()}
			</h1>
			<p class="text-xl font-bold tracking-wide text-slate-600 uppercase">
				{m.home_subtitle()}
			</p>
		</div>

		<!-- Game Description -->
		<div class="comic-border space-y-4 rounded-xl bg-white p-6 text-left">
			<h2 class="text-2xl font-black text-slate-900 uppercase">{m.home_game_intro_title()}</h2>
			<div class="space-y-3 text-sm leading-relaxed font-bold text-slate-700">
				<p>{m.home_game_intro_p1()}</p>
				<p>{m.home_game_intro_p2()}</p>
				<p>{m.home_game_intro_p3()}</p>
			</div>
		</div>

		<!-- Login Button -->
		<a
			href={resolve('/login')}
			class="comic-button block rounded-xl border-3 border-slate-900 bg-primary px-6 py-4 font-black text-white uppercase transition-all hover:shadow-[4px_4px_0px_#221910] active:shadow-none"
		>
			<div class="flex items-center justify-center gap-3">
				<span class="material-symbols-outlined">login</span>
				<span>{m.home_play_now()}</span>
			</div>
		</a>
	</div>
</div>
