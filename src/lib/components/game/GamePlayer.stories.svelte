<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GamePlayer from './GamePlayer.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Game/GamePlayer',
		component: GamePlayer,
		tags: ['autodocs'],
		argTypes: {
			hp: { control: { type: 'range', min: 0, max: 3, step: 1 } },
			maxHp: { control: 'number' },
			alive: { control: 'boolean' },
			isMe: { control: 'boolean' },
			selected: { control: 'boolean' },
			selectable: { control: 'boolean' }
		}
	});
</script>

<Story
	name="Full HP"
	args={{
		name: 'Sheriff_Buck',
		hp: 3,
		maxHp: 3,
		alive: true
	}}
/>

<Story
	name="Low HP"
	args={{
		name: 'Doc_Holiday',
		hp: 1,
		maxHp: 3,
		alive: true
	}}
/>

<Story
	name="Eliminated"
	args={{
		name: 'Calamity_Sue',
		hp: 0,
		maxHp: 3,
		alive: false
	}}
/>

<Story
	name="Current Player (Me)"
	args={{
		name: 'Outlaw_Jane',
		hp: 2,
		maxHp: 3,
		alive: true,
		isMe: true
	}}
/>

<Story
	name="Selected Target"
	args={{
		name: 'Sheriff_Buck',
		hp: 3,
		maxHp: 3,
		alive: true,
		selected: true,
		selectable: true,
		onselect: fn()
	}}
/>

<Story
	name="Selectable"
	args={{
		name: 'Doc_Holiday',
		hp: 2,
		maxHp: 3,
		alive: true,
		selectable: true,
		onselect: fn()
	}}
/>
