<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { menuList } from '$lib/fynx';
	import { goto } from '$app/navigation';
	import MessageBadge from '$lib/components/MessageBadge.svelte';
	import { isAdminStore } from '$lib/auth';

	let isMobile = $state(false);

	const checkMobile = () => {
		isMobile = window.innerWidth < 768;
	};

	// 초기 체크
	if (typeof window !== 'undefined') {
		checkMobile();
		window.addEventListener('resize', checkMobile);
	}

	const handleNavClick = async (href: string) => {
		if (href === '/adm' && !$isAdminStore) return;
		await goto(href);
	};
</script>

<nav class={isMobile ? 'bottom-nav' : 'side-nav'}>
	{#if !isMobile}
		<div class="logo-container">
			<img src="{base}/images/logoN.png" alt="로고" class="logo" />
		</div>
	{/if}

	{#each menuList as item}
		<div class="nav-item {item.href === '/adm' && !$isAdminStore ? 'hidden' : ''}">
			<button
				class={$page.url.pathname.startsWith(item.href) ? 'active' : ''}
				onclick={() => handleNavClick(item.href)}
			>
				<span class="material-symbols-outlined">{item.icon}</span>
				<span class="nav-text">{item.text}</span>
			</button>
			{#if item.href === '/office'}
				<MessageBadge storeTypes={['userMessage', 'userTradeNew', 'userCashNew']} />
			{/if}
			{#if item.href === '/adm'}
				<MessageBadge storeTypes={['tradeNew', 'depositNew']} />
			{/if}
		</div>
	{/each}
</nav>

<style>
	.hidden {
		display: none;
	}
	nav {
		z-index: 100;
	}
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		background: linear-gradient(to right, rgba(74, 94, 204, 0.9), rgba(67, 19, 126, 0.9));
		backdrop-filter: blur(10px);
		padding: 0;
		box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
	}

	.side-nav {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 200px;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		background: linear-gradient(to bottom, rgba(74, 94, 204, 0.9), rgba(67, 19, 126, 0.9));
		backdrop-filter: blur(10px);
		padding: 0 20px 20px; /* 상단 패딩 제거, 좌우 하단 패딩 유지 */
		box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
	}

	.logo-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px 0;
		width: 100%;
	}

	.logo {
		width: 100px; /* 사이드바 너비(200px)의 80% */
		height: auto;
		object-fit: contain;
	}
	.nav-item {
		position: relative;
	}
	.nav-item button {
		display: flex;
		align-items: center;
		color: var(--text-color);
		font-size: 0.9rem;
		transition: background-color 0.3s ease;
		background-color: transparent;
		border: none;
		cursor: pointer;
		width: 100%;
		height: 100%;
	}
	.bottom-nav .nav-item {
		flex: 1;
	}
	.bottom-nav .nav-item button {
		flex-direction: column;
		padding: 10px 0;
	}
	.bottom-nav .nav-item:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}
	.side-nav .nav-item {
		flex-direction: row;
		margin-bottom: 10px;
	}
	.side-nav .nav-item button {
		padding: 12px;
		border-radius: 8px;
	}
	.side-nav .nav-item button:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.nav-item button.active {
		background-color: rgba(255, 255, 255, 0.2);
	}

	.material-symbols-outlined {
		font-size: 24px;
		margin-right: 10px;
	}

	.bottom-nav .material-symbols-outlined {
		margin-bottom: 4px;
		margin-right: 0;
	}

	.bottom-nav .nav-text {
		font-size: 0.8rem;
	}
</style>
