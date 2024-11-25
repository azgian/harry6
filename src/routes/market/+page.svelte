<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Listings from './Listings.svelte';
	import type { OrderType } from '$lib/types/trade';

	let orderType = $derived($page.url.searchParams.get('orderType') as OrderType);

	$effect(() => {
		if (!orderType || orderType !== 'sell') {
			goto('?orderType=sell', { replaceState: true });
		}
	});
</script>

<Listings {orderType} />
