import { writable, get } from "svelte/store";
import { symbolsData } from "./coinsData";

export interface OHLCData {
    t: number;
    o: number;
    h: number;
    l: number;
    c: number;
}

export interface CoinPriceHistory {
    [symbol: string]: {
        [timestamp: number]: OHLCData;
    };
}

export const priceHistoryStore = writable<CoinPriceHistory>({});
export const lastUpdateTimeStore = writable<number>(0);
export const dataReadyStore = writable<boolean>(false);
export const initialDataLoadedStore = writable<boolean>(false);
export const dataInitializedStore = writable<boolean>(false);
export const loadingStore = writable<boolean>(true);

export const getCoinDataLive = async (symbol: string) => {
    try {
        const api_url = `https://api.bithumb.com/public/ticker/${symbol}`;
        const response = await fetch(api_url);
        const data = await response.json();
        
        if (data.status !== "0000") {
            throw new Error(`API 오류: ${data.message}`);
        }
        
        const currentTime = getAlignedTime();
        const closePrice = parseFloat(data.data.closing_price);
        
        priceHistoryStore.update(history => {
            if (!history[symbol]) {
                history[symbol] = {};
            }
            
            // 이전 업데이트와 동일한 시간이면 업데이트 건너뛰기
            const lastUpdate = Math.max(...Object.keys(history[symbol]).map(Number));
            if (lastUpdate === currentTime) {
                return history;
            }
            
            history[symbol][currentTime] = { 
                t: currentTime, 
                o: closePrice, 
                h: closePrice, 
                l: closePrice, 
                c: closePrice 
            };
            
            // 30개만 유지
            const timestamps = Object.keys(history[symbol])
                .map(Number)
                .sort((a, b) => b - a)
                .slice(0, 30);
            
            const newHistory: { [key: number]: OHLCData } = {};
            timestamps.forEach(t => {
                newHistory[t] = history[symbol][t];
            });
            history[symbol] = newHistory;
            
            return history;
        });
        
        lastUpdateTimeStore.set(currentTime);
        return closePrice;
    } catch (error) {
        console.error(`${symbol} 데이터 가져오기 실패:`, error);
        return 0;
    }
}

export const refreshCoinPriceLiveStore = refreshCoinPriceLive();

function refreshCoinPriceLive()
{
    const { subscribe } = writable(null);

    let interval: number | null = null;

    const startUpdating = async () : Promise<void> =>
    {
        if (interval) return;
        await updateCoinPriceLive();
        interval = setInterval(updateCoinPriceLive, 10000) as unknown as number;
    }

    const stopUpdating = () : void =>
    {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
    }

    return {
        subscribe,
        startUpdating,
        stopUpdating
    };    
};

export const updateCoinPriceLive = async () => {
    if (symbolsData.length === 0) {
        console.error('symbols is empty. Fetching coin data...');
        return;
    }
    for (const symbol of symbolsData) {
        try {
            await getCoinDataLive(symbol);
        } catch (error) {
            console.error(`${symbol} 가격 업데이트 오류:`, error);
        }
    }
};

export const getCoinPriceLive = (symbol: string): number => {
    const priceHistory = get(priceHistoryStore);
    const symbolHistory = priceHistory[symbol];
    
    if (symbolHistory && Object.keys(symbolHistory).length > 0) {
        // 타임스탬프로 정렬하여 가장 최근 값 가져오기
        const timestamps = Object.keys(symbolHistory)
            .map(Number)
            .sort((a, b) => b - a);
        
        const lastTimestamp = timestamps[0];
        return symbolHistory[lastTimestamp].h;
    }    
    return 0;
};

// 10초 단위로 정확한 시간 얻기
function getAlignedTime(time: number = Date.now()): number {
    return Math.floor(time / 10000) * 10000;
}

// 초기 데이터로 store를 채우는 함수
export const initializePriceHistoryStore = async () => {
    // 이미 데이터가 있으면 초기화하지 않음
    const currentHistory = get(priceHistoryStore);
    if (Object.keys(currentHistory).length > 0) {
        return;
    }

    try {
        const currentTime = getAlignedTime();
        const initialHistory: CoinPriceHistory = {};

        for (const symbol of symbolsData) {
            const response = await fetch(`https://api.bithumb.com/public/ticker/${symbol}`);
            const data = await response.json();
            
            if (data.status === "0000") {
                const currentPrice = parseFloat(data.data.closing_price);
                initialHistory[symbol] = {};

                // 현재 시세로 30개 데이터 포인트 생성
                for (let i = 29; i >= 0; i--) {
                    const timestamp = currentTime - (i * 10000);
                    initialHistory[symbol][timestamp] = {
                        t: timestamp,
                        o: currentPrice,
                        h: currentPrice,
                        l: currentPrice,
                        c: currentPrice
                    };
                }
            }
        }

        // store가 비어있을 때만 초기화
        priceHistoryStore.set(initialHistory);
        
        // 실시간 업데이트 시작
        refreshCoinPriceLiveStore.startUpdating();

    } catch (error) {
        console.error('Failed to initialize price history:', error);
    }
};

export const resetDataInitialization = () => {
    dataInitializedStore.set(false);
};

export const waitForInitialData = () => {
    return new Promise<void>((resolve) => {
        const unsubscribe = dataInitializedStore.subscribe(value => {
            if (value) {
                unsubscribe();
                resolve();
            }
        });
    });
};

export const getLastStatus = (status: {
	[key: string]: number;
    }): { statusName: string; statusColor: string } => {
	const keys = Object.keys(status);
    const lastStatus = keys.length > 0 ? keys[keys.length - 1] : '';
    let statusName = '';
    let statusColor = '';
    if (lastStatus === 'new') {
        statusName = '신규';
        statusColor = 'yellow';
    }
    if (lastStatus === 'ing') {
        statusName = '진행';
        statusColor = 'orange';
    }
    if (lastStatus === 'end') {
        statusName = '완료';
        statusColor = 'gray';
    }
    return { statusName, statusColor };
};
