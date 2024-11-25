export const coinsData = [
    {
        id: "usdt_trc20",
        name: "USDT",
        symbol: "USDT_KRW",
        network: "TRC20",
        logo: "/images/coin/usdt_trc20.png",
        order: 1,
        isUse: true,
    },
];

export const symbolsData = coinsData
    .filter(coin => coin.isUse)
    .map(coin => coin.symbol);

export const getCoinSymbol = (coinId: string) => {
    const coin = coinsData.find(coin => coin.id === coinId);
    return coin?.symbol;
};