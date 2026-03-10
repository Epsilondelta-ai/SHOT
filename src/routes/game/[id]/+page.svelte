<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/stores';
	import GameHeader from '$lib/components/game/GameHeader.svelte';
	import GamePlayer from '$lib/components/game/GamePlayer.svelte';
	import GameLog from '$lib/components/game/GameLog.svelte';
	import GameResult from '$lib/components/game/GameResult.svelte';

	type Card = 'heal' | 'jail' | 'verify';
	type Role = 'normal' | 'spy' | 'leader';

	type GamePlayerData = {
		id: string;
		name: string;
		hp: number;
		maxHp: number;
		alive: boolean;
		isJailed?: boolean;
		attacks?: number;
		cards?: Card[];
		role?: Role;
	};

	type LogEntry = {
		id: string;
		text: string;
		type: 'shot' | 'eliminated' | 'round' | 'result';
	};

	type Phase = 'aiming' | 'waiting' | 'resolving' | 'finished';

	const gameId = $derived($page.params.id);
	const myId: string = 'p2';
	const totalTime = 15;

	let round = $state(1);
	let timeLeft = $state(12);
	let phase: Phase = $state('aiming');
	let selectedTargetId: string | null = $state(null);
	let isLogOpen = $state(false);

	let players: GamePlayerData[] = $state([
		{ id: 'p1', name: 'Sheriff_Buck', hp: 3, maxHp: 3, alive: true, attacks: 1, cards: [], isJailed: false, role: 'normal' },
		{ id: 'p2', name: 'Outlaw_Jane', hp: 3, maxHp: 3, alive: true, attacks: 2, cards: ['heal'], isJailed: false, role: 'normal' },
		{ id: 'p3', name: 'Doc_Holiday', hp: 2, maxHp: 3, alive: true, attacks: 1, cards: [], isJailed: false, role: 'normal' },
		{ id: 'p4', name: 'Calamity_Sue', hp: 0, maxHp: 3, alive: false, attacks: 1, cards: [], isJailed: false, role: 'normal' },
		{ id: 'p5', name: 'Quick_Draw', hp: 3, maxHp: 3, alive: true, attacks: 1, cards: ['verify'], isJailed: true, role: 'normal' },
		{ id: 'p6', name: 'Gunslinger_Kate', hp: 1, maxHp: 3, alive: true, attacks: 2, cards: ['heal', 'jail'], isJailed: false, role: 'normal' },
		{ id: 'p7', name: 'Bandit_Bob', hp: 3, maxHp: 3, alive: true, attacks: 1, cards: [], isJailed: false, role: 'normal' },
		{ id: 'p8', name: 'Lawman_Tom', hp: 2, maxHp: 3, alive: true, attacks: 1, cards: ['verify'], isJailed: false, role: 'normal' },
		{ id: 'p9', name: 'Undercover_Max', hp: 3, maxHp: 3, alive: true, attacks: 1, cards: [], isJailed: false, role: 'spy' },
		{ id: 'p10', name: 'Captain_Wilson', hp: 5, maxHp: 5, alive: true, attacks: 2, cards: [], isJailed: false, role: 'leader' }
	]);

	let logs: LogEntry[] = $state([
		{ id: '1', text: m.game_round_start({ round: '1' }), type: 'round' },
		{
			id: '2',
			text: m.game_shot_other({ shooter: 'Sheriff_Buck', target: 'Doc_Holiday' }),
			type: 'shot'
		},
		{
			id: '3',
			text: m.game_shot_other({ shooter: 'Doc_Holiday', target: 'Calamity_Sue' }),
			type: 'shot'
		},
		{
			id: '4',
			text: m.game_shot_other({ shooter: 'Calamity_Sue', target: 'Doc_Holiday' }),
			type: 'shot'
		},
		{ id: '5', text: m.game_eliminated({ player: 'Calamity_Sue' }), type: 'eliminated' },
		{ id: '6', text: m.game_round_start({ round: '2' }), type: 'round' }
	]);

	const myPlayer = $derived(players.find((p) => p.id === myId));
	const amAlive = $derived(myPlayer?.alive ?? false);
	const alivePlayers = $derived(players.filter((p) => p.alive));
	const opponents = $derived(players.filter((p) => p.id !== myId));
	const isFinished = $derived(phase === 'finished');
	const winner = $derived.by(() => {
		if (alivePlayers.length === 1) return alivePlayers[0];
		return undefined;
	});

	function selectTarget(playerId: string) {
		if (phase !== 'aiming' || !amAlive) return;
		selectedTargetId = selectedTargetId === playerId ? null : playerId;
	}

	function shoot() {
		if (!selectedTargetId || phase !== 'aiming') return;
		const target = players.find((p) => p.id === selectedTargetId);
		if (!target) return;

		phase = 'waiting';

		// Simulate round resolution after short delay
		setTimeout(() => {
			phase = 'resolving';

			// My shot
			logs = [
				...logs,
				{
					id: crypto.randomUUID(),
					text: m.game_you_shot({ target: target.name }),
					type: 'shot'
				}
			];

			players = players.map((p) => {
				if (p.id === selectedTargetId) {
					const newHp = Math.max(0, p.hp - 1);
					return { ...p, hp: newHp, alive: newHp > 0 };
				}
				return p;
			});

			// Check elimination
			const eliminated = players.find((p) => p.id === selectedTargetId && !p.alive);
			if (eliminated) {
				logs = [
					...logs,
					{
						id: crypto.randomUUID(),
						text: m.game_eliminated({ player: eliminated.name }),
						type: 'eliminated'
					}
				];
			}

			// Simulate opponent shots at me
			const shooters = alivePlayers.filter((p) => p.id !== myId && p.id !== selectedTargetId);
			if (shooters.length > 0 && Math.random() > 0.5) {
				const shooter = shooters[0];
				logs = [
					...logs,
					{
						id: crypto.randomUUID(),
						text: m.game_shot_you({ shooter: shooter.name }),
						type: 'shot'
					}
				];
				players = players.map((p) => {
					if (p.id === myId) {
						const newHp = Math.max(0, p.hp - 1);
						return { ...p, hp: newHp, alive: newHp > 0 };
					}
					return p;
				});
			}

			selectedTargetId = null;

			// Check game over
			const aliveNow = players.filter((p) => p.alive);
			if (aliveNow.length <= 1) {
				phase = 'finished';
				if (aliveNow.length === 1) {
					logs = [
						...logs,
						{
							id: crypto.randomUUID(),
							text: m.game_winner({ player: aliveNow[0].name }),
							type: 'result'
						}
					];
				}
			} else {
				// Next round
				setTimeout(() => {
					round += 1;
					timeLeft = totalTime;
					logs = [
						...logs,
						{
							id: crypto.randomUUID(),
							text: m.game_round_start({ round: String(round) }),
							type: 'round'
						}
					];
					phase = 'aiming';
				}, 1500);
			}
		}, 1500);
	}
</script>

<svelte:head>
	<title>{m.game_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background-dark font-display text-white">
	<GameHeader {round} {timeLeft} {totalTime} />

	<main class="mx-auto w-full max-w-2xl flex-1 space-y-5 p-4">
		<!-- Spectating banner -->
		{#if !amAlive && !isFinished}
			<div
				class="comic-border-sm flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-slate-400"
			>
				<span class="material-symbols-outlined">visibility</span>
				<span class="text-sm font-black uppercase">{m.game_spectating()}</span>
			</div>
		{/if}

		<!-- Opponents -->
		<section>
			<div class="grid grid-cols-5 gap-2">
				{#each opponents as player (player.id)}
					<GamePlayer
						name={player.name}
						hp={player.hp}
						maxHp={player.maxHp}
						alive={player.alive}
						selected={selectedTargetId === player.id}
						selectable={phase === 'aiming' && amAlive}
						onselect={() => selectTarget(player.id)}
						isJailed={player.isJailed}
						attacks={player.attacks}
						cards={player.cards}
						role={player.role}
					/>
				{/each}
			</div>
		</section>

		<!-- Action Area -->
		<section class="flex flex-col items-center gap-3">
			{#if phase === 'aiming' && amAlive}
				<p class="text-sm font-bold text-slate-400 uppercase tracking-wide">
					{#if selectedTargetId}
						<span class="material-symbols-outlined align-middle text-red-500">gps_fixed</span>
						{players.find((p) => p.id === selectedTargetId)?.name}
					{:else}
						{m.game_select_target()}
					{/if}
				</p>
				<button
					class="comic-button flex items-center justify-center gap-3 rounded-2xl border-3 border-slate-900 px-12 py-5 text-2xl font-extrabold uppercase italic shadow-[4px_4px_0px_#000] transition-all
						{selectedTargetId
						? 'bg-red-600 text-white hover:bg-red-700'
						: 'cursor-not-allowed bg-slate-700 text-slate-500'}"
					disabled={!selectedTargetId}
					onclick={shoot}
				>
					<span class="material-symbols-outlined text-3xl">local_fire_department</span>
					{m.game_shoot()}
				</button>
			{:else if phase === 'waiting'}
				<div class="flex flex-col items-center gap-3 py-4">
					<div class="size-10 animate-spin rounded-full border-4 border-slate-600 border-t-primary">
					</div>
					<p class="text-sm font-bold text-slate-400 uppercase">{m.game_waiting_others()}</p>
				</div>
			{:else if phase === 'resolving'}
				<div class="flex flex-col items-center gap-2 py-4">
					<span class="material-symbols-outlined animate-pulse text-5xl text-red-500"
						>local_fire_department</span
					>
				</div>
			{/if}
		</section>

		<!-- My Player -->
		{#if myPlayer}
			<section>
				<div class="mx-auto max-w-[200px]">
					<GamePlayer
						name={myPlayer.name}
						hp={myPlayer.hp}
						maxHp={myPlayer.maxHp}
						alive={myPlayer.alive}
						isMe={true}
						isJailed={myPlayer.isJailed}
						attacks={myPlayer.attacks}
						cards={myPlayer.cards}
						role={myPlayer.role}
					/>
				</div>
			</section>
		{/if}

	</main>

	<!-- GameLog Bottom Sheet Overlay -->
	<GameLog {logs} isOpen={isLogOpen} ontoggle={() => (isLogOpen = !isLogOpen)} />
</div>

<!-- Game Result Overlay -->
{#if isFinished}
	<GameResult
		winner={winner?.name}
		isMyWin={winner?.id === myId}
		isDraw={alivePlayers.length === 0}
	/>
{/if}
