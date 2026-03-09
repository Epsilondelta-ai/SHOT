<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ConfigHeader from './ConfigHeader.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Config/ConfigHeader',
		component: ConfigHeader,
		tags: ['autodocs'],
		args: {
			onchange: fn()
		}
	});
</script>

<Story
	name="Assistant Tab Active"
	args={{
		activeTab: 'assistant'
	}}
/>

<Story
	name="Bot Tab Active"
	args={{
		activeTab: 'bot'
	}}
/>
