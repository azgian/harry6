<script lang="ts">
	import '../app.css';
	import ResponsiveNav from '$lib/components/ResponsiveNav.svelte';
	import TopUserBar from '$lib/components/TopUserBar.svelte';
	import SectionTitle from '$lib/components/SectionTitle.svelte';
	import { page } from '$app/stores';
	import { deviceTypeStore } from '$lib/stores';
	import { getDeviceType } from '$lib';
	import Toast from '$lib/components/toast/Toast.svelte';
	import { toast } from '$lib/components/toast';
	import { user } from '$lib/auth';
	import { goto } from '$app/navigation';
	import type { LayoutData } from './+layout';
	import { refreshCoinPriceLiveStore, resetDataInitialization } from '$lib/coinData';
	import ChartPrice from '$lib/components/ChartPrice.svelte';
	import Drawer from '$lib/components/drawer/Drawer.svelte';
	import { drawer } from '$lib/components/drawer';
	import { initializeCounters } from '$lib/message/service';
	import { setContext } from 'svelte';
	import { counters } from '$lib/message/stores';

	let { children } = $props<{ data: LayoutData }>();
	let showNav = $state(true);

	// 디바이스 타입은 한 번만 설정
	deviceTypeStore.set(getDeviceType());

	//차트 코드
	const initializeData = async () => {
		try {
			await refreshCoinPriceLiveStore.startUpdating();
		} catch (error) {
			console.error('데이터 초기화 중 오류 발생:', error);
		}
	};

	const cleanupData = () => {
		resetDataInitialization();
	};

	// 메시지 서비스 초기화
	const initializeMessage = () => {
		try {
			return initializeCounters();
		} catch (error) {
			console.error('메시지 서비스 초기화 실패:', error);
		}
	};

	$effect.root(() => {
		const messageCleanup = initializeMessage();
		initializeData();

		return () => {
			messageCleanup?.();
			cleanupData();
		};
	});

	// 라우팅 처리
	$effect(() => {
		if ($user) {
			if ($page.url.pathname === '/') {
				goto('/market');
			}
		} else {
			if ($page.url.pathname !== '/') {
				goto('/');
			}
		}
	});

	// 네비게이션 표시 여부
	$effect(() => {
		showNav = $page.url.pathname !== '/';
	});

	// 최상위 레이아웃에서 카운터 컨텍스트 설정
	setContext('messageCounters', counters);
</script>

<div class="layout">
	{#if showNav && $user}
		<header class="top-bar">
			<TopUserBar />
		</header>
	{/if}
	<main class:has-nav={showNav && $user}>
		<div class="content">
			<SectionTitle />
			<div class="page-container">
				<ChartPrice symbol="USDT_KRW" />
				{@render children()}
			</div>
		</div>
	</main>
	{#if showNav && $user}
		<footer class="bottom-nav">
			<ResponsiveNav />
		</footer>
	{/if}
</div>

<Drawer componentName={$drawer.componentName} isOpen={$drawer.isOpen} position={$drawer.position} />

<Toast
	message={$toast.message}
	type={$toast.type}
	duration={$toast.duration}
	onConfirm={$toast.onConfirm}
/>

<!-- onConfirm={toast.handleConfirm} -->

<!-- onCancel={toast.handleCancel} -->

<style>
	.layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.top-bar {
		position: sticky;
		top: 0;
		z-index: 1000;
		background-color: #fff; /* 또는 원하는 배경색 */
	}

	main {
		flex: 1;
		padding: 0 15px;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}

	.content {
		max-width: 800px;
		margin: 0 auto;
		padding-bottom: 250px;
	}

	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		background-color: #fff; /* 또는 원하는 배경색 */
	}

	@media (min-width: 768px) {
		main.has-nav {
			padding-right: 220px;
		}

		.bottom-nav {
			top: 0;
			right: 0;
			left: auto;
			width: 200px;
		}

		.content {
			padding-bottom: 150px;
		}
	}
</style>
