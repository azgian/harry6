import type { User } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export interface Wallet {
    address: string;
    network: string;
}

export interface CoinData
{
    id: string;
    name: string;
    symbol: string;
    network: string;
    logo: string;
    order: number;
    isUse: boolean;
}

export interface ItemData
{
    id: string;
    name: string;
    subName: string;
    symbol: string;
    sort: number;
    logo: string;
    price: number;
    sFee: number;
    bFee: number;
    order: number;
    isUse: boolean;
}

export interface ListingData
{
    id: string;
    coinId: string;
    userId: string;
    sort: 'sell' | 'buy';
    amount: number;
    minAmount: number;
    fee: number;
    network: string;
    walletAddress: string;
    createdAt: Timestamp;
    isActive: boolean;
}

export interface RequestData {
    id: string;
    listing: ListingData;
    user: User;
    sort: string;
    price: number;
    reqAmount: number;
    sum: number;
    fee: number;
    networkFee: number;
    resultSum: number;
    network: string;
    txid: string;
    status: {
        [key: string]: number;  // 키는 문자열, 값은 숫자 (타임스탬프)
    };
    created: string;
    updated: string;
}

export interface InputValues {
    name: string;
    value: string | number | null | undefined;
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop';