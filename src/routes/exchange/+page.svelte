<script lang="ts">
	import { scale, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Button from '$lib/components/Button.svelte';
	import LoaderBox from '$lib/components/LoaderBox.svelte';
	import { toast } from '$lib/components/toast';
	import { setCommaInput } from '$lib';
	import { user } from '$lib/auth';
	import { db } from '$lib/firebase';
	import { collection, Timestamp, writeBatch } from 'firebase/firestore';
	import type { TransactionStatus } from '$lib/auth';
	import { doc } from 'firebase/firestore';

	// 기본 상태
	const initAmount = 0;
	let requestAmount = $state(initAmount);
	let showPay = $state(false);
	let errorMessage = $state('');
	let isLoading = $state(false);
	let disabled = $state(false);

	const handleReset = () => {
		requestAmount = initAmount;
	};

	const handleTogglePay = () => {
		showPay = !showPay;
	};

	const confirmExchange = () => {
		if (!requestAmount) {
			toast.show('충전 금액을 입력해주세요.', 'error', 1500);
			return;
		}
		toast.show('지정계좌로 송금하셨습니까?', 'info', null, requestExchange);
	};

	const requestExchange = async () => {
		if (!$user?.uid) {
			toast.show('로그인이 필요합니다.', 'error', 1500);
			return;
		}

		try {
			isLoading = true;
			disabled = true;
			const batch = writeBatch(db);
			const now = Timestamp.now();

			// 1. cashLog 문서 생성
			const cashLogRef = doc(collection(db, 'cashLogs'));
			const cashLogData = {
				id: cashLogRef.id,
				userId: $user.uid,
				amount: requestAmount,
				type: 'deposit',
				status: 'requested' as TransactionStatus,
				relatedId: '',
				description: '충전신청',
				assetsCash: $user.assets?.cash || 0,
				createdAt: now,
				updatedAt: now
			};

			// 2. 사용자 문서 업데이트
			const userRef = doc(db, 'users', $user.uid);
			batch.update(userRef, {
				recentActivity: {
					type: 'deposit',
					amount: requestAmount,
					timestamp: now,
					description: '충전신청',
					status: 'requested' as TransactionStatus,
					relatedId: cashLogRef.id
				},
				'assets.lastUpdated': now
			});

			// 3. cashLog 문서 생성
			batch.set(cashLogRef, cashLogData);

			// 4. 모든 작업을 한번에 실행
			await batch.commit();

			toast.show('충전신청이 되었습니다.<br />오피스에서 전체 내역을 확인하세요.', 'success', 5000);

			// 초기화
			requestAmount = initAmount;
			showPay = false;
		} catch (error) {
			console.error('Exchange request error:', error);
			const errorMessage =
				error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
			toast.show(`충전신청 실패: ${errorMessage}`, 'error', 3000);
		} finally {
			isLoading = false;
			disabled = false;
		}
	};
</script>

<div class="exchange-container" transition:slide={{ duration: 300, easing: cubicOut }}>
	<strong>캐시교환권 충전 신청</strong>
	<div class="main-content">
		<div class="kakao-pay-button">
			<Button
				onClick={handleTogglePay}
				text="송금충전 문의"
				icon="phone"
				style="font-weight: 600; background-color: #ffe812; width: 250px; color: #3A1D1D;"
			/>
		</div>

		{#if showPay}
			<div class="kakaopay-container" transition:scale={{ duration: 300, easing: cubicOut }}>
				<div class="kakaopay-content">
					<img src="/images/bankAccount2.jpg" alt="bankAccount" class="rounded-lg" />
				</div>
			</div>
		{/if}

		<div class="input-wrapper">
			<div class="input-container">
				<input
					placeholder="충전 금액"
					value={requestAmount.toLocaleString('ko-KR') || ''}
					oninput={(e) => {
						requestAmount = setCommaInput(e);
					}}
					type="text"
					inputmode="numeric"
					pattern="[0-9]*"
				/>
				<button onclick={confirmExchange} {disabled} class="request-button">
					{#if isLoading}
						<LoaderBox type="dots" boxHeight="10px" />
					{:else}
						충전 신청
					{/if}
				</button>
			</div>
			<div class="message-box">
				{#if errorMessage}
					<span class="error">{errorMessage}</span>
				{/if}
			</div>
		</div>

		<div class="amount-selection">
			<div class="reset-button">
				<Button onClick={handleReset} text="금액 초기화" className="outline" />
			</div>
		</div>
	</div>
</div>

<style>
	.exchange-container {
		margin: 0 auto;
		background-color: rgba(0, 0, 0, 0.1);
		border-radius: 8px;
		padding: 20px;
	}
	.main-content {
		padding: 20px;
		border-radius: 8px;
	}

	.kakao-pay-button {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.kakaopay-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: 5px auto 20px;
		transition: height 300ms cubic-bezier(0.25, 0.1, 0.25, 1);
	}

	.kakaopay-content {
		/* background-color: #fff; */
		padding: 5px;
		border-radius: 15px;
		width: 250px;
		max-width: 100%;
	}
	.kakaopay-content img {
		width: 100%;
		height: auto;
	}
	.amount-selection {
		margin-top: 20px;
	}
	.input-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		max-width: 350px;
		margin: 20px auto 0;
		gap: 5px;
	}
	.input-container {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}
	.input-container input {
		flex-grow: 1;
		min-width: 0;
		height: 40px;
		font-size: 1.5rem;
		border-radius: 10px 0 0 10px;
	}
	.request-button {
		font-size: 1rem;
		height: 40px;
		min-width: 100px;
		border: none;
		border-radius: 0 10px 10px 0;
		background-color: var(--primary-color);
		color: #fff;
	}
	.request-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.message-box {
		font-size: 0.85rem;
		height: 1rem;
		text-align: center;
	}
	.error {
		color: #fa8c6a;
	}
	.reset-button {
		display: flex;
		justify-content: center;
		margin-top: 10px;
	}

	@media (max-width: 510px) {
		.input-container {
			flex-direction: column;
		}

		.input-container input {
			width: 100%;
			margin-bottom: 10px;
			border-radius: 10px;
		}

		.input-container button {
			width: 100%;
			border-radius: 10px;
		}
	}
</style>
