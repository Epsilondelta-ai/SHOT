<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { goto } from '$app/navigation';
	import { apiPost } from '$lib/api';
	import { createRoomSocket } from '$lib/roomSocket.svelte';

	import RoomHeader from '$lib/components/room/RoomHeader.svelte';
	import PlayerSlot from '$lib/components/room/PlayerSlot.svelte';
	import RoomChat from '$lib/components/room/RoomChat.svelte';
	import RoomLlmPlayerPanel from '$lib/components/room/RoomLlmPlayerPanel.svelte';

	type Player = {
		id: string;
		userId: string;
		name: string;
		avatarSrc?: string | null;
		ready: boolean;
		type: 'human' | 'llm';
		assistantId: string | null;
		assistantName: string | null;
		llmModelId: string | null;
		modelName: string | null;
	};

	type ChatMessage = {
		id: string;
		sender: string;
		text: string;
		isSystem?: boolean;
	};

	let { data } = $props();

	// eslint-disable-next-line svelte/prefer-writable-derived
	let players: Player[] = $state(data.players);
	$effect(() => {
		players = data.players;
	});

	// eslint-disable-next-line svelte/prefer-writable-derived
	let chatMessages: ChatMessage[] = $state(data.chatMessages);
	$effect(() => {
		chatMessages = data.chatMessages;
	});

	// Store socket reference for chat sending
	let socketRef: ReturnType<typeof createRoomSocket> | null = $state(null);

	// WebSocket connection
	$effect(() => {
		const socket = createRoomSocket(data.roomId, {
			onPlayers: (wsPlayers) => {
				players = wsPlayers.map((player) => ({
					...player,
					ready:
						player.type === 'llm'
							? true
							: players.find((existing) => existing.id === player.id)?.ready ?? false
				}));
			},
			onChat: (msg) => {
				chatMessages = [...chatMessages, msg];
			},
			onKicked: ({ playerId, userId }) => {
				if (userId === data.myId || myPlayer?.id === playerId) {
					goto('/lobby');
				}
			}
		});
		socketRef = socket;

		return () => {
			socket.close();
			socketRef = null;
		};
	});

	const isHost = $derived((players.find((player) => player.userId === data.myId)?.id ?? '') === data.hostId);
	const myPlayer = $derived(players.find((player) => player.userId === data.myId));
	const amReady = $derived(myPlayer?.ready ?? false);
	const readyCount = $derived(players.filter((player) => player.id === data.hostId || player.ready).length);
	const allReady = $derived(readyCount === players.length);
	const canStart = $derived(isHost && allReady && players.length >= 2);
	const isRoomFull = $derived(players.length >= data.maxPlayers);

	const slots = $derived.by<(Player | undefined)[]>(() => {
		const result: (Player | undefined)[] = [...players];
		while (result.length < data.maxPlayers) {
			result.push(undefined);
		}
		return result;
	});

	function toggleReady() {
		players = players.map((player) =>
			player.userId === data.myId ? { ...player, ready: !player.ready } : player
		);
	}

	function kickPlayer(playerId: string) {
		socketRef?.sendKick(playerId);
		players = players.filter((p) => p.id !== playerId);
	}

	function sendChat(text: string) {
		socketRef?.sendChat(text);
	}

	async function leaveRoom() {
		await apiPost(`/api/rooms/${data.roomId}/leave`);
		goto('/lobby');
	}

	async function addLlmPlayer(payload: { assistantId: string; llmModelId: string }) {
		const result = await apiPost<{ player: Player }>(`/api/rooms/${data.roomId}/llm-players`, payload);
		players = players.some((player) => player.id === result.player.id) ? players : [...players, result.player];
	}

	function startGame() {
		// TODO: implement game start
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
		maxPlayers={data.maxPlayers}
	/>

	<main class="mx-auto w-full max-w-2xl flex-1 space-y-6 p-4">
		<!-- Status Banner -->
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
				{allReady && players.length >= 2
					? m.room_all_ready()
					: players.length < 2
						? m.room_waiting_players()
						: isHost
							? m.room_waiting_players()
							: m.room_waiting_host()}
			</span>
			<span class="text-sm font-bold">
				({readyCount}/{players.length})
			</span>
		</div>

		<!-- Player Grid -->
		<section>
			<h2 class="mb-3 flex items-center gap-2 text-lg font-black uppercase">
				<span class="material-symbols-outlined text-primary">group</span>
				{m.room_players()}
			</h2>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each slots as player, i (player?.id ?? `empty-${i}`)}
					<PlayerSlot
						{player}
						isHost={player?.id === data.hostId}
						isMe={player?.userId === data.myId}
						onkick={isHost && player && player.userId !== data.myId
							? () => kickPlayer(player.id)
							: undefined}
					/>
				{/each}
			</div>
		</section>

		{#if isHost}
			<RoomLlmPlayerPanel
				assistants={data.assistants}
				llmModels={data.llmModels}
				disabled={isRoomFull}
				onadd={addLlmPlayer}
			/>
		{/if}

		<!-- Chat -->
		<section>
			<RoomChat messages={chatMessages} onsend={sendChat} />
		</section>

		<!-- Action Buttons -->
		<div class="flex gap-3 pb-6">
			<button
				type="button"
				onclick={leaveRoom}
				class="comic-button flex flex-1 items-center justify-center gap-2 rounded-xl border-3 border-slate-900 bg-slate-200 px-6 py-4 font-black uppercase"
			>
				<span class="material-symbols-outlined">logout</span>
				{m.room_leave()}
			</button>

			{#if isHost}
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
				<button
					class="comic-button flex flex-[2] items-center justify-center gap-2 rounded-xl border-3 border-slate-900 px-6 py-4 font-black text-white uppercase italic shadow-[3px_3px_0px_#221910]
						{amReady ? 'bg-red-500' : 'bg-primary'}"
					onclick={toggleReady}
				>
					<span class="material-symbols-outlined">
						{amReady ? 'close' : 'check'}
					</span>
					{amReady ? m.room_cancel_ready() : m.room_not_ready()}
				</button>
			{/if}
		</div>
	</main>
</div>
