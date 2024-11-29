<script lang="ts">
	import SectionTab from '$lib/components/SectionTab.svelte';
	import type { CounterType } from '$lib/message';

	const tabItems = [
		{
			label: 'Main',
			href: '/adm',
			messageStoreType: ['tradeNew', 'depositNew'] as CounterType[]
		},
		{ label: 'Users', href: '/adm/users' },
		{ label: 'Listing', href: '/adm/listing' },
		{ label: 'Config', href: '/adm/config' }
	];
</script>

<SectionTab {tabItems} />

<slot />
