<script lang="ts">
	import { coinsData } from '$lib/coinsData';
	import type { CoinData } from '$lib/types';

	const { coinId = 'usdt_trc20' } = $props();
	const coinData: CoinData = coinsData.find((coin) => coin.id === coinId) || coinsData[0];
</script>

<div class="coin_info">
	<img src={coinData?.logo} alt="" class="coin_logo" />
	<div class="coin_name-container">
		<span class="coin_name">
			{coinData?.name}
		</span>
	</div>
</div>

<style>
	.coin_info {
		display: flex;
		align-items: center;
	}
	.coin_logo {
		width: 30px;
		height: 30px;
		margin-right: 10px;
	}
	.coin_name-container {
		display: flex;
		align-items: center;
		margin-right: 8px;
	}
	.coin_name {
		font-size: 18px;
		font-weight: bold;
		color: white;
	}
</style>
