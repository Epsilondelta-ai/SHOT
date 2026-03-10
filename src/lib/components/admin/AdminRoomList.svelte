<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type RoomStatus = 'waiting' | 'full' | 'starting_soon' | 'in_progress';

	type Room = {
		id: string;
		name: string;
		host: string;
		currentPlayers: number;
		maxPlayers: number;
		status: RoomStatus;
	};

	let {
		rooms,
		onclose
	}: {
		rooms: Room[];
		onclose?: (roomId: string) => void;
	} = $props();

	const statusConfig: Record<RoomStatus, { color: string; dotColor: string; label: () => string }> =
		{
			waiting: {
				color: 'text-green-600',
				dotColor: 'bg-green-500',
				label: () => m.lobby_status_waiting()
			},
			full: {
				color: 'text-orange-600',
				dotColor: 'bg-orange-500',
				label: () => 'Full'
			},
			starting_soon: {
				color: 'text-yellow-600',
				dotColor: 'bg-yellow-500',
				label: () => 'Starting Soon'
			},
			in_progress: {
				color: 'text-blue-600',
				dotColor: 'bg-blue-500',
				label: () => m.lobby_status_in_progress()
			}
		};
</script>

<div class="space-y-2">
	{#each rooms as room (room.id)}
		{@const config = statusConfig[room.status]}
		<div class="comic-border flex items-center justify-between rounded-xl bg-white p-4">
			<div class="flex items-center gap-3">
				<div
					class="flex size-10 items-center justify-center rounded-lg border-2 border-slate-900 bg-primary/20"
				>
					<span class="material-symbols-outlined text-xl text-primary">meeting_room</span>
				</div>
				<div>
					<span class="text-sm font-black text-slate-900 uppercase">{room.name}</span>
					<div class="mt-0.5 flex items-center gap-3 text-[11px] font-bold text-slate-400">
						<span>{m.room_host()}: {room.host}</span>
						<span class="flex items-center gap-1">
							<span class="material-symbols-outlined text-xs">group</span>
							{room.currentPlayers}/{room.maxPlayers}
						</span>
						<span class="flex items-center gap-1">
							<span class="h-1.5 w-1.5 rounded-full {config.dotColor}"></span>
							<span class="font-black uppercase {config.color}">{config.label()}</span>
						</span>
					</div>
				</div>
			</div>

			<button
				class="comic-button rounded-lg border-2 border-slate-900 bg-red-500 px-4 py-2 text-xs font-black text-white uppercase"
				onclick={() => onclose?.(room.id)}
			>
				{m.admin_room_close()}
			</button>
		</div>
	{/each}
</div>
