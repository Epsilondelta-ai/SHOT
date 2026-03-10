<script lang="ts">
	let { username = 'Sheriff_Buck', avatarSrc = '' }: { username?: string; avatarSrc?: string } =
		$props();
</script>

<header class="sticky top-0 z-50 border-b-4 border-slate-900 bg-white px-4 py-4">
	<div class="relative mx-auto flex w-full max-w-2xl items-center justify-end">
		<h1
			class="absolute left-1/2 -translate-x-1/2 text-4xl font-extrabold tracking-tighter text-primary uppercase italic"
			style="text-shadow: 2px 2px 0px #221910;"
		>
			SHOT!
		</h1>

		<div class="flex items-center gap-2">
			<div class="mr-2 hidden flex-col items-end sm:flex">
				<span class="text-sm font-bold">{username}</span>
			</div>
			<a
				href="/mypage"
				class="size-12 overflow-hidden rounded-full border-2 border-slate-900 bg-accent-beige"
			>
				{#if avatarSrc}
					<img alt="User Avatar" class="h-full w-full object-cover" src={avatarSrc} />
				{:else}
					<span class="material-symbols-outlined text-2xl text-slate-600">person</span>
				{/if}
			</a>
		</div>
	</div>
</header>
