<script lang="ts">
	import { user } from '$lib/auth';
	import { readMessage } from '$lib/message';
	import LogTable from '$lib/components/LogTable.svelte';
	import { formatDate } from '$lib';

	const userId = $user?.uid ?? '';
</script>

<LogTable
	logTitle="Message Log"
	iconTitle="mail"
	collectionName="messageLogs"
	status={{
		condition: (item) => (item.read === false ? 'pending' : '')
	}}
	queryOptions={{
		whereConditions: [{ field: 'userId', operator: '==', value: userId }],
		orderByField: 'createdAt',
		orderDirection: 'desc'
	}}
	useItemClick={true}
	onItemClick={async (item) => {
		await readMessage(item.id, userId);
	}}
	leads={[
		{
			key: 'createdAt',
			type: 'html',
			format: async (value, item) =>
				`<div class="date flex align-middle gap-2"><span class="material-symbols-outlined">${!item.read ? 'mail' : 'drafts'}</span> ${formatDate(value, true)}</div>`
		}
	]}
	columns={[{ key: 'message', type: 'text' }]}
	itemsPerPage={20}
/>
