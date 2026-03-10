<script lang="ts">
	let {
		isOpen = false,
		oncreate,
		oncancel
	}: {
		isOpen?: boolean;
		oncreate?: (data: { name: string; icon: string; maxPlayers: number }) => void;
		oncancel?: () => void;
	} = $props();

	const ICONS = [
		'swords',
		'sports_esports',
		'casino',
		'bolt',
		'star',
		'local_fire_department',
		'skull',
		'shield'
	];

	let name = $state('');
	let icon = $state('swords');
	let maxPlayers = $state(4);

	function handleSubmit() {
		if (!name.trim()) return;
		oncreate?.({ name: name.trim(), icon, maxPlayers });
		name = '';
		icon = 'swords';
		maxPlayers = 4;
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
		<div class="comic-border w-full max-w-sm rounded-2xl bg-white p-6">
			<h2 class="mb-4 text-base font-black text-slate-900">로비 만들기</h2>

			<div class="space-y-4">
				<!-- Room Name -->
				<div>
					<label class="mb-1 block text-xs font-black text-slate-500 uppercase" for="room-name">
						방 이름
					</label>
					<input
						id="room-name"
						class="comic-border-sm w-full rounded-lg px-3 py-2 text-sm font-bold placeholder:text-slate-400"
						placeholder="방 이름을 입력하세요"
						bind:value={name}
						onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
					/>
				</div>

				<!-- Icon -->
				<div>
					<p class="mb-2 text-xs font-black text-slate-500 uppercase">아이콘</p>
					<div class="flex flex-wrap gap-2">
						{#each ICONS as ic (ic)}
							<button
								class="flex size-10 items-center justify-center rounded-lg border-2 transition-colors
									{icon === ic
									? 'border-slate-900 bg-primary text-white'
									: 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}"
								onclick={() => (icon = ic)}
								title={ic}
							>
								<span class="material-symbols-outlined text-xl">{ic}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Max Players -->
				<div>
					<label class="mb-1 block text-xs font-black text-slate-500 uppercase" for="max-players">
						최대 인원 ({maxPlayers}명)
					</label>
					<input
						id="max-players"
						class="w-full accent-primary"
						type="range"
						min="2"
						max="8"
						bind:value={maxPlayers}
					/>
					<div class="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
						<span>2</span>
						<span>8</span>
					</div>
				</div>
			</div>

			<div class="mt-6 flex gap-3">
				<button
					class="comic-button flex-1 rounded-lg border-2 border-slate-900 bg-primary py-2 text-sm font-black text-white disabled:opacity-40"
					disabled={!name.trim()}
					onclick={handleSubmit}
				>
					만들기
				</button>
				<button
					class="comic-button rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-600"
					onclick={oncancel}
				>
					취소
				</button>
			</div>
		</div>
	</div>
{/if}
