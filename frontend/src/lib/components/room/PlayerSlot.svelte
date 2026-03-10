<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		player,
		isHost = false,
		isMe = false,
		onkick
	}: {
		player?: { name: string; avatarSrc?: string; ready: boolean };
		isHost?: boolean;
		isMe?: boolean;
		onkick?: () => void;
	} = $props();
</script>

{#if player}
	<div
		class="comic-border relative flex flex-col items-center gap-2 rounded-xl bg-white p-4 transition-all
			{player.ready ? 'ring-3 ring-green-400' : ''}"
	>
		{#if isHost}
			<span
				class="absolute -top-3 -right-2 rounded-full border-2 border-slate-900 bg-yellow-400 px-2 py-0.5 text-[10px] font-black uppercase"
			>
				{m.room_host()}
			</span>
		{/if}

		<div
			class="relative size-16 overflow-hidden rounded-full border-3 border-slate-900
				{player.ready ? 'bg-green-100' : 'bg-accent-beige'}"
		>
			{#if player.avatarSrc}
				<img alt={player.name} class="h-full w-full object-cover" src={player.avatarSrc} />
			{:else}
				<div class="flex h-full w-full items-center justify-center">
					<span class="material-symbols-outlined text-3xl text-slate-600">person</span>
				</div>
			{/if}
		</div>

		<span class="text-sm font-black tracking-tight {isMe ? 'text-primary' : 'text-slate-900'}">
			{player.name}
		</span>

		{#if player.ready}
			<span
				class="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-[10px] font-black text-green-700 uppercase"
			>
				<span class="material-symbols-outlined text-xs">check_circle</span>
				{m.room_ready()}
			</span>
		{:else}
			<span
				class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-400 uppercase"
			>
				{m.room_not_ready()}
			</span>
		{/if}

		{#if onkick && !isMe}
			<button
				class="absolute -top-2 -left-2 flex size-6 items-center justify-center rounded-full border-2 border-slate-900 bg-red-500 text-white transition-transform hover:scale-110"
				onclick={onkick}
				title={m.room_kick()}
			>
				<span class="material-symbols-outlined text-sm">close</span>
			</button>
		{/if}
	</div>
{:else}
	<div
		class="comic-border flex flex-col items-center justify-center gap-2 rounded-xl border-dashed bg-slate-50 p-4 opacity-50"
	>
		<div
			class="flex size-16 items-center justify-center rounded-full border-3 border-dashed border-slate-300"
		>
			<span class="material-symbols-outlined text-3xl text-slate-300">person_add</span>
		</div>
		<span class="text-xs font-bold text-slate-400">{m.room_empty_slot()}</span>
	</div>
{/if}
