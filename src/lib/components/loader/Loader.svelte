<script lang="ts">
	import Dots from '$lib/components/loader/Dots.svelte';
	import Bars from '$lib/components/loader/Bars.svelte';
	import Circles from '$lib/components/loader/Circles.svelte';

	interface Props {
		type?: 'dots' | 'bars' | 'circles';
		size?: number;
		color?: string;
	}

	let { type = 'circles', size = 24, color = 'white' }: Props = $props();

	const loaderComponents = {
		dots: Dots,
		bars: Bars,
		circles: Circles
	} as const;

	let Component = $derived(loaderComponents[type as keyof typeof loaderComponents] || Dots);
</script>

{#if Component}
	<Component {size} {color} />
{/if}
