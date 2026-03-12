<script lang="ts">
	import GameChat from '$lib/components/game/GameChat.svelte';
	import GameHeader from '$lib/components/game/GameHeader.svelte';
	import GameLog from '$lib/components/game/GameLog.svelte';
	import GamePlayer from '$lib/components/game/GamePlayer.svelte';
	import type { ReplayFrame } from '$lib/types/replay';
	import type { GameSnapshot } from '$lib/types/game';

	let { data } = $props();
	const frames: ReplayFrame[] = data.frames;
	const roomId: string = data.roomId;

	let currentIndex = $state(0);
	let playing = $state(false);
	let speed = $state(1);
	let mobileTab = $state<'log' | 'chat' | null>(null);

	const speeds = [0.5, 1, 2, 4];

	const currentFrame = $derived(frames[currentIndex] ?? null);
	const game = $derived<GameSnapshot | null>(currentFrame?.snapshot ?? null);
	const totalFrames = frames.length;

	let replayChatBubbles = $state<Record<string, string>>({});
	const bubbleTimers = new Map<string, ReturnType<typeof setTimeout>>();
	let prevMsgCount = 0;

	function scheduleBubbleHide(playerId: string) {
		const existing = bubbleTimers.get(playerId);
		if (existing) clearTimeout(existing);
		const timer = setTimeout(() => {
			delete replayChatBubbles[playerId];
			bubbleTimers.delete(playerId);
		}, 10000);
		bubbleTimers.set(playerId, timer);
	}

	// Detect new messages when frame changes
	$effect(() => {
		const messages = game?.chatMessages ?? [];
		const count = messages.length;

		if (count < prevMsgCount) {
			// Stepped backward — clear bubbles
			for (const t of bubbleTimers.values()) clearTimeout(t);
			bubbleTimers.clear();
			replayChatBubbles = {};
			prevMsgCount = count;
			return;
		}

		for (let i = prevMsgCount; i < count; i++) {
			const msg = messages[i];
			replayChatBubbles[msg.playerId] = msg.text;
			if (playing) scheduleBubbleHide(msg.playerId);
		}
		prevMsgCount = count;
	});

	// Pause/resume bubble timers with playback
	$effect(() => {
		if (playing) {
			for (const playerId of Object.keys(replayChatBubbles)) {
				scheduleBubbleHide(playerId);
			}
		} else {
			for (const t of bubbleTimers.values()) clearTimeout(t);
			bubbleTimers.clear();
		}
	});

	let playInterval: ReturnType<typeof setInterval> | null = null;

	function clearPlay() {
		if (playInterval !== null) {
			clearInterval(playInterval);
			playInterval = null;
		}
	}

	function startPlay(ms: number) {
		clearPlay();
		playInterval = setInterval(() => {
			if (currentIndex >= totalFrames - 1) {
				playing = false;
				clearPlay();
				return;
			}
			currentIndex += 1;
		}, ms);
	}

	// cleanup on unmount only
	$effect(() => () => clearPlay());

	function togglePlay() {
		if (currentIndex >= totalFrames - 1) {
			currentIndex = 0;
		}
		if (playing) {
			playing = false;
			clearPlay();
		} else {
			playing = true;
			startPlay(1000 / speed);
		}
	}

	function stepBack() {
		playing = false;
		clearPlay();
		currentIndex = Math.max(0, currentIndex - 1);
	}

	function stepForward() {
		playing = false;
		clearPlay();
		currentIndex = Math.min(totalFrames - 1, currentIndex + 1);
	}

	function setSpeed(s: number) {
		speed = s;
		if (playing) {
			startPlay(1000 / s);
		}
	}
</script>

<svelte:head>
	<title>Replay — {roomId}</title>
</svelte:head>

<div class="flex h-screen flex-col bg-background-dark font-display text-white">
	{#if game}
		<GameHeader round={game.round} timeLeft={0} totalTime={1} />

		<div class="flex flex-1 overflow-hidden">
			<main class="flex-1 overflow-y-auto">
				<div class="mx-auto w-full max-w-2xl space-y-5 p-4 pb-16 lg:max-w-none lg:pb-4">
					<div class="comic-border-sm rounded-xl bg-slate-800 px-4 py-3 text-center">
						<p class="text-xs font-black tracking-[0.25em] text-slate-400 uppercase">
							다시보기 — 라운드 {game.round} / {game.maxRound}
						</p>
						<p class="mt-2 text-lg font-black text-white">
							{game.players.find((p) => p.id === game.currentTurnPlayerId)?.name ?? '—'}
						</p>
						<p class="mt-1 text-sm font-bold text-slate-400">
							{#if game.phase === 'finished'}
								게임 종료
							{:else if game.phase === 'chatting'}
								대화 단계
							{:else}
								행동 단계
							{/if}
						</p>
					</div>

					<div
						class="comic-border-sm flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-slate-400"
					>
						<span class="material-symbols-outlined">movie</span>
						<span class="text-sm font-black uppercase">전지적 다시보기 — 모든 역할 공개</span>
					</div>

					{#if currentFrame?.actionSummary}
						<div class="rounded-xl bg-slate-700 px-4 py-3 text-center">
							<p class="text-sm font-bold text-slate-200">{currentFrame.actionSummary}</p>
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
									selected={false}
									selectable={false}
									onselect={() => {}}
									isJailed={player.isJailed}
									attacks={player.attacks}
									cards={player.cards}
									role={player.role}
									verified={player.verified}
									isMe={false}
									isTurn={player.id === game.currentTurnPlayerId && game.phase !== 'finished'}
					chatBubble={replayChatBubbles[player.id] ?? null}
								/>
							{/each}
						</div>
					</section>
				</div>
			</main>

			<aside class="hidden lg:flex w-80 flex-col border-l-2 border-slate-700 bg-slate-900">
				<div class="flex flex-1 flex-col overflow-hidden border-b-2 border-slate-700">
					<GameLog logs={game.logs} inline={true} />
				</div>
				<div class="flex flex-1 flex-col overflow-hidden">
					<GameChat
						messages={game.chatMessages}
						myId=""
						canSend={false}
						onsend={() => {}}
						inline={true}
					/>
				</div>
			</aside>
		</div>

		<!-- Replay controls -->
		<div class="border-t-4 border-slate-700 bg-slate-900 px-4 pt-3 pb-16 lg:pb-3">
			<div class="mx-auto flex max-w-2xl flex-col items-center gap-3 lg:max-w-none">
				<div class="flex items-center gap-3">
					<button
						class="comic-button rounded-lg border-2 border-slate-700 bg-slate-700 px-3 py-2 font-black text-white disabled:opacity-40"
						onclick={stepBack}
						disabled={currentIndex === 0}
						aria-label="이전"
					>
						<span class="material-symbols-outlined">skip_previous</span>
					</button>

					<button
						class="comic-button rounded-lg border-2 border-slate-700 bg-primary px-4 py-2 font-black text-white"
						onclick={togglePlay}
						aria-label={playing ? '일시정지' : '재생'}
					>
						<span class="material-symbols-outlined">
							{playing ? 'pause' : 'play_arrow'}
						</span>
					</button>

					<button
						class="comic-button rounded-lg border-2 border-slate-700 bg-slate-700 px-3 py-2 font-black text-white disabled:opacity-40"
						onclick={stepForward}
						disabled={currentIndex >= totalFrames - 1}
						aria-label="다음"
					>
						<span class="material-symbols-outlined">skip_next</span>
					</button>

					<div class="flex items-center gap-1">
						{#each speeds as s (s)}
							<button
								class="rounded px-2 py-1 text-xs font-black transition-colors"
								class:bg-primary={speed === s}
								class:text-white={speed === s}
								class:bg-slate-700={speed !== s}
								class:text-slate-300={speed !== s}
								onclick={() => setSpeed(s)}
							>
								{s}x
							</button>
						{/each}
					</div>
				</div>

				<div class="flex w-full max-w-lg items-center gap-3">
					<span class="text-xs font-bold text-slate-400">
						프레임 {currentIndex + 1} / {totalFrames}
					</span>
					<input
						type="range"
						min="0"
						max={totalFrames - 1}
						bind:value={currentIndex}
						oninput={() => (playing = false)}
						class="flex-1 accent-primary"
					/>
				</div>
			</div>
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
				class="comic-border fixed inset-x-0 bottom-12 z-30 flex max-h-[50vh] flex-col rounded-t-2xl bg-white transition-transform duration-300"
				style="transform: translateY({mobileTab !== null ? '0%' : '100%'})"
			>
				{#if mobileTab === 'log'}
					<GameLog logs={game.logs} inline={true} />
				{:else if mobileTab === 'chat'}
					<GameChat
						messages={game.chatMessages}
						myId=""
						canSend={false}
						onsend={() => {}}
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
	{:else}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-slate-400 font-bold">이 게임의 다시보기 데이터가 없습니다.</p>
		</div>
	{/if}
</div>
