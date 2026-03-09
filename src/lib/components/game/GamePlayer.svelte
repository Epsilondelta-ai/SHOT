<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		name,
		hp,
		maxHp,
		alive,
		isMe = false,
		selected = false,
		selectable = false,
		onselect
	}: {
		name: string;
		hp: number;
		maxHp: number;
		alive: boolean;
		isMe?: boolean;
		selected?: boolean;
		selectable?: boolean;
		onselect?: () => void;
	} = $props();

	const hpPercent = $derived(Math.max(0, (hp / maxHp) * 100));
	const hpColor = $derived(
		hpPercent > 60 ? 'bg-green-500' : hpPercent > 30 ? 'bg-yellow-500' : 'bg-red-500'
	);
</script>

<button
	class="comic-border relative flex flex-col items-center gap-2 rounded-xl p-3 transition-all
		{!alive ? 'opacity-40 grayscale' : ''}
		{selected ? 'ring-4 ring-red-500 bg-red-50' : 'bg-white'}
		{selectable && alive && !isMe ? 'cursor-pointer hover:bg-red-50 hover:scale-105' : ''}
		{isMe ? 'ring-3 ring-primary bg-primary/5' : ''}"
	disabled={!selectable || !alive || isMe}
	onclick={onselect}
>
	<!-- Crosshair overlay when selected -->
	{#if selected}
		<div class="absolute inset-0 flex items-center justify-center">
			<span class="material-symbols-outlined text-5xl text-red-500/30">gps_fixed</span>
		</div>
	{/if}

	<!-- Avatar -->
	<div
		class="relative size-14 overflow-hidden rounded-full border-3 border-slate-900
			{alive ? 'bg-accent-beige' : 'bg-slate-300'}"
	>
		<div class="flex h-full w-full items-center justify-center">
			<span class="material-symbols-outlined text-2xl {alive ? 'text-slate-600' : 'text-slate-400'}"
				>{alive ? 'person' : 'skull'}</span
			>
		</div>
	</div>

	<!-- Name -->
	<span
		class="max-w-full truncate text-xs font-black tracking-tight
			{isMe ? 'text-primary' : 'text-slate-900'}"
	>
		{name}
		{#if isMe}(ME){/if}
	</span>

	<!-- HP Bar -->
	{#if alive}
		<div class="w-full">
			<div class="flex items-center justify-between text-[10px] font-bold text-slate-500">
				<span>{m.game_hp()}</span>
				<span>{hp}/{maxHp}</span>
			</div>
			<div class="mt-0.5 h-2 w-full overflow-hidden rounded-full border border-slate-900 bg-slate-200">
				<div
					class="h-full rounded-full transition-all duration-500 {hpColor}"
					style="width: {hpPercent}%"
				></div>
			</div>
		</div>
	{:else}
		<span class="text-[10px] font-black text-red-600 uppercase">{m.game_dead()}</span>
	{/if}
</button>
