<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminLLMConfig from './AdminLLMConfig.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Admin/AdminLLMConfig',
		component: AdminLLMConfig,
		tags: ['autodocs'],
		args: {
			onprovideradd: fn(),
			onproviderdelete: fn(),
			onmodeltest: fn(),
			onmodeladd: fn(),
			onmodeldelete: fn()
		}
	});
</script>

<Story
	name="Full Config"
	args={{
		providers: [
			{
				id: 'p1',
				name: 'Anthropic',
				baseUrl: 'https://api.anthropic.com',
				apiKey: '••••••••••••',
				active: true
			},
			{
				id: 'p2',
				name: 'OpenAI',
				baseUrl: 'https://api.openai.com',
				apiKey: '••••••••••••',
				active: true
			},
			{
				id: 'p3',
				name: 'Gemini',
				baseUrl: 'https://generativelanguage.googleapis.com',
				apiKey: '••••••••••••',
				active: false
			}
		],
		models: [
			{
				id: 'm1',
				providerId: 'p1',
				name: 'Claude 3.5 Sonnet',
				contextWindow: 200000,
				costInput: 0.003,
				costOutput: 0.015,
				enabled: true
			},
			{
				id: 'm2',
				providerId: 'p1',
				name: 'Claude 3 Opus',
				contextWindow: 200000,
				costInput: 0.015,
				costOutput: 0.075,
				enabled: true
			},
			{
				id: 'm3',
				providerId: 'p2',
				name: 'GPT-4 Turbo',
				contextWindow: 128000,
				costInput: 0.01,
				costOutput: 0.03,
				enabled: false
			},
			{
				id: 'm4',
				providerId: 'p2',
				name: 'GPT-4o',
				contextWindow: 128000,
				costInput: 0.005,
				costOutput: 0.015,
				enabled: true
			}
		]
	}}
/>

<Story
	name="Only Providers"
	args={{
		providers: [
			{
				id: 'p1',
				name: 'Anthropic',
				baseUrl: 'https://api.anthropic.com',
				apiKey: '••••••••••••',
				active: true
			},
			{
				id: 'p2',
				name: 'OpenAI',
				baseUrl: 'https://api.openai.com',
				apiKey: '••••••••••••',
				active: false
			}
		],
		models: []
	}}
/>

<Story
	name="Only Models"
	args={{
		providers: [
			{
				id: 'p1',
				name: 'Anthropic',
				baseUrl: 'https://api.anthropic.com',
				apiKey: '••••••••••••',
				active: true
			}
		],
		models: [
			{
				id: 'm1',
				providerId: 'p1',
				name: 'Claude 3.5 Sonnet',
				contextWindow: 200000,
				costInput: 0.003,
				costOutput: 0.015,
				enabled: true
			},
			{
				id: 'm2',
				providerId: 'p1',
				name: 'Claude 3 Haiku',
				contextWindow: 200000,
				costInput: 0.00080,
				costOutput: 0.004,
				enabled: true
			}
		]
	}}
/>

<Story
	name="Empty"
	args={{
		providers: [],
		models: []
	}}
/>
