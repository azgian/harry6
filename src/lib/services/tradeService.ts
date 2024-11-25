import { db } from '$lib/firebase';
import type { TradeLog } from '$lib/types/trade';
import type { TransactionStatus } from '$lib/auth';
import { 
  collection, 
  doc, 
  writeBatch, 
  query, 
  where, 
  orderBy, 
  startAfter, 
  limit, 
  onSnapshot, 
  runTransaction, 
  Timestamp,
  getDocs,
  type QueryDocumentSnapshot,
  updateDoc
} from 'firebase/firestore';

export class TradeService {
  private collection = collection(db, 'tradeLogs');

  // 타임스탬프 변환 유틸리티
  private toFirestoreTimestamp(date: Date | number): Timestamp {
    return Timestamp.fromDate(typeof date === 'number' ? new Date(date) : date);
  }

  // 거래 요청 생성
  async createRequest(data: Omit<TradeLog, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
    const batch = writeBatch(db);
    const now = Timestamp.now();

    const requestRef = doc(this.collection);
    batch.set(requestRef, {
      ...data,
      id: requestRef.id,
      status: 'requested' as TransactionStatus,
      createdAt: now,
      updatedAt: now
    });

    await batch.commit();
    return requestRef;
  }

  // 거래 상태 업데이트
  async updateRequestStatus(
    requestId: string, 
    status: TransactionStatus,
    data?: { txid?: string }
  ) {
    const requestRef = doc(this.collection, requestId);
    
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(requestRef);
      if (!docSnap.exists()) {
        throw new Error('Request not found');
      }

      const now = Timestamp.now();

      transaction.update(requestRef, {
        status,
        updatedAt: now,
        ...(data?.txid ? { txid: data.txid } : {})
      });
    });
  }

  // 날짜 범위로 거래 요청 조회
  async getRequestsByDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<TradeLog[]> {
    const requests: TradeLog[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const q = query(
        this.collection,
        where('userId', '==', userId),
        where('createdAt', '>=', this.toFirestoreTimestamp(startDate)),
        where('createdAt', '<=', this.toFirestoreTimestamp(endDate)),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      requests.push(
        ...snapshot.docs.map(doc => ({
          ...doc.data()
        } as TradeLog))
      );

      // 다음 달로 이동
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return requests;
  }

  // 페이지네이션된 거래 요청 조회
  async getRequestsPage(
    userId: string, 
    page: number, 
    pageSize: number,
    lastDoc?: QueryDocumentSnapshot
  ) {
    const baseQuery = query(
      this.collection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    const q = lastDoc 
      ? query(baseQuery, startAfter(lastDoc))
      : baseQuery;

    const snapshot = await getDocs(q);
    
    return {
      requests: snapshot.docs.map(doc => ({
        ...doc.data()
      } as TradeLog)),
      lastDoc: snapshot.docs[snapshot.docs.length - 1]
    };
  }

  // 실시간 거래 요청 감시
  watchRequests(uid: string, callback: (requests: TradeLog[]) => void) {
    const q = query(
      collection(db, 'tradeLogs'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TradeLog[];
      callback(requests);
    });
  }

  // 관리자용 전체 거래 감시
  watchAllRequests(callback: (requests: TradeLog[]) => void) {
    const q = query(
      collection(db, 'tradeLogs'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TradeLog[];
      callback(requests);
    });
  }

  async deleteRequest(requestId: string) {  // 메서드 이름만 변경
    const requestRef = doc(this.collection, requestId);
    
    await runTransaction(db, async (transaction) => {
      const request = await transaction.get(requestRef);
      if (!request.exists()) throw new Error('Request not found');

      // 요청 삭제
      transaction.delete(requestRef);
    });
  }

  async updateTradeLog(tradeId: string, data: Partial<TradeLog>) {
    const tradeRef = doc(this.collection, tradeId);
    await updateDoc(tradeRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  }
}
