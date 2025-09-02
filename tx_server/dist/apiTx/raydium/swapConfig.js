export const swapConfig = {
    executeSwap: true, // Send tx when true, simulate tx when false
    useVersionedTransaction: true,
    maxLamports: 10000000, // Micro lamports for priority fee
    direction: "in", // Swap direction: 'in' or 'out'
    liquidityFile: "https://api.raydium.io/v2/sdk/liquidity/mainnet.json",
    maxRetries: 2,
};
