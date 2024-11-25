<script lang="ts">
	import Button from './Button.svelte';
	let { orderType, isLoadingSB = false, disabledSB = false, setAction, textSB = '' } = $props();

	const buttonStyle = $derived(
		`width:150px; ${
			orderType === 'sell'
				? 'background: linear-gradient(145deg, #d32f2f, #f44336);'
				: 'background: linear-gradient(145deg, #1976d2, #2196f3);'
		}`
	);
	const textB5 = $derived(orderType === 'sell' ? '판매' : '구매');
</script>

<Button
	text={textB5 + (textSB ? ` ${textSB}` : '')}
	isLoading={isLoadingSB}
	disabled={disabledSB}
	onClick={setAction as () => void}
	style={buttonStyle}
/>
