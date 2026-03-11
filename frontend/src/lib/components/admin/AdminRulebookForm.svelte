<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Rulebook = {
		id: string;
		name: string;
		content: string;
		active: boolean;
		created: string;
		updated: string;
	};

	let {
		isOpen = false,
		editingRulebook,
		onsave,
		oncancel
	}: {
		isOpen?: boolean;
		editingRulebook?: Rulebook | null;
		onsave?: (rulebook: Omit<Rulebook, 'id' | 'created' | 'updated'>) => void;
		oncancel?: () => void;
	} = $props();

	let name = $state('');
	let content = $state('');
	let active = $state(true);

	$effect(() => {
		if (editingRulebook) {
			name = editingRulebook.name;
			content = editingRulebook.content;
			active = editingRulebook.active;
		} else {
			name = '';
			content = '';
			active = true;
		}
	});

	function handleSave() {
		if (!name.trim() || !content.trim()) return;
		onsave?.({ name, content, active });
		name = '';
		content = '';
		active = true;
	}

	function handleCancel() {
		name = '';
		content = '';
		active = true;
		oncancel?.();
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
		<div class="comic-border mx-auto w-full max-w-md rounded-2xl bg-white p-6">
			<h2 class="mb-4 text-lg font-black tracking-tighter text-slate-900 uppercase">
				{editingRulebook ? m.admin_edit() : m.admin_add_rulebook()}
			</h2>

			<div class="space-y-3">
				<!-- Name Input -->
				<div>
					<label class="mb-1 text-xs font-black text-slate-500 uppercase" for="rulebook-name">
						{m.admin_rulebook_name()}
					</label>
					<input
						id="rulebook-name"
						class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold placeholder:text-slate-400"
						placeholder="예: 기본 룰북"
						type="text"
						bind:value={name}
					/>
				</div>

				<!-- Content Textarea -->
				<div>
					<label class="mb-1 text-xs font-black text-slate-500 uppercase" for="rulebook-content">
						{m.admin_rulebook_content()}
					</label>
					<textarea
						id="rulebook-content"
						class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold placeholder:text-slate-400"
						placeholder={m.admin_rulebook_content_placeholder()}
						rows="10"
						bind:value={content}
					></textarea>
				</div>

				<!-- Active Toggle -->
				<div class="flex items-center gap-2">
					<input class="size-4 accent-primary" id="rulebook-active" type="checkbox" bind:checked={active} />
					<label class="text-sm font-black text-slate-900 uppercase" for="rulebook-active">
						{m.admin_rulebook_active()}
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
					disabled={!name.trim() || !content.trim()}
					onclick={handleSave}
				>
					{m.admin_save()}
				</button>
			</div>
		</div>
	</div>
{/if}
