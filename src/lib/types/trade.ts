import type { Timestamp } from 'firebase/firestore';
import type { TransactionStatus } from '$lib/auth';

export type OrderType = 'buy' | 'sell';

export interface TradeLog
{
    id: string;
    orderType: OrderType;
    userId: string;
    listingId: string;
    cashLogId?: string;
    coinId: string;
    reqAmount: number;
    price: number;
    totalPrice: number;
    fee: number;
    networkFee: number;
    finalPrice: number;
    network: string;
    walletAddress: string;
    txid?: string;
    status: TransactionStatus;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface Listing
{
    docId: string;
    coinId: string;
    userId: string;
	orderType: OrderType;
    amount: number;
    minAmount: number;
    userFee: number;
    network: string;
    walletAddress: string;
	createdAt: Timestamp;
    isActive: boolean;
};
