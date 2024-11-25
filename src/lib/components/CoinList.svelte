<script lang="ts">
	import CoinInfo from './CoinInfo.svelte';
	import Button from './Button.svelte';
	import { goto } from '$app/navigation';
	import { getCoinSymbol } from '$lib/coinsData';

	let { coinId = 'coin_usdt_trc20', orderType } = $props();
	let isAddClass = $derived(orderType ? 'is-req' : 'is-list');
	const coinSymbol = getCoinSymbol(coinId);
</script>

<div class="coin_list-container {isAddClass}">
	<CoinInfo {coinId} />
	<div class="coin-list-button">
		<Button
			style={orderType === 'sell'
				? 'background-color: #d32f2f; border: 1px solid #ffffff;'
				: 'background: linear-gradient(145deg, #d32f2f, #f44336);'}
			onClick={() => {
				goto(`/adm/listing?symbol=${coinSymbol}&orderType=sell`);
			}}
			text="Sell"
		/>
		<Button
			style={orderType === 'buy'
				? 'background-color: #1976d2; border: 1px solid #ffffff;'
				: 'background: linear-gradient(145deg, #1976d2, #2196f3);'}
			onClick={() => {
				goto(`/adm/listing?symbol=${coinSymbol}&orderType=buy`);
			}}
			text="Buy"
		/>
	</div>
</div>

<style>
	.coin_list-container {
		background-color: rgba(0, 0, 0, 0.2);
		padding: 10px 20px;
		margin-bottom: 1px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.coin-list-button {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 10px;
	}
	.fee-wrap {
		display: flex;
		align-items: center;
		gap: 5px;
		flex-wrap: wrap;
	}
	.fee-container {
		display: flex;
		align-items: center;
	}
	.is-req {
		border-radius: 10px 10px 0 0;
	}
	.is-list {
		border-radius: 10px;
	}
</style>
