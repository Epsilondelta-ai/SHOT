<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type User = {
		id: string;
		name: string;
		email: string;
		role: string;
		games: number;
		joined: string;
		banned: boolean;
		banEnd?: string | null;
		banReason?: string | null;
		banHistoryCount?: number;
	};

	let {
		users,
		onban,
		onunban,
		onrole,
		onhistory
	}: {
		users: User[];
		onban?: (userId: string) => void;
		onunban?: (userId: string) => void;
		onrole?: (userId: string, role: 'admin' | 'user') => void;
		onhistory?: (userId: string, userName: string) => void;
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
				class="comic-border flex items-center justify-between gap-3 rounded-xl bg-white p-4
					{user.banned ? 'opacity-60' : ''}"
			>
				<div class="flex min-w-0 items-center gap-3">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-slate-900
							{user.banned ? 'bg-red-100' : user.role === 'admin' ? 'bg-primary/20' : 'bg-accent-beige'}"
					>
						<span
							class="material-symbols-outlined text-lg
								{user.banned ? 'text-red-500' : user.role === 'admin' ? 'text-primary' : 'text-slate-600'}"
						>
							{user.banned ? 'block' : user.role === 'admin' ? 'shield_person' : 'person'}
						</span>
					</div>
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-sm font-black text-slate-900">{user.name}</span>
							{#if user.role === 'admin'}
								<span
									class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary uppercase"
								>
									ADMIN
								</span>
							{/if}
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
						<div
							class="mt-0.5 flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-400"
						>
							<span class="truncate">{user.email}</span>
							<span>{m.admin_user_games()}: {user.games}</span>
						</div>
						{#if user.banned && user.banEnd}
							<div class="mt-1 text-[11px] font-bold text-red-400">
								{m.admin_ban_until()}: {user.banEnd}
								{#if user.banReason}
									— {user.banReason}
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<div class="flex shrink-0 flex-col gap-1 sm:flex-row">
					{#if (user.banHistoryCount ?? 0) > 0}
						<button
							class="comic-button rounded-lg border-2 border-slate-900 bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 uppercase"
							onclick={() => onhistory?.(user.id, user.name)}
						>
							<span class="material-symbols-outlined align-middle text-sm">history</span>
						</button>
					{/if}

					{#if user.role === 'admin'}
						<button
							class="comic-button rounded-lg border-2 border-slate-900 bg-slate-200 px-3 py-2 text-xs font-black text-slate-700 uppercase"
							onclick={() => onrole?.(user.id, 'user')}
						>
							관리자 해제
						</button>
					{:else}
						<button
							class="comic-button rounded-lg border-2 border-slate-900 bg-primary px-3 py-2 text-xs font-black text-white uppercase"
							onclick={() => onrole?.(user.id, 'admin')}
						>
							관리자 지정
						</button>
					{/if}

					{#if user.banned}
						<button
							class="comic-button rounded-lg border-2 border-slate-900 bg-green-500 px-3 py-2 text-xs font-black text-white uppercase"
							onclick={() => onunban?.(user.id)}
						>
							{m.admin_user_unban()}
						</button>
					{:else}
						<button
							class="comic-button rounded-lg border-2 border-slate-900 bg-red-500 px-3 py-2 text-xs font-black text-white uppercase"
							onclick={() => onban?.(user.id)}
						>
							{m.admin_user_ban()}
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
