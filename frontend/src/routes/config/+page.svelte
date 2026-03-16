<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import ConfigHeader from '$lib/components/config/ConfigHeader.svelte';
	import ConfigBotList from '$lib/components/config/ConfigBotList.svelte';
	import ConfigBotForm from '$lib/components/config/ConfigBotForm.svelte';
	import BottomNav from '$lib/components/lobby/BottomNav.svelte';
	import LobbyHeader from '$lib/components/lobby/LobbyHeader.svelte';

	let { data } = $props();

	type Bot = {
		id: string;
		name: string;
		image: string | null;
		active: boolean;
		createdAt: string;
	};

	let bots: Bot[] = $state(data.bots ?? []);
	let showBotModal = $state(false);
	let editingBot: Bot | null = $state(null);

	function openAddBot() {
		editingBot = null;
		showBotModal = true;
	}

	function openEditBot(bot: Bot) {
		editingBot = bot;
		showBotModal = true;
	}

	async function handleBotSave() {
		showBotModal = false;
		editingBot = null;
		// Refresh bot list
		const { BACKEND_URL } = await import('$lib/config');
		const res = await fetch(`${BACKEND_URL}/api/config/bots`, { credentials: 'include' });
		if (res.ok) {
			bots = await res.json();
		}
	}

	function handleBotCancel() {
		showBotModal = false;
		editingBot = null;
	}

	async function handleBotDelete(bot: Bot) {
		if (!confirm(`Delete "${bot.name}"?`)) return;
		const { BACKEND_URL } = await import('$lib/config');
		const res = await fetch(`${BACKEND_URL}/api/config/bots/${bot.id}`, {
			method: 'DELETE',
			credentials: 'include'
		});
		if (res.ok) {
			bots = bots.filter((b) => b.id !== bot.id);
		}
	}
</script>

<svelte:head>
	<title>{m.config_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background-light font-display text-slate-900">
	<LobbyHeader username={data.username} avatarSrc={data.avatarSrc} isAdmin={data.isAdmin} />
	<ConfigHeader />

	<main class="mx-auto w-full max-w-2xl flex-1 space-y-4 p-4 pb-24">
		<ConfigBotList {bots} onAdd={openAddBot} onEdit={openEditBot} onDelete={handleBotDelete} />
	</main>

	<BottomNav active="config" />
</div>

{#if showBotModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
			<h3 class="mb-4 text-base font-black uppercase tracking-tighter text-slate-900">
				{editingBot ? 'Edit Bot' : 'Add Bot'}
			</h3>
			<ConfigBotForm bot={editingBot} onSave={handleBotSave} onCancel={handleBotCancel} />
		</div>
	</div>
{/if}
