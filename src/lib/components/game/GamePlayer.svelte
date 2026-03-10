<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Card = 'heal' | 'jail' | 'verify';
	type Role = 'normal' | 'spy' | 'leader' | 'revealed';

	let {
		name,
		hp,
		maxHp,
		alive,
		isMe = false,
		selected = false,
		selectable = false,
		onselect,
		isJailed = false,
		attacks = 1,
		cards = [],
		role = 'normal'
	}: {
		name: string;
		hp: number;
		maxHp: number;
		alive: boolean;
		isMe?: boolean;
		selected?: boolean;
		selectable?: boolean;
		onselect?: () => void;
		isJailed?: boolean;
		attacks?: number;
		cards?: Card[];
		role?: Role;
	} = $props();

	const cardIcons: Record<Card, string> = {
		heal: 'local_hospital',
		jail: 'gavel',
		verify: 'warning'
	};

	const roleColor = $derived.by(() => {
		switch (role) {
			case 'spy':
				return 'bg-red-100 border-red-400';
			case 'leader':
				return 'bg-blue-100 border-blue-400';
			case 'revealed':
				return 'bg-green-100 border-green-400';
			default:
				return 'bg-white border-slate-900';
		}
	});

	const roleTextColor = $derived.by(() => {
		switch (role) {
			case 'spy':
				return 'text-red-700';
			case 'leader':
				return 'text-blue-700';
			case 'revealed':
				return 'text-green-700';
			default:
				return 'text-slate-900';
		}
	});
</script>

<button
	class="relative flex flex-col items-center gap-2 rounded-xl p-3 transition-all border-3
		{!alive ? 'opacity-40 grayscale' : ''}
		{selected ? 'ring-4 ring-red-500 bg-red-50 border-red-500' : roleColor}
		{selectable && alive && !isMe ? 'cursor-pointer hover:scale-105' : ''}
		{isMe ? 'ring-3 ring-primary' : ''}"
	style="border-color: {selected ? '#ef4444' : role === 'spy' ? '#dc2626' : role === 'leader' ? '#2563eb' : role === 'revealed' ? '#16a34a' : '#0f172a'}"
	disabled={!selectable || !alive || isMe}
	onclick={onselect}
>
	<!-- Jail bars overlay when jailed -->
	{#if isJailed}
		<div class="absolute inset-0 z-10 rounded-xl flex items-center justify-center pointer-events-none">
			<div class="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 opacity-40"></div>
			<svg class="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
				{#each Array.from({length: 6}) as _, i}
					<line x1={i * 16 + 8} y1="0" x2={i * 16 + 8} y2="100" stroke="currentColor" stroke-width="2" class="text-slate-600 opacity-70"/>
				{/each}
			</svg>
		</div>
	{/if}

	<!-- Crosshair overlay when selected -->
	{#if selected}
		<div class="absolute inset-0 flex items-center justify-center z-20">
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
	<div class="flex flex-col items-center gap-1 w-full">
		<span
			class="max-w-full truncate text-xs font-black tracking-tight
				{isMe ? 'text-primary' : roleTextColor}"
		>
			{name}
			{#if isMe}(ME){/if}
		</span>

		<!-- Role Badge -->
		{#if role === 'spy'}
			<span class="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white uppercase">SPY</span>
		{:else if role === 'leader'}
			<span class="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-500 text-white uppercase">LEADER</span>
		{:else if role === 'revealed'}
			<span class="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-500 text-white uppercase">REVEALED</span>
		{/if}
	</div>

	<!-- HP Hearts -->
	{#if alive}
		<div class="flex gap-0.5 justify-center">
			{#each Array.from({length: maxHp}) as _, i}
				<span
					class="material-symbols-outlined text-sm {i < hp ? 'text-red-500' : 'text-slate-300'}"
					style="font-variation-settings: 'FILL' {i < hp ? 1 : 0}"
				>
					favorite
				</span>
			{/each}
		</div>

		<!-- Attacks & Cards -->
		<div class="w-full space-y-1">
			<!-- Attacks -->
			<div class="flex items-center justify-center gap-1 px-2 py-1 bg-slate-100 rounded">
				{#each Array.from({length: attacks}) as _, i}
					<span class="material-symbols-outlined text-xs text-yellow-600">bullet_point</span>
				{/each}
			</div>

			<!-- Cards -->
			{#if cards.length > 0}
				<div class="flex items-center justify-center gap-0.5">
					{#each cards as card}
						<div class="flex items-center justify-center size-6 bg-blue-100 rounded border border-blue-300">
							<span class="material-symbols-outlined text-xs text-blue-600">
								{cardIcons[card]}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<span class="text-[10px] font-black text-red-600 uppercase">{m.game_dead()}</span>
	{/if}
</button>
