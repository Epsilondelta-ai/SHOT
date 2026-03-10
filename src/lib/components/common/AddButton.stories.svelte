<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AddButton from './AddButton.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Common/AddButton',
		component: AddButton,
		tags: ['autodocs'],
		parameters: {
			layout: 'centered'
		},
		args: {
			onclick: fn()
		}
	});
</script>

<Story
	name="Default"
	args={{
		label: '추가'
	}}
/>

<Story
	name="Create Room"
	args={{
		label: '방 만들기'
	}}
/>

<Story
	name="Add User"
	args={{
		label: '사용자 추가'
	}}
/>
