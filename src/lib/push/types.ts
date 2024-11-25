export interface NotificationOptions {
  title: string;
  message: string;
  url?: string;
  imageUrl?: string;
  userId?: string;
  type?: 'system' | 'trade' | 'deposit' | 'admin_notification';
  data?: Record<string, unknown>;
}

export interface OneSignalConfig {
  appId: string;
  safari_web_id?: string;
  allowLocalhostAsSecureOrigin?: boolean;
  serviceWorkerPath?: string;
  serviceWorkerParam?: {
    scope: string;
  };
}

export interface OneSignalResponse {
  id: string;
  recipients: number;
  external_id?: string;
}

export interface OneSignalError {
  errors: string[];
  httpCode?: number;
}

declare global {
  interface Window {
    OneSignal?: unknown[] | {
      init: (config: OneSignalConfig) => void;
      showNativePrompt: () => Promise<void>;
      setExternalUserId: (id: string) => Promise<void>;
      on: (event: string, listener: (data: unknown) => void) => void;
    };
  }
}