<script lang="ts">
	import LogTable from '$lib/components/LogTable.svelte';
	import { getUser } from '$lib/auth';
	import { doc, runTransaction, Timestamp } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { toast } from '$lib/toast';
	import { sendMessage } from '$lib/message';
	import { sendPush } from '$lib/push';
	import type { TransactionStatus } from '$lib/auth';

	// 알림 전송 함수
	async function sendNotification(userId: string, title: string, message: string) {
		try {
			// 푸시 알림 전송
			await sendPush({
				userId,
				title,
				message,
				type: 'system',
				data: {
					type: 'deposit',
					timestamp: new Date().toISOString()
				}
			});

			// 내부 메시지 전송
			await sendMessage(userId, title, message, 'system');
		} catch (error) {
			console.error('알림 전송 실패:', error);
		}
	}

	// 캐시 교환 승인
	const approveCashLog = async (id: string) => {
		try {
			let retries = 3;
			let lastError: Error | null = null;

			while (retries > 0) {
				try {
					const result = await runTransaction(db, async (transaction) => {
						// 1. 캐시 로그 문서 읽기
						const cashLogRef = doc(db, 'cashLogs', id);
						const cashLogSnap = await transaction.get(cashLogRef);

						if (!cashLogSnap.exists()) {
							throw new Error('존재하지 않는 신청입니다.');
						}

						const cashLogData = cashLogSnap.data();

						// 2. 상태 확인
						if (cashLogData.status !== 'requested') {
							throw new Error('이미 처리된 신청입니다.');
						}

						// 3. 유저 문서 읽기
						const userRef = doc(db, 'users', cashLogData.userId);
						const userSnap = await transaction.get(userRef);

						if (!userSnap.exists()) {
							throw new Error('사용자를 찾을 수 없습니다.');
						}

						const userData = userSnap.data();
						const assetsCash = (userData.assets?.cash || 0) + cashLogData.amount;
						const now = Timestamp.now();

						// 4. 문서 업데이트
						transaction.update(cashLogRef, {
							status: 'completed' as TransactionStatus,
							assetsCash: assetsCash,
							updatedAt: now
						});

						transaction.update(userRef, {
							assets: {
								...userData.assets,
								cash: assetsCash,
								lastUpdated: now
							},
							recentActivity: {
								type: 'deposit',
								amount: cashLogData.amount,
								timestamp: now,
								description: '충전완료',
								status: 'completed' as TransactionStatus,
								relatedId: id
							}
						});

						return {
							userId: cashLogData.userId,
							amount: cashLogData.amount
						};
					});

					// 6. 트랜잭션 성공 후 알림 전송
					if (result) {
						const message = `충전되었습니다. [₩ ${result.amount.toLocaleString('ko-KR')}]`;
						await sendNotification(result.userId, '충전완료', message);
					}

					toast.showToast('충전되었습니다.', 'success', 1500, false);
					return;
				} catch (error) {
					lastError = error instanceof Error ? error : new Error('알 수 없는 오류');
					retries--;

					if (error instanceof Error && error.message.includes('version')) {
						await new Promise((resolve) => setTimeout(resolve, 1500));
						continue;
					}

					throw error;
				}
			}

			throw lastError || new Error('트랜잭션 실패');
		} catch (error) {
			console.error('캐시 교환 승인 실패:', error);
			toast.showToast(
				error instanceof Error ? error.message : '캐시 교환 승인에 실패했습니다.',
				'error',
				1500,
				false
			);
		}
	};

	// 캐시 교환 신청 취소
	const rejectCashLog = async (id: string, userId: string, amount: number) => {
		try {
			const now = Timestamp.now();
			await runTransaction(db, async (transaction) => {
				const cashLogRef = doc(db, 'cashLogs', id);
				const userRef = doc(db, 'users', userId);

				transaction.update(cashLogRef, {
					status: 'cancelled' as TransactionStatus,
					updatedAt: now
				});

				transaction.update(userRef, {
					recentActivity: {
						type: 'deposit',
						amount: amount,
						timestamp: now,
						description: '충전취소',
						status: 'cancelled' as TransactionStatus,
						relatedId: id
					}
				});
			});

			toast.showToast('신청이 취소되었습니다.', 'success', 1500, false);
			const message = `충전신청이 취소되었습니다. [₩ ${amount.toLocaleString('ko-KR')}]`;
			await sendNotification(userId, '충전취소', message);
		} catch (error) {
			console.error('캐시 교환 신청 취소 실패:', error);
			toast.showToast('신청 취소에 실패했습니다.', 'error', 1500, false);
		}
	};
</script>

<LogTable
	collectionName="cashLogs"
	itemsPerPage={20}
	queryOptions={{
		whereConditions: [{ field: 'type', operator: '==', value: 'deposit' }],
		orderByField: 'createdAt',
		orderDirection: 'desc'
	}}
	status={{
		condition: (item) => (item.status === 'requested' ? 'pending' : '')
	}}
	leads={[
		{ key: 'createdAt', type: 'date' },
		{
			key: 'userId',
			type: 'text',
			className: 'bg-black text-white px-2 rounded-md opacity-50',
			format: async (userId: string) => {
				const user = await getUser(userId);
				return user?.displayName || user?.email || 'no name';
			}
		}
	]}
	columns={[
		{ key: 'amount', type: 'currency' },
		{ key: 'description', type: 'text', className: 'ml-1' },
		{
			key: 'status',
			type: 'text',
			className: 'ml-1',
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
	configBtn={[
		{
			icon: 'delete',
			condition: (item) => item.status === 'requested',
			confirmMessage: '신청취소하시겠습니까?',
			onClick: async (item) => {
				await rejectCashLog(item.id, item.userId, item.amount);
			}
		}
	]}
	actions={[
		{
			label: '신청승인',
			type: 'primary',
			condition: (item) => item.status === 'requested',
			confirmMessage: '신청승인후 캐시충전됩니다.<br />진행하시겠습니까?',
			onClick: async (item) => {
				await approveCashLog(item.id);
			}
		}
	]}
/>
