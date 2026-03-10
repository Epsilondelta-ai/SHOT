<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import LobbyHeader from '$lib/components/lobby/LobbyHeader.svelte';
	import BottomNav from '$lib/components/lobby/BottomNav.svelte';
	import ProfileCard from '$lib/components/mypage/ProfileCard.svelte';
	import StatsCard from '$lib/components/mypage/StatsCard.svelte';
	import RecentMatches from '$lib/components/mypage/RecentMatches.svelte';
	import SettingsSection from '$lib/components/mypage/SettingsSection.svelte';

	let { data } = $props();

	const settingsItems = [
		{
			key: 'language',
			label: m.mypage_settings_language(),
			icon: 'language',
			value: 'EN'
		},
		{
			key: 'notifications',
			label: m.mypage_settings_notifications(),
			icon: 'notifications',
			value: 'On'
		},
		{
			key: 'signout',
			label: m.mypage_sign_out(),
			icon: 'logout'
		}
	];
</script>

<svelte:head>
	<title>{m.mypage_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background-light font-display text-slate-900">
	<LobbyHeader username={data.username} avatarSrc={data.avatarSrc} />

	<main class="mx-auto w-full max-w-2xl flex-1 space-y-4 p-4 pb-28">
		<ProfileCard username={data.username} avatarSrc={data.avatarSrc} />

		<StatsCard games={data.stats.games} wins={data.stats.wins} streak={data.stats.streak} />

		<RecentMatches matches={data.recentMatches} />

		<SettingsSection items={settingsItems} />
	</main>

	<BottomNav active="mypage" />
</div>
