<script lang="ts">
	let {
		username = 'Sheriff_Buck',
		avatarSrc = '',
		isAdmin = false
	}: { username?: string; avatarSrc?: string; isAdmin?: boolean } = $props();
</script>

<header class="sticky top-0 z-50 border-b-4 border-slate-900 bg-white px-4 py-4">
	<div class="relative mx-auto flex w-full max-w-2xl items-center justify-between">
		{#if isAdmin}
			<a
				href="/admin"
				class="comic-button flex items-center gap-1 rounded-lg border-2 border-slate-900 bg-slate-800 px-3 py-2 text-xs font-black text-white uppercase transition-colors hover:bg-slate-700"
			>
				<span class="material-symbols-outlined text-sm">admin_panel_settings</span>
				<span class="hidden sm:inline">Admin</span>
			</a>
		{:else}
			<div></div>
		{/if}

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
				class="flex size-12 items-center justify-center overflow-hidden rounded-full border-2 border-slate-900 bg-accent-beige"
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
