<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import LobbyHeader from '$lib/components/lobby/LobbyHeader.svelte';
	import LobbyTabs from '$lib/components/lobby/LobbyTabs.svelte';
	import LobbyCard from '$lib/components/lobby/LobbyCard.svelte';
	import BottomNav from '$lib/components/lobby/BottomNav.svelte';
	import LobbyCreateModal from '$lib/components/lobby/LobbyCreateModal.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { apiPost } from '$lib/api';

	type Tab = 'all' | 'in_progress' | 'waiting';

	let { data } = $props();

	let showCreateModal = $state(false);

	async function createRoom(roomData: { name: string; icon: string; maxPlayers: number }) {
		const result = await apiPost<{ id: string }>('/api/rooms', roomData);
		showCreateModal = false;
		goto(`/room/${result.id}`);
	}

	async function joinRoom(roomId: string) {
		await apiPost('/api/rooms/' + roomId + '/join');
		goto(`/room/${roomId}`);
	}

	const interval = setInterval(() => invalidateAll(), 5000);
	onDestroy(() => clearInterval(interval));

	let activeTab: Tab = $state('all');

	const filteredLobbies = $derived(
		activeTab === 'all'
			? data.lobbies
			: activeTab === 'in_progress'
				? data.lobbies.filter((l: { status: string }) => l.status === 'in_progress' || l.status === 'starting_soon')
				: data.lobbies.filter((l: { status: string }) => l.status === 'waiting')
	);
</script>

<svelte:head>
	<title>{m.lobby_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background-light font-display text-slate-900">
	<LobbyHeader username={data.username} avatarSrc={data.avatarSrc} isAdmin={data.isAdmin} />

	<main class="mx-auto w-full max-w-2xl flex-1 space-y-6 p-4">
		<LobbyTabs active={activeTab} onchange={(tab) => (activeTab = tab)} />

		<!-- Search & Create -->
		<div class="flex flex-col gap-4 sm:flex-row">
			<div class="relative flex-1">
				<span
					class="material-symbols-outlined absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
					>search</span
				>
				<input
					class="comic-border w-full rounded-xl bg-white py-4 pr-4 pl-12 font-bold placeholder:text-slate-400 focus:border-primary focus:ring-primary"
					placeholder={m.lobby_search_placeholder()}
					type="text"
				/>
			</div>
			<button
				class="comic-button flex items-center justify-center gap-2 rounded-xl border-3 border-slate-900 bg-primary px-6 py-4 font-black whitespace-nowrap text-white uppercase italic shadow-[3px_3px_0px_#221910]"
				onclick={() => (showCreateModal = true)}
			>
				<span class="material-symbols-outlined font-bold">add_circle</span>
				{m.lobby_create()}
			</button>
		</div>

		<!-- Lobby List -->
		<div class="space-y-4 pb-24">
			{#each filteredLobbies as lobby (lobby.id)}
				<LobbyCard
					name={lobby.name}
					icon={lobby.icon}
					currentPlayers={lobby.currentPlayers}
					maxPlayers={lobby.maxPlayers}
					status={lobby.status}
					onjoin={() => joinRoom(lobby.id)}
				/>
			{/each}
			{#if filteredLobbies.length === 0}
				<div class="py-16 text-center text-slate-400">
					<span class="material-symbols-outlined text-5xl">sports_esports</span>
					<p class="mt-2 text-sm font-bold">{m.lobby_empty()}</p>
				</div>
			{/if}
		</div>
	</main>

	<BottomNav active="lobby" />
</div>

<LobbyCreateModal
	isOpen={showCreateModal}
	oncreate={createRoom}
	oncancel={() => (showCreateModal = false)}
/>
