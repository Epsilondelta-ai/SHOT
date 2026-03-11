<script lang="ts">
	import { goto, beforeNavigate } from '$app/navigation';
	import { apiPost } from '$lib/api';
	import { createRoomSocket } from '$lib/roomSocket.svelte';
	import { m } from '$lib/paraglide/messages';

	import RoomBotPlayerPanel from '$lib/components/room/RoomBotPlayerPanel.svelte';
	import RoomChat from '$lib/components/room/RoomChat.svelte';
	import RoomHeader from '$lib/components/room/RoomHeader.svelte';
	import RoomLlmPlayerPanel from '$lib/components/room/RoomLlmPlayerPanel.svelte';
	import PlayerSlot from '$lib/components/room/PlayerSlot.svelte';

	type Player = {
		id: string;
		userId: string;
		name: string;
		avatarSrc?: string | null;
		ready: boolean;
		type: 'human' | 'llm' | 'bot';
		canManageBots: boolean;
		assistantId: string | null;
		assistantName: string | null;
		llmModelId: string | null;
		modelName: string | null;
		botId: string | null;
	};

	type ChatMessage = {
		id: string;
		sender: string;
		text: string;
		isSystem?: boolean;
	};

	type AssistantOption = {
		id: string;
		name: string;
		prompt: string;
		scope: 'personal' | 'global';
	};

	type ModelOption = {
		id: string;
		provider: 'anthropic' | 'openai' | 'google' | 'xai';
		apiModelName: string;
		displayName: string;
	};

	type BotOption = {
		id: string;
		name: string;
	};

	let { data } = $props();

	type Spectator = { userId: string; userName: string };

	let players: Player[] = $state([]);
	let spectators: Spectator[] = $state([]);
	let chatMessages: ChatMessage[] = $state([]);
	let hostUserId = $state('');
	let maxPlayers = $state(5);
	let capacityDraft = $state(5);
	let socketRef: ReturnType<typeof createRoomSocket> | null = $state(null);

	function getSpectatorQuery() {
		return data.isSpectator ? '?spectator=1' : '';
	}

	$effect(() => {
		players = data.players;
		chatMessages = data.chatMessages;
		hostUserId = data.hostUserId;
		maxPlayers = data.maxPlayers;
		capacityDraft = data.maxPlayers;
	});

	$effect(() => {
		if (data.status === 'in_progress') {
			goto(`/game/${data.roomId}${getSpectatorQuery()}`);
		}
	});

	$effect(() => {
		const socket = createRoomSocket(
			data.roomId,
			{
				onPlayers: (wsPlayers, roomState, wsSpectators) => {
					players = wsPlayers;
					if (wsSpectators) spectators = wsSpectators;
					if (roomState) {
						hostUserId = roomState.hostUserId;
						maxPlayers = roomState.maxPlayers;
						capacityDraft = roomState.maxPlayers;
						if (roomState.status === 'in_progress') {
							goto(`/game/${data.roomId}${getSpectatorQuery()}`);
						}
					}
				},
				onChat: (msg) => {
					chatMessages = [...chatMessages, msg];
				},
				onKicked: ({ playerId, userId }) => {
					if (userId === data.myId || myPlayer?.id === playerId) {
						goto('/lobby');
					}
				}
			},
			{ spectator: data.isSpectator }
		);
		socketRef = socket;

		return () => {
			socket.close();
			socketRef = null;
		};
	});

	const myPlayer = $derived(
		players.find((player) => player.type === 'human' && player.userId === data.myId)
	);
	const hostId = $derived(
		players.find((player) => player.type === 'human' && player.userId === hostUserId)?.id ?? ''
	);
	const isHost = $derived(data.myId === hostUserId);
	const canManageBots = $derived(isHost || myPlayer?.canManageBots === true);
	const amReady = $derived(myPlayer?.ready ?? false);
	const readyCount = $derived(
		players.filter((player) => player.id === hostId || player.ready).length
	);
	const allReady = $derived(readyCount === players.length);
	const canStart = $derived(isHost && allReady && players.length >= 5);
	const isRoomFull = $derived(players.length >= maxPlayers);
	const humanMembers = $derived(
		players.filter((player) => player.type === 'human' && player.userId !== hostUserId)
	);

	const slots = $derived.by<(Player | undefined)[]>(() => {
		const result: (Player | undefined)[] = [...players];
		while (result.length < maxPlayers) {
			result.push(undefined);
		}
		return result;
	});

	function toggleReady() {
		if (data.isSpectator) return;
		if (!myPlayer || isHost) return;
		const nextReady = !myPlayer.ready;
		players = players.map((player) =>
			player.id === myPlayer.id ? { ...player, ready: nextReady } : player
		);
		socketRef?.sendReady(nextReady);
	}

	function kickPlayer(playerId: string) {
		socketRef?.sendKick(playerId);
		players = players.filter((player) => player.id !== playerId);
	}

	function sendChat(text: string) {
		if (data.isSpectator) return;
		socketRef?.sendChat(text);
	}

	let isLeaving = $state(false);

	// Reset isLeaving when spectator mode activates (becomeSpectator sets isLeaving=true
	// to block beforeNavigate, but SvelteKit soft-navigates keeping the same instance)
	$effect(() => {
		if (data.isSpectator) isLeaving = false;
	});

	async function leaveRoom() {
		if (isLeaving) return;
		isLeaving = true;
		await apiPost(`/api/rooms/${data.roomId}/leave`).catch(() => {});
		goto('/lobby');
	}

	beforeNavigate(({ cancel, to }) => {
		if (isLeaving || data.isSpectator) return;
		cancel();
		isLeaving = true;
		apiPost(`/api/rooms/${data.roomId}/leave`)
			.catch(() => {})
			.finally(() => goto(to?.url.pathname ?? '/lobby'));
	});

	async function addLlmPlayer(payload: { assistantId: string; llmModelId: string }) {
		await apiPost(`/api/rooms/${data.roomId}/llm-players`, payload);
	}

	async function addBotPlayer(payload: { botId: string }) {
		await apiPost(`/api/rooms/${data.roomId}/bot-players`, payload);
	}

	async function transferHost(userId: string) {
		await apiPost(`/api/rooms/${data.roomId}/host`, { userId });
		hostUserId = userId;
	}

	async function setBotPermission(userId: string, canManageBots: boolean) {
		await apiPost(`/api/rooms/${data.roomId}/bot-permissions`, { userId, canManageBots });
		players = players.map((player) =>
			player.userId === userId ? { ...player, canManageBots } : player
		);
	}

	async function updateCapacity() {
		await apiPost(`/api/rooms/${data.roomId}/capacity`, { maxPlayers: capacityDraft });
		maxPlayers = capacityDraft;
	}

	async function startGame() {
		await apiPost(`/api/games/${data.roomId}/start`);
		goto(`/game/${data.roomId}${getSpectatorQuery()}`);
	}

	async function becomeSpectator() {
		isLeaving = true;
		await apiPost(`/api/rooms/${data.roomId}/spectate`);
		goto(`/room/${data.roomId}?spectator=1`);
	}

	async function joinAsPlayer() {
		isLeaving = true;
		await apiPost(`/api/rooms/${data.roomId}/join`);
		goto(`/room/${data.roomId}`);
	}
</script>

<svelte:head>
	<title>{m.room_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background-light font-display text-slate-900">
	<RoomHeader
		roomName={data.roomName}
		roomCode={data.roomCode}
		currentPlayers={players.length}
		{maxPlayers}
		onback={leaveRoom}
	/>

	<main class="mx-auto w-full max-w-2xl flex-1 space-y-6 p-4">
		<div
			class="comic-border-sm flex items-center justify-center gap-2 rounded-xl px-4 py-3
				{allReady && players.length >= 2
				? 'bg-green-100 text-green-700'
				: players.length < 2
					? 'bg-orange-100 text-orange-700'
					: 'bg-blue-50 text-blue-600'}"
		>
			<span class="material-symbols-outlined text-lg">
				{allReady && players.length >= 2
					? 'check_circle'
					: players.length < 2
						? 'hourglass_empty'
						: 'schedule'}
			</span>
			<span class="text-sm font-black uppercase">
				{allReady && players.length >= 5
					? m.room_all_ready()
					: players.length < 5
						? m.room_waiting_players()
						: isHost
							? m.room_waiting_players()
							: m.room_waiting_host()}
			</span>
			<span class="text-sm font-bold">
				({readyCount}/{players.length})
			</span>
		</div>

		{#if data.isSpectator}
			<div
				class="comic-border-sm flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white"
			>
				<span class="material-symbols-outlined text-lg">visibility</span>
				<span class="text-sm font-black uppercase">{m.game_spectating()}</span>
			</div>
		{/if}

		<section>
			<div class="mb-3 flex items-end justify-between gap-3">
				<h2 class="flex items-center gap-2 text-lg font-black uppercase">
					<span class="material-symbols-outlined text-primary">group</span>
					{m.room_players()}
				</h2>
				{#if !data.isSpectator && !isHost && myPlayer}
					<p class="text-right text-[11px] font-black text-primary">
						{amReady ? '내 슬롯을 다시 누르면 준비 취소' : '내 슬롯을 누르면 준비 완료'}
					</p>
				{/if}
			</div>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each slots as player, i (player?.id ?? `empty-${i}`)}
					<PlayerSlot
						{player}
						isHost={player?.id === hostId}
						isMe={player?.userId === data.myId}
						onkick={isHost && player && player.userId !== data.myId
							? () => kickPlayer(player.id)
							: undefined}
						ontoggleReady={player?.userId === data.myId && player?.id !== hostId
							? toggleReady
							: undefined}
					/>
				{/each}
			</div>
		</section>

		{#if spectators.length > 0}
			<section>
				<h2 class="mb-2 flex items-center gap-2 text-sm font-black uppercase text-slate-500">
					<span class="material-symbols-outlined text-base">visibility</span>
					{m.game_spectating()} ({spectators.length})
				</h2>
				<div class="comic-border-sm flex flex-wrap gap-2 rounded-xl bg-white px-4 py-3">
					{#each spectators as spectator (spectator.userId)}
						<span class="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
							{#if spectator.userId === hostUserId}
								<span class="material-symbols-outlined text-xs text-yellow-500">star</span>
							{/if}
							{spectator.userName}
						</span>
					{/each}
				</div>
			</section>
		{/if}

		<section>
			<RoomChat messages={chatMessages} onsend={sendChat} canSend={!data.isSpectator} />
		</section>

		{#if isHost}
			<section class="comic-border rounded-xl bg-white p-4">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">tune</span>
					<div>
						<h2 class="text-sm font-black tracking-wider text-slate-900 uppercase">Room Control</h2>
						<p class="text-xs font-bold text-slate-400">
							방장 변경, 정원 변경, bot 권한 부여를 관리합니다.
						</p>
					</div>
				</div>

				<div class="mt-4 rounded-xl bg-slate-50 p-4">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="text-[11px] font-black tracking-wider text-slate-500 uppercase">
								Room Size
							</p>
							<p class="text-sm font-bold text-slate-700">
								현재 {maxPlayers}명, 변경 범위는 5~8명입니다.
							</p>
						</div>
						<button
							type="button"
							class="comic-button rounded-xl border-2 border-slate-900 bg-primary px-4 py-2 text-xs font-black text-white uppercase disabled:opacity-50"
							disabled={capacityDraft === maxPlayers || capacityDraft < players.length}
							onclick={updateCapacity}
						>
							정원 변경
						</button>
					</div>
					<input
						class="mt-3 w-full accent-primary"
						type="range"
						min="5"
						max="8"
						bind:value={capacityDraft}
					/>
					<div class="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
						<span>5</span>
						<span>{capacityDraft}명</span>
						<span>8</span>
					</div>
				</div>

				<div class="mt-4 space-y-3">
					{#if humanMembers.length === 0}
						<p class="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
							현재 위임하거나 권한을 줄 수 있는 다른 플레이어가 없습니다.
						</p>
					{:else}
						{#each humanMembers as player (player.id)}
							<div
								class="comic-border-sm flex flex-col gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<p class="text-sm font-black text-slate-900">{player.name}</p>
									<p class="text-[11px] font-bold text-slate-500">
										{player.canManageBots ? 'bot/LLM 추가 권한 있음' : 'bot/LLM 추가 권한 없음'}
									</p>
								</div>
								<div class="flex gap-2">
									<button
										type="button"
										class="comic-button rounded-xl border-2 border-slate-900 px-3 py-2 text-[11px] font-black uppercase {player.canManageBots
											? 'bg-white text-slate-700'
											: 'bg-blue-600 text-white'}"
										onclick={() => setBotPermission(player.userId, !player.canManageBots)}
									>
										{player.canManageBots ? '권한 회수' : 'bot 권한 부여'}
									</button>
									<button
										type="button"
										class="comic-button rounded-xl border-2 border-slate-900 bg-yellow-400 px-3 py-2 text-[11px] font-black text-slate-900 uppercase"
										onclick={() => transferHost(player.userId)}
									>
										방장 위임
									</button>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</section>
		{/if}

		{#if canManageBots}
			<section class="grid gap-4 lg:grid-cols-2">
				<RoomLlmPlayerPanel
					assistants={data.assistants as AssistantOption[]}
					llmModels={data.llmModels as ModelOption[]}
					disabled={isRoomFull}
					onadd={addLlmPlayer}
				/>
				<RoomBotPlayerPanel
					bots={data.bots as BotOption[]}
					disabled={isRoomFull}
					onadd={addBotPlayer}
				/>
			</section>
		{:else}
			<section class="comic-border rounded-xl bg-white p-4">
				<p class="text-sm font-bold text-slate-600">
					LLM/OpenClaw 봇 추가 권한은 기본적으로 방장만 가지며, 다른 참가자는 방장이 따로 권한을
					부여해야 합니다.
				</p>
			</section>
		{/if}

		<div class="flex gap-3 pb-6">
			<button
				type="button"
				onclick={leaveRoom}
				class="comic-button flex flex-1 items-center justify-center gap-2 rounded-xl border-3 border-slate-900 bg-slate-200 px-6 py-4 font-black uppercase"
			>
				<span class="material-symbols-outlined">logout</span>
				{m.room_leave()}
			</button>

			{#if data.isSpectator && isHost}
				<button
					type="button"
					onclick={joinAsPlayer}
					disabled={isRoomFull}
					class="comic-button flex flex-1 items-center justify-center gap-2 rounded-xl border-3 border-slate-900 bg-primary px-4 py-4 font-black text-white uppercase disabled:cursor-not-allowed disabled:opacity-50"
				>
					<span class="material-symbols-outlined">person_add</span>
					{isRoomFull ? m.room_full() : m.room_join_as_player()}
				</button>
				<button
					class="comic-button flex flex-[2] items-center justify-center gap-2 rounded-xl border-3 border-slate-900 px-6 py-4 font-black text-white uppercase italic shadow-[3px_3px_0px_#221910]
						{canStart ? 'bg-green-600' : 'cursor-not-allowed bg-slate-400 opacity-60'}"
					disabled={!canStart}
					onclick={startGame}
				>
					<span class="material-symbols-outlined">play_arrow</span>
					{m.room_start_game()}
				</button>
			{:else if data.isSpectator}
				<button
					type="button"
					onclick={joinAsPlayer}
					disabled={isRoomFull}
					class="comic-button flex flex-[2] items-center justify-center gap-2 rounded-xl border-3 border-slate-900 bg-primary px-6 py-4 font-black text-white uppercase disabled:cursor-not-allowed disabled:opacity-50"
				>
					<span class="material-symbols-outlined">person_add</span>
					{isRoomFull ? m.room_full() : m.room_join_as_player()}
				</button>
			{:else if isHost}
				<button
					type="button"
					onclick={becomeSpectator}
					class="comic-button flex flex-1 items-center justify-center gap-2 rounded-xl border-3 border-slate-900 bg-white px-4 py-4 font-black uppercase"
				>
					<span class="material-symbols-outlined">visibility</span>
					{m.room_spectate()}
				</button>
				<button
					class="comic-button flex flex-[2] items-center justify-center gap-2 rounded-xl border-3 border-slate-900 px-6 py-4 font-black text-white uppercase italic shadow-[3px_3px_0px_#221910]
						{canStart ? 'bg-green-600' : 'cursor-not-allowed bg-slate-400 opacity-60'}"
					disabled={!canStart}
					onclick={startGame}
				>
					<span class="material-symbols-outlined">play_arrow</span>
					{m.room_start_game()}
				</button>
			{:else}
				<div
					class="comic-border flex flex-[2] items-center justify-center gap-3 rounded-xl bg-white px-6 py-4"
				>
					<span class="material-symbols-outlined text-2xl text-primary">touch_app</span>
					<div class="text-left">
						<p class="text-[11px] font-black tracking-wider text-slate-500 uppercase">
							Ready Control
						</p>
						<p class="text-sm font-black text-slate-800">
							{amReady ? '내 슬롯을 다시 눌러 준비를 취소하세요.' : '내 슬롯을 눌러 준비하세요.'}
						</p>
					</div>
				</div>
			{/if}
		</div>
	</main>
</div>
