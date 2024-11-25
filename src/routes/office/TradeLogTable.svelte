<script lang="ts">
	import LogTable from '$lib/components/LogTable.svelte';
	import type { TradeLog } from '$lib/types/trade';
	import type { TransactionStatus } from '$lib/auth';
	import { toast } from '$lib/toast';
	import { sendMessage } from '$lib/message';
	import { sendPush } from '$lib/push';
	import { TradeService } from '$lib/services/tradeService';
	import { user } from '$lib/auth';
	import { doc, runTransaction, Timestamp } from 'firebase/firestore';
	import { db } from '$lib/firebase';

	const tradeService = new TradeService();

	let totalReqItems = $state(0);
	let requestData = $state<TradeLog[]>([]);
	let txidInputs = $state<Record<string, string>>({});
	let unsubscribe: (() => void) | null = null;
	let loadingStates = $state(new Map());

	// 실시간 거래 요청 감시
	const watchTradeRequests = () => {
		if ($user?.uid) {
			unsubscribe?.();
			unsubscribe = tradeService.watchRequests($user.uid, (requests) => {
				requestData = [...requests];
				totalReqItems = requests.length;
				loadingStates = new Map(loadingStates);
			});
		}
	};

	// 알림 전송 함수
	async function sendNotification(userId: string, title: string, message: string) {
		try {
			// 푸시 알림 전송
			await sendPush({
				userId,
				title,
				message,
				type: 'trade',
				data: {
					timestamp: new Date().toISOString()
				}
			});

			// 내부 메시지 전송
			await sendMessage(userId, title, message, 'trade');
		} catch (error) {
			console.error('알림 전송 실패:', error);
		}
	}

	// 거래 상태 업데이트
	const accessRequest = async (logId: string, status: TransactionStatus) => {
		try {
			const record = requestData.find((item) => item.id === logId);
			if (!record) return;

			const txid = txidInputs[logId] || '';

			if (record.orderType === 'sell' && status === 'confirmed' && !txid) {
				toast.showToast('TXID를 입력하세요.', 'warning', 1500, false);
				return;
			}

			const now = Timestamp.now();

			await runTransaction(db, async (transaction) => {
				const tradeRef = doc(db, 'tradeLogs', logId);
				const userRef = doc(db, 'users', record.userId);

				transaction.update(tradeRef, {
					status,
					updatedAt: now,
					...(txid && { txid })
				});

				if (status === 'completed' && record.cashLogId) {
					const cashLogRef = doc(db, 'cashLogs', record.cashLogId);
					transaction.update(cashLogRef, {
						status: 'completed',
						updatedAt: now
					});

					transaction.update(userRef, {
						recentActivity: {
							type: 'trade',
							amount: record.finalPrice,
							timestamp: now,
							description: `${record.orderType === 'buy' ? '구매' : '판매'}완료`,
							status: 'completed',
							relatedId: logId
						}
					});
				}

				return record; // 트랜잭션에서 데이터 반환
			});

			// 상태별 알림 메시지 전송
			if (record.userId) {
				const typeKr = record.orderType === 'buy' ? '구매' : '판매';
				let title, message;

				switch (status) {
					case 'confirmed':
						title = '거래진행 알림';
						message = `${typeKr} 거래가 진행중입니다.`;
						break;
					case 'completed':
						title = '거래완료 알림';
						message = `거래완료 되었습니다. (${typeKr}내역: ₩ ${record.finalPrice.toLocaleString('ko-KR')} / ${record.reqAmount})`;
						break;
					default:
						return;
				}

				await sendNotification(record.userId, title, message);
			}
		} catch (error) {
			console.error('Failed to access request:', error);
			toast.showToast('거래 상태 업데이트 실패', 'error', 1500, false);
		}
	};

	// 거래 요청 취소
	const cancelRequest = async (id: string) => {
		try {
			const record = requestData.find((item) => item.id === id);
			if (!record) return;

			const now = Timestamp.now();

			await runTransaction(db, async (transaction) => {
				const tradeRef = doc(db, 'tradeLogs', id);
				const userRef = doc(db, 'users', record.userId);
				const userDoc = await transaction.get(userRef);
				const userData = userDoc.data();

				// 업데이트될 캐시 계산
				const updatedCash = (userData?.assets?.cash || 0) + record.finalPrice;

				// 거래 상태 업데이트
				transaction.update(tradeRef, {
					status: 'cancelled' as TransactionStatus,
					updatedAt: now
				});

				// 유저 자산 업데이트
				transaction.update(userRef, {
					assets: {
						...userData?.assets,
						cash: updatedCash,
						lastUpdated: now
					},
					recentActivity: {
						type: 'trade',
						amount: record.finalPrice,
						timestamp: now,
						description: '거래취소',
						status: 'cancelled',
						relatedId: id
					}
				});

				// 캐시로그 업데이트
				if (record.cashLogId) {
					const cashLogRef = doc(db, 'cashLogs', record.cashLogId);
					transaction.update(cashLogRef, {
						assetsCash: updatedCash,
						status: 'cancelled',
						updatedAt: now
					});
				}

				return record;
			});

			const typeKr = record.orderType === 'buy' ? '구매' : '판매';
			await sendNotification(record.userId, '거래취소 알림', `${typeKr} 거래가 취소되었습니다.`);

			toast.showToast('거래가 취소되었습니다.', 'success', 1500, false);
		} catch (error) {
			console.error('Failed to cancel request:', error);
			toast.showToast('거래 취소 실패', 'error', 1500, false);
		}
	};

	$effect(() => {
		if ($user?.uid) {
			watchTradeRequests();
		}
		return () => {
			unsubscribe?.();
		};
	});
</script>

<LogTable
	{loadingStates}
	collectionName="tradeLogs"
	queryOptions={{
		orderByField: 'createdAt',
		orderDirection: 'desc',
		whereConditions: [
			{ field: 'userId', operator: '==', value: $user?.uid },
			{
				field: 'status',
				operator: 'in',
				value: ['requested', 'pending', 'confirmed', 'completed']
			}
		]
	}}
	status={{
		condition: (item) => (item.status !== 'completed' ? 'pending' : '')
	}}
	leads={[
		{ key: 'createdAt', type: 'date' },
		{
			key: 'orderType',
			type: 'text',
			format: (value: string | number) => (value === 'buy' ? '구매' : '판매'),
			className: (value: string | number) =>
				`${value === 'buy' ? 'bg-indigo-500' : 'bg-rose-500'} text-md text-white px-1 rounded-md`
		},
		{
			key: 'status',
			type: 'text',
			format: (status: string) =>
				({
					requested: '신청',
					pending: '대기',
					confirmed: '확인',
					completed: '완료',
					rejected: '거절',
					cancelled: '취소',
					failed: '실패'
				})[status] || status
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
			format: (value) => value
		}
	]}
	configBtn={[
		{
			icon: 'delete',
			condition: (item: TradeLog) => item.status === 'requested',
			confirmMessage: '거래신청취소하시겠습니까?',
			onClick: async (item: TradeLog) => {
				await cancelRequest(item.id);
			}
		}
	]}
	actions={[
		{
			label: '거래신청중',
			type: 'outline',
			condition: (item: TradeLog) => item.status === 'requested',
			onClick: () => {},
			disabled: (item: TradeLog) => item.status === 'requested'
		},
		{
			label: '거래진행',
			type: 'blink',
			condition: (item: TradeLog) => item.orderType === 'sell' && item.status === 'pending',
			confirmMessage: '거래진행하시겠습니까?',
			onClick: async (item: TradeLog) => await accessRequest(item.id, 'confirmed')
		},
		{
			label: '거래진행중',
			type: 'outline',
			condition: (item: TradeLog) => item.orderType === 'buy' && item.status === 'pending',
			onClick: () => {},
			disabled: (item: TradeLog) => item.orderType === 'buy' && item.status === 'pending'
		},
		{
			label: '완료대기중',
			type: 'outline',
			condition: (item: TradeLog) => item.orderType === 'sell' && item.status === 'confirmed',
			onClick: () => {},
			disabled: (item: TradeLog) => item.orderType === 'sell' && item.status === 'confirmed'
		},
		{
			label: '거래완료',
			type: 'blink',
			condition: (item: TradeLog) => item.status === 'confirmed',
			onClick: async (item: TradeLog) => {
				toast.showToast(
					'거래를 완료하시겠습니까?',
					'primary',
					null,
					true,
					async () => await accessRequest(item.id, 'completed')
				);
			}
		}
	]}
/>
