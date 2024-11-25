import { derived } from 'svelte/store';
import { user } from '$lib/auth';
import { initWallets } from '$lib/fynx';
import type { Wallet } from '$lib/types';
// import { auth } from '$lib/firebase';
// import { onAuthStateChanged } from 'firebase/auth';


// // OneSignal 인터페이스 정의
// interface OneSignalType {
//     login(externalId: string): Promise<void>;
//     logout(): Promise<void>;
// }

// // OneSignal 타입 선언
// declare global {
//     interface Window {
//         OneSignalDeferred?: Array<{
//             (OneSignal: OneSignalType): Promise<void> | void;
//         }>;
//     }
// }

// // OneSignal 사용자 연동
// onAuthStateChanged(auth, async (userData) => {
//     if (userData && window.OneSignalDeferred) {
//         // 사용자 로그인 시
//         window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
//             await OneSignal.login(userData.uid);
//         });
//     } else if (window.OneSignalDeferred) {
//         // 로그아웃 시
//         window.OneSignalDeferred.push(async (OneSignal: OneSignalType) => {
//             await OneSignal.logout();
//         });
//     }
// });

// 사용자의 지갑 정보 스토어
export const userWalletsStore = derived(user, ($user) => {
    if ($user?.wallets) {
        return ($user.wallets as unknown) as Wallet[];
    }
    return initWallets;
});

// 사용자의 캐시 정보 스토어
export const userCashStore = derived(user, ($user) => {
    if ($user?.assets?.cash) {
        return $user.assets.cash as number;
    }
    return 0;
});
