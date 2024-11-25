import { PUBLIC_ONESIGNAL_APP_ID, PUBLIC_ONESIGNAL_REST_API_KEY } from '$env/static/public';
import type { NotificationOptions } from './types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '$lib/firebase';
import type { TradeLog } from '$lib/types/trade';
import type { OneSignalResponse } from './types';

// 단일 알림 전송
export async function sendPush(data: NotificationOptions) {
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${PUBLIC_ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: PUBLIC_ONESIGNAL_APP_ID,
        include_external_user_ids: [data.userId],
        contents: { en: data.message },
        headings: { en: data.title },
        data: data.data
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OneSignal error:', errorData);
      throw new Error(`Push notification failed: ${errorData.errors?.[0] || 'Unknown error'}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Push notification error:', error);
    // 푸시 실패해도 다른 기능은 계속 진행
    return null;
  }
}

// 어드민 알림
export async function sendAdminPush(title: string, message: string, data?: Record<string, unknown>) {
  try {
    const adminsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'admin')
    );
    const adminsSnapshot = await getDocs(adminsQuery);
    
    const notifications = adminsSnapshot.docs.map(doc => 
      sendPush({
        userId: doc.id,
        title,
        message,
        type: 'admin_notification',
        data
      })
    );

    await Promise.all(notifications);
  } catch (error) {
    console.warn('어드민 푸시 전송 실패:', error);
  }
}

// 거래 알림
export async function sendTradePush(userId: string, tradeData: TradeLog) {
  const typeKr = tradeData.orderType === 'buy' ? '구매' : '판매';
  
  await sendPush({
    userId,
    title: '거래 상태 업데이트',
    message: `${typeKr} 거래가 ${tradeData.status} 상태로 변경되었습니다.`,
    type: 'trade',
    data: { tradeId: tradeData.id }
  });
}

export async function sendPushWithRetry(data: NotificationOptions, maxRetries = 3): Promise<OneSignalResponse | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sendPush(data);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // 지수 백오프
    }
  }
  return null;
}