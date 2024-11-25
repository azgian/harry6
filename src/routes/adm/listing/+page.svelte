<script lang="ts">
	import { page } from '$app/stores';
	import ListingForm from './ListingForm.svelte';
	import { coinsData } from '$lib/coinsData';
	import type { OrderType } from '$lib/types/trade';

	let orderType = $derived($page.url.searchParams.get('orderType') as OrderType);
</script>

{#each coinsData as coin}
	<ListingForm {orderType} coinId={coin.id} />
{/each}
