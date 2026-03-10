<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RoomLlmPlayerPanel from './RoomLlmPlayerPanel.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Room/RoomLlmPlayerPanel',
		component: RoomLlmPlayerPanel,
		tags: ['autodocs'],
		argTypes: {
			disabled: { control: 'boolean' }
		}
	});

	const sampleAssistants = [
		{ id: 'a1', name: 'Aggressive Bot', prompt: '공격적으로 플레이합니다.', scope: 'global' },
		{ id: 'a2', name: 'Cautious Bot', prompt: '신중하게 플레이합니다.', scope: 'personal' }
	];

	const sampleModels = [
		{ id: 'm1', provider: 'anthropic', apiModelName: 'claude-3-5-sonnet', displayName: 'Claude 3.5 Sonnet' },
		{ id: 'm2', provider: 'openai', apiModelName: 'gpt-4o', displayName: 'GPT-4o' }
	];
</script>

<Story
	name="Default"
	args={{
		assistants: sampleAssistants,
		llmModels: sampleModels,
		onadd: fn()
	}}
/>

<Story
	name="Disabled"
	args={{
		assistants: sampleAssistants,
		llmModels: sampleModels,
		disabled: true,
		onadd: fn()
	}}
/>

<Story
	name="No Models"
	args={{
		assistants: sampleAssistants,
		llmModels: [],
		onadd: fn()
	}}
/>

<Story
	name="No Assistants"
	args={{
		assistants: [],
		llmModels: sampleModels,
		onadd: fn()
	}}
/>
