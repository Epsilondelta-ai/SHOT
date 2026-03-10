<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import SettingsSection from './SettingsSection.svelte';

	const { Story } = defineMeta({
		title: 'Mypage/SettingsSection',
		component: SettingsSection,
		tags: ['autodocs']
	});
</script>

<Story
	name="Default"
	args={{
		items: [
			{ key: 'language', label: 'Language', icon: 'language', value: 'EN', onclick: fn() },
			{
				key: 'notifications',
				label: 'Notifications',
				icon: 'notifications',
				value: 'On',
				onclick: fn()
			},
			{ key: 'signout', label: 'Sign Out', icon: 'logout', onclick: fn() }
		]
	}}
/>

<Story
	name="No Values"
	args={{
		items: [
			{ key: 'privacy', label: 'Privacy Policy', icon: 'privacy_tip', onclick: fn() },
			{ key: 'terms', label: 'Terms of Service', icon: 'description', onclick: fn() },
			{ key: 'support', label: 'Support', icon: 'help', onclick: fn() }
		]
	}}
/>
