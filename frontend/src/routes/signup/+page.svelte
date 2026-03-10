<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { BACKEND_URL } from '$lib/config';
	import LoginHeader from '$lib/components/login/LoginHeader.svelte';
	import ComicInput from '$lib/components/login/ComicInput.svelte';
	import ComicButton from '$lib/components/login/ComicButton.svelte';
	import OrDivider from '$lib/components/login/OrDivider.svelte';

	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let error = $state('');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		const fd = new FormData(e.target as HTMLFormElement);
		const name = fd.get('name') as string;
		const email = fd.get('email') as string;
		const password = fd.get('password') as string;
		const confirmPassword = fd.get('confirmPassword') as string;

		if (!name || !email || !password || !confirmPassword) {
			error = '모든 항목을 입력해주세요.';
			return;
		}

		if (password !== confirmPassword) {
			error = '비밀번호가 일치하지 않습니다.';
			return;
		}

		try {
			const res = await fetch(`${BACKEND_URL}/api/auth/sign-up/email`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ name, email, password })
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				error = body?.message ?? '회원가입에 실패했습니다.';
				return;
			}

			goto('/lobby');
		} catch {
			error = '회원가입에 실패했습니다.';
		}
	}
</script>

<svelte:head>
	<title>{m.signup_title()}</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-background-light p-4 font-display text-slate-900"
>
	<div
		class="comic-border relative w-full max-w-md space-y-8 overflow-hidden rounded-xl bg-white p-8"
	>
		<LoginHeader subtitle={m.signup_subtitle()} />

		<form class="space-y-6" onsubmit={handleSubmit}>
			{#if error}
				<div class="comic-border-sm rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
					{error}
				</div>
			{/if}

			<ComicInput
				label={m.signup_name_label()}
				type="text"
				name="name"
				placeholder={m.signup_name_placeholder()}
				icon="person"
			/>

			<ComicInput
				label={m.signup_email_label()}
				type="email"
				name="email"
				placeholder={m.signup_email_placeholder()}
				icon="alternate_email"
			/>

			<ComicInput
				label={m.signup_password_label()}
				type={showPassword ? 'text' : 'password'}
				name="password"
				placeholder={m.signup_password_placeholder()}
				icon={showPassword ? 'visibility_off' : 'visibility'}
				onIconClick={() => (showPassword = !showPassword)}
			/>

			<ComicInput
				label={m.signup_confirm_password_label()}
				type={showConfirmPassword ? 'text' : 'password'}
				name="confirmPassword"
				placeholder={m.signup_confirm_password_placeholder()}
				icon={showConfirmPassword ? 'visibility_off' : 'visibility'}
				onIconClick={() => (showConfirmPassword = !showConfirmPassword)}
			/>

			<div class="space-y-4 pt-4">
				<ComicButton type="submit" icon="person_add">{m.signup_button()}</ComicButton>

				<OrDivider text={m.signup_or()} />

				<a
					href={resolve('/login')}
					class="comic-button comic-border-sm flex w-full items-center justify-center gap-2 rounded-lg bg-white py-4 text-lg font-black tracking-widest text-slate-900 uppercase"
				>
					{m.signup_back_to_login()}
				</a>
			</div>
		</form>

		<!-- Bottom Graphic -->
		<div
			class="absolute -right-6 -bottom-6 -z-10 h-24 w-24 rounded-full border-4 border-primary/40 bg-primary/20"
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
