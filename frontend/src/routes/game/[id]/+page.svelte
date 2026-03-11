<script lang="ts">
	import GameChat from '$lib/components/game/GameChat.svelte';
	import GameHeader from '$lib/components/game/GameHeader.svelte';
	import GameLog from '$lib/components/game/GameLog.svelte';
	import GamePlayer from '$lib/components/game/GamePlayer.svelte';
	import GameResult from '$lib/components/game/GameResult.svelte';
	import { createGameSocket } from '$lib/gameSocket.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { ActionCard, GameAction, GameSnapshot } from '$lib/types/game';

	const emptyGame: GameSnapshot = {
		roomId: 'story-room',
		round: 1,
		currentTurnPlayerId: 'p2',
		viewerMode: 'player',
		myPlayerId: 'p2',
		myTeam: 'agents',
		phase: 'acting',
		remainingChatTurns: 0,
		canReveal: false,
		winnerTeam: null,
		players: [],
		logs: [],
		chatMessages: []
	};

	let { data } = $props();

	let game = $state<GameSnapshot>((data.game as GameSnapshot) ?? emptyGame);
	let selectedCard = $state<ActionCard | null>(null);
	let selectedTargetId = $state<string | null>(null);
	let isLogOpen = $state(false);
	let isChatOpen = $state(false);
	let actionError = $state('');
	let actionPending = $state(false);
	let timeLeft = $state(15);

	let socket = $state<ReturnType<typeof createGameSocket> | null>(null);

	$effect(() => {
		const s = createGameSocket(
			game.roomId,
			{
				onGameState: (snapshot) => {
					game = snapshot;
					actionPending = false;
					selectedCard = null;
					selectedTargetId = null;
				},
				onError: () => {
					actionError = 'Connection lost. Please refresh.';
				}
			},
			{ spectator: game.viewerMode === 'spectator' }
		);
		socket = s;
		return () => s.close();
	});

	$effect(() => {
		const round = game.round;
		timeLeft = round >= 0 ? 15 : 15;
		const timer = setInterval(() => {
			timeLeft = Math.max(0, timeLeft - 1);
		}, 1000);

		return () => clearInterval(timer);
	});

	const myPlayer = $derived(game.players.find((player) => player.id === game.myPlayerId));
	const amAlive = $derived(myPlayer?.alive ?? false);
	const isMyTurn = $derived(game.currentTurnPlayerId === game.myPlayerId);
	const isFinished = $derived(game.phase === 'finished');
	const canSendChat = $derived(
		isMyTurn && game.phase === 'chatting' && game.remainingChatTurns > 0
	);
	const canAct = $derived(isMyTurn && game.phase === 'acting' && amAlive);
	const handOptions = $derived.by(() => {
		if (!myPlayer) return [] as { card: ActionCard; count: number; icon: string; label: string }[];

		const counts: Record<ActionCard, number> = {
			attack: myPlayer.attacks,
			heal: myPlayer.cards.filter((card) => card === 'heal').length,
			jail: myPlayer.cards.filter((card) => card === 'jail').length,
			verify: myPlayer.cards.filter((card) => card === 'verify').length
		};

		return (Object.entries(counts) as [ActionCard, number][])
			.filter(([, count]) => count > 0)
			.map(([card, count]) => ({
				card,
				count,
				icon:
					card === 'attack'
						? 'local_fire_department'
						: card === 'heal'
							? 'local_hospital'
							: card === 'jail'
								? 'gavel'
								: 'warning',
				label: card.toUpperCase()
			}));
	});

	function dispatchAction(action: GameAction) {
		if (actionPending) return;
		if (!socket) return;

		actionPending = true;
		actionError = '';
		socket.sendAction(action);

		// Auto-release pending after 10s in case server never responds
		setTimeout(() => {
			actionPending = false;
		}, 10000);
	}

	function selectTarget(playerId: string) {
		if (!canAct) return;
		selectedTargetId = selectedTargetId === playerId ? null : playerId;
	}

	function sendChat(text: string) {
		dispatchAction({ type: 'chat', text });
	}

	function skipChatTurn() {
		dispatchAction({ type: 'skip-chat' });
	}

	function revealIdentity() {
		dispatchAction({ type: 'reveal' });
	}

	function endTurn() {
		dispatchAction({ type: 'end-turn' });
	}

	function playSelectedCard() {
		if (!selectedCard || !myPlayer) return;

		const targetId =
			selectedCard === 'heal' ? (selectedTargetId ?? myPlayer.id) : (selectedTargetId ?? undefined);

		if (selectedCard !== 'heal' && !targetId) {
			actionError = 'Select a target first.';
			return;
		}

		dispatchAction({ type: 'play-card', card: selectedCard, targetId });
	}

	const winnerLabel = $derived(
		game.winnerTeam === 'agents' ? 'Agents' : game.winnerTeam === 'spies' ? 'Spies' : undefined
	);
	const isMyWin = $derived(game.winnerTeam !== null && game.winnerTeam === game.myTeam);
	const isSpectator = $derived(game.viewerMode === 'spectator');
</script>

<svelte:head>
	<title>{m.game_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background-dark font-display text-white">
	<GameHeader round={game.round} {timeLeft} totalTime={15} />

	<main class="mx-auto w-full max-w-2xl flex-1 space-y-5 p-4">
		<div class="comic-border-sm rounded-xl bg-slate-800 px-4 py-3 text-center">
			<p class="text-xs font-black tracking-[0.25em] text-slate-400 uppercase">Current Turn</p>
			<p class="mt-2 text-lg font-black text-white">
				{game.players.find((player) => player.id === game.currentTurnPlayerId)?.name}
			</p>
			<p class="mt-1 text-sm font-bold text-slate-400">
				{#if isFinished}
					Game finished
				{:else if isMyTurn}
					Your turn
				{:else}
					Waiting for another player
				{/if}
			</p>
		</div>

		{#if (isSpectator || !amAlive) && !isFinished}
			<div
				class="comic-border-sm flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-slate-400"
			>
				<span class="material-symbols-outlined">visibility</span>
				<span class="text-sm font-black uppercase">{m.game_spectating()}</span>
			</div>
		{/if}

		<section>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
				{#each game.players as player (player.id)}
					<GamePlayer
						name={player.name}
						hp={player.hp}
						maxHp={player.maxHp}
						alive={player.alive}
						selected={selectedTargetId === player.id}
						selectable={canAct && player.id !== game.myPlayerId}
						onselect={() => selectTarget(player.id)}
						isJailed={player.isJailed}
						attacks={player.attacks}
						cards={player.cards}
						role={player.role}
						isMe={player.id === game.myPlayerId}
					/>
				{/each}
			</div>
		</section>

		<section class="flex flex-col items-center gap-3">
			{#if canSendChat}
				<div class="comic-border-sm w-full rounded-2xl bg-slate-800/90 px-5 py-5 text-center">
					<p class="text-sm font-black text-white">
						You can chat {game.remainingChatTurns} more time{game.remainingChatTurns === 1
							? ''
							: 's'}
						before acting.
					</p>
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
			{:else if canAct}
				<div class="comic-border-sm w-full rounded-2xl bg-slate-800/90 px-5 py-5 text-center">
					<p class="text-xs font-black tracking-[0.25em] text-primary uppercase">Action Phase</p>
					{#if selectedCard}
						<p class="mt-2 text-lg font-black text-white">
							{selectedCard.toUpperCase()}
						</p>
						<p class="mt-2 text-sm font-bold text-slate-300">
							Target:
							{#if selectedTargetId}
								{game.players.find((player) => player.id === selectedTargetId)?.name}
							{:else if selectedCard === 'heal'}
								{myPlayer?.name} (self)
							{:else}
								none
							{/if}
						</p>
						<div class="mt-4 flex flex-wrap items-center justify-center gap-3">
							<button
								class="comic-button rounded-xl border-2 border-slate-900 bg-red-600 px-5 py-3 text-sm font-black text-white uppercase disabled:opacity-50"
								disabled={selectedCard !== 'heal' && !selectedTargetId}
								onclick={playSelectedCard}
							>
								Play Card
							</button>
							<button
								class="comic-button rounded-xl border-2 border-slate-900 bg-slate-600 px-5 py-3 text-sm font-black text-white uppercase"
								onclick={() => {
									selectedCard = null;
									selectedTargetId = null;
								}}
							>
								Clear Selection
							</button>
						</div>
					{:else}
						<p class="mt-2 text-sm font-bold tracking-wide text-slate-300 uppercase">
							Select a card to act
						</p>
					{/if}

					<div class="mt-4 flex flex-wrap items-center justify-center gap-3">
						{#if game.canReveal}
							<button
								class="comic-button rounded-xl border-2 border-slate-900 bg-yellow-500 px-5 py-3 text-sm font-black text-slate-900 uppercase"
								onclick={revealIdentity}
							>
								Reveal Identity
							</button>
						{/if}
						<button
							class="comic-button rounded-xl border-2 border-slate-900 bg-slate-200 px-5 py-3 text-sm font-black text-slate-900 uppercase"
							onclick={endTurn}
						>
							End Turn
						</button>
					</div>
				</div>
			{:else if !isFinished}
				<div class="flex flex-col items-center gap-3 py-4">
					<div
						class="size-10 animate-spin rounded-full border-4 border-slate-600 border-t-primary"
					></div>
					<p class="text-sm font-bold text-slate-400 uppercase">{m.game_waiting_others()}</p>
				</div>
			{/if}

			{#if actionError}
				<p class="text-sm font-bold text-red-400">{actionError}</p>
			{/if}
		</section>

		{#if myPlayer && amAlive && !isSpectator}
			<section class="border-t-4 border-slate-600 pt-4">
				<h3 class="mb-3 text-sm font-black text-slate-300 uppercase">My Cards</h3>
				<div class="flex flex-wrap items-center justify-center gap-3">
					{#if handOptions.length > 0}
						{#each handOptions as option (option.card)}
							<button
								class="group relative flex flex-col items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all"
								class:border-primary={selectedCard === option.card}
								class:border-slate-400={selectedCard !== option.card}
								class:text-white={selectedCard === option.card}
								style={selectedCard === option.card
									? 'background: linear-gradient(to bottom, var(--color-primary));'
									: 'background: linear-gradient(to bottom, rgb(55, 65, 81), rgb(31, 41, 55))'}
								onclick={() => {
									selectedCard = selectedCard === option.card ? null : option.card;
									selectedTargetId = null;
								}}
							>
								<span
									class="material-symbols-outlined text-2xl transition-transform"
									class:text-primary={selectedCard !== option.card}
									class:text-white={selectedCard === option.card}
									class:group-hover:scale-110={selectedCard !== option.card}
								>
									{option.icon}
								</span>
								<span class="text-xs font-bold uppercase">{option.label}</span>
								<span class="text-[10px] font-black text-slate-300">x{option.count}</span>
							</button>
						{/each}
					{:else}
						<p class="text-sm font-bold text-slate-500">No cards in hand</p>
					{/if}
				</div>
			</section>
		{/if}
	</main>

	<GameLog logs={game.logs} isOpen={isLogOpen} ontoggle={() => (isLogOpen = !isLogOpen)} />

	<GameChat
		messages={game.chatMessages}
		myId={game.myPlayerId ?? ''}
		isOpen={isChatOpen}
		canSend={canSendChat}
		ontoggle={() => (isChatOpen = !isChatOpen)}
		onsend={sendChat}
	/>
</div>

{#if isFinished}
	<GameResult winner={winnerLabel} {isMyWin} isDraw={false} />
{/if}
