<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	import RoomHeader from '$lib/components/room/RoomHeader.svelte';
	import PlayerSlot from '$lib/components/room/PlayerSlot.svelte';
	import RoomChat from '$lib/components/room/RoomChat.svelte';

	type Player = {
		id: string;
		name: string;
		avatarSrc?: string;
		ready: boolean;
	};

	// Mock data
	const roomName = 'Wild West Duel';
	const roomCode = 'ABCD';
	const maxPlayers = 4;
	const hostId: string = 'p1';
	const myId: string = 'p2';

	let players: Player[] = $state([
		{ id: 'p1', name: 'Sheriff_Buck', ready: true },
		{ id: 'p2', name: 'Outlaw_Jane', ready: false },
		{ id: 'p3', name: 'Doc_Holiday', ready: true }
	]);

	let chatMessages = $state([
		{ id: '1', sender: '', text: 'Sheriff_Buck 님이 방을 만들었습니다.', isSystem: true },
		{ id: '2', sender: 'Sheriff_Buck', text: ' 반갑습니다!' },
		{ id: '3', sender: '', text: 'Outlaw_Jane 님이 입장했습니다.', isSystem: true },
		{ id: '4', sender: 'Doc_Holiday', text: ' 준비됐어요!' }
	]);

	const isHost = $derived(myId === hostId);
	const myPlayer = $derived(players.find((p) => p.id === myId));
	const amReady = $derived(myPlayer?.ready ?? false);
	const readyCount = $derived(players.filter((p) => p.ready).length);
	const allReady = $derived(readyCount === players.length);
	const canStart = $derived(isHost && allReady && players.length >= 2);

	const slots = $derived.by<(Player | undefined)[]>(() => {
		const result: (Player | undefined)[] = [...players];
		while (result.length < maxPlayers) {
			result.push(undefined);
		}
		return result;
	});

	function toggleReady() {
		players = players.map((p) => (p.id === myId ? { ...p, ready: !p.ready } : p));
	}

	function kickPlayer(playerId: string) {
		players = players.filter((p) => p.id !== playerId);
	}

	function handleChatSend(text: string) {
		chatMessages = [
			...chatMessages,
			{
				id: crypto.randomUUID(),
				sender: myPlayer?.name ?? '',
				text: ` ${text}`
			}
		];
	}

	function startGame() {
		// TODO: implement game start
	}
</script>

<svelte:head>
	<title>{m.room_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background-light font-display text-slate-900">
	<RoomHeader {roomName} {roomCode} currentPlayers={players.length} {maxPlayers} />

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
							? m.room_all_ready()
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
						isHost={player?.id === hostId}
						isMe={player?.id === myId}
						onkick={isHost && player && player.id !== myId
							? () => kickPlayer(player.id)
							: undefined}
					/>
				{/each}
			</div>
		</section>

		<!-- Chat -->
		<section>
			<RoomChat messages={chatMessages} onsend={handleChatSend} />
		</section>

		<!-- Action Buttons -->
		<div class="flex gap-3 pb-6">
			<a
				href="/lobby"
				class="comic-button flex flex-1 items-center justify-center gap-2 rounded-xl border-3 border-slate-900 bg-slate-200 px-6 py-4 font-black uppercase"
			>
				<span class="material-symbols-outlined">logout</span>
				{m.room_leave()}
			</a>

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
