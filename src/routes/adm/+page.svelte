<script lang="ts">
	import ExchangeLogTable from './ExchangeLogTable.svelte';
	import TradeLogTable from './TradeLogTable.svelte';
	import MessageBadge from '$lib/components/MessageBadge.svelte';

	let activeTab = $state('trade');
</script>

<div class="tab-container">
	<div class="tabs">
		<button
			class="tab-button {activeTab === 'trade' ? 'active' : ''}"
			onclick={() => (activeTab = 'trade')}
		>
			<span class="material-symbols-outlined">swap_horiz</span>
			Trade
			<MessageBadge storeTypes={['tradeNew']} />
		</button>
		<button
			class="tab-button {activeTab === 'exchange' ? 'active' : ''}"
			onclick={() => (activeTab = 'exchange')}
		>
			<span class="material-symbols-outlined">currency_exchange</span>
			Exchange
			<MessageBadge storeTypes={['depositNew']} />
		</button>
	</div>

	<div class="tab-content">
		{#if activeTab === 'exchange'}
			<ExchangeLogTable />
		{:else}
			<TradeLogTable />
		{/if}
	</div>
</div>

<style>
	.tab-container {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.tabs {
		display: flex;
		gap: 5px;
		margin-left: 10px;
	}

	.tab-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		transition: all 0.3s ease;
		border-radius: 8px 8px 0 0;
		font-weight: 700;
		position: relative;
	}

	.tab-button:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.05);
	}

	.tab-button.active {
		color: white;
		background: rgba(0, 0, 0, 0.2);
		position: relative;
	}
	.tab-button .material-symbols-outlined {
		font-size: 20px;
	}

	.tab-content {
		flex: 1;
		overflow: auto;
	}
</style>
