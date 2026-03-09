<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		totalUsers,
		activeNow,
		activeRooms,
		gamesToday
	}: {
		totalUsers: number;
		activeNow: number;
		activeRooms: number;
		gamesToday: number;
	} = $props();

	const stats = $derived([
		{ label: m.admin_total_users(), value: totalUsers, icon: 'group', color: 'text-blue-600' },
		{
			label: m.admin_active_now(),
			value: activeNow,
			icon: 'circle',
			color: 'text-green-600'
		},
		{
			label: m.admin_active_rooms(),
			value: activeRooms,
			icon: 'meeting_room',
			color: 'text-primary'
		},
		{
			label: m.admin_games_today(),
			value: gamesToday,
			icon: 'sports_esports',
			color: 'text-purple-600'
		}
	]);
</script>

<div class="grid grid-cols-2 gap-3">
	{#each stats as stat (stat.label)}
		<div class="comic-border flex items-center gap-3 rounded-xl bg-white p-4">
			<div
				class="flex size-12 items-center justify-center rounded-lg border-2 border-slate-900 bg-background-light"
			>
				<span class="material-symbols-outlined text-2xl {stat.color}">{stat.icon}</span>
			</div>
			<div>
				<span class="text-2xl font-black text-slate-900">{stat.value}</span>
				<p class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{stat.label}</p>
			</div>
		</div>
	{/each}
</div>
