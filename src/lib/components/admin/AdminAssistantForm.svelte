<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Assistant = {
		id: string;
		name: string;
		prompt: string;
		active: boolean;
		created: string;
		updated: string;
	};

	let {
		isOpen = false,
		editingAssistant,
		onsave,
		oncancel
	}: {
		isOpen?: boolean;
		editingAssistant?: Assistant | null;
		onsave?: (assistant: Omit<Assistant, 'id' | 'created' | 'updated'>) => void;
		oncancel?: () => void;
	} = $props();

	let name = $state('');
	let prompt = $state('');
	let active = $state(true);

	$effect(() => {
		if (editingAssistant) {
			name = editingAssistant.name;
			prompt = editingAssistant.prompt;
			active = editingAssistant.active;
		} else {
			name = '';
			prompt = '';
			active = true;
		}
	});

	function handleSave() {
		if (!name.trim() || !prompt.trim()) return;
		onsave?.({ name, prompt, active });
		name = '';
		prompt = '';
		active = true;
	}

	function handleCancel() {
		name = '';
		prompt = '';
		active = true;
		oncancel?.();
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
		<div class="comic-border mx-auto w-full max-w-md rounded-2xl bg-white p-6">
			<h2 class="mb-4 text-lg font-black tracking-tighter text-slate-900 uppercase">
				{editingAssistant ? m.admin_edit() : m.admin_add_assistant()}
			</h2>

			<div class="space-y-3">
				<!-- Name Input -->
				<div>
					<label class="mb-1 text-xs font-black text-slate-500 uppercase" for="name">
						{m.admin_assistant_name()}
					</label>
					<input
						id="name"
						class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold placeholder:text-slate-400"
						placeholder="예: 친절한 어시스턴트"
						type="text"
						bind:value={name}
					/>
				</div>

				<!-- Prompt Textarea -->
				<div>
					<label class="mb-1 text-xs font-black text-slate-500 uppercase" for="prompt">
						{m.admin_assistant_prompt()}
					</label>
					<textarea
						id="prompt"
						class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold placeholder:text-slate-400"
						placeholder={m.admin_assistant_prompt_placeholder()}
						rows="6"
						bind:value={prompt}
					></textarea>
				</div>

				<!-- Active Toggle -->
				<div class="flex items-center gap-2">
					<input
						class="size-4 accent-primary"
						id="active"
						type="checkbox"
						bind:checked={active}
					/>
					<label class="text-sm font-black text-slate-900 uppercase" for="active">
						{m.admin_assistant_active()}
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
					disabled={!name.trim() || !prompt.trim()}
					onclick={handleSave}
				>
					{m.admin_save()}
				</button>
			</div>
		</div>
	</div>
{/if}
