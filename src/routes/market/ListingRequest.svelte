<script lang="ts">
	import ButtonSB from '$lib/components/ButtonSB.svelte';
	import { priceHistoryStore } from '$lib/coinData';
	import { getCoinSymbol } from '$lib/coinsData';
	import type { InputValues } from '$lib/types';
	import { alertEmptyValue, setCommaInput } from '$lib';
	import { goto } from '$app/navigation';
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { toast } from '$lib/components/toast';
	import { userWalletsStore } from '$lib/stores/userStore';
	import { user } from '$lib/auth';
	import { networkFeeList } from '$lib/fynx';
	import type { Listing, TradeLog } from '$lib/types/trade';
	import { db } from '$lib/firebase';
	import { doc, writeBatch, increment, Timestamp, collection } from 'firebase/firestore';
	import type { TransactionStatus } from '$lib/auth';
	import { drawer } from '$lib/components/drawer';

	type Props = {
		listing: Listing | null;
	};

	let { listing }: Props = $props();

	let orderType = $state(listing?.orderType);
	let requestOrderType = $state<'sell' | 'buy'>(orderType === 'sell' ? 'buy' : 'sell');

	let walletAddress = $state('');
	let network = $state('');
	let networkFee = $state(0);

	let isLoadingSB = $state(false);
	let errorMessage = $state('');
	let disabledSB = $state(false);
	let reqAmount = $state(listing?.minAmount || 0);

	let listingId = $state(listing?.docId || '');
	let amount = $state(listing?.amount || 0);
	let minAmount = $state(listing?.minAmount || 0);
	let fee = $state(listing?.userFee || 0);
	let listingTitle = $state(requestOrderType === 'sell' ? '판매' : '구매');
	let calcTitle = $state(requestOrderType === 'sell' ? '수령' : '지불');

	let symbol = $state(getCoinSymbol(listing?.coinId || '') || 'USDT_KRW');
	let priceData = $state($priceHistoryStore[symbol] || {});
	let currentPrice = $state(
		Object.values(priceData).length > 0
			? Object.values(priceData)[Object.values(priceData).length - 1].h
			: 0
	);
	let price = $state(currentPrice);
	let networkFeeKrw = $derived(networkFee ? networkFee * price : 0);
	let totalPrice = $derived(price * reqAmount);
	let resultFeeAmount = $derived(
		(totalPrice * fee) / 100 + (requestOrderType === 'buy' ? networkFeeKrw : 0)
	);
	let finalPrice = $derived(
		Math.round(
			requestOrderType === 'sell' ? totalPrice - resultFeeAmount : totalPrice + resultFeeAmount
		)
	);

	const selectedWallet = $derived($userWalletsStore.find((w) => w.network === network));
	$effect(() => {
		networkFee = networkFeeList.find((item) => item.network === network)?.fee || 0;
		walletAddress = selectedWallet?.address || '';
	});

	const confirmTrade = () => {
		if (isLoadingSB) return;
		const inputValuesRequired: InputValues[] = [
			{ name: '지갑주소', value: walletAddress },
			{ name: '수량', value: reqAmount }
		];
		if (!alertEmptyValue(inputValuesRequired)) return;
		const toastMessage =
			'이 서비스는<br />위법적 목적으로<br />제공되지 않습니다.<br /><br />거래를 신청하시겠습니까?';
		toast.showToast(toastMessage, 'primary', null, true, requestTrade);
	};

	const requestTrade = async () => {
		if (isLoadingSB) return;
		if (!$user?.uid) {
			toast.showToast('로그인이 필요합니다.', 'error', 1500, false);
			return;
		}

		const batch = writeBatch(db);
		const now = Timestamp.now();

		try {
			isLoadingSB = true;

			// 1. 거래 문서 참조 생성
			const tradeRef = doc(collection(db, 'tradeLogs'));
			const tradeData: TradeLog = {
				id: tradeRef.id,
				userId: $user.uid,
				listingId,
				cashLogId: '',
				coinId: listing?.coinId || '',
				orderType: requestOrderType,
				price,
				reqAmount,
				totalPrice,
				fee,
				networkFee: networkFee || 0,
				network,
				walletAddress,
				finalPrice,
				status: 'requested' as TransactionStatus, // 초기 상태는 'requested'
				createdAt: now,
				updatedAt: now
			};

			// 2. 거래 문서 생성 설정
			batch.set(tradeRef, tradeData);

			// 3. 구매 시 사용자 자산 홀딩 설정
			if (requestOrderType === 'buy') {
				const userRef = doc(db, 'users', $user.uid);
				batch.update(userRef, {
					'assets.cash': increment(-finalPrice),
					'assets.lastUpdated': now,
					recentActivity: {
						type: 'trade',
						amount: -finalPrice,
						timestamp: now,
						description: `${listing?.coinId || ''} 구매 신청`,
						status: 'requested' as TransactionStatus, // 거래 상태와 동일하게 'requested'
						relatedId: tradeRef.id
					}
				});

				// cashLog 문서도 batch에 포함
				const cashLogRef = doc(collection(db, 'cashLogs'));
				const cashLogData = {
					id: cashLogRef.id,
					userId: $user.uid,
					assetsCash: $user.assets?.cash - finalPrice || 0,
					amount: finalPrice * -1,
					type: 'trade',
					status: 'requested' as TransactionStatus, // 캐시로그도 'requested'로 시작
					tradeId: tradeRef.id,
					description: '거래신청 홀딩',
					createdAt: now
				};
				batch.set(cashLogRef, cashLogData);

				// tradeLog에 cashLogId 추가하여 업데이트
				tradeData.cashLogId = cashLogRef.id;
				batch.set(tradeRef, tradeData);
			}

			// 4. 모든 작업을 한번에 실행
			await batch.commit();

			toast.showToast('거래가 신청되었습니다.', 'success', 1500, false);
			goto(`/office`);
		} catch (error) {
			console.error('Trade request error:', error);
			toast.showToast('거래 신청 중 예기치 않은 오류가 발생했습니다.', 'error', 1500, false);
		} finally {
			isLoadingSB = false;
		}
	};

	const userCash = $state($user?.assets?.cash || 0);
	let _userCash = $derived(userCash - networkFeeKrw);
	let _currentPrice = $derived(currentPrice + (currentPrice * fee) / 100);
	let availableAmount = $derived(Math.floor(_userCash / _currentPrice));

	$effect(() => {
		if (reqAmount > amount) {
			errorMessage = `<small>최대 거래 가능수량</small><br /><strong>${amount.toLocaleString('ko-KR')}</strong>`;
			disabledSB = true;
		} else if (reqAmount < minAmount) {
			errorMessage = `<small>최소 거래 가능수량</small><br /><strong>${minAmount.toLocaleString('ko-KR')}</strong>`;
			disabledSB = true;
		} else if (reqAmount > availableAmount) {
			errorMessage = `<small>구매가능수량</small><br /><strong>${availableAmount.toLocaleString('ko-KR')}</strong>`;
			disabledSB = true;
		} else {
			errorMessage = '';
			disabledSB = false;
		}
	});
</script>

<div class="trade-request" transition:scale={{ duration: 300, easing: cubicOut }}>
	<button class="button-config" onclick={() => drawer.showDrawer('MyInfo')}>
		<span class="material-symbols-outlined">person_edit</span>
		My Info setting
	</button>
	{#if !$user?.displayName || !$user?.phone || !$userWalletsStore.length || !$userWalletsStore.some((w) => w.address)}
		<div class="overlay">
			<div>
				거래를 위해서 My Info에서<br />회원정보를 입력해주세요.
			</div>
		</div>
	{/if}
	<div class="input-container">
		<span>지갑주소</span>
		<input
			placeholder="네트워크를 선택하세요"
			bind:value={walletAddress}
			class="input-wallet"
			readonly
		/>
		<div class="wallet-list">
			{#each $userWalletsStore as wallet}
				{#if wallet.network && wallet.address !== ''}
					<div class="wallet-item">
						<label for={wallet.network} class:selected={network === wallet.network}>
							{wallet.network}
						</label>
						<input
							type="radio"
							id={wallet.network}
							value={wallet.address}
							checked={network === wallet.network}
							onchange={() => (network = wallet.network)}
						/>
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<div class="flex flex-wrap items-center justify-center gap-5">
		<div
			class="flex grow flex-wrap items-center justify-around"
			style="background-color: rgba(255, 255, 255, 0.15);border-radius: 10px; padding: 10px;"
		>
			<div class="flex flex-col items-center justify-center">
				<small>{listingTitle}가 (현재시세)</small>
				<div class="current-price mt-1">
					{price.toLocaleString('ko-KR')}
				</div>
			</div>
			<div class="flex flex-col items-center justify-center">
				<small
					>{listingTitle}수량
					<span style="color: lime;">(최소: {minAmount.toLocaleString('ko-KR')})</span>
				</small>
				<input
					value={reqAmount.toLocaleString('ko-KR')}
					oninput={(e) => {
						reqAmount = setCommaInput(e);
					}}
					type="text"
					inputmode="numeric"
					pattern="[0-9]*"
					class="input-amount"
				/>
				{#if requestOrderType === 'buy'}
					<div class="mt-1 flex w-full items-center justify-between">
						<small class="text-xs text-gray-300"> Available </small>
						<span>
							{availableAmount ? availableAmount.toLocaleString('ko-KR') : '0'}
						</span>
						<button class="selectMaxAmount" onclick={() => (reqAmount = availableAmount)}>
							Max
						</button>
					</div>
				{/if}
			</div>
		</div>
		<div class="flex flex-col items-center gap-5">
			<div class="flex flex-col items-center justify-center">
				{#if errorMessage}
					<div class="error-message">
						{@html errorMessage}
					</div>
				{:else}
					<small>예상 {calcTitle}액</small>
					<div style="font-size: 1.25rem; font-weight: 700; text-align: center; color: aqua;">
						{finalPrice ? finalPrice.toLocaleString('ko-KR') : '0'}
					</div>
				{/if}
			</div>
			<ButtonSB
				orderType={requestOrderType}
				{disabledSB}
				{isLoadingSB}
				setAction={confirmTrade}
				textSB="신청"
			/>
		</div>
	</div>
</div>

<style>
	.trade-request {
		background-color: rgba(0, 0, 0, 0.1);
		border-radius: 10px;
		padding-top: 30px;
		overflow: hidden;
		transition: height 300ms cubic-bezier(0.25, 0.1, 0.25, 1);
		padding: 10px;
		width: 100%;
		position: relative;
		z-index: 100;
		overflow: visible;
	}
	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.3);
		border-radius: 10px;
		z-index: 99;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.overlay div {
		background-color: rgba(0, 0, 0, 0.5);
		padding: 15px;
		border-radius: 10px;
	}
	.button-config {
		position: absolute;
		top: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 0.8rem;
		background-color: rgba(0, 0, 0, 0.5);
		padding: 2px 5px;
		border-radius: 0 5px 0 10px;
		z-index: 100;
	}
	.button-config span {
		font-size: 1rem;
	}
	.input-container {
		display: flex;
		flex-direction: column;
		gap: 5px;
		margin-bottom: 20px;
	}
	.input-container span {
		font-size: 0.8rem;
		color: #ccc;
	}
	.input-wallet {
		width: 100%;
	}
	.current-price {
		font-weight: 700;
		text-align: center;
		color: gold;
		font-size: 1.5rem;
		border-radius: 5px;
	}
	.input-amount {
		font-weight: 700;
		max-width: 100%;
		width: 150px;
		margin-top: 5px;
	}
	.input-amount:read-only {
		background-color: #999;
		color: #333;
	}
	.selectMaxAmount {
		background-color: #333;
		color: gold;
		border-radius: 5px;
		padding: 2px 10px;
		font-size: 0.8rem;
		font-weight: 700;
		box-shadow: 0 0 5px 0 rgba(255, 255, 150, 0.9);
		margin-top: 2px;
	}
	.error-message {
		color: rgb(243, 99, 99);
		text-align: center;
	}
	.wallet-list {
		display: flex;
		justify-content: flex-end;
		gap: 5px;
		flex-wrap: wrap;
		min-height: 30px;
	}
	.wallet-item {
		display: flex;
		align-items: center;
		color: #eee;
	}
	.wallet-item label {
		padding: 2px 10px;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s ease;
		border: 1px solid rgba(255, 255, 255, 0.5);
	}
	/* 선택된 라벨의 스타일 */
	.wallet-item label.selected {
		background-color: rgba(255, 255, 255, 0.5);
		color: #333;
	}
	/* 호버 효과 */
	.wallet-item label:hover {
		background-color: rgba(255, 255, 255, 0.2);
	}
	/* 라디오 버튼 숨기기 (선택사항) */
	.wallet-item input[type='radio'] {
		display: none;
	}
</style>
