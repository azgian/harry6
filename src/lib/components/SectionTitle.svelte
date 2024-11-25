<script lang="ts">
	import { page } from '$app/stores';
	import { menuList } from '$lib/fynx';
	import SectionTab from './SectionTab.svelte';

	const formatTitle = (path: string, query: URLSearchParams): string => {
		const parts = path.split('/').filter(Boolean);
		let formattedParts = parts
			.slice(0, 2)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1));

		const sortParam = query.get('sort');
		if (sortParam && formattedParts.length < 2) {
			formattedParts.push(sortParam.charAt(0).toUpperCase() + sortParam.slice(1));
		}

		return formattedParts.join(' > ');
	};

	const currentMenuItem = $derived(
		menuList.find((item) => $page.url.pathname.startsWith(item.href))
	);

	const formattedTitle = $derived(formatTitle($page.url.pathname, $page.url.searchParams));

	const showTitle = $derived(
		$page.url.pathname !== '/' && $page.params.path !== 'api/oauth2-redirect'
	);
</script>

{#if showTitle}
	<div class="section-title-container" id="sectionTitle">
		<div class="section-title">
			{#if currentMenuItem}
				<span class="material-symbols-outlined">{currentMenuItem.icon}</span>
			{/if}
			<strong>{formattedTitle}</strong>
		</div>
		<SectionTab />
	</div>
{/if}

<style>
	.section-title-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}
	.section-title {
		display: flex;
		justify-content: start;
		align-items: center;
		padding: 10px 0;
		gap: 10px;
	}
	.section-title strong {
		font-size: 1.25rem;
		font-weight: bold;
	}
</style>
