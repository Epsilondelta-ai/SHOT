<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import LobbyHeader from '$lib/components/lobby/LobbyHeader.svelte';
	import LobbyTabs from '$lib/components/lobby/LobbyTabs.svelte';
	import LobbyCard from '$lib/components/lobby/LobbyCard.svelte';
	import BottomNav from '$lib/components/lobby/BottomNav.svelte';

	type Tab = 'all' | 'in_progress' | 'waiting';
	type LobbyStatus = 'waiting' | 'full' | 'starting_soon' | 'in_progress';

	let activeTab: Tab = $state('all');

	const lobbies: {
		name: string;
		icon: string;
		currentPlayers: number;
		maxPlayers: number;
		status: LobbyStatus;
	}[] = [
		{ name: 'Wild West Duel', icon: 'swords', currentPlayers: 3, maxPlayers: 4, status: 'waiting' },
		{
			name: 'Gold Rush Heist',
			icon: 'local_activity',
			currentPlayers: 4,
			maxPlayers: 4,
			status: 'full'
		},
		{ name: 'Saloon Brawl', icon: 'castle', currentPlayers: 1, maxPlayers: 8, status: 'waiting' },
		{
			name: 'Train Robbery',
			icon: 'directions_run',
			currentPlayers: 5,
			maxPlayers: 6,
			status: 'starting_soon'
		}
	];

	const filteredLobbies = $derived(
		activeTab === 'all'
			? lobbies
			: activeTab === 'in_progress'
				? lobbies.filter((l) => l.status === 'in_progress' || l.status === 'starting_soon')
				: lobbies.filter((l) => l.status === 'waiting')
	);
</script>

<svelte:head>
	<title>{m.lobby_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background-light font-display text-slate-900">
	<LobbyHeader />

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
			>
				<span class="material-symbols-outlined font-bold">add_circle</span>
				{m.lobby_create()}
			</button>
		</div>

		<!-- Lobby List -->
		<div class="space-y-4 pb-24">
			{#each filteredLobbies as lobby (lobby.name)}
				<LobbyCard
					name={lobby.name}
					icon={lobby.icon}
					currentPlayers={lobby.currentPlayers}
					maxPlayers={lobby.maxPlayers}
					status={lobby.status}
				/>
			{/each}
		</div>
	</main>

	<BottomNav active="lobby" />
</div>
