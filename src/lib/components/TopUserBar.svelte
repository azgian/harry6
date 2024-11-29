<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from '$lib/components/toast';
	import Button from '$lib/components/Button.svelte';
	import { getAuth, signOut } from 'firebase/auth';
	import { user } from '$lib/auth';

	const auth = getAuth();

	let email = $derived($user?.email || '');
	let _displayName = $derived($user?.displayName || email.split('@')[0] + '@');

	const logout = async () => {
		try {
			await signOut(auth);
			goto('/');
			toast.show('로그아웃 되었습니다.', 'success', 1500);
		} catch (error) {
			console.error('로그아웃 에러:', error);
			toast.show('로그아웃 중 오류가 발생했습니다.', 'error', 1500);
		}
	};
</script>

<div class="top-nav-container">
	<div class="top-nav">
		<div class="user-info">
			<div class="user-name-info">
				<span class="material-symbols-outlined">account_circle</span>
				{_displayName}
			</div>
			{#if $user?.assets?.cash && $user?.assets?.cash > 0}
				<div class="user-point-info">
					<span class="material-symbols-outlined">credit_card</span>
					{$user?.assets?.cash.toLocaleString('ko-KR')}
				</div>
			{/if}
		</div>
		<div class="logout-button">
			<Button
				onClick={() => {
					toast.show('로그아웃 하시겠습니까?', 'info', null, logout);
				}}
				icon="logout"
			/>
		</div>
	</div>
</div>

<style>
	.top-nav-container {
		position: sticky;
		top: 0;
		left: 0;
		width: 100%;
		height: 50px;
		display: flex;
		justify-content: center;
		background: linear-gradient(
			to right,
			rgba(54, 74, 184, 0.95),
			rgba(47, 0, 106, 0.95)
		); /* 진한 배경색 추가 */
		backdrop-filter: blur(10px); /* 블러 효과 추가 */
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* 그림자 효과 추가 */
		z-index: 10;
	}
	.top-nav {
		height: 100%;
		width: 100%;
		max-width: 800px;
		display: flex;
		align-items: center;
		color: var(--text-color); /* 텍스트 색상 설정 */
		padding: 0; /* 좌우 패딩 추가 */
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.user-info {
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.user-name-info {
		display: flex;
		align-items: center;
		color: aqua;
		font-size: 0.95rem;
		gap: 5px;
		padding-left: 10px;
	}
	.user-point-info {
		display: flex;
		align-items: center;
		font-size: 0.8rem;
		gap: 2.5px;
	}
	.logout-button {
		background-color: transparent;
		border: none;
		color: var(--text-color);
		font-size: 1.5rem;
	}
	@media (min-width: 768px) {
		.top-nav-container {
			width: calc(100% - 200px);
		}
	}
</style>
