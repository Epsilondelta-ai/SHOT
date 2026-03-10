<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		username = $bindable('Sheriff_Buck'),
		avatarSrc = $bindable('')
	}: {
		username?: string;
		avatarSrc?: string;
	} = $props();

	let editing = $state(false);
	let draftUsername = $state('');
	let draftAvatarSrc = $state('');
	let fileInput: HTMLInputElement;

	function startEdit() {
		draftUsername = username;
		draftAvatarSrc = avatarSrc;
		editing = true;
	}

	function save() {
		username = draftUsername;
		avatarSrc = draftAvatarSrc;
		editing = false;
	}

	function cancel() {
		editing = false;
	}

	function onFileChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		draftAvatarSrc = URL.createObjectURL(file);
	}
</script>

<div class="comic-border relative overflow-hidden rounded-xl bg-white p-6">
	<div class="flex items-center gap-5">
		<div class="relative shrink-0">
			<button
				class="relative flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-slate-900 bg-accent-beige {editing
					? 'cursor-pointer'
					: 'cursor-default'}"
				onclick={() => editing && fileInput.click()}
				type="button"
				tabindex={editing ? 0 : -1}
			>
				{#if editing ? draftAvatarSrc : avatarSrc}
					<img
						alt="Avatar"
						class="h-full w-full object-cover"
						src={editing ? draftAvatarSrc : avatarSrc}
					/>
				{:else}
					<span class="material-symbols-outlined text-slate-600" style="font-size: 5rem;">person</span>
				{/if}
				{#if editing}
					<div class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
						<span class="material-symbols-outlined text-2xl text-white">photo_camera</span>
					</div>
				{/if}
			</button>
			<input
				bind:this={fileInput}
				type="file"
				accept="image/*"
				class="hidden"
				onchange={onFileChange}
			/>
		</div>

		<div class="min-w-0 flex-1">
			{#if editing}
				<input
					type="text"
					bind:value={draftUsername}
					class="comic-border-sm w-full rounded-lg px-3 py-2 text-xl font-black tracking-tight text-slate-900 uppercase outline-none focus:ring-2 focus:ring-primary"
				/>
			{:else}
				<h2 class="truncate text-2xl font-black tracking-tight text-slate-900 uppercase">
					{username}
				</h2>
			{/if}
		</div>
	</div>

	{#if editing}
		<div class="mt-4 flex gap-2">
			<button
				onclick={save}
				class="comic-button comic-border-sm flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-black tracking-wider text-white uppercase"
			>
				<span class="material-symbols-outlined text-base">check</span>
				{m.mypage_save_profile()}
			</button>
			<button
				onclick={cancel}
				class="comic-border-sm flex flex-1 items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-black tracking-wider text-slate-900 uppercase"
			>
				<span class="material-symbols-outlined text-base">close</span>
				{m.mypage_cancel()}
			</button>
		</div>
	{:else}
		<button
			onclick={startEdit}
			class="comic-button comic-border-sm mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-black tracking-wider text-slate-900 uppercase"
		>
			<span class="material-symbols-outlined text-base">edit</span>
			{m.mypage_edit_profile()}
		</button>
	{/if}

	<!-- Decorative circle -->
	<div
		class="absolute -top-6 -right-6 size-20 rounded-full border-4 border-primary/30 bg-primary/10"
	></div>
</div>
