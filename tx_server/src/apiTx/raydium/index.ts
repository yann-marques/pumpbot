import RaydiumSwap from './RaydiumSwap.js';
import { Connection, PublicKey, Transaction, VersionedTransaction, Commitment} from '@solana/web3.js';
import { swapConfig } from './swapConfig.js';

import { URL_EXTRA_NODE, PRIVATE_KEY, PUBLIC_KEY } from '../../CONFIG.js'
import { getTokenBalance } from '../utils.js'

import {
    LIQUIDITY_STATE_LAYOUT_V4,
    LiquidityPoolKeys,
    MAINNET_PROGRAM_ID,
    MARKET_STATE_LAYOUT_V3
  } from "@raydium-io/raydium-sdk";
  
const getPoolKeys = async (ammId: string, connection: Connection) => {
    const ammAccount = await connection.getAccountInfo(new PublicKey(ammId));
    if (ammAccount) {
        const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(ammAccount.data);
        const marketAccount = await connection.getAccountInfo(poolState.marketId);
        if (marketAccount) {
            const marketState = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);
            const marketAuthority = PublicKey.createProgramAddressSync(
                [
                    marketState.ownAddress.toBuffer(),
                    marketState.vaultSignerNonce.toArrayLike(Buffer, "le", 8),
                ],
                MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
            );
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
                authority: new PublicKey(
                    "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
                ),
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
            } as unknown as LiquidityPoolKeys;
        }
    }
};


/**
 * Performs a token swap on the Raydium protocol.
 * Depending on the configuration, it can execute the swap or simulate it.
 */
export const raydium_swap = async (mintStr: string, pool_adrr: string, token_a_amount: number, direction: boolean) => {
    /**
     * The RaydiumSwap instance for handling swaps.
     */
    const raydiumSwap = new RaydiumSwap(URL_EXTRA_NODE, PRIVATE_KEY);
    console.log(`Raydium swap initialized`);

    /**
     * Find pool information for the given token pair.
     */

    let connection: Connection
    connection = new Connection(
        URL_EXTRA_NODE,
        'confirmed'
    );

    const poolInfo = await getPoolKeys(pool_adrr, connection);

    if (!poolInfo)
    {
        console.log('Failed to fectch poolInfo')
        return ;
    }

    if (direction)
    {
        console.log('(Raydium) Sell')
    }
    else
    {
        console.log('(Raydium) Buy')
    }

    const tx = await raydiumSwap.getSwapTransaction(
        mintStr,
        token_a_amount,
        poolInfo,
        swapConfig.maxLamports, 
        swapConfig.useVersionedTransaction,
        swapConfig.direction
    );

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
                ? await raydiumSwap.sendVersionedTransaction(tx as VersionedTransaction, swapConfig.maxRetries)
                : await raydiumSwap.sendLegacyTransaction(tx as Transaction, swapConfig.maxRetries);
        
                console.log(`SWAP RAYDIUM https://solscan.io/tx/${signature}`);
                return (signature);
        
            } else {
                /**
                 * Simulate the transaction and log the result.
                 */
                const simRes = swapConfig.useVersionedTransaction
                ? await raydiumSwap.simulateVersionedTransaction(tx as VersionedTransaction)
                : await raydiumSwap.simulateLegacyTransaction(tx as Transaction);
        
                console.log(simRes);
            }

        } catch (error) {
            console.log(`Error on attempt ${attempt}:`, error);

            if (attempt >= maxAttempts) {
                console.log('Max attempts reached. Unable to complete transaction.');
                console.log(error)
                return ;
            } else {
                console.log('Retrying transaction...');
            }
        }
    }
};