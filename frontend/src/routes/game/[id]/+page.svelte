<script lang="ts">
	import GameChat from '$lib/components/game/GameChat.svelte';
	import GameHeader from '$lib/components/game/GameHeader.svelte';
	import GameLog from '$lib/components/game/GameLog.svelte';
	import GamePlayer from '$lib/components/game/GamePlayer.svelte';
	import GameResult from '$lib/components/game/GameResult.svelte';
	import { goto } from '$app/navigation';
	import { createGameSocket } from '$lib/gameSocket.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { ActionCard, GameAction, GameSnapshot } from '$lib/types/game';

	const emptyGame: GameSnapshot = {
		roomId: 'story-room',
		round: 1,
		maxRound: 15,
		currentTurnPlayerId: 'p2',
		viewerMode: 'player',
		myPlayerId: 'p2',
		myTeam: 'agents',
		phase: 'acting',
		remainingChatTurns: 0,
		canReveal: false,
		mustUseAttack: false,
		winnerTeam: null,
		players: [],
		logs: [],
		chatMessages: []
	};

	let { data } = $props();

	// Capture stable initial values before reactivity — prevents $effect re-run on game updates
	const initialGame = (data.game as GameSnapshot) ?? emptyGame;
	const roomId = initialGame.roomId;
	const isSpectator = initialGame.viewerMode === 'spectator';

	let game = $state<GameSnapshot>(initialGame);
	let selectedCard = $state<ActionCard | null>(null);
	let selectedTargetId = $state<string | null>(null);
	let mobileTab = $state<'log' | 'chat' | null>(null);
	let actionError = $state('');
	let actionPending = $state(false);
	let timeLeft = $state(120);
	let redirectCountdown = $state(30);
	let chatBubbles = $state<Record<string, string>>({});
	const seenMessageIds = new Set<string>();

	// Animation state: keyed by playerId
	let animationStates = $state<Record<string, import('$lib/components/game/GamePlayer.svelte').AnimationState | null>>({});
	const seenLogIds = new Set<string>(initialGame.logs.map((l) => l.id));

	/**
	 * Parse a new log entry to extract actor/target player names and card type.
	 * Matches Korean log strings produced by gameState.ts:
	 *   "{actor}이(가) {target}을(를) 공격했습니다." -> attack
	 *   "{actor}이(가) {target}을(를) 치료했습니다."  -> heal
	 *   "{actor}이(가) {target}을(를) 구금했습니다."  -> jail
	 *   "{actor}이(가) {target}을(를) 스파이로 밝혀냈습니다." -> verify
	 *   "{actor}이(가) {target}을(를) 대원으로 확인했습니다." -> verify
	 */
	function parseActionLog(
		text: string
	): { actorName: string; targetName: string; card: ActionCard } | null {
		const patterns: { re: RegExp; card: ActionCard }[] = [
			{ re: /^(.+)이\(가\) (.+)을\(를\) 공격했습니다\.$/, card: 'attack' },
			{ re: /^(.+)이\(가\) (.+)을\(를\) 치료했습니다\.$/, card: 'heal' },
			{ re: /^(.+)이\(가\) (.+)을\(를\) 구금했습니다\.$/, card: 'jail' },
			{ re: /^(.+)이\(가\) (.+)을\(를\) 스파이로 밝혀냈습니다\.$/, card: 'verify' },
			{ re: /^(.+)이\(가\) (.+)을\(를\) 대원으로 확인했습니다\.$/, card: 'verify' }
		];
		for (const { re, card } of patterns) {
			const match = text.match(re);
			if (match) return { actorName: match[1]!, targetName: match[2]!, card };
		}
		return null;
	}

	const animationTimers = new Map<string, ReturnType<typeof setTimeout>>();
	let animationCounter = 0;
	let bgFlash = $state<'attack' | 'heal' | null>(null);
	let bgFlashId = $state(0);
	let bgFlashTimer: ReturnType<typeof setTimeout> | null = null;

	function triggerAnimation(playerId: string, role: 'actor' | 'target', card: ActionCard): void {
		const existing = animationTimers.get(playerId);
		if (existing) clearTimeout(existing);
		animationStates[playerId] = { id: ++animationCounter, role, card };

		if (role === 'target' && playerId === game.myPlayerId && (card === 'attack' || card === 'heal')) {
			if (bgFlashTimer) clearTimeout(bgFlashTimer);
			bgFlash = card;
			bgFlashId += 1;
			bgFlashTimer = setTimeout(() => { bgFlash = null; }, 1200);
		}
		const timer = setTimeout(() => {
			animationStates[playerId] = null;
			animationTimers.delete(playerId);
		}, 1200);
		animationTimers.set(playerId, timer);
	}

	$effect(() => {
		for (const msg of game.chatMessages) {
			if (seenMessageIds.has(msg.id)) continue;
			seenMessageIds.add(msg.id);
			chatBubbles[msg.playerId] = msg.text;
			const { playerId } = msg;
			setTimeout(() => {
				delete chatBubbles[playerId];
			}, 10000);
		}
	});

	let socket = $state<ReturnType<typeof createGameSocket> | null>(null);

	$effect(() => {
		const s = createGameSocket(
			roomId,
			{
				onGameState: (snapshot) => {
					// Detect new log entries before updating game state
					for (const log of snapshot.logs) {
						if (seenLogIds.has(log.id)) continue;
						seenLogIds.add(log.id);

						const parsed = parseActionLog(log.text);
						if (!parsed) continue;

						const actorPlayer = snapshot.players.find((p) => p.name === parsed.actorName);
						const targetPlayer = snapshot.players.find((p) => p.name === parsed.targetName);
						if (actorPlayer) triggerAnimation(actorPlayer.id, 'actor', parsed.card);
						if (targetPlayer) triggerAnimation(targetPlayer.id, 'target', parsed.card);
					}

					game = snapshot;
					actionPending = false;
					selectedCard = null;
					selectedTargetId = null;
				},
				onError: () => {
					actionError = 'Connection lost. Please refresh.';
				},
				onRedirect: (url) => goto(url)
			},
			{ spectator: isSpectator }
		);
		socket = s;
		return () => s.close();
	});

	$effect(() => {
		if (game.phase !== 'finished') return;
		redirectCountdown = 30;
		const timer = setInterval(() => {
			redirectCountdown -= 1;
			if (redirectCountdown <= 0) {
				clearInterval(timer);
				goto(`/room/${roomId}`);
			}
		}, 1000);
		return () => clearInterval(timer);
	});

	$effect(() => {
		const round = game.round;
		timeLeft = round >= 0 ? 120 : 120;
		const timer = setInterval(() => {
			timeLeft = Math.max(0, timeLeft - 1);
			if (timeLeft > 0) return;
			clearInterval(timer);
			if (!isMyTurn || isFinished) return;

			if (game.phase === 'chatting') {
				skipChatTurn();
			} else if (game.phase === 'acting') {
				if (game.mustUseAttack) {
					const myRole = myPlayer?.role;
					const validTargets = game.players.filter((p) => {
						if (!p.alive || p.id === game.myPlayerId) return false;
						if (p.role === 'leader' && myRole !== 'revealed') return false;
						return true;
					});
					if (validTargets.length > 0) {
						const target = validTargets[Math.floor(Math.random() * validTargets.length)];
						dispatchAction({ type: 'play-card', card: 'attack', targetId: target.id });
						setTimeout(() => endTurn(), 1000);
					} else {
						endTurn();
					}
				} else {
					endTurn();
				}
			}
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
				label: card === 'verify' ? 'INSPECT' : card.toUpperCase()
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
		game.winnerTeam === 'agents'
			? 'Agents'
			: game.winnerTeam === 'spies'
				? 'Spies'
				: game.winnerTeam === 'draw'
					? 'Draw'
					: undefined
	);
	const isMyWin = $derived(
		game.winnerTeam !== null && game.winnerTeam !== 'draw' && game.winnerTeam === game.myTeam
	);
	const isSpectatorView = $derived(game.viewerMode === 'spectator');
</script>

<svelte:head>
	<title>{m.game_title()}</title>
</svelte:head>

<div class="relative flex h-screen flex-col bg-background-dark font-display text-white">
	{#if bgFlash}
		{#key bgFlashId}
			<div class="bg-flash pointer-events-none fixed inset-0 z-[100] {bgFlash === 'attack' ? 'bg-red-500/40' : 'bg-green-500/40'}"></div>
		{/key}
	{/if}
	<GameHeader round={game.round} {timeLeft} totalTime={120} />

	<!-- Desktop: side-by-side layout; Mobile: stacked -->
	<div class="flex flex-1 overflow-hidden">
		<main class="flex-1 overflow-y-auto">
			<div class="mx-auto w-full max-w-2xl space-y-5 p-4 pb-16 lg:max-w-none lg:pb-4">
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

				{#if (isSpectatorView || !amAlive) && !isFinished}
					<div
						class="comic-border-sm flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-slate-400"
					>
						<span class="material-symbols-outlined">visibility</span>
						<span class="text-sm font-black uppercase">{m.game_spectating()}</span>
					</div>
				{/if}

				<section>
					<div class="grid grid-cols-2 gap-2 pt-24 sm:grid-cols-4">
						{#each game.players as player (player.id)}
							<GamePlayer
								name={player.name}
								hp={player.hp}
								maxHp={player.maxHp}
								alive={player.alive}
								selected={selectedTargetId === player.id}
								selectable={canAct && (player.id !== game.myPlayerId || selectedCard === 'verify')}
								onselect={() => selectTarget(player.id)}
								isJailed={player.isJailed}
								attacks={player.attacks}
								cards={player.cards}
								role={player.role}
								verified={player.verified}
								isMe={player.id === game.myPlayerId}
								isTurn={player.id === game.currentTurnPlayerId && !isFinished}
							chatBubble={chatBubbles[player.id] ?? null}
							animation={animationStates[player.id] ?? null}
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
									onclick={() => (mobileTab = 'chat')}
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
							<p class="text-xs font-black tracking-[0.25em] text-primary uppercase">
								Action Phase
							</p>
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
									class="comic-button rounded-xl border-2 border-slate-900 bg-slate-200 px-5 py-3 text-sm font-black text-slate-900 uppercase disabled:opacity-50"
									disabled={game.mustUseAttack}
									onclick={endTurn}
								>
									{game.mustUseAttack ? "Use Attack First" : "End Turn"}
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

				{#if myPlayer && amAlive && !isSpectatorView}
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
			</div>
		</main>

		<!-- Desktop sidebar: hidden on mobile, visible on lg+ -->
		<aside class="hidden lg:flex w-80 flex-col border-l-2 border-slate-700 bg-slate-900">
			<!-- Top half: Action Log -->
			<div class="flex flex-1 flex-col overflow-hidden border-b-2 border-slate-700">
				<GameLog logs={game.logs} inline={true} />
			</div>
			<!-- Bottom half: Chat -->
			<div class="flex flex-1 flex-col overflow-hidden">
				<GameChat
					messages={game.chatMessages}
					myId={game.myPlayerId ?? ''}
					canSend={canSendChat}
					onsend={sendChat}
					inline={true}
				/>
			</div>
		</aside>
	</div>

	<!-- Mobile: Tab bar + bottom sheet (hidden on desktop) -->
	<div class="lg:hidden">
		<!-- Overlay -->
		{#if mobileTab !== null}
			<div
				class="fixed inset-0 z-30 bg-black/40"
				role="presentation"
				onclick={() => (mobileTab = null)}
				onkeydown={(e) => e.key === 'Escape' && (mobileTab = null)}
			></div>
		{/if}

		<!-- Bottom Sheet -->
		<div
			class="comic-border fixed inset-x-0 bottom-12 z-30 flex max-h-[60vh] flex-col rounded-t-2xl bg-white transition-transform duration-300"
			style="transform: translateY({mobileTab !== null ? '0%' : '100%'})"
		>
			{#if mobileTab === 'log'}
				<GameLog logs={game.logs} inline={true} />
			{:else if mobileTab === 'chat'}
				<GameChat
					messages={game.chatMessages}
					myId={game.myPlayerId ?? ''}
					canSend={canSendChat}
					onsend={sendChat}
					inline={true}
				/>
			{/if}
		</div>

		<!-- Tab Bar -->
		<div class="fixed inset-x-0 bottom-0 z-40 flex border-t-2 border-slate-700 bg-slate-900">
			<button
				class="flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors"
				class:text-primary={mobileTab === 'log'}
				class:text-slate-400={mobileTab !== 'log'}
				onclick={() => (mobileTab = mobileTab === 'log' ? null : 'log')}
			>
				<span class="material-symbols-outlined text-xl">menu_book</span>
				<span class="text-[10px] font-black uppercase">로그</span>
			</button>
			<button
				class="flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors"
				class:text-primary={mobileTab === 'chat'}
				class:text-slate-400={mobileTab !== 'chat'}
				onclick={() => (mobileTab = mobileTab === 'chat' ? null : 'chat')}
			>
				<span class="material-symbols-outlined text-xl">chat</span>
				<span class="text-[10px] font-black uppercase">채팅</span>
			</button>
		</div>
	</div>
</div>

{#if isFinished}
	<GameResult winner={winnerLabel} {isMyWin} isDraw={false} countdown={redirectCountdown} {roomId} />
{/if}

<style>
	@keyframes bg-flash {
		0% { opacity: 0; }
		20% { opacity: 1; }
		70% { opacity: 1; }
		100% { opacity: 0; }
	}

	.bg-flash {
		animation: bg-flash 1s ease-in-out forwards;
	}
</style>
