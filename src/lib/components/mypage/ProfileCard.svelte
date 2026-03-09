<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		username = 'Sheriff_Buck',
		avatarSrc = ''
	}: {
		username?: string;
		avatarSrc?: string;
	} = $props();
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
		</div>

		<div class="min-w-0 flex-1">
			<h2 class="truncate text-2xl font-black tracking-tight text-slate-900 uppercase">
				{username}
			</h2>
		</div>
	</div>

	<button
		class="comic-button comic-border-sm mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-black tracking-wider text-slate-900 uppercase"
	>
		<span class="material-symbols-outlined text-base">edit</span>
		{m.mypage_edit_profile()}
	</button>

	<!-- Decorative circle -->
	<div
		class="absolute -top-6 -right-6 size-20 rounded-full border-4 border-primary/30 bg-primary/10"
	></div>
</div>
