<script lang="ts">
	import SectionTab from '$lib/components/SectionTab.svelte';
	import type { CounterType } from '$lib/message';

	const tabItems = [
		{
			label: 'Dashboard',
			href: '/adm',
			messageStoreType: ['tradeNew', 'depositNew'] as CounterType[]
		},
		{ label: 'Users', href: '/adm/users' },
		{ label: 'Listing', href: '/adm/listing' }
	];
</script>

<SectionTab {tabItems} />

<slot />
