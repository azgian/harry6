<script lang="ts">
	import TradeLogTable from './TradeLogTable.svelte';
	import CashLog from './CashLog.svelte';
	import MessageBadge from '$lib/components/MessageBadge.svelte';

	let activeTab = $state('trade');
</script>

<div class="tab-container">
	<div class="tabs">
		<button
			class="tab-button {activeTab === 'trade' ? 'active' : ''}"
			onclick={() => (activeTab = 'trade')}
		>
			<span class="material-symbols-outlined">receipt_long</span>
			Trade
			<MessageBadge storeTypes={['userTradeNew']} />
		</button>
		<button
			class="tab-button {activeTab === 'cash' ? 'active' : ''}"
			onclick={() => (activeTab = 'cash')}
		>
			<span class="material-symbols-outlined">credit_card</span>
			Cash
			<MessageBadge storeTypes={['userCashNew']} />
		</button>
	</div>

	<div class="tab-content">
		{#if activeTab === 'trade'}
			<TradeLogTable />
		{:else if activeTab === 'cash'}
			<CashLog />
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
