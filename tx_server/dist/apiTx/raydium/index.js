var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import RaydiumSwap from './RaydiumSwap.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { swapConfig } from './swapConfig.js';
import { URL_EXTRA_NODE, PRIVATE_KEY } from '../../CONFIG.js';
import { LIQUIDITY_STATE_LAYOUT_V4, MAINNET_PROGRAM_ID, MARKET_STATE_LAYOUT_V3 } from "@raydium-io/raydium-sdk";
const getPoolKeys = (ammId, connection) => __awaiter(void 0, void 0, void 0, function* () {
    const ammAccount = yield connection.getAccountInfo(new PublicKey(ammId));
    if (ammAccount) {
        const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(ammAccount.data);
        const marketAccount = yield connection.getAccountInfo(poolState.marketId);
        if (marketAccount) {
            const marketState = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);
            const marketAuthority = PublicKey.createProgramAddressSync([
                marketState.ownAddress.toBuffer(),
                marketState.vaultSignerNonce.toArrayLike(Buffer, "le", 8),
            ], MAINNET_PROGRAM_ID.OPENBOOK_MARKET);
            return {
                id: new PublicKey(ammId),
                programId: MAINNET_PROGRAM_ID.AmmV4,
                status: poolState.status,
                baseDecimals: poolState.baseDecimal.toNumber(),
                quoteDecimals: poolState.quoteDecimal.toNumber(),
                lpDecimals: 9,
                baseMint: poolState.baseMint,
                quoteMint: poolState.quoteMint,
                version: 4,
                authority: new PublicKey("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"),
                openOrders: poolState.openOrders,
                baseVault: poolState.baseVault,
                quoteVault: poolState.quoteVault,
                marketProgramId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
                marketId: marketState.ownAddress,
                marketBids: marketState.bids,
                marketAsks: marketState.asks,
                marketEventQueue: marketState.eventQueue,
                marketBaseVault: marketState.baseVault,
                marketQuoteVault: marketState.quoteVault,
                marketAuthority: marketAuthority,
                targetOrders: poolState.targetOrders,
                lpMint: poolState.lpMint,
            };
        }
    }
});
/**
 * Performs a token swap on the Raydium protocol.
 * Depending on the configuration, it can execute the swap or simulate it.
 */
export const raydium_swap = (mintStr, pool_adrr, token_a_amount, direction) => __awaiter(void 0, void 0, void 0, function* () {
    /**
     * The RaydiumSwap instance for handling swaps.
     */
    const raydiumSwap = new RaydiumSwap(URL_EXTRA_NODE, PRIVATE_KEY);
    console.log(`Raydium swap initialized`);
    /**
     * Find pool information for the given token pair.
     */
    let connection;
    connection = new Connection(URL_EXTRA_NODE, 'confirmed');
    const poolInfo = yield getPoolKeys(pool_adrr, connection);
    if (!poolInfo) {
        console.log('Failed to fectch poolInfo');
        return;
    }
    if (direction) {
        console.log('(Raydium) Sell');
    }
    else {
        console.log('(Raydium) Buy');
    }
    const tx = yield raydiumSwap.getSwapTransaction(mintStr, token_a_amount, poolInfo, swapConfig.maxLamports, swapConfig.useVersionedTransaction, swapConfig.direction);
    /**
     * Depending on the configuration, execute or simulate the swap.
    */
    const maxAttempts = 4;
    let attempt = 0;
    let transaction, signature;
    while (attempt < maxAttempts) {
        try {
            attempt++;
            console.log(`(Raydium) Attempt ${attempt} of ${maxAttempts}`);
            if (swapConfig.executeSwap) {
                /**
                 * Send the transaction to the network and log the transaction ID.
                 */
                signature = swapConfig.useVersionedTransaction
                    ? yield raydiumSwap.sendVersionedTransaction(tx, swapConfig.maxRetries)
                    : yield raydiumSwap.sendLegacyTransaction(tx, swapConfig.maxRetries);
                console.log(`SWAP RAYDIUM https://solscan.io/tx/${signature}`);
                return (signature);
            }
            else {
                /**
                 * Simulate the transaction and log the result.
                 */
                const simRes = swapConfig.useVersionedTransaction
                    ? yield raydiumSwap.simulateVersionedTransaction(tx)
                    : yield raydiumSwap.simulateLegacyTransaction(tx);
                console.log(simRes);
            }
        }
        catch (error) {
            console.log(`Error on attempt ${attempt}:`, error);
            if (attempt >= maxAttempts) {
                console.log('Max attempts reached. Unable to complete transaction.');
                console.log(error);
                return;
            }
            else {
                console.log('Retrying transaction...');
            }
        }
    }
});
