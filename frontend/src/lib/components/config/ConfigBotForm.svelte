<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Bot = {
		id: string;
		name: string;
		apiKey: string;
		active: boolean;
		created: string;
		updated: string;
	};

	let {
		isOpen = false,
		editingBot,
		onsave,
		oncancel
	}: {
		isOpen?: boolean;
		editingBot?: Bot | null;
		onsave?: (bot: Omit<Bot, 'id' | 'created' | 'updated'>) => void;
		oncancel?: () => void;
	} = $props();

	let name = $state('');
	let apiKey = $state('');
	let active = $state(true);

	$effect(() => {
		if (editingBot) {
			name = editingBot.name;
			apiKey = editingBot.apiKey;
			active = editingBot.active;
		} else {
			name = '';
			apiKey = '';
			active = true;
		}
	});

	function handleSave() {
		if (!name.trim() || !apiKey.trim()) return;
		onsave?.({ name, apiKey, active });
		name = '';
		apiKey = '';
		active = true;
	}

	function handleCancel() {
		name = '';
		apiKey = '';
		active = true;
		oncancel?.();
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
		<div class="comic-border mx-auto w-full max-w-md rounded-2xl bg-white p-6">
			<h2 class="mb-4 text-lg font-black tracking-tighter text-slate-900 uppercase">
				{editingBot ? m.admin_edit() : m.config_add_bot()}
			</h2>

			<div class="space-y-3">
				<!-- Bot Name Input -->
				<div>
					<label class="mb-1 text-xs font-black text-slate-500 uppercase" for="bot-name">
						{m.config_bot_name()}
					</label>
					<input
						id="bot-name"
						class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold placeholder:text-slate-400"
						placeholder="My OpenClaw Bot"
						type="text"
						bind:value={name}
					/>
				</div>

				<!-- API Key Input -->
				<div>
					<label class="mb-1 text-xs font-black text-slate-500 uppercase" for="api-key">
						{m.config_bot_api_key()}
					</label>
					<input
						id="api-key"
						class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold placeholder:text-slate-400"
						placeholder={m.config_bot_api_key_placeholder()}
						type="password"
						bind:value={apiKey}
					/>
				</div>

				<!-- Active Toggle -->
				<div class="flex items-center gap-2">
					<input class="size-4 accent-primary" id="active" type="checkbox" bind:checked={active} />
					<label class="text-sm font-black text-slate-900 uppercase" for="active">
						{m.config_bot_active()}
					</label>
				</div>
			</div>

			<!-- Buttons -->
			<div class="mt-6 flex gap-2">
				<button
					class="comic-button flex-1 rounded-lg border-2 border-slate-900 bg-slate-200 px-4 py-3 font-black uppercase"
					onclick={handleCancel}
				>
					{m.admin_cancel()}
				</button>
				<button
					class="comic-button flex-1 rounded-lg border-2 border-slate-900 bg-primary px-4 py-3 font-black text-white uppercase"
					disabled={!name.trim() || !apiKey.trim()}
					onclick={handleSave}
				>
					{m.admin_save()}
				</button>
			</div>
		</div>
	</div>
{/if}
