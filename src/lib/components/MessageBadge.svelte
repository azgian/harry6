<script lang="ts">
	import { derived } from 'svelte/store';
	import { counters, type CounterType } from '$lib/message';
	import { cubicOut } from 'svelte/easing';
	import { scale } from 'svelte/transition';

	type Props = {
		storeTypes: CounterType[];
	};

	let { storeTypes = [] }: Props = $props();

	const totalCount = derived(
		storeTypes.map((type) => counters[type]),
		($values) => $values.reduce((total, current) => total + (current || 0), 0)
	);

	let count = $state(0);

	$effect(() => {
		count = $totalCount;
	});
</script>

{#if count > 0}
	<span
		class="message-badge"
		role="status"
		aria-label={`${count}개의 새로운 알림`}
		transition:scale={{ duration: 200, easing: cubicOut }}
	>
		{count}
	</span>
{/if}

<style>
	.message-badge {
		position: absolute;
		top: 2px;
		right: 4px;
		border-radius: 50%;
		width: 20px;
		height: 20px;
		background-color: tomato;
		color: white;
		box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 0.8rem;
	}
</style>
