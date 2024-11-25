<script lang="ts">
	import SectionTab from '$lib/components/SectionTab.svelte';
	import type { CounterType } from '$lib/message';

	const tabItems = [
		{
			label: 'Dashboard',
			href: '/office',
			messageStoreType: ['userTradeNew', 'userCashNew'] as CounterType[]
		},
		{
			label: 'Message',
			href: '/office/message',
			messageStoreType: ['userMessage'] as CounterType[]
		},
		{ label: 'MyInfo', href: '/office/myinfo' }
	];
</script>

<SectionTab {tabItems} />

<slot />
