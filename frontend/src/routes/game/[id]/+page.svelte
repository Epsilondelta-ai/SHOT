<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import GameHeader from '$lib/components/game/GameHeader.svelte';
	import GamePlayer from '$lib/components/game/GamePlayer.svelte';
	import GameLog from '$lib/components/game/GameLog.svelte';
	import GameChat from '$lib/components/game/GameChat.svelte';
	import GameResult from '$lib/components/game/GameResult.svelte';

	type Card = 'heal' | 'jail' | 'verify';
	type Role = 'normal' | 'spy' | 'leader' | 'revealed';

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

	type Phase = 'chatting' | 'aiming' | 'waiting' | 'resolving' | 'finished' | 'died';

	interface PageProps {
		initialPhase?: Phase;
		initialPlayers?: GamePlayerData[];
		initialLogs?: LogEntry[];
	}

	// eslint-disable-next-line svelte/valid-prop-names-in-kit-pages
	let { initialPhase = 'aiming', initialPlayers, initialLogs }: PageProps = $props();

	const myId: string = 'p2';
	const totalTime = 15;
	const actionCardPool: Card[] = ['heal', 'jail', 'verify'];

	let round = $state(1);
	let timeLeft = $state(12);
	// eslint-disable-next-line svelte/prefer-writable-derived
	let phase = $state<Phase>('aiming');
	let selectedTargetId: string | null = $state(null);
	let selectedCard: Card | null = $state(null);
	let isLogOpen = $state(false);
	let isChatOpen = $state(false);
	let remainingChatTurns = $state(0);
	let cardsDrawnThisTurn = $state(0);

	type ChatMessage = {
		id: string;
		playerId: string;
		playerName: string;
		text: string;
	};

	let chatMessages: ChatMessage[] = $state([]);

	function sendChat(text: string) {
		if (phase !== 'chatting' || remainingChatTurns <= 0) return;
		const me = players.find((p) => p.id === myId);
		chatMessages = [
			...chatMessages,
			{
				id: crypto.randomUUID(),
				playerId: myId,
				playerName: me?.name ?? 'Me',
				text
			}
		];

		remainingChatTurns -= 1;
		if (remainingChatTurns <= 0) {
			phase = 'aiming';
			isChatOpen = false;
		}
	}

	function skipChatTurn() {
		if (phase !== 'chatting') return;
		remainingChatTurns = 0;
		phase = 'aiming';
		isChatOpen = false;
	}

	// eslint-disable-next-line svelte/prefer-writable-derived
	let players = $state<GamePlayerData[]>([]);

	$effect(() => {
		players = initialPlayers ?? [];
		logs = initialLogs ?? [];
		selectedTargetId = null;
		selectedCard = null;
		remainingChatTurns = 0;
		cardsDrawnThisTurn = 0;
		isChatOpen = false;
		phase = initialPhase;
		if ((initialPlayers?.length ?? 0) > 0 && initialPhase === 'aiming') {
			queueMicrotask(() => startTurn());
		}
	});

	// eslint-disable-next-line svelte/prefer-writable-derived
	let logs = $state<LogEntry[]>([]);

	const myPlayer = $derived(players.find((p) => p.id === myId));
	const amAlive = $derived(myPlayer?.alive ?? false);
	const alivePlayers = $derived(players.filter((p) => p.alive));
	const isFinished = $derived(phase === 'finished');
	const canSendChat = $derived(phase === 'chatting' && remainingChatTurns > 0);
	const isRevealedSpy = $derived(myPlayer?.role === 'revealed');
	const winner = $derived.by(() => {
		if (alivePlayers.length === 1) return alivePlayers[0];
		return undefined;
	});

	function getRandomActionCard(): Card {
		return actionCardPool[Math.floor(Math.random() * actionCardPool.length)] ?? 'verify';
	}

	function appendLog(text: string, type: LogEntry['type'] = 'round') {
		logs = [...logs, { id: crypto.randomUUID(), text, type }];
	}

	function drawActionCards(count: number) {
		const drawnCards = Array.from({ length: count }, () => getRandomActionCard());
		cardsDrawnThisTurn += count;
		players = players.map((player) =>
			player.id === myId ? { ...player, cards: [...(player.cards ?? []), ...drawnCards] } : player
		);
		return drawnCards;
	}

	function startTurn() {
		const me = players.find((player) => player.id === myId);
		if (!me?.alive) return;

		selectedTargetId = null;
		selectedCard = null;
		cardsDrawnThisTurn = 0;
		remainingChatTurns = 0;

		drawActionCards(2);
		appendLog('You drew 2 action cards.');
		remainingChatTurns = 1;

		if (me.role === 'revealed') {
			drawActionCards(2);
			appendLog('Revealed spy bonus: drew 2 more action cards and gained 1 extra chat.');
			remainingChatTurns += 1;
		}

		phase = remainingChatTurns > 0 ? 'chatting' : 'aiming';
		isChatOpen = remainingChatTurns > 0;
	}

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
					const nextRound = round + 1;
					round = nextRound;
					timeLeft = totalTime;
					logs = [
						...logs,
						{
							id: crypto.randomUUID(),
							text: m.game_round_start({ round: String(nextRound) }),
							type: 'round'
						}
					];
					startTurn();
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
			<div class="grid grid-cols-6 gap-2">
				{#each players as player (player.id)}
					<GamePlayer
						name={player.name}
						hp={player.hp}
						maxHp={player.maxHp}
						alive={player.alive}
						selected={selectedTargetId === player.id}
						selectable={phase === 'aiming' && amAlive && player.id !== myId}
						onselect={() => selectTarget(player.id)}
						isJailed={player.isJailed}
						attacks={player.attacks}
						cards={player.cards}
						role={player.role}
						isMe={player.id === myId}
					/>
				{/each}
			</div>
		</section>

		<!-- Action Area -->
		{#if phase !== 'finished' && phase !== 'died'}
			<section class="flex flex-col items-center gap-3">
				{#if phase === 'chatting' && amAlive}
					<div
						class="comic-border-sm w-full max-w-xl rounded-2xl bg-slate-800/90 px-5 py-5 text-center"
					>
						<p class="text-xs font-black tracking-[0.25em] text-primary uppercase">Turn Start</p>
						<p class="mt-2 text-lg font-black text-white">
							Drew {cardsDrawnThisTurn} action card{cardsDrawnThisTurn === 1 ? '' : 's'}
						</p>
						<p class="mt-2 text-sm font-bold text-slate-300">
							You can chat {remainingChatTurns} more time{remainingChatTurns === 1 ? '' : 's'} before
							acting.
						</p>
						{#if isRevealedSpy}
							<p class="mt-2 text-xs font-black tracking-wide text-green-400 uppercase">
								Revealed spy bonus active
							</p>
						{/if}
						<div class="mt-4 flex flex-wrap items-center justify-center gap-3">
							<button
								class="comic-button rounded-xl border-2 border-slate-900 bg-primary px-5 py-3 text-sm font-black text-white uppercase"
								onclick={() => (isChatOpen = true)}
							>
								Open Chat
							</button>
							<button
								class="comic-button rounded-xl border-2 border-slate-900 bg-slate-600 px-5 py-3 text-sm font-black text-white uppercase"
								onclick={skipChatTurn}
							>
								Skip Chat
							</button>
						</div>
					</div>
				{:else if phase === 'aiming' && amAlive}
					{#if selectedCard}
						<p class="text-sm font-bold tracking-wide text-slate-400 uppercase">
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
							<span class="material-symbols-outlined text-3xl">
								{selectedCard === 'heal'
									? 'local_hospital'
									: selectedCard === 'jail'
										? 'gavel'
										: selectedCard === 'verify'
											? 'warning'
											: 'local_fire_department'}
							</span>
							{selectedCard === 'heal'
								? 'HEAL'
								: selectedCard === 'jail'
									? 'JAIL'
									: selectedCard === 'verify'
										? 'VERIFY'
										: 'SHOT'}
						</button>
					{:else}
						<p class="text-sm font-bold tracking-wide text-slate-400 uppercase">
							Select a card to act
						</p>
					{/if}
				{:else if phase === 'waiting'}
					<div class="flex flex-col items-center gap-3 py-4">
						<div
							class="size-10 animate-spin rounded-full border-4 border-slate-600 border-t-primary"
						></div>
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
		{/if}

		<!-- My Card Hand -->
		{#if myPlayer && phase !== 'finished' && phase !== 'died'}
			<section class="border-t-4 border-slate-600 pt-4">
				<h3 class="mb-3 text-sm font-black text-slate-300 uppercase">My Cards</h3>
				<div class="flex flex-wrap items-center justify-center gap-3">
					{#if myPlayer.cards && myPlayer.cards.length > 0}
						{#each myPlayer.cards as card, i (i)}
							<button
								class="group relative flex flex-col items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all"
								class:border-primary={selectedCard === card}
								class:border-slate-400={selectedCard !== card}
								class:text-white={selectedCard === card}
								style={selectedCard === card
									? 'background: linear-gradient(to bottom, var(--color-primary)); box-shadow: 0 10px 15px -3px rgba(168, 85, 247, 0.5));'
									: 'background: linear-gradient(to bottom, rgb(55, 65, 81), rgb(31, 41, 55))'}
								title={`Play ${card}`}
								onclick={() => (selectedCard = selectedCard === card ? null : card)}
							>
								<!-- Card icon -->
								<span
									class="material-symbols-outlined text-2xl transition-transform"
									class:text-primary={selectedCard !== card}
									class:text-white={selectedCard === card}
									class:group-hover:scale-110={selectedCard !== card}
								>
									{card === 'heal' ? 'local_hospital' : card === 'jail' ? 'gavel' : 'warning'}
								</span>
								<!-- Card label -->
								<span
									class="text-xs font-bold uppercase transition-colors"
									class:text-slate-300={selectedCard !== card}
									class:group-hover:text-primary={selectedCard !== card}
									class:text-white={selectedCard === card}
								>
									{card}
								</span>
							</button>
						{/each}
					{:else}
						<p class="text-sm font-bold text-slate-500">No cards in hand</p>
					{/if}
				</div>
			</section>
		{/if}
	</main>

	<!-- GameLog Bottom Sheet Overlay -->
	<GameLog {logs} isOpen={isLogOpen} ontoggle={() => (isLogOpen = !isLogOpen)} />

	<!-- GameChat Bottom Sheet Overlay -->
	<GameChat
		messages={chatMessages}
		{myId}
		isOpen={isChatOpen}
		canSend={canSendChat}
		ontoggle={() => (isChatOpen = !isChatOpen)}
		onsend={sendChat}
	/>
</div>

<!-- Game Result Overlay -->
{#if isFinished}
	<GameResult
		winner={winner?.name}
		isMyWin={winner?.id === myId}
		isDraw={alivePlayers.length === 0}
	/>
{/if}
