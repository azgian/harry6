<!-- <script lang="ts">
	import { type TradeLog } from '$lib/types/trade';
	import { formatDate } from '$lib';
	import { TradeService } from '$lib/services/tradeService';

	const tradeService = new TradeService();

	type Props = {
		log: TradeLog;
	};
	let { log }: Props = $props();

	let date = $state(formatDate(log.createdAt, true));
</script>

<div class="log-container {log.status.accepted && !log.status.completed ? 'status-pending' : ''}">
	<div class="lead">
		<span class="date">{date}</span>
	</div>
</div>

<style>
	.log-container {
		display: flex;
		flex-direction: column;
	}
	.status-pending {
		background-color: rgba(10, 10, 50, 0.5);
	}
	.lead {
		display: flex;
		align-items: center;
	}
	.date {
		width: 95px;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.5);
	}
	.user {
		width: 100px;
		max-width: 100px;
		min-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		background-color: rgba(255, 255, 255, 0.3);
		color: #fff;
		text-align: center;
		border-radius: 5px;
		font-size: 0.9rem;
	}
	.isIcon {
		display: flex;
		align-items: center;
		gap: 1px;
	}
</style> -->
