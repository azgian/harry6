import {
    collection,
    doc,
    query,
    where,
    Timestamp,
    increment,
    onSnapshot,
    type Unsubscribe,
    runTransaction
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import { counters } from './stores';
import type { MessageLog } from './types';
import { user } from '$lib/auth';

// 메시지 전송
export async function sendMessage(userId: string, title: string, message?: string, type: MessageLog['type'] = 'system') {
    try {
        const messageData: MessageLog = {
            userId,
            title,
            message,
            type,
            read: false,
            createdAt: Timestamp.now()
        };

        await runTransaction(db, async (transaction) => {
            const messageRef = doc(collection(db, 'messageLogs'));
            transaction.set(messageRef, messageData);

            const userRef = doc(db, 'users', userId);
            transaction.update(userRef, {
                'recentActivity': {
                    type: 'message',
                    title,
                    message,
                    timestamp: messageData.createdAt
                },
                unreadMessageCount: increment(1)
            });
        });
    } catch (error) {
        console.error('메시지 전송 실패:', error);
        throw error;
    }
}

// 메시지 읽음 처리
export async function readMessage(messageId: string, userId: string) {
    try {
        await runTransaction(db, async (transaction) => {
            const messageRef = doc(db, 'messageLogs', messageId);
            const messageSnap = await transaction.get(messageRef);

            if (!messageSnap.exists()) throw new Error('메시지를 찾을 수 없습니다.');

            const messageData = messageSnap.data();
            if (messageData.userId !== userId) throw new Error('권한이 없습니다.');
            if (messageData.read) return;

            transaction.update(messageRef, { read: true });
            transaction.update(doc(db, 'users', userId), {
                unreadMessageCount: increment(-1)
            });
        });
    } catch (error) {
        console.error('메시지 읽음 처리 실패:', error);
        throw error;
    }
}

// 카운터 구독 설정
function setupCounterSubscriptions(userId: string) {
    const subscriptions: Unsubscribe[] = [];

    // userMessage: 사용자의 미읽은 메시지
    subscriptions.push(
        onSnapshot(
            query(
                collection(db, 'messageLogs'),
                where('userId', '==', userId),
                where('read', '==', false)
            ),
            (snapshot) => {
                console.log('미읽은 메시지 스냅샷:', {
                    size: snapshot.size,
                    docs: snapshot.docs.map(doc => ({
                        id: doc.id,
                        read: doc.data().read,
                    }))
                });
                counters.userMessage.set(snapshot.size);
            },
            (error) => {
                console.error('메시지 구독 에러:', error);
            }
        )
    );

    // 2. userCashNew: 사용자의 진행중인 충전/환전
    subscriptions.push(
        onSnapshot(
            query(
                collection(db, 'cashLogs'),
                where('userId', '==', userId),
                where('status', '==', 'requested')
            ),
            (snapshot) => counters.userCashNew.set(snapshot.size)
        )
    );

    // 3. userTradeNew: 사용자의 진행중인 거래
    subscriptions.push(
        onSnapshot(
            query(
                collection(db, 'tradeLogs'),
                where('userId', '==', userId),
                where('status', 'in', ['requested', 'pending', 'confirmed'])
            ),
            (snapshot) => counters.userTradeNew.set(snapshot.size)
        )
    );

    // 4. tradeNew: 전체 진행중인 거래 (관리자용)
    subscriptions.push(
        onSnapshot(
            query(
                collection(db, 'tradeLogs'),
                where('status', 'in', ['requested', 'pending', 'confirmed'])
            ),
            (snapshot) => counters.tradeNew.set(snapshot.size)
        )
    );

    // 5. depositNew: 진행중인 입금 요청 (관리자용)
    subscriptions.push(
        onSnapshot(
            query(
                collection(db, 'cashLogs'),
                where('type', '==', 'deposit'),
                where('status', '==', 'requested')
            ),
            (snapshot) => counters.depositNew.set(snapshot.size)
        )
    );

    return () => subscriptions.forEach(unsubscribe => unsubscribe());
}

// 싱글톤 인스턴스를 위한 전역 변수
let isInitialized = false;

// MessageService 클래스 수정
class MessageService {
    private cleanup: (() => void) | null = null;
    private userUnsubscribe: (() => void) | null = null;

    // 초기화 메서드
    init() {
        if (isInitialized) {
            return;
        }
        
        isInitialized = true;

        this.userUnsubscribe = user.subscribe((currentUser) => {
            
            if (currentUser?.uid) {
                this.startSubscriptions(currentUser.uid);
            } else {
                this.stopSubscriptions();
            }
        });

        // cleanup 함수 반환
        return () => {
            this.dispose();
        };
    }

    // 구독 시작
    public startSubscriptions(userId: string) {
      
        // 기존 구독 정리
        this.stopSubscriptions();

        // 스토어 초기화
        Object.values(counters).forEach(store => store.set(0));

        this.cleanup = setupCounterSubscriptions(userId);
    }

    // 구독 정리
    public stopSubscriptions() {
        if (this.cleanup) {
            this.cleanup();
            this.cleanup = null;
        }
    }

    // 전체 정리
    private dispose() {
        this.stopSubscriptions();
        if (this.userUnsubscribe) {
            this.userUnsubscribe();
            this.userUnsubscribe = null;
        }
        isInitialized = false;
    }
}

export const messageService = new MessageService();

// initializeCounters 대신 messageService.init() 사용
export const initializeCounters = () => messageService.init();

