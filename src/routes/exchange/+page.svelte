<script lang="ts">
	import { scale, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Button from '$lib/components/Button.svelte';
	import { deviceTypeStore } from '$lib/stores';
	import LoaderBox from '$lib/components/LoaderBox.svelte';
	import { toast } from '$lib/toast';
	import { setCommaInput } from '$lib';
	import { user } from '$lib/auth';
	import { db } from '$lib/firebase';
	import { collection, Timestamp, writeBatch } from 'firebase/firestore';
	import type { TransactionStatus } from '$lib/auth';
	import { doc } from 'firebase/firestore';
	import { sendMessage } from '$lib/message';

	// 기본 상태
	const initAmount = 0;
	let requestAmount = $state(initAmount);
	let showPay = $state(false);
	let errorMessage = $state('');
	let isLoading = $state(false);
	let disabled = $state(false);

	// 상수
	// const amountButtons = [
	// 	{ amount: 10000, image: '/images/btn_char_1.png', label: '1만' },
	// 	{ amount: 100000, image: '/images/btn_char_10.png', label: '10만' },
	// 	{ amount: 500000, image: '/images/btn_char_50.png', label: '50만' },
	// 	{ amount: 1000000, image: '/images/btn_char_100.png', label: '100만' }
	// ];

	// 이벤트 핸들러
	const handleAmountClick = (value: number) => {
		requestAmount += value;
	};

	const handleReset = () => {
		requestAmount = initAmount;
	};

	const handleTogglePay = () => {
		showPay = !showPay;
	};

	const confirmExchange = () => {
		toast.showToast('카카오페이로 송금하셨습니까?', 'info', null, true, requestExchange);
	};

	const requestExchange = async () => {
		if (!$user?.uid) {
			toast.showToast('로그인이 필요합니다.', 'error', 1500, false);
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

			// 5. 알림 전송
			await sendMessage(
				$user.uid,
				'충전신청 알림',
				`${requestAmount.toLocaleString('ko-KR')}원 충전이 신청되었습니다.`,
				'deposit'
			);

			toast.showToast(
				'충전신청이 되었습니다.<br />오피스에서 전체 내역을 확인하세요.',
				'success',
				5000,
				false
			);

			// 초기화
			requestAmount = initAmount;
			showPay = false;
		} catch (error) {
			console.error('Exchange request error:', error);
			const errorMessage =
				error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
			toast.showToast(`충전신청 실패: ${errorMessage}`, 'error', 3000, false);
		} finally {
			isLoading = false;
			disabled = false;
		}
	};
	// $effect(() => {
	// 	if (requestAmount > 2_000_000) {
	// 		errorMessage = '1회 최대 충전 금액은 200만원입니다.';
	// 		disabled = true;
	// 	} else if (requestAmount < 10000) {
	// 		errorMessage = `최소 충전 금액은 ${initAmount.toLocaleString('ko-KR')}원입니다.`;
	// 		disabled = true;
	// 	} else {
	// 		errorMessage = '';
	// 		disabled = false;
	// 	}
	// });
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
			<!-- <span>송금 1회 200만원, 하루 최대 1000만원</span> -->
		</div>

		{#if showPay}
			<div class="kakaopay-container" transition:scale={{ duration: 300, easing: cubicOut }}>
				<!-- {#if $deviceTypeStore === 'desktop'} -->
				<div class="kakaopay-content">
					<img src="/images/bankAccount.jpg" alt="bankAccount" />
				</div>
				<!-- {:else}
					<a href="https://qr.kakaopay.com/Ej7qWmp84" target="_blank" class="kakaopay-link">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 208 191.94" class="kakao-icon">
							<path
								d="M104 0C46.56 0 0 36.71 0 82c0 29.28 19.47 55 48.75 69.48-1.59 5.49-10.24 35.34-10.58 37.69 0 0-.21 1.76.93 2.43a3.14 3.14 0 0 0 2.48.15c3.28-.46 38-24.81 44-29A131.56 131.56 0 0 0 104 164c57.44 0 104-36.71 104-82S161.44 0 104 0z"
								fill="#3A1D1D"
								fill-rule="evenodd"
							/>
						</svg>
						https://qr.kakaopay.com/Ej7qWmp84
					</a>
				{/if} -->
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
			<!-- <div class="amount-buttons">
				{#each amountButtons as button}
					<button
						type="button"
						class="amount-button"
						onclick={() => handleAmountClick(button.amount)}
					>
						<img src={button.image} alt={button.label} />
					</button>
				{/each}
			</div> -->
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

	.kakao-pay-button span {
		font-size: 0.85rem;
		background-color: rgba(0, 0, 0, 0.3);
		padding: 5px 15px;
		border-radius: 15px;
		margin-top: 5px;
		text-align: center;
	}

	.kakaopay-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: 5px auto 20px;
		transition: height 300ms cubic-bezier(0.25, 0.1, 0.25, 1);
	}

	.kakaopay-content {
		background-color: #fff;
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

	.amount-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		justify-content: center;
		margin: 0 auto 20px;
		max-width: 400px;
		width: 100%;
	}

	.amount-button {
		background-color: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		width: calc(50% - 5px);
		max-width: 150px;
		height: auto;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.amount-button img {
		width: 100%;
		height: auto;
		object-fit: contain;
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

	.kakaopay-link {
		align-items: center;
		justify-content: center;
		background-color: #ffe812;
		color: #3a1d1d;
		text-decoration: none;
		padding: 10px 15px;
		border-radius: 6px;
		margin-top: 15px;
		font-weight: bold;
		transition: background-color 0.3s;
	}

	.kakaopay-link:hover {
		background-color: #ffd800;
	}

	.kakao-icon {
		width: 24px;
		height: 24px;
		margin-right: 8px;
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

		.kakaopay-link {
			display: flex;
			width: 100%;
			font-size: 0.8rem;
		}
	}
</style>
