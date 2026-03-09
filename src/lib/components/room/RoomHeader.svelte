<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		roomName,
		roomCode,
		currentPlayers,
		maxPlayers
	}: {
		roomName: string;
		roomCode: string;
		currentPlayers: number;
		maxPlayers: number;
	} = $props();
</script>

<header class="sticky top-0 z-50 border-b-4 border-slate-900 bg-white px-4 py-4">
	<div class="mx-auto flex w-full max-w-2xl items-center justify-between">
		<a
			href="/lobby"
			class="comic-button flex items-center gap-1 rounded-lg border-2 border-slate-900 bg-accent-beige px-3 py-2 text-sm font-bold transition-colors hover:bg-primary hover:text-white"
		>
			<span class="material-symbols-outlined text-lg">arrow_back</span>
			{m.room_back()}
		</a>

		<div class="text-center">
			<h1
				class="text-2xl font-extrabold tracking-tighter text-primary uppercase italic"
				style="text-shadow: 2px 2px 0px #221910;"
			>
				{roomName}
			</h1>
			<div class="mt-1 flex items-center justify-center gap-3 text-xs">
				<span class="flex items-center gap-1 font-bold text-slate-500">
					<span class="material-symbols-outlined text-sm">tag</span>
					{roomCode}
				</span>
				<span class="flex items-center gap-1 font-bold text-slate-500">
					<span class="material-symbols-outlined text-sm">group</span>
					{currentPlayers}/{maxPlayers}
				</span>
			</div>
		</div>

		<div class="w-[72px]"></div>
	</div>
</header>
