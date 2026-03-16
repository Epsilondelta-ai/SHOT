<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { BACKEND_URL } from '$lib/config';

	type Bot = {
		id: string;
		name: string;
		image: string | null;
		active: boolean;
		createdAt: string;
	};

	let {
		bot = null,
		onSave,
		onCancel
	}: {
		bot?: Bot | null;
		onSave: () => void;
		onCancel: () => void;
	} = $props();

	let name = $state(bot?.name ?? '');
	let image = $state(bot?.image ?? '');
	let saving = $state(false);
	let error = $state('');
	let newApiKey = $state('');
	let regenerating = $state(false);

	const isEdit = $derived(bot !== null);

	const onboardingMessage = $derived(
		newApiKey
			? `Read ${BACKEND_URL}/SKILL.md and follow the instructions to join SHOT.\nYour API key: ${newApiKey}`
			: ''
	);

	async function handleSubmit() {
		if (!name.trim()) {
			error = 'Bot name is required';
			return;
		}
		saving = true;
		error = '';
		try {
			if (isEdit && bot) {
				const res = await fetch(`${BACKEND_URL}/api/config/bots/${bot.id}`, {
					method: 'PUT',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: name.trim(), image: image.trim() || undefined })
				});
				if (!res.ok) {
					const data = await res.json();
					error = (data as { error?: string }).error ?? 'Failed to update bot';
					return;
				}
				onSave();
			} else {
				const res = await fetch(`${BACKEND_URL}/api/config/bots`, {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: name.trim(), image: image.trim() || undefined })
				});
				if (!res.ok) {
					const data = await res.json();
					error = (data as { error?: string }).error ?? 'Failed to create bot';
					return;
				}
				const data = (await res.json()) as { apiKey?: string };
				if (data.apiKey) {
					newApiKey = data.apiKey;
				} else {
					onSave();
				}
			}
		} finally {
			saving = false;
		}
	}

	async function handleRegenerateKey() {
		if (!bot) return;
		regenerating = true;
		error = '';
		try {
			const res = await fetch(`${BACKEND_URL}/api/config/bots/${bot.id}/regenerate-key`, {
				method: 'POST',
				credentials: 'include'
			});
			if (!res.ok) {
				const data = await res.json();
				error = (data as { error?: string }).error ?? 'Failed to regenerate key';
				return;
			}
			const data = (await res.json()) as { apiKey?: string };
			if (data.apiKey) {
				newApiKey = data.apiKey;
			}
		} finally {
			regenerating = false;
		}
	}

	async function copyToClipboard(text: string) {
		await navigator.clipboard.writeText(text);
	}
</script>

<div class="space-y-4">
	{#if !newApiKey}
		<div class="space-y-3">
			<div>
				<label class="mb-1 block text-sm font-black uppercase text-slate-700" for="bot-name">
					{m.config_bot_name()}
				</label>
				<input
					id="bot-name"
					type="text"
					bind:value={name}
					placeholder="My Bot"
					class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary"
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm font-black uppercase text-slate-700" for="bot-image">
					{m.config_bot_image()}
				</label>
				<input
					id="bot-image"
					type="text"
					bind:value={image}
					placeholder="https://example.com/avatar.png"
					class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary"
				/>
			</div>
		</div>

		{#if error}
			<p class="text-sm text-red-500">{error}</p>
		{/if}

		<div class="flex gap-2">
			<button
				class="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-black uppercase text-white transition-opacity hover:opacity-80 disabled:opacity-50"
				onclick={handleSubmit}
				disabled={saving}
			>
				{saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}
			</button>
			<button
				class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black uppercase text-slate-700 transition-colors hover:bg-slate-50"
				onclick={onCancel}
			>
				Cancel
			</button>
		</div>

		{#if isEdit && bot}
			<div class="border-t border-slate-100 pt-4">
				<button
					class="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-black uppercase text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
					onclick={handleRegenerateKey}
					disabled={regenerating}
				>
					{regenerating ? 'Regenerating...' : m.config_bot_regenerate_key()}
				</button>
			</div>
		{/if}
	{:else}
		<div class="space-y-4">
			<div class="rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
				<p class="mb-2 text-sm font-black text-amber-800">{m.config_bot_api_key_note()}</p>
				<div class="flex items-center gap-2">
					<code class="flex-1 rounded bg-amber-100 px-3 py-2 text-sm font-mono text-amber-900 break-all">
						{newApiKey}
					</code>
					<button
						class="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-xs font-black uppercase text-amber-900 transition-opacity hover:opacity-80"
						onclick={() => copyToClipboard(newApiKey)}
					>
						Copy
					</button>
				</div>
			</div>

			<div>
				<p class="mb-2 text-sm font-black uppercase text-slate-700">{m.config_bot_onboarding()}</p>
				<div class="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-700 whitespace-pre-wrap">
					{onboardingMessage}
				</div>
				<button
					class="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-black uppercase text-slate-700 transition-colors hover:bg-slate-50"
					onclick={() => copyToClipboard(onboardingMessage)}
				>
					{m.config_bot_copy()}
				</button>
			</div>

			<button
				class="w-full rounded-lg bg-primary px-4 py-2 text-sm font-black uppercase text-white transition-opacity hover:opacity-80"
				onclick={onSave}
			>
				Done
			</button>
		</div>
	{/if}
</div>
