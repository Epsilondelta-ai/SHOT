<script lang="ts">
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import './layout.css';
	import favicon from '$lib/assets/favicon.png';
	import ToastContainer from '$lib/components/common/ToastContainer.svelte';
	import { addToast } from '$lib/toast.svelte';

	let { children } = $props();

	const originalConsoleError = console.error;
	console.error = (...args: unknown[]) => {
		originalConsoleError(...args);
		addToast(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
	};
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#ffffff" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</svelte:head>
{@render children()}
<ToastContainer />

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>
