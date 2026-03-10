<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ComicInput from './ComicInput.svelte';

	const { Story } = defineMeta({
		title: 'Login/ComicInput',
		component: ComicInput,
		tags: ['autodocs'],
		argTypes: {
			label: { control: 'text' },
			icon: { control: 'text' },
			type: {
				control: { type: 'select' },
				options: ['text', 'email', 'password']
			},
			placeholder: { control: 'text' }
		}
	});
</script>

<Story
	name="Email"
	args={{
		label: 'Email Address',
		type: 'email',
		placeholder: 'hero@example.com',
		icon: 'alternate_email'
	}}
/>

<Story
	name="Password"
	args={{ label: 'Secret Code', type: 'password', placeholder: '••••••••', icon: 'visibility' }}
/>

<Story
	name="Text"
	args={{ label: 'Hero Name', type: 'text', placeholder: 'Enter your name', icon: 'person' }}
/>
