<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { goto } from '$app/navigation';
	import { getLocale, locales, localizeHref } from '$lib/paraglide/runtime';
	import { BACKEND_URL } from '$lib/config';
	import LobbyHeader from '$lib/components/lobby/LobbyHeader.svelte';
	import BottomNav from '$lib/components/lobby/BottomNav.svelte';
	import ProfileCard from '$lib/components/mypage/ProfileCard.svelte';
	import StatsCard from '$lib/components/mypage/StatsCard.svelte';
	import RecentMatches from '$lib/components/mypage/RecentMatches.svelte';
	import GameHistory from '$lib/components/mypage/GameHistory.svelte';
	import SettingsSection from '$lib/components/mypage/SettingsSection.svelte';

	let { data } = $props();

	async function signOut() {
		await fetch(`${BACKEND_URL}/api/auth/sign-out`, {
			method: 'POST',
			credentials: 'include'
		});
		goto('/login');
	}

	function toggleLanguage() {
		const current = getLocale();
		const idx = locales.indexOf(current);
		const next = locales[(idx + 1) % locales.length];
		window.location.href = localizeHref(window.location.pathname, { locale: next });
	}

	const settingsItems = $derived([
		{
			key: 'language',
			label: m.mypage_settings_language(),
			icon: 'language',
			value: getLocale().toUpperCase(),
			onclick: toggleLanguage
		},
		{
			key: 'signout',
			label: m.mypage_sign_out(),
			icon: 'logout',
			onclick: signOut
		}
	]);
</script>

<svelte:head>
	<title>{m.mypage_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background-light font-display text-slate-900">
	<LobbyHeader username={data.username} avatarSrc={data.avatarSrc} isAdmin={data.isAdmin} />

	<main class="mx-auto w-full max-w-2xl flex-1 space-y-4 p-4 pb-28">
		<ProfileCard username={data.username} avatarSrc={data.avatarSrc} />

		<StatsCard games={data.stats.games} wins={data.stats.wins} streak={data.stats.streak} />

		<RecentMatches matches={data.recentMatches} />

		<GameHistory replays={data.myReplays} />

		<SettingsSection items={settingsItems} />
	</main>

	<BottomNav active="mypage" />
</div>
