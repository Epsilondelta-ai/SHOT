<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		username = 'Sheriff_Buck',
		level = 42,
		xp = 7800,
		maxXp = 10000,
		avatarSrc = ''
	}: {
		username?: string;
		level?: number;
		xp?: number;
		maxXp?: number;
		avatarSrc?: string;
	} = $props();

	const xpPercent = $derived(Math.round((xp / maxXp) * 100));
</script>

<div class="comic-border relative overflow-hidden rounded-xl bg-white p-6">
	<div class="flex items-center gap-5">
		<div class="relative shrink-0">
			<div
				class="flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-slate-900 bg-accent-beige"
			>
				{#if avatarSrc}
					<img alt="Avatar" class="h-full w-full object-cover" src={avatarSrc} />
				{:else}
					<span class="material-symbols-outlined text-5xl text-slate-600">person</span>
				{/if}
			</div>
			<div
				class="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white"
			>
				{level}
			</div>
		</div>

		<div class="min-w-0 flex-1">
			<h2 class="truncate text-2xl font-black uppercase tracking-tight text-slate-900">
				{username}
			</h2>
			<p class="text-xs font-bold uppercase text-slate-500">
				{m.mypage_level()} {level}
			</p>

			<div class="mt-3">
				<div class="mb-1 flex justify-between text-xs font-bold text-slate-500">
					<span>XP</span>
					<span>{xp.toLocaleString()} / {maxXp.toLocaleString()}</span>
				</div>
				<div class="h-3 w-full overflow-hidden rounded-full border-2 border-slate-900 bg-slate-100">
					<div
						class="h-full rounded-full bg-primary transition-all"
						style="width: {xpPercent}%"
					></div>
				</div>
			</div>
		</div>
	</div>

	<button
		class="comic-button comic-border-sm mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-black uppercase tracking-wider text-slate-900"
	>
		<span class="material-symbols-outlined text-base">edit</span>
		{m.mypage_edit_profile()}
	</button>

	<!-- Decorative circle -->
	<div
		class="absolute -top-6 -right-6 size-20 rounded-full border-4 border-primary/30 bg-primary/10"
	></div>
</div>
