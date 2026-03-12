<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		winner,
		isMyWin = false,
		isDraw = false,
		countdown = null
	}: {
		winner?: string;
		isMyWin?: boolean;
		isDraw?: boolean;
		countdown?: number | null;
	} = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
	<div
		class="comic-border mx-4 flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl bg-white p-8 text-center"
	>
		{#if isDraw}
			<span class="material-symbols-outlined text-7xl text-slate-500">handshake</span>
			<h2
				class="text-4xl font-extrabold tracking-tighter text-slate-700 uppercase italic"
				style="text-shadow: 2px 2px 0px #d7ccc8;"
			>
				{m.game_draw()}
			</h2>
		{:else if isMyWin}
			<span class="material-symbols-outlined text-7xl text-yellow-500">emoji_events</span>
			<h2
				class="text-4xl font-extrabold tracking-tighter text-primary uppercase italic"
				style="text-shadow: 2px 2px 0px #221910;"
			>
				{m.game_you_win()}
			</h2>
		{:else}
			<span class="material-symbols-outlined text-7xl text-primary">emoji_events</span>
			<h2
				class="text-3xl font-extrabold tracking-tighter text-slate-900 uppercase italic"
				style="text-shadow: 2px 2px 0px #d7ccc8;"
			>
				{m.game_winner({ player: winner ?? '' })}
			</h2>
		{/if}

		{#if countdown !== null}
			<p class="text-sm font-bold text-slate-500">
				Returning to lobby in {countdown}s…
			</p>
		{/if}

		<a
			href="/lobby"
			class="comic-button w-full rounded-xl border-3 border-slate-900 bg-primary px-6 py-4 text-center font-black text-white uppercase italic shadow-[3px_3px_0px_#221910]"
		>
			{m.game_back_to_lobby()}
		</a>
	</div>
</div>
