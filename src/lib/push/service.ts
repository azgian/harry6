import { PUBLIC_ONESIGNAL_APP_ID, PUBLIC_ONESIGNAL_SAFARI_WEB_ID } from '$env/static/public';
import type { OneSignalConfig } from './types';

class PushService {
  private static instance: PushService;
  private initialized = false;

  private constructor() {}

  static getInstance() {
    if (!PushService.instance) {
      PushService.instance = new PushService();
    }
    return PushService.instance;
  }

  async init() {
    if (this.initialized) return;

    try {
      await this.loadOneSignalScript();
      
      const config: OneSignalConfig = {
        appId: PUBLIC_ONESIGNAL_APP_ID,
        safari_web_id: PUBLIC_ONESIGNAL_SAFARI_WEB_ID,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        serviceWorkerParam: {
          scope: '/push/onesignal/'
        }
      };

      await this.initializeOneSignal(config);
      this.initialized = true;
    } catch (error) {
      console.error('OneSignal 초기화 실패:', error);
      throw error;
    }
  }

  private async loadOneSignalScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.OneSignal) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('OneSignal 스크립트 로드 실패'));
      document.head.appendChild(script);
    });
  }

  private async initializeOneSignal(config: OneSignalConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!window.OneSignal) {
          window.OneSignal = [];
        }

        if (Array.isArray(window.OneSignal)) {
          window.OneSignal.push(() => {
            if (window.OneSignal && !Array.isArray(window.OneSignal)) {
              window.OneSignal.init(config);
              this.setupNotificationHandlers();
              resolve();
            }
          });
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupNotificationHandlers() {
    if (window.OneSignal && !Array.isArray(window.OneSignal)) {
      window.OneSignal.on('notificationClick', (data: unknown) => {
        this.handleNotificationClick(data);
      });
    }
  }

  private async handleNotificationClick(data: unknown) {
    try {
      const notificationData = data as { notification?: { additionalData?: { url?: string } } };
      if (notificationData?.notification?.additionalData?.url) {
        window.open(notificationData.notification.additionalData.url, '_blank');
      }
    } catch (error) {
      console.error('알림 클릭 처리 실패:', error);
    }
  }

  async requestPermission() {
    try {
      if (window.OneSignal && !Array.isArray(window.OneSignal)) {
        await window.OneSignal.showNativePrompt();
      }
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
      throw error;
    }
  }

  async setExternalUserId(userId: string) {
    try {
      if (window.OneSignal && !Array.isArray(window.OneSignal)) {
        await window.OneSignal.setExternalUserId(userId);
      }
    } catch (error) {
      console.error('외부 사용자 ID 설정 실패:', error);
      throw error;
    }
  }
}

export const pushService = PushService.getInstance();