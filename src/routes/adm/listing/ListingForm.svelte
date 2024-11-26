<script lang="ts">
	import CoinList from '$lib/components/CoinList.svelte';
	import ButtonSB from '$lib/components/ButtonSB.svelte';
	import type { InputValues, Wallet } from '$lib/types';
	import { alertEmptyValue, setCommaInput } from '$lib';
	import { goto } from '$app/navigation';
	import { user } from '$lib/auth';
	import { userWalletsStore } from '$lib/stores/userStore';
	import { db } from '$lib/firebase';
	import { Timestamp, addDoc, collection } from 'firebase/firestore';
	import { toast } from '$lib/components/toast';
	import type { OrderType } from '$lib/types/trade';

	type Props = {
		orderType: OrderType;
		coinId: string;
	};

	let { orderType, coinId = 'coin_usdt_trc20' }: Props = $props();

	const userId = $user?.uid;

	const initWallet = ($userWalletsStore as Wallet[]).find((w: Wallet) => w.network === 'BEP20');

	let amount = $state(0);
	let minAmount = $state(0);
	let fee = $state(0);
	let network = $state(initWallet?.network || '');
	let selectedNetwork = $state(initWallet?.network || '');
	let walletAddress = $state(initWallet?.address || '');

	let listingTitle = $derived(orderType === 'sell' ? '판매' : '구매');
	let _listingTitle = $derived(orderType === 'sell' ? '구매' : '판매');

	let isLoadingSB = $state(false);
	let disabledSB = $state(false);

	const listingUpdate = async () => {
		const inputValuesRequired: InputValues[] = [{ name: '수량', value: amount }];
		if (!alertEmptyValue(inputValuesRequired)) return;

		if (!userId) {
			toast.showToast('로그인이 필요합니다.', 'error', 1500, false);
			return;
		}

		try {
			const listing = {
				coinId,
				userId,
				orderType,
				amount,
				minAmount,
				userFee: fee,
				network,
				walletAddress,
				createdAt: Timestamp.now(),
				isActive: true
			};

			const newListing = await addDoc(collection(db, 'listings'), listing);
			goto(`/market?orderType=${orderType}&lid=${newListing.id}`);
			toast.showToast('리스팅이 등록되었습니다.', 'success', 1500, false);
		} catch (error) {
			console.error('Listing 등록 에러:', error);
			if (error instanceof Error) {
				toast.showToast(`리스팅 등록 실패: ${error.message}`, 'error', 1500, false);
			} else {
				toast.showToast('리스팅 등록 중 예기치 않은 오류가 발생했습니다.', 'error', 1500, false);
			}
		}
	};

	const selectNetwork = (network: string) => {
		selectedNetwork = network;
		const selectedWallet = $userWalletsStore.find((w) => w.network === network);
		if (selectedWallet) {
			walletAddress = selectedWallet.address;
			network = selectedWallet.network;
		}
	};
</script>

<CoinList {coinId} {orderType} />

{#if orderType}
	<div class="listing-form-container">
		{#if orderType === 'buy'}
			<div class="wallet-wrap">
				<span>지갑주소</span>
				<input
					placeholder="지갑주소를 입력하세요"
					bind:value={walletAddress}
					class="input-wallet"
				/>
				<div class="wallet-list">
					{#each $userWalletsStore as wallet}
						{#if wallet.network && wallet.address !== ''}
							<div class="wallet-item">
								<label for={wallet.network} class:selected={selectedNetwork === wallet.network}>
									{wallet.network}
								</label>
								<input
									type="radio"
									id={wallet.network}
									value={wallet.address}
									checked={selectedNetwork === wallet.network}
									onchange={() => selectNetwork(wallet.network)}
								/>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
		<div class="input-container-group">
			<div class="input-container">
				<span class="input-label">{listingTitle}수량</span>
				<input
					placeholder={`${listingTitle}수량`}
					type="text"
					inputmode="numeric"
					pattern="[0-9]*"
					value={amount.toLocaleString('ko-KR')}
					oninput={(e) => {
						amount = setCommaInput(e);
					}}
				/>
			</div>
			<div class="input-container">
				<span class="input-label">최소 {listingTitle}수량</span>
				<input
					placeholder={`최소 ${listingTitle}수량`}
					type="text"
					inputmode="numeric"
					pattern="[0-9]*"
					value={minAmount.toLocaleString('ko-KR')}
					oninput={(e) => {
						minAmount = setCommaInput(e);
					}}
				/>
			</div>
			<div class="input-container">
				<span class="input-label">{_listingTitle}자 수수료(%)</span>
				<input
					placeholder={`${_listingTitle}자 수수료`}
					type="text"
					inputmode="numeric"
					pattern="[0-9]*"
					value={fee.toLocaleString('ko-KR')}
					oninput={(e) => {
						fee = setCommaInput(e);
					}}
				/>
			</div>
		</div>
		<div class="button-container">
			<ButtonSB {orderType} {isLoadingSB} {disabledSB} setAction={listingUpdate} textSB="등록" />
		</div>
	</div>
{/if}

<style>
	.listing-form-container {
		padding: 10px;
		background-color: rgba(0, 0, 0, 0.1);
		border-radius: 0 0 10px 10px;
	}
	.wallet-wrap {
		margin-bottom: 20px;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.input-container-group {
		display: flex;
		justify-content: space-around;
		gap: 10px;
		flex-wrap: wrap;
	}
	.input-label {
		color: #eee;
	}
	.input-container {
		display: flex;
		flex-direction: column;
		gap: 5px;
		margin-bottom: 10px;
		align-items: center;
	}
	.input-container input {
		width: 150px;
		font-size: 1.25rem;
		font-weight: 700;
	}
	.button-container {
		display: flex;
		justify-content: center;
		margin: 30px 0 20px;
	}
	.wallet-list {
		display: flex;
		justify-content: flex-end;
		gap: 5px;
		flex-wrap: wrap;
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
