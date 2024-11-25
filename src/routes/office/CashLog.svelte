<script lang="ts">
	import LogTable from '$lib/components/LogTable.svelte';
	import { user } from '$lib/auth';
	const userId = $user?.uid;

	let itemsPerPage = $state(20);
</script>

<LogTable
	status={{
		condition: (item) => {
			switch (item.status) {
				case 'requested':
					return 'pending';
				case 'pending':
					return 'pending';
				case 'confirmed':
					return 'pending';
				case 'completed':
					return '';
				case 'rejected':
				case 'cancelled':
					return '';
				case 'failed':
					return 'error';
				default:
					return '';
			}
		}
	}}
	collectionName="cashLogs"
	queryOptions={{
		whereConditions: [{ field: 'userId', operator: '==', value: userId }],
		orderByField: 'createdAt',
		orderDirection: 'desc'
	}}
	leads={[
		{ key: 'createdAt', type: 'date' },
		{
			key: 'type',
			type: 'text',
			format: (value) => {
				switch (value) {
					case 'deposit':
						return '충전';
					case 'withdraw':
						return '출금';
					case 'trade':
						return '거래';
					default:
						return value;
				}
			},
			className: (value) => {
				switch (value) {
					case 'deposit':
						return 'bg-blue-500 text-white px-2 rounded-md';
					case 'withdraw':
						return 'bg-red-500 text-white px-2 rounded-md';
					case 'trade':
						return 'bg-green-500 text-white px-2 rounded-md';
					default:
						return '';
				}
			}
		}
	]}
	columns={[
		{
			key: 'amount',
			type: 'currency',
			className: 'mr-3',
			format: (value) => {
				return `${value.toLocaleString('ko-KR')}`;
			}
		},
		{
			key: 'description',
			type: 'text',
			className: 'opacity-55 text-gray'
		},
		{
			key: 'status',
			type: 'text',
			className: 'ml-1',
			format: (status: string) =>
				({
					requested: '신청',
					pending: '대기',
					confirmed: '확인',
					completed: '완료',
					rejected: '거절',
					cancelled: '취소',
					failed: '실패'
				})[status] || status
		}
	]}
	tails={[
		{
			key: 'assetsCash',
			type: 'number',
			format: (value) =>
				`<div class="flex items-center gap-1"><span class="material-symbols-outlined">credit_card</span> ${value.toLocaleString('ko-KR')}</div>`
		}
	]}
	{itemsPerPage}
/>
