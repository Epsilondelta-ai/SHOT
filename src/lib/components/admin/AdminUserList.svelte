<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type User = {
		id: string;
		name: string;
		email: string;
		games: number;
		joined: string;
		banned: boolean;
	};

	let {
		users,
		onban,
		onunban
	}: {
		users: User[];
		onban?: (userId: string) => void;
		onunban?: (userId: string) => void;
	} = $props();

	let search = $state('');

	const filtered = $derived(
		search
			? users.filter(
					(u) =>
						u.name.toLowerCase().includes(search.toLowerCase()) ||
						u.email.toLowerCase().includes(search.toLowerCase())
				)
			: users
	);
</script>

<div class="space-y-3">
	<!-- Search -->
	<div class="relative">
		<span class="material-symbols-outlined absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
			>search</span
		>
		<input
			class="comic-border w-full rounded-xl bg-white py-3 pr-4 pl-12 font-bold placeholder:text-slate-400 focus:border-primary focus:ring-primary"
			placeholder={m.admin_users_search()}
			type="text"
			bind:value={search}
		/>
	</div>

	<!-- User List -->
	<div class="space-y-2">
		{#each filtered as user (user.id)}
			<div
				class="comic-border flex items-center justify-between rounded-xl bg-white p-4
					{user.banned ? 'opacity-60' : ''}"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex size-10 items-center justify-center rounded-full border-2 border-slate-900
							{user.banned ? 'bg-red-100' : 'bg-accent-beige'}"
					>
						<span
							class="material-symbols-outlined text-lg
								{user.banned ? 'text-red-500' : 'text-slate-600'}"
						>
							{user.banned ? 'block' : 'person'}
						</span>
					</div>
					<div>
						<div class="flex items-center gap-2">
							<span class="text-sm font-black text-slate-900">{user.name}</span>
							{#if user.banned}
								<span
									class="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600 uppercase"
								>
									{m.admin_user_status_banned()}
								</span>
							{:else}
								<span
									class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-600 uppercase"
								>
									{m.admin_user_status_active()}
								</span>
							{/if}
						</div>
						<div class="mt-0.5 flex items-center gap-3 text-[11px] font-bold text-slate-400">
							<span>{user.email}</span>
							<span>{m.admin_user_games()}: {user.games}</span>
						</div>
					</div>
				</div>

				{#if user.banned}
					<button
						class="comic-button rounded-lg border-2 border-slate-900 bg-green-500 px-4 py-2 text-xs font-black text-white uppercase"
						onclick={() => onunban?.(user.id)}
					>
						{m.admin_user_unban()}
					</button>
				{:else}
					<button
						class="comic-button rounded-lg border-2 border-slate-900 bg-red-500 px-4 py-2 text-xs font-black text-white uppercase"
						onclick={() => onban?.(user.id)}
					>
						{m.admin_user_ban()}
					</button>
				{/if}
			</div>
		{/each}
	</div>
</div>
