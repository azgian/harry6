import { writable, type Writable } from 'svelte/store';

type Counters = {
    userMessage: Writable<number>;
    userCashNew: Writable<number>;
    userTradeNew: Writable<number>;
    tradeNew: Writable<number>;
    depositNew: Writable<number>;
};

// 스토어 생성 함수
function createCounters(): Counters {
    return {
        userMessage: writable(0),
        userCashNew: writable(0),
        userTradeNew: writable(0),
        tradeNew: writable(0),
        depositNew: writable(0)
    };
}

// 싱글톤 인스턴스
let countersInstance: Counters | null = null;

// 스토어 가져오기
export function getCounters(): Counters {
    if (!countersInstance) {
        countersInstance = createCounters();
    }
    return countersInstance;
}

export const counters = getCounters();
