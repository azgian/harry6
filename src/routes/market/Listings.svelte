<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Listing } from '$lib/types/trade';
	import type { OrderType } from '$lib/types/trade';
	import type { Unsubscribe } from 'firebase/firestore';
	import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import CoinInfo from '$lib/components/CoinInfo.svelte';
	import { getCoinPriceLive, dataInitializedStore, lastUpdateTimeStore } from '$lib/coinData';
	import { getCoinSymbol } from '$lib/coinsData';
	import LoaderBox from '$lib/components/LoaderBox.svelte';
	import { scrollToElement } from '$lib/index';
	import { symbolsData } from '$lib/coinsData';
	import ListingView from './ListingView.svelte';
	import { page } from '$app/stores';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { orderType }: { orderType: OrderType } = $props();
	if (!orderType) {
		orderType = 'sell';
	}

	let lid = $derived<string | null>($page.url.searchParams.get('lid'));
	let listings = $state<Listing[]>([]);
	let prices = $state<{ [symbol: string]: number }>({});
	let controller = $state<AbortController | null>(null);
	let isLoading = $state(true);
	let unsubscribeListener: Unsubscribe | undefined;

	const getListings = async (orderType: OrderType) => {
		try {
			controller?.abort();
			controller = new AbortController();

			if (unsubscribeListener) {
				unsubscribeListener();
			}

			const q = query(
				collection(db, 'listings'),
				where('orderType', '==', orderType),
				where('isActive', '==', true),
				orderBy('createdAt', 'desc')
			);

			unsubscribeListener = onSnapshot(
				q,
				(snapshot) => {
					listings = snapshot.docs.map((doc) => ({
						...(doc.data() as Listing),
						docId: doc.id
					}));
					isLoading = false;
				},
				(error) => {
					console.error('Listings listener error:', error);
					isLoading = false;
				}
			);

			return unsubscribeListener;
		} catch (error) {
			console.error('Error setting up listings listener:', error);
			isLoading = false;
			return () => {};
		}
	};

	$effect.root(() => {
		getListings(orderType);

		return () => {
			controller?.abort();
		};
	});

	const updateOrderType = (newOrderType: OrderType) => {
		goto(`/market?orderType=${newOrderType}`, { replaceState: true });
		isLoading = true;
		getListings(newOrderType);
	};

	const updatePrices = () => {
		const newPrices: { [symbol: string]: number } = {};

		symbolsData.forEach((symbol) => {
			const price = getCoinPriceLive(symbol);
			if (price > 0) {
				newPrices[symbol] = price;
			}
		});

		if (Object.keys(newPrices).length > 0) {
			prices = newPrices;
		}
	};

	// 실시간 가격 업데이트 - lastUpdateTimeStore 변경 시
	$effect(() => {
		if ($lastUpdateTimeStore > 0) {
			updatePrices();
		}
	});

	// 초기 데이터 로드 시 가격 업데이트
	$effect(() => {
		if ($dataInitializedStore) {
			updatePrices();
		}
	});

	let selectedListing = $derived(
		lid ? listings.find((listing) => listing.docId === lid) : null
	);

	const handleListingClick = (listingId: string) => {
		goto(`/market?orderType=${orderType}&lid=${listingId}`, { replaceState: true });
		scrollToElement('#sectionTitle');
	};

	$effect(() => {
		if (isLoading) {
			setTimeout(() => {
				isLoading = false;
			}, 500);
		}
	});
</script>

<div class="listings-container">
	{#if selectedListing}
		<ListingView listing={selectedListing} />
	{/if}

	<!-- <div class="select_tabs_container">
		<div class="select_tabs">
			<button class:active={orderType === 'sell'} onclick={() => updateOrderType('sell')}
				>Sell</button
			>
			<button class:active={orderType === 'buy'} onclick={() => updateOrderType('buy')}>Buy</button>
		</div>
	</div> -->

	<div class="trade_list-container" transition:slide={{ duration: 300, easing: cubicOut }}>
		{#if listings.length === 0 || isLoading}
			<LoaderBox boxHeight="300px" />
		{:else}
			{#each listings as listing}
				{@const symbol = getCoinSymbol(listing.coinId) || ''}
				{#if listing.isActive}
					<button
						class="trade_list"
						class:selected={listing.docId === lid}
						onclick={() => handleListingClick(listing.docId)}
					>
						<div class="coin_info">
							<CoinInfo coinId={symbol} />
						</div>
						<div class="trade-info">
							<div class="trade_price">
								<small>현재시세</small>
								{#if typeof prices[symbol] === 'undefined'}
									<LoaderBox size={20} boxHeight="20px" />
								{:else}
									<strong>{prices[symbol].toLocaleString()}</strong>
								{/if}
							</div>
							<div class="trade_amount">
								<small>수량</small>
								<strong>{listing.amount.toLocaleString()}</strong>
							</div>
						</div>
					</button>
				{/if}
			{/each}
		{/if}
	</div>
</div>

<style>
	.listings-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	.trade_list-container {
		width: 100%;
		margin-top: 50px;
	}
	.trade_list {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 15px 0;
		border-bottom: 1px solid #e0e0e0;
		width: 100%;
		/* cursor: pointer; */
	}
	.trade_list:hover {
		background-color: rgba(0, 0, 0, 0.1);
	}
	.trade_list.selected {
		background-color: rgba(0, 0, 0, 0.2);
	}
	.coin_info {
		padding-left: 20px;
	}
	.trade-info {
		display: flex;
		align-items: center;
	}
	.trade_price {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 10px;
		width: 100px;
	}
	.trade_price strong {
		color: gold;
	}
	.trade_amount {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 10px;
		width: 100px;
	}
	strong {
		font-size: 1.5rem;
		font-weight: bold;
	}

	/* 400px 이하에서 .trade_price 숨기기 */
	@media (max-width: 400px) {
		.trade_price {
			display: none;
		}
	}

	/* .loading-container {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		height: 150px;
	}
	.select_tabs_container {
		display: flex;
		justify-content: flex-end;
		margin: 20px 0;
	}
	.select_tabs {
		display: flex;
		width: 150px;
		height: 36px;
		background-color: #ffffff;
		border-radius: 16px;
		position: relative;
		overflow: hidden;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
	.select_tabs button {
		flex: 1;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 14px;
		font-weight: bold;
		color: #333;
		transition: all 0.3s ease;
		z-index: 2;
	}
	.select_tabs button:first-child.active {
		color: #ffffff;
		background-color: #ff4136;
		border-radius: 16px;
	}
	.select_tabs button:last-child.active {
		color: #ffffff;
		background-color: #0074d9;
		border-radius: 16px;
	} */
</style>
