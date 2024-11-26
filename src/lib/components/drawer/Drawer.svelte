<script lang="ts">
	import { fly } from 'svelte/transition';
	import { drawer } from './';
	import type { DrawerPosition } from './';
	import MyInfo from '$lib/components/section/MyInfo.svelte';

	type Props = {
		componentName?: string;
		isOpen?: boolean;
		position?: DrawerPosition;
	};
	let { componentName = 'MyInfo', isOpen = false, position = 'right' }: Props = $props();

	const components = {
		MyInfo
	};

	let Component = $derived(components[componentName as keyof typeof components]);
</script>

{#if isOpen}
	<div class="drawer-overlay" transition:fly={{ duration: 200, opacity: 0 }}>
		<div
			class="drawer {position}"
			transition:fly={{
				duration: 300,
				x: position === 'left' ? -300 : 300
			}}
		>
			<Component />
			<button class="close-button" onclick={() => drawer.hideDrawer()}>
				<span class="material-symbols-outlined">close</span>
			</button>
		</div>
	</div>
{/if}

<style>
	.drawer-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.3);
		z-index: 1000;
	}
	.drawer {
		position: fixed;
		top: 0;
		width: 400px;
		max-width: 100%;
		height: 100%;
		background: linear-gradient(to bottom, var(--gradient-top), var(--gradient-bottom));
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
		padding: 1rem;
		overflow-y: auto;
		z-index: 1100;
	}
	.left {
		left: 0;
	}
	.right {
		right: 0;
	}
	.close-button {
		position: absolute;
		top: 0px;
		right: 0px;
		background-color: rgba(0, 0, 0, 0.3);
		border-radius: 0 10px 0 10px;
	}
	.close-button span {
		font-size: 3.5rem;
		color: rgba(255, 255, 255, 0.3);
	}
</style>
