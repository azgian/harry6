import { db } from './firebase';
import { 
    doc, 
    collection, 
    getDoc, 
    updateDoc, 
    addDoc, 
    increment, 
    Timestamp,
    getDocs,
    query,
    where
} from 'firebase/firestore';
import type { TransactionStatus, ActivityType } from '$lib/auth';

export interface CashLog
{
    id: string;
    userId: string;          // 유저 ID
    amount: number;          // 충전/사용 금액
    type: ActivityType;  // 충전인지 사용인지
    status: TransactionStatus;  // 승인 상태
    createdAt: Timestamp;  // 요청 시간
    assetsCash?: number;      // 유저의 현재 캐시 잔액
    tradeId?: string;         // 거래 ID
    updatedAt?: Timestamp; // 처리 시간
    adminId?: string;        // 처리한 관리자 ID
    description?: string;    // 설명 (예: "카카오페이 충전", "게임 구매" 등)
}

// 현재 캐시 잔액 조회
export const getCash = async (userId: string): Promise<number> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
            throw new Error('User not found');
        }
        return userDoc.data().assets?.cash || 0;
    } catch (error) {
        console.error('Error getting cash:', error);
        throw error;
    }
};

export const getUpdateCurrentCash = async (userId: string, amount: number): Promise<number> =>
{
    await updateDoc(doc(db, 'users', userId), {
        'assets.cash': increment(amount)
    });
    return await getCash(userId);
};

// 메인 캐시 처리 함수
export const setCash = async (
    userId: string, 
    amount: number, 
    type: ActivityType = 'deposit',
    status: TransactionStatus = 'pending',
    tradeId: string = '',
    description: string = '',
) => {
    if (!userId || amount === 0) return;

    try
    {
        const assetsCash = await getUpdateCurrentCash(userId, amount);

        // 캐시 로그 생성
        const cashLogData: Omit<CashLog, 'id'> = {
            userId,
            assetsCash,
            amount,
            type,
            status,
            description,
            tradeId,
            createdAt: Timestamp.now()
        };

        // Firestore에 로그 추가
        const cashLog = await addDoc(collection(db, 'cashLogs'), cashLogData);
        if(status==='rejected')
        {
            // cashLogs에서 tradeId 값이 같은 로그의 status를 rejected로 업데이트
            const cashLogs = await getDocs(query(collection(db, 'cashLogs'), where('tradeId', '==', tradeId)));
            cashLogs.forEach(async (log) => {
                await updateDoc(doc(db, 'cashLogs', log.id), { status: 'rejected' });
            });
        }

        return cashLog;

    } catch (error) {
        console.error('Error setting cash:', error);
        throw error;
    }
};

export const updateCashLog = async (cashLogId: string, data: Partial<CashLog>) => {
    await updateDoc(doc(db, 'cashLogs', cashLogId), data);
};
