<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import MessageBadge from './MessageBadge.svelte';
	import type { CounterType } from '$lib/message';

	type TabItem = {
		label: string;
		href: string;
		messageStoreType?: CounterType[];
	};

	const { tabItems = [] as TabItem[] } = $props();

	const isActive = (href: string) => href === $page.url.pathname;
	const handleClick = (href: string) => goto(href);
</script>

<div class="section-tab" role="tablist">
	{#each tabItems as tab, index}
		<button
			class="section-tab-item"
			class:active={isActive(tab.href)}
			class:first={index === 0}
			class:last={index === tabItems.length - 1}
			onclick={() => handleClick(tab.href)}
			role="tab"
			aria-selected={isActive(tab.href)}
			aria-controls={tab.href.replace('/', '-')}
		>
			{tab.label}
			{#if tab.messageStoreType?.length}
				<div class="message-badge">
					<MessageBadge storeTypes={tab.messageStoreType} />
				</div>
			{/if}
		</button>
	{/each}
</div>

<style>
	.section-tab {
		display: flex;
		justify-content: center;
		align-items: center;
		margin: 5px 0 20px;
	}
	.section-tab-item {
		border: 1px solid #fff;
		background-color: transparent;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		padding: 8px 16px;
		margin-bottom: 20px;
		border-right: none;
		color: #fff;
		position: relative;
		transition: background-color 0.2s ease;
	}
	.section-tab-item.last {
		border-right: 1px solid #fff;
		border-top-right-radius: 25px;
		border-bottom-right-radius: 25px;
	}
	.section-tab-item.first {
		border-top-left-radius: 25px;
		border-bottom-left-radius: 25px;
	}
	.section-tab-item.active {
		background-color: #fff;
		color: var(--primary-color-light);
	}
	.section-tab-item:not(.active):hover {
		background-color: var(--primary-color-light);
	}
	.message-badge {
		position: absolute;
		right: 0px;
		top: 0px;
	}
</style>
