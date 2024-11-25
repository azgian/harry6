import type { Timestamp } from 'firebase/firestore';

export interface MessageLog {
    userId: string;
    title: string;
    message?: string;
    read: boolean;
    createdAt: Timestamp;
    type?: 'system' | 'trade' | 'deposit' | 'admin';
}

export type CounterType = 'userMessage' | 'userCashNew' | 'userTradeNew' | 'tradeNew' | 'depositNew';
