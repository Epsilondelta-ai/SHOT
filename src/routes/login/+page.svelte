<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import LoginHeader from '$lib/components/login/LoginHeader.svelte';
	import ComicInput from '$lib/components/login/ComicInput.svelte';
	import ComicButton from '$lib/components/login/ComicButton.svelte';
	import OrDivider from '$lib/components/login/OrDivider.svelte';


	let showPassword = $state(false);
</script>

<svelte:head>
	<title>{m.login_title()}</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-background-light p-4 font-display text-slate-900"
>
	<div
		class="comic-border relative w-full max-w-md space-y-8 overflow-hidden rounded-xl bg-white p-8"
	>
		<LoginHeader subtitle={m.login_subtitle()} />

		<form class="space-y-6">
			<ComicInput
				label={m.login_email_label()}
				type="email"
				placeholder={m.login_email_placeholder()}
				icon="alternate_email"
			/>

			<ComicInput
				label={m.login_password_label()}
				type={showPassword ? 'text' : 'password'}
				placeholder={m.login_password_placeholder()}
				icon={showPassword ? 'visibility_off' : 'visibility'}
				onIconClick={() => (showPassword = !showPassword)}
			>
				{#snippet trailing()}
					<button type="button" class="text-xs font-bold text-primary underline underline-offset-2">
						{m.login_forgot()}
					</button>
				{/snippet}
			</ComicInput>

			<div class="space-y-4 pt-4">
				<ComicButton type="submit" icon="login">{m.login_button()}</ComicButton>

				<OrDivider text={m.login_or()} />

				<a
					href={resolve('/signup')}
					class="comic-button comic-border-sm flex w-full items-center justify-center gap-2 rounded-lg bg-white py-4 text-lg font-black tracking-widest text-slate-900 uppercase"
				>
					{m.login_create_identity()}
				</a>
			</div>
		</form>

		<!-- Bottom Graphic -->
		<div
			class="absolute -bottom-6 -left-6 -z-10 h-24 w-24 rounded-full border-4 border-primary/40 bg-primary/20"
		></div>
	</div>

	<!-- Background Decorations -->
	<div class="fixed top-10 left-10 hidden opacity-20 lg:block">
		<span class="material-symbols-outlined text-8xl font-bold text-primary">flare</span>
	</div>
	<div class="fixed right-10 bottom-10 hidden opacity-20 lg:block">
		<span class="material-symbols-outlined text-8xl font-bold text-primary">motion_photos_on</span>
	</div>
</div>
