<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StatsCard from './StatsCard.svelte';

	const { Story } = defineMeta({
		title: 'Mypage/StatsCard',
		component: StatsCard,
		tags: ['autodocs'],
		argTypes: {
			games: { control: 'number' },
			wins: { control: 'number' },
			streak: { control: 'number' }
		}
	});
</script>

<Story
	name="Default"
	args={{
		games: 128,
		wins: 87,
		streak: 9
	}}
/>

<Story
	name="No Games"
	args={{
		games: 0,
		wins: 0,
		streak: 0
	}}
/>

<Story
	name="High Win Rate"
	args={{
		games: 50,
		wins: 48,
		streak: 15
	}}
/>

<Story
	name="Low Win Rate"
	args={{
		games: 100,
		wins: 20,
		streak: 0
	}}
/>
