<script lang="ts">
	import Loader from '$lib/components/loader/Loader.svelte';
	type Props = {
		type?: 'bars' | 'circles' | 'dots';
		size?: number;
		boxWidth?: string;
		boxHeight?: string;
	};
	let { type = 'bars', size = 50, boxWidth = '100%', boxHeight = '450px' }: Props = $props();
</script>

<div class="flex items-center justify-center" style="width: {boxWidth}; height: {boxHeight};">
	<Loader {type} {size} />
</div>
