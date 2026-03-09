<script lang="ts">
	import LoginHeader from '$lib/components/login/LoginHeader.svelte';
	import ComicInput from '$lib/components/login/ComicInput.svelte';
	import ComicButton from '$lib/components/login/ComicButton.svelte';
	import OrDivider from '$lib/components/login/OrDivider.svelte';

	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
</script>

<svelte:head>
	<title>Sign Up - SHOT!</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-background-light p-4 font-display text-slate-900"
>
	<div
		class="comic-border relative w-full max-w-md space-y-8 overflow-hidden rounded-xl bg-white p-8"
	>
		<LoginHeader subtitle="Create Your Identity" />

		<form class="space-y-6">
			<ComicInput label="Name" type="text" placeholder="Your Hero Name" icon="person" />

			<ComicInput
				label="Email"
				type="email"
				placeholder="hero@example.com"
				icon="alternate_email"
			/>

			<ComicInput
				label="Password"
				type={showPassword ? 'text' : 'password'}
				placeholder="••••••••"
				icon={showPassword ? 'visibility_off' : 'visibility'}
				onIconClick={() => (showPassword = !showPassword)}
			/>

			<ComicInput
				label="Confirm Password"
				type={showConfirmPassword ? 'text' : 'password'}
				placeholder="••••••••"
				icon={showConfirmPassword ? 'visibility_off' : 'visibility'}
				onIconClick={() => (showConfirmPassword = !showConfirmPassword)}
			/>

			<div class="space-y-4 pt-4">
				<ComicButton type="submit" icon="person_add">Sign Up</ComicButton>

				<OrDivider />

				<a href="/login">
					<ComicButton type="button" variant="secondary">Back to Login</ComicButton>
				</a>
			</div>
		</form>

		<!-- Bottom Graphic -->
		<div
			class="absolute -bottom-6 -right-6 -z-10 h-24 w-24 rounded-full border-4 border-primary/40 bg-primary/20"
		></div>
	</div>

	<!-- Background Decorations -->
	<div class="fixed top-10 right-10 hidden opacity-20 lg:block">
		<span class="material-symbols-outlined text-8xl font-bold text-primary">flare</span>
	</div>
	<div class="fixed bottom-10 left-10 hidden opacity-20 lg:block">
		<span class="material-symbols-outlined text-8xl font-bold text-primary">motion_photos_on</span>
	</div>
</div>
