<script lang="ts">
	import LogTable from '$lib/components/LogTable.svelte';
	import { toast } from '$lib/components/toast';
	import { sendMessage } from '$lib/message';
	import { sendPush } from '$lib/push';
	import { getUser } from '$lib/auth';
	import type { TransactionStatus } from '$lib/auth';
	import {
		doc,
		getDoc,
		updateDoc,
		runTransaction,
		onSnapshot,
		query,
		collection,
		increment,
		Timestamp
	} from 'firebase/firestore';
	import { db } from '$lib/firebase';

	let loadingStates = $state(new Map<string, boolean>());
	let txidInputs = $state<Record<string, string>>({});
	let unsubscribe: () => void;

	$effect(() => {
		const q = query(collection(db, 'tradeLogs'));
		unsubscribe = onSnapshot(q, (snapshot) => {
			snapshot.docChanges().forEach((change) => {
				if (change.type === 'modified') {
					// LogTable 컴포넌트를 강제로 리렌더링하기 위해
					// 약간의 지연 후 상태를 업데이트
					setTimeout(() => {
						loadingStates = new Map(loadingStates);
					}, 100);
				}
			});
		});

		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
	});

	const handleActionStart = (buttonKey: string) => {
		loadingStates.set(buttonKey, true);
	};

	const handleActionEnd = (buttonKey: string) => {
		loadingStates.set(buttonKey, false);
	};

	// 알림 전송 함수
	async function sendNotification(userId: string, title: string, message: string, type: 'trade') {
		try {
			// 푸시 알림 전송
			await sendPush({
				userId,
				title,
				message,
				type,
				data: {
					timestamp: new Date().toISOString()
				}
			});

			// 내부 메시지 전송
			await sendMessage(userId, title, message, type);
		} catch (error) {
			console.error('알림 전송 실패:', error);
		}
	}

	const setTradeStatus = async (id: string, status: TransactionStatus) => {
		try {
			const tradeRef = doc(db, 'tradeLogs', id);
			const tradeDoc = await getDoc(tradeRef);

			if (!tradeDoc.exists()) {
				toast.showToast('거래 정보를 찾을 수 없습니다.', 'error', 1500, false);
				return;
			}

			const tradeData = tradeDoc.data();
			const now = Timestamp.now();
			const typeKr = tradeData.orderType === 'buy' ? '구매' : '판매';

			// 상태 업데이트 로직
			switch (status) {
				case 'pending':
					await updateDoc(tradeRef, {
						status: 'pending',
						updatedAt: now
					});
					await sendNotification(
						tradeData.userId,
						'거래접수',
						`${typeKr} 거래가 접수되었습니다.`,
						'trade'
					);
					break;

				case 'confirmed':
					if (tradeData.orderType === 'buy' && !txidInputs[id]) {
						toast.showToast('TXID를 입력하세요.', 'error', 1500, false);
						handleActionEnd(`거래진행-${id}`);
						return;
					}

					await runTransaction(db, async (transaction) => {
						if (tradeData.listingId) {
							const listingRef = doc(db, 'listings', tradeData.listingId);
							transaction.update(listingRef, {
								amount: increment(tradeData.reqAmount * -1)
							});
						}

						transaction.update(tradeRef, {
							status: 'confirmed',
							updatedAt: now,
							...(tradeData.orderType === 'buy' && { txid: txidInputs[id] })
						});
					});

					await sendNotification(
						tradeData.userId,
						'거래진행중',
						`${typeKr} 거래가 진행중입니다.`,
						'trade'
					);

					if (tradeData.orderType === 'buy') {
						txidInputs[id] = '';
					}
					break;

				default:
					toast.showToast('잘못된 상태 변경입니다.', 'error', 1500, false);
					return;
			}
		} catch (error) {
			console.error('거래 상태 업데이트 실패:', error);
			toast.showToast('거래 상태 업데이트에 실패했습니다.', 'error', 1500, false);
		}
	};

	const rejectTrade = async (id: string) => {
		try {
			const now = Timestamp.now();
			const tradeData = await runTransaction(db, async (transaction) => {
				const tradeRef = doc(db, 'tradeLogs', id);
				const tradeDoc = await transaction.get(tradeRef);

				if (!tradeDoc.exists()) {
					throw new Error('거래 정보를 찾을 수 없습니다.');
				}

				const tradeData = tradeDoc.data();

				if (tradeData.status !== 'requested') {
					throw new Error('이미 진행중인 거래는 취소할 수 없습니다.');
				}

				const userRef = doc(db, 'users', tradeData.userId);
				const userDoc = await transaction.get(userRef);
				const userData = userDoc.data();

				// 업데이트될 캐시 계산
				const updatedCash = (userData?.assets?.cash || 0) + tradeData.finalPrice;

				// 거래 업데이트
				transaction.update(tradeRef, {
					status: 'cancelled',
					updatedAt: now
				});

				// 유저 업데이트
				transaction.update(userRef, {
					assets: {
						...userData?.assets,
						cash: updatedCash,
						lastUpdated: now
					},
					recentActivity: {
						type: 'trade',
						amount: tradeData.finalPrice,
						timestamp: now,
						description: '거래취소',
						status: 'cancelled',
						relatedId: id
					}
				});

				// 캐시로그 업데이트
				if (tradeData.cashLogId) {
					const cashLogRef = doc(db, 'cashLogs', tradeData.cashLogId);
					transaction.update(cashLogRef, {
						assetsCash: updatedCash,
						status: 'cancelled',
						updatedAt: now
					});
				}

				return tradeData;
			});

			const typeKr = tradeData.orderType === 'buy' ? '구매' : '판매';
			await sendNotification(
				tradeData.userId,
				'거래취소',
				`${typeKr} 거래가 취소되었습니다.`,
				'trade'
			);

			toast.showToast(
				'거래가 취소되었습니다.<br />구매자의 홀딩 자산이 복구되었습니다.',
				'success',
				1500,
				false
			);
		} catch (error) {
			console.error('거래 취소 실패:', error);
			toast.showToast(
				error instanceof Error ? error.message : '거래 취소에 실패했습니다.',
				'error',
				1500,
				false
			);
		}
	};
</script>

<LogTable
	{loadingStates}
	collectionName="tradeLogs"
	queryOptions={{
		whereConditions: [
			{
				field: 'status',
				operator: 'in',
				value: ['requested', 'pending', 'confirmed', 'completed']
			}
		],
		orderByField: 'createdAt',
		orderDirection: 'desc'
	}}
	onActionStart={handleActionStart}
	onActionEnd={handleActionEnd}
	status={{
		condition: (item) => (item.status !== 'completed' ? 'pending' : '')
	}}
	leads={[
		{ key: 'createdAt', type: 'date' },
		{
			key: 'orderType',
			type: 'text',
			format: (value) => (value === 'buy' ? '구매' : '판매'),
			className: (value) =>
				`${value === 'buy' ? 'bg-indigo-500' : 'bg-rose-500'} text-sm text-white px-1 rounded-md mr-1`
		}
	]}
	columns={[
		{
			key: 'userId',
			type: 'isIcon',
			format: async (userId: string) => {
				const user = await getUser(userId);
				const userName = user?.displayName || user?.email || 'no name';
				const phone = user?.phone
					? '<span class="material-symbols-outlined">smartphone</span>' +
						user?.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
					: '';
				return (
					'<span class="bg-black text-white px-2 rounded-md mr-1 opacity-50">' +
					userName +
					'</span>' +
					'<span class="flex items-center text-gray-400">' +
					phone +
					'</span>'
				);
			}
		}
	]}
	tradeInfo={[
		{
			key: 'finalPrice',
			type: 'text',
			format: (value) =>
				'<span class="font-bold text-lg">₩ ' + value.toLocaleString('ko-KR') + '</span>'
		},
		{
			key: 'walletAddress',
			type: 'text',
			format: (value) => value
		},
		{
			key: 'txid',
			type: 'text',
			format: (value, item) => {
				if (!value) {
					return {
						element: 'textarea',
						props: {
							placeholder:
								item.status !== 'pending' ? '거래접수 후 입력하세요' : 'TXID를 입력하세요',
							disabled: item.status !== 'pending',
							oninput: (e: Event) => {
								const txid = e.target as HTMLTextAreaElement;
								txidInputs[item.id] = txid.value;
							}
						}
					};
				} else {
					return value;
				}
			}
		}
	]}
	configBtn={[
		{
			icon: 'delete',
			condition: (item) => item.status === 'requested',
			confirmMessage: '거래취소하시겠습니까?',
			onClick: async (item) => await rejectTrade(item.id)
		}
	]}
	actions={[
		{
			label: '거래접수',
			type: 'blink',
			condition: (item) => item.status === 'requested',
			confirmMessage: '거래접수 하시겠습니까?',
			onClick: async (item) => await setTradeStatus(item.id, 'pending')
		},
		{
			label: '거래진행',
			type: 'blink',
			condition: (item) => item.status === 'pending',
			onClick: async (item) => await setTradeStatus(item.id, 'confirmed')
		},
		{
			label: '완료대기중',
			type: 'outline',
			condition: (item) => item.status === 'confirmed',
			onClick: () => {},
			disabled: (item) => item.orderType === 'buy' && item.status === 'confirmed'
		},
		{
			label: '거래완료',
			type: 'blink',
			confirmMessage: '거래완료 하시겠습니까?',
			condition: (item) => item.orderType === 'sell' && item.status === 'confirmed',
			onClick: async (item) => await setTradeStatus(item.id, 'completed')
		}
	]}
/>
