<script lang="ts">
	import type { Listing } from '$lib/types/trade';
	import CoinInfo from '$lib/components/CoinInfo.svelte';
	import LoaderBox from '$lib/components/LoaderBox.svelte';
	import Button from '$lib/components/Button.svelte';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { toast } from '$lib/toast';
	import ListingRequest from './ListingRequest.svelte';
	import { user } from '$lib/auth';
	import { formatDate } from '$lib';
	import { doc, deleteDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { goto } from '$app/navigation';

	type Props = {
		listing: Listing;
	};

	let { listing }: Props = $props();

	let isLoading = $state(true);

	let lid = $state(listing.docId);
	let orderType = $state(listing.orderType);

	const tradeSortKr = $derived(orderType === 'sell' ? '판매' : '구매');

	$effect(() => {
		if (listing) {
			isLoading = true;
			setTimeout(() => {
				isLoading = false;
			}, 1000);
		}
	});

	const deleteListing = async () => {
		if (!$user?.uid || !lid) {
			toast.showToast('삭제 권한이 없습니다.', 'error', 1500, false);
			return;
		}

		try {
			// listings 컬렉션에서 직접 문서 삭제
			const listingRef = doc(db, 'listings', lid);
			await deleteDoc(listingRef);

			toast.showToast('리스팅이 삭제되었습니다.', 'success', 1500, false);
			goto(`/market?orderType=${orderType}`);
		} catch (error) {
			console.error('Error deleting listing:', error);
			if (error instanceof Error) {
				toast.showToast(`리스팅 삭제 실패: ${error.message}`, 'error', 1500, false);
			} else {
				toast.showToast('리스팅 삭제 중 예기치 않은 오류가 발생했습니다.', 'error', 1500, false);
			}
		}
	};
</script>

<div class="trade-view" transition:slide={{ duration: 300, easing: cubicOut }}>
	{#if isLoading}
		<LoaderBox size={50} boxHeight="400px" />
	{:else if listing}
		<div class="trade-card">
			<div class="top">
				<span class="timestamp">{formatDate(listing.createdAt, true)}</span>
				<span>&nbsp;</span>
				{#if $user?.role === 'admin'}
					<Button
						onClick={() => {
							toast.showToast('리스팅을 삭제하시겠습니까?', 'info', null, true, deleteListing);
						}}
						text="리스팅 삭제"
						className="outline"
						style="font-size: 0.75rem;"
					/>
				{/if}
			</div>
			<div class="content">
				<div class="row">
					<span class="label">상품명</span>
					<span class="value">
						<CoinInfo coinId={listing.coinId} />
					</span>
				</div>
				<div class="row">
					<span class="label">{tradeSortKr}수량</span>
					<span class="value amount">
						{listing.amount.toLocaleString()}
					</span>
				</div>
			</div>
		</div>
		<ListingRequest {listing} />
	{/if}
</div>

<style>
	.trade-view {
		background-color: rgba(0, 0, 0, 0.1);
		border-radius: 8px;
		overflow: hidden;
		transition: height 300ms cubic-bezier(0.25, 0.1, 0.25, 1);
		min-height: 450px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		padding: 10px;
	}
	.trade-card {
		width: 100%;
		padding: 10px;
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: start;
		padding-bottom: 10px;
		min-height: 40px;
	}
	.timestamp {
		font-size: 12px;
		color: #ccc;
	}
	.content {
		margin-bottom: 20px;
	}
	.row {
		display: flex;
		align-items: center;
		margin-bottom: 10px;
	}
	.label {
		width: 100px;
		font-weight: bold;
	}
	.value {
		flex: 1;
	}
	.amount {
		font-size: 1.5rem;
		font-weight: bold;
	}
</style>
