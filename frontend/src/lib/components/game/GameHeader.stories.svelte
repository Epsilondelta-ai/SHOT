<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GameHeader from './GameHeader.svelte';

	const { Story } = defineMeta({
		title: 'Game/GameHeader',
		component: GameHeader,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		},
		argTypes: {
			round: { control: 'number' },
			timeLeft: { control: { type: 'range', min: 0, max: 15, step: 1 } },
			totalTime: { control: 'number' }
		}
	});
</script>

<Story
	name="Default"
	args={{
		round: 1,
		timeLeft: 12,
		totalTime: 15
	}}
/>

<Story
	name="Urgent (Low Time)"
	args={{
		round: 3,
		timeLeft: 3,
		totalTime: 15
	}}
/>

<Story
	name="Time's Up"
	args={{
		round: 5,
		timeLeft: 0,
		totalTime: 15
	}}
/>

<Story
	name="Full Time"
	args={{
		round: 1,
		timeLeft: 15,
		totalTime: 15
	}}
/>
