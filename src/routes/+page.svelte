<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import BottomNav from '$lib/components/lobby/BottomNav.svelte';
</script>

<svelte:head>
	<title>{m.home_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background-light font-display text-slate-900">
	<!-- Hero Section -->
	<div class="relative flex-1 flex flex-col items-center justify-center px-4 py-12">
		<!-- Background Decorations -->
		<div class="fixed top-8 left-8 hidden opacity-15 lg:block">
			<span class="material-symbols-outlined text-9xl font-bold text-primary">flare</span>
		</div>
		<div class="fixed bottom-32 right-8 hidden opacity-15 lg:block">
			<span class="material-symbols-outlined text-9xl font-bold text-primary">local_fire_department</span>
		</div>

		<!-- Hero Content -->
		<div class="relative z-10 max-w-2xl space-y-8 text-center">
			<!-- Title -->
			<div class="space-y-2">
				<h1 class="text-6xl font-black tracking-tighter text-primary italic uppercase drop-shadow-lg">
					{m.home_title()}
				</h1>
				<p class="text-xl font-bold text-slate-600 uppercase tracking-wide">
					{m.home_subtitle()}
				</p>
			</div>

			<!-- Description -->
			<p class="text-base font-bold text-slate-700 leading-relaxed max-w-md mx-auto">
				{m.home_description()}
			</p>

			<!-- Quick Navigation Cards -->
			<div class="space-y-3 pt-4">
				<!-- Lobby Card -->
				<a
					href={resolve('/lobby')}
					class="comic-button block rounded-xl border-3 border-slate-900 bg-white px-6 py-4 font-black uppercase text-slate-900 transition-all hover:shadow-[4px_4px_0px_#8b5a2b] active:shadow-none"
				>
					<div class="flex items-center justify-between gap-4">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-2xl text-primary">swords</span>
							<span>{m.home_play_now()}</span>
						</div>
						<span class="material-symbols-outlined">arrow_forward</span>
					</div>
				</a>

				<!-- Profile Card -->
				<a
					href={resolve('/mypage')}
					class="comic-button block rounded-xl border-3 border-slate-900 bg-white px-6 py-4 font-black uppercase text-slate-900 transition-all hover:shadow-[4px_4px_0px_#8b5a2b] active:shadow-none"
				>
					<div class="flex items-center justify-between gap-4">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-2xl text-primary">person</span>
							<span>{m.home_my_profile()}</span>
						</div>
						<span class="material-symbols-outlined">arrow_forward</span>
					</div>
				</a>

				<!-- Settings Card -->
				<a
					href={resolve('/config')}
					class="comic-button block rounded-xl border-3 border-slate-900 bg-white px-6 py-4 font-black uppercase text-slate-900 transition-all hover:shadow-[4px_4px_0px_#8b5a2b] active:shadow-none"
				>
					<div class="flex items-center justify-between gap-4">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-2xl text-primary">settings</span>
							<span>{m.home_settings()}</span>
						</div>
						<span class="material-symbols-outlined">arrow_forward</span>
					</div>
				</a>
			</div>
		</div>
	</div>

	<BottomNav active="home" />
</div>
