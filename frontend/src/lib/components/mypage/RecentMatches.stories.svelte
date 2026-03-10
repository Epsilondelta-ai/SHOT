<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RecentMatches from './RecentMatches.svelte';

	const { Story } = defineMeta({
		title: 'Mypage/RecentMatches',
		component: RecentMatches,
		tags: ['autodocs']
	});
</script>

<Story
	name="Default"
	args={{
		matches: [
			{ id: '1', name: 'Wild West Duel', result: 'win', score: '3:1', date: 'Today' },
			{ id: '2', name: 'Gold Rush Heist', result: 'win', score: '2:1', date: 'Today' },
			{ id: '3', name: 'Saloon Brawl', result: 'loss', score: '1:3', date: 'Yesterday' },
			{ id: '4', name: 'Train Robbery', result: 'win', score: '3:0', date: 'Yesterday' },
			{ id: '5', name: 'Desert Showdown', result: 'loss', score: '0:3', date: '2 days ago' }
		]
	}}
/>

<Story
	name="All Wins"
	args={{
		matches: [
			{ id: '1', name: 'Wild West Duel', result: 'win', score: '3:0', date: 'Today' },
			{ id: '2', name: 'Gold Rush Heist', result: 'win', score: '3:1', date: 'Today' },
			{ id: '3', name: 'Saloon Brawl', result: 'win', score: '3:2', date: 'Yesterday' }
		]
	}}
/>

<Story
	name="All Losses"
	args={{
		matches: [
			{ id: '1', name: 'Desert Showdown', result: 'loss', score: '0:3', date: 'Today' },
			{ id: '2', name: 'Train Robbery', result: 'loss', score: '1:3', date: 'Yesterday' }
		]
	}}
/>

<Story name="Empty" args={{ matches: [] }} />
