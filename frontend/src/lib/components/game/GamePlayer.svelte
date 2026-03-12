<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import arrow from '$lib/assets/arrow.png';
	import bullet from '$lib/assets/bullet.png';
	import handcuffs from '$lib/assets/handcuffs.png';
	import heal from '$lib/assets/heal.png';
	import magnifier from '$lib/assets/magnifier.png';

	type Card = 'heal' | 'jail' | 'verify';
	type Role = 'normal' | 'spy' | 'leader' | 'revealed';

	let {
		name,
		hp,
		maxHp,
		alive,
		isMe = false,
		isTurn = false,
		chatBubble = null,
		selected = false,
		selectable = false,
		onselect,
		isJailed = false,
		attacks = 1,
		cards = [],
		role = 'normal',
		verified = false
	}: {
		name: string;
		hp: number;
		maxHp: number;
		alive: boolean;
		isMe?: boolean;
		isTurn?: boolean;
		chatBubble?: string | null;
		selected?: boolean;
		selectable?: boolean;
		onselect?: () => void;
		isJailed?: boolean;
		attacks?: number;
		cards?: Card[];
		role?: Role;
		verified?: boolean;
	} = $props();

	const cardImages: Record<Card, { src: string; alt: string }> = {
		heal: { src: heal, alt: 'heal' },
		jail: { src: handcuffs, alt: 'handcuffs' },
		verify: { src: magnifier, alt: 'magnifier' }
	};

	const roleColor = $derived.by(() => {
		if (verified && role === 'normal')
			return alive ? 'bg-green-100 border-green-400' : 'bg-green-200 border-green-500';
		switch (role) {
			case 'spy':
				return alive ? 'bg-red-100 border-red-400' : 'bg-red-200 border-red-500';
			case 'leader':
				return alive ? 'bg-blue-100 border-blue-400' : 'bg-blue-50 border-blue-300';
			case 'revealed':
				return alive ? 'bg-red-100 border-red-400' : 'bg-red-200 border-red-500';
			default:
				return alive ? 'bg-white border-slate-900' : 'bg-slate-50 border-slate-400';
		}
	});

	const roleTextColor = $derived.by(() => {
		if (verified && role === 'normal') return 'text-green-700';
		switch (role) {
			case 'spy':
				return 'text-red-700';
			case 'leader':
				return 'text-blue-700';
			case 'revealed':
				return 'text-red-700';
			default:
				return 'text-slate-900';
		}
	});

	const deadOverlayColor = $derived.by(() => {
		switch (role) {
			case 'spy':
				return 'bg-slate-500/70';
			case 'revealed':
				return 'bg-slate-500/70';
			default:
				return 'bg-slate-300/70';
		}
	});
</script>

<button
	class="relative flex flex-col items-center gap-2 rounded-xl border-3 p-3 transition-all
		{selected ? 'border-red-500 bg-red-50 ring-4 ring-red-500' : roleColor}
		{selectable && alive && !isMe ? 'cursor-pointer hover:scale-105' : ''}
		{isMe ? 'ring-3 ring-primary' : ''}
		"
	style="border-color: {selected
		? '#ef4444'
		: role === 'spy'
			? '#dc2626'
			: role === 'leader'
				? '#2563eb'
				: role === 'revealed'
					? '#dc2626'
					: verified
						? '#16a34a'
						: '#0f172a'}"
	disabled={!selectable || !alive || isMe}
	onclick={onselect}
>
	<!-- Chat bubble -->
	{#if chatBubble}
		<div class="absolute bottom-full left-1/2 z-40 mb-2 w-32 -translate-x-1/2">
			<div class="relative rounded-md border-2 border-slate-900 bg-white px-2 py-1.5 text-center text-xs font-bold text-slate-900 shadow-md">
				<span class="break-words">{chatBubble}</span>
				<div class="absolute -bottom-[9px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[9px] border-x-transparent border-t-slate-900"></div>
				<div class="absolute -bottom-[6px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[7px] border-x-transparent border-t-white"></div>
			</div>
		</div>
	{/if}

	<!-- Current turn indicator -->
	{#if isTurn}
		<div class="absolute -top-7 left-1/2 z-30 -translate-x-1/2">
			<img src={arrow} alt="current turn" class="animate-bounce" style="width: 3rem; height: 3rem; transform: scale(2); transform-origin: center top;" />
		</div>
	{/if}

	<!-- Jail bars overlay when jailed -->
	{#if isJailed}
		<div
			class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl"
		>
			<div
				class="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 opacity-40"
			></div>
			<svg class="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
				{#each Array.from({ length: 6 }) as _, i (i)}
					<line
						x1={i * 16 + 8}
						y1="0"
						x2={i * 16 + 8}
						y2="100"
						stroke="currentColor"
						stroke-width="2"
						class="text-slate-600 opacity-70"
					/>
				{/each}
			</svg>
		</div>
	{/if}

	<!-- Crosshair overlay when selected -->
	{#if selected}
		<div class="absolute inset-0 z-20 flex items-center justify-center">
			<span class="material-symbols-outlined text-5xl text-red-500/30">gps_fixed</span>
		</div>
	{/if}

	{#if !alive}
		<div class="pointer-events-none absolute inset-0 z-[5] rounded-xl {deadOverlayColor}"></div>
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
	<div class="flex w-full flex-col items-center gap-1">
		<span
			class="max-w-full truncate text-xs font-black tracking-tight
				{isMe ? 'text-primary' : roleTextColor}"
		>
			{name}
			{#if isMe}(ME){/if}
		</span>

		<!-- Role Badge -->
		{#if role === 'spy'}
			<span class="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-black text-white uppercase"
				>SPY</span
			>
		{:else if role === 'leader'}
			<span class="rounded-full bg-blue-500 px-2 py-0.5 text-[9px] font-black text-white uppercase"
				>CAPTAIN</span
			>
		{:else if role === 'revealed'}
			<span class="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-black text-white uppercase"
				>SPY</span
			>
		{:else if verified}
			<span class="rounded-full bg-green-500 px-2 py-0.5 text-[9px] font-black text-white uppercase"
				>AGENT</span
			>
		{/if}
	</div>

	<!-- HP Hearts -->
	{#if alive}
		<div class="flex justify-center gap-0.5 overflow-hidden">
			{#each Array.from({ length: maxHp }) as _, i (i)}
				<span
					class="material-symbols-outlined text-xs {i < hp ? 'text-red-500' : 'text-slate-300'}"
					style="font-variation-settings: 'FILL' {i < hp ? 1 : 0}"
				>
					favorite
				</span>
			{/each}
		</div>

		<!-- Attacks & Cards -->
		<div class="w-full space-y-1">
			<!-- Attacks -->
			<div
				class="flex items-center justify-center gap-1 overflow-hidden rounded bg-slate-100 px-2 py-1.5"
			>
				{#each Array.from({ length: attacks }) as _, i (i)}
					<img src={bullet} alt="attack" class="size-3 shrink-0" />
				{/each}
			</div>

			<!-- Cards -->
			{#if cards.length > 0}
				<div class="flex flex-wrap items-center justify-center gap-0.5">
					{#each cards as card, i (i)}
						<div
							class="flex size-7 items-center justify-center rounded border border-blue-300 bg-blue-100 p-1"
						>
							<img
								src={cardImages[card].src}
								alt={cardImages[card].alt}
								class="size-full object-contain"
							/>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<span class="text-[10px] font-black text-red-600 uppercase">{m.game_dead()}</span>
	{/if}
</button>
