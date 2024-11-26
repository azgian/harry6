<script lang="ts">
	import LogTable from '$lib/components/LogTable.svelte';
</script>

<LogTable
	collectionName="users"
	logTitle="Users"
	iconTitle="group"
	queryOptions={{
		orderByField: 'createdAt',
		orderDirection: 'desc'
	}}
	leads={[
		{
			key: 'createdAt',
			type: 'date'
		},
		{
			key: 'displayName',
			type: 'text',
			className: 'bg-black text-white px-2 rounded-md opacity-50',
			format: (value) => value || 'no name'
		}
	]}
	columns={[
		{
			key: 'email',
			type: 'isIcon',
			format: (value) =>
				value ? '<span class="material-symbols-outlined">mail</span> ' + value : ''
		},
		{
			key: 'phone',
			type: 'isIcon',
			format: (value) =>
				value ? '<span class="material-symbols-outlined">smartphone</span> ' + value : ''
		},
		{
			key: 'assets.cash',
			type: 'text',
			className: 'isIcon',
			format: (value) =>
				value
					? '<span class="material-symbols-outlined">credit_card</span> ' +
						value?.toLocaleString('ko-KR')
					: ''
		}
	]}
	itemsPerPage={20}
/>
