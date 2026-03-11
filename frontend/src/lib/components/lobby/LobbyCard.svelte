<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type LobbyStatus = 'waiting' | 'full' | 'starting_soon' | 'in_progress';

	let {
		name,
		icon,
		currentPlayers,
		maxPlayers,
		status,
		onjoin,
		onspectate
	}: {
		name: string;
		icon: string;
		currentPlayers: number;
		maxPlayers: number;
		status: LobbyStatus;
		onjoin?: () => void;
		onspectate?: () => void;
	} = $props();

	const statusConfig: Record<
		LobbyStatus,
		{ color: string; dotColor: string; label: () => string }
	> = {
		waiting: {
			color: 'text-green-600',
			dotColor: 'bg-green-500',
			label: () => m.lobby_status_waiting()
		},
		full: {
			color: 'text-red-600',
			dotColor: 'bg-red-500',
			label: () => m.lobby_status_full()
		},
		starting_soon: {
			color: 'text-orange-600',
			dotColor: 'bg-orange-500',
			label: () => m.lobby_status_starting_soon()
		},
		in_progress: {
			color: 'text-blue-600',
			dotColor: 'bg-blue-500',
			label: () => m.lobby_status_in_progress()
		}
	};

	const isFull = $derived(status === 'full');
	const isJoinDisabled = $derived(status === 'full' || status === 'in_progress');
	const config = $derived(statusConfig[status]);
</script>

<div
	class="comic-card comic-border flex items-center justify-between rounded-xl bg-white p-4
		{isFull ? 'opacity-80 grayscale-[0.5]' : ''}"
>
	<div class="flex items-center gap-4">
		<div
			class="flex size-16 items-center justify-center rounded-lg border-2 border-slate-900 bg-primary/20 text-primary"
		>
			<span class="material-symbols-outlined text-4xl font-bold">{icon}</span>
		</div>
		<div>
			<h3 class="text-xl font-black tracking-tight text-slate-900 uppercase">{name}</h3>
			<div class="mt-1 flex items-center gap-3">
				<span class="flex items-center gap-1 text-sm font-bold text-slate-500">
					<span class="material-symbols-outlined text-base">group</span>
					{currentPlayers}/{maxPlayers}
				</span>
				<span class="h-2 w-2 rounded-full {config.dotColor}"></span>
				<span class="text-xs font-black uppercase {config.color}">{config.label()}</span>
			</div>
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<button
			class="comic-button rounded-full border-2 border-slate-900 px-6 py-2 text-sm font-black uppercase transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500
				{status === 'starting_soon'
				? 'bg-primary text-white'
				: 'bg-accent-beige hover:bg-primary hover:text-white'}"
			disabled={isJoinDisabled}
			onclick={onjoin}
		>
			{status === 'full'
				? m.lobby_status_full()
				: status === 'in_progress'
					? m.lobby_status_in_progress()
					: m.lobby_join()}
		</button>
		<button
			class="comic-button rounded-full border-2 border-slate-900 bg-white px-6 py-2 text-sm font-black uppercase transition-colors hover:bg-slate-900 hover:text-white"
			onclick={onspectate}
		>
			{m.lobby_spectate()}
		</button>
	</div>
</div>
