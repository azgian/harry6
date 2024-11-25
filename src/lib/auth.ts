import { writable } from 'svelte/store';
import { auth, db } from '$lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, getDoc, collection, query, where, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { 
    serverTimestamp, 
    Timestamp,
} from 'firebase/firestore';
import type { Wallet } from '$lib/types';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { initWallets } from '$lib/fynx';
import { messageService } from './message/service';

export type TransactionStatus = 
  | 'requested'   // 요청됨 (신청)
  | 'pending'     // 처리중 (승인됨/진행중)
  | 'confirmed'   // 확인됨
  | 'completed'   // 완료됨
  | 'rejected'    // 거절됨
  | 'cancelled'   // 취소됨
  | 'failed';     // 실패됨

// 활동 유형
export type ActivityType = 
  | 'trade'       // 거래
  | 'deposit'     // 입금
  | 'withdraw'    // 출금
  | 'wallet'      // 지갑 관련
  | 'system';     // 시스템 작업

// User 타입에서 사용
export type RecentActivity = {
  type: ActivityType;
  amount?: number;
  timestamp: Timestamp;
  description: string;
  status: TransactionStatus;
  relatedId?: string;
};

// User 타입 업데이트
export type User = FirebaseUser & {
  phone?: string;
  role?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  wallets?: Wallet[];
  unreadMessageCount?: number;
  assets: {
    cash: number;
    coin: number;
    lastUpdated: Timestamp;
  };
  recentActivity?: RecentActivity;
};

export const user = writable<User | null>(null);
export const isAdminStore = writable<boolean>(false);
export const admins = writable<User[]>([]);

// 캐시 TTL 설정 (예: 5분)
const CACHE_TTL = 5 * 60 * 1000;

export const userCache = writable<Record<string, { user: User; timestamp: number }>>({});

export const getUser = async (userId: string) => {
    let cachedData: { user: User; timestamp: number } | undefined;
    userCache.subscribe(cache => {
        cachedData = cache[userId];
    })();

    // 유효한 캐시가 있으면 사용
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
        return cachedData.user;
    }

    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const userData = {
                uid: userId,
                ...userDoc.data()
            } as User;

            // 캐시 업데이트
            userCache.update(cache => ({
                ...cache,
                [userId]: {
                    user: userData,
                    timestamp: Date.now()
                }
            }));

            return userData;
        }
        return null;
    } catch (error) {
        console.error('유저 정보 로드 실패:', error);
        return null;
    }
};

let unsubscribe: (() => void) | undefined;
let adminUnsubscribe: (() => void) | undefined;

// admin 사용자 목록 실시간 업데이트
const subscribeToAdmins = () => {
    // 이미 구독 중이면 중복 구독 방지
    if (adminUnsubscribe) {
        adminUnsubscribe();
    }

    const q = query(
        collection(db, 'users'),
        where('role', '==', 'admin')
    );

    adminUnsubscribe = onSnapshot(q, (snapshot) => {
        const adminUsers: User[] = [];
        snapshot.forEach((doc) => {
            adminUsers.push({
                uid: doc.id,
                ...doc.data()
            } as User);
        });
        admins.set(adminUsers);
    }, (error) => {
        console.error('Admin 목록 구독 에러:', error);
        admins.set([]);
    });

    return adminUnsubscribe;
};

// auth 상태 변경 리스너 수정
auth.onAuthStateChanged((userData) => {
    if (userData) {
        if (unsubscribe) {
            unsubscribe();
        }
        
        unsubscribe = onSnapshot(
            doc(db, 'users', userData.uid), 
            async (userDoc) => {
                const firestoreData = userDoc.exists() ? userDoc.data() : {};
                
                user.set({
                    ...userData,
                    ...firestoreData,
                    updatedAt: serverTimestamp()
                } as User);
                isAdminStore.set(firestoreData.role === 'admin');
            }
        );

        // 로그인 상태에서는 항상 admin 목록 구독
        subscribeToAdmins();
        
        // 메시지 서비스 구독 시작
        messageService.startSubscriptions(userData.uid);
    } else {
        if (unsubscribe) {
            unsubscribe();
        }
        if (adminUnsubscribe) {
            adminUnsubscribe();
        }
        
        // 메시지 서비스 구독 정리
        messageService.stopSubscriptions();
        
        user.set(null);
        admins.set([]); // admin 목록 초기화
    }
});

// admin 목록을 가져오는 함수 추가 (일회성 조회용)
export const getAdminUsers = async (): Promise<User[]> => {
    try {
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'admin')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        } as User));
    } catch (error) {
        console.error('Admin 목록 조회 실패:', error);
        return [];
    }
};


export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const now = Timestamp.now();

    // 이메일 인증 메일 발송 먼저 시도
    try {
      await sendEmailVerification(user, {
        url: window.location.origin + '/', // 인증 후 리다이렉트될 URL
        handleCodeInApp: true,
      });
    } catch (emailError) {
      console.error('이메일 인증 발송 실패:', emailError);
      await user.delete();
      throw new Error('인증 이메일 발송에 실패했습니다. 다시 시도해주세요.');
    }

    // Firestore에 사용자 데이터 저장
    try {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        createdAt: now,
        updatedAt: now,
        role: 'user',
        wallets: initWallets,
        emailVerified: false, // 이메일 인증 상태 추가
        assets: {
          cash: 0,
          coin: 0,
          lastUpdated: now
        },
        recentActivity: {
          type: 'system' as ActivityType,
          timestamp: now,
          description: '회원가입 완료',
          status: 'completed' as TransactionStatus
        }
      });
    } catch (firestoreError) {
      console.error('Firestore 사용자 데이터 저장 실패:', firestoreError);
      await user.delete();
      throw new Error('회원가입 처리 중 오류가 발생했습니다.');
    }

    await auth.signOut();
    return user;
  } catch (error) {
    console.error('회원가입 오류:', error);
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 이메일 인증 체크
    if (!user.emailVerified) {
      // 인증 메일 재발송 시도
      try {
        await sendEmailVerification(user, {
          url: window.location.origin + '/',
          handleCodeInApp: true,
        });
        await auth.signOut();
        throw new Error('이메일 인증이 필요합니다. 새로운 인증 메일을 발송했습니다. 이메일을 확인해주세요.');
      } catch (err: unknown) {
        await auth.signOut();
        if (err instanceof Error) {
          throw new Error('이메일 인증이 필요합니다. 인증 메일 재발송에 실패했습니다.');
        }
        throw new Error('이메일 인증이 필요합니다. 인증 메일 재발송에 실패했습니다.');
      }
    }

    const now = Timestamp.now();
    await updateDoc(doc(db, 'users', user.uid), {
      updatedAt: now,
      emailVerified: user.emailVerified, // 이메일 인증 상태 업데이트
      recentActivity: {
        type: 'system' as ActivityType,
        timestamp: now,
        description: '로그인',
        status: 'completed' as TransactionStatus
      }
    });

    return user;
  } catch (error: unknown) {
    console.error('로그인 오류:', error);
    throw error;
  }
};

// 로그아웃
export const signOut = async () => {
  try {
    const uid = auth.currentUser?.uid;
    if (uid) {
      // 로그아웃 전 활동 기록
      const now = Timestamp.now();
      await updateDoc(doc(db, 'users', uid), {
        updatedAt: now,
        recentActivity: {
          type: 'system' as ActivityType,
          timestamp: now,
          description: '로그아웃',
          status: 'completed' as TransactionStatus
        }
      });
    }
    
    // 메시지 서비스 정리는 onAuthStateChanged에서 자동으로 처리됨
    await auth.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};
