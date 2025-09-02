import { Connection, LAMPORTS_PER_SOL, PublicKey, Transaction, TransactionInstruction, clusterApiUrl } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getMint, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getKeyPairFromPrivateKey, createTransaction, sendAndConfirmTransactionWrapper, bufferFromUInt64, bufferFromUF64, getTokenBalance, getSolanaAccountBalance } from './utils.js';
import { getCoinData } from './api.js';
import { TransactionMode } from './types.js';
import { GLOBAL, FEE_RECIPIENT, SYSTEM_PROGRAM_ID, RENT, PUMP_FUN_ACCOUNT, PUMP_FUN_PROGRAM, ASSOC_TOKEN_ACC_PROG } from './constants.js';
import { Float } from '@solana/buffer-layout';

import { URL_EXTRA_NODE } from '../CONFIG.js'


export async function pumpFunBuy(transactionMode: TransactionMode, payerPrivateKey: string, mintStr: string, solIn: number, priorityFeeInSol: number = 0, slippageDecimal: number = 0.25) {
    try {
        let connection: Connection
        connection = new Connection(
            URL_EXTRA_NODE,
            'confirmed'
        );

        const coinData = await getCoinData(mintStr);
        if (!coinData) {
            console.error('Failed to retrieve coin data...');
            return;
        }

        const payer = await getKeyPairFromPrivateKey(payerPrivateKey);
        const owner = payer.publicKey;
        const mint = new PublicKey(mintStr);

        const txBuilder = new Transaction();

        const tokenAccountAddress = await getAssociatedTokenAddress(
            mint,
            owner,
            false
        );

        const tokenAccountInfo = await connection.getAccountInfo(tokenAccountAddress);

        let tokenAccount: PublicKey;
        if (!tokenAccountInfo) {
            txBuilder.add(
                createAssociatedTokenAccountInstruction(
                    payer.publicKey,
                    tokenAccountAddress,
                    payer.publicKey,
                    mint
                )
            );
            tokenAccount = tokenAccountAddress;
        } else {
            tokenAccount = tokenAccountAddress;
        }

        const solInLamports = solIn * LAMPORTS_PER_SOL;
        const tokenOut = Math.floor(solInLamports * coinData["virtual_token_reserves"] / coinData["virtual_sol_reserves"]);

        const solInWithSlippage = solIn * (1 + slippageDecimal);
        const maxSolCost = Math.floor(solInWithSlippage * LAMPORTS_PER_SOL);
        const ASSOCIATED_USER = tokenAccount;
        const USER = owner;
        const BONDING_CURVE = new PublicKey(coinData['bonding_curve']);
        const ASSOCIATED_BONDING_CURVE = new PublicKey(coinData['associated_bonding_curve']);

        const keys = [
            { pubkey: GLOBAL, isSigner: false, isWritable: false },
            { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: BONDING_CURVE, isSigner: false, isWritable: true },
            { pubkey: ASSOCIATED_BONDING_CURVE, isSigner: false, isWritable: true },
            { pubkey: ASSOCIATED_USER, isSigner: false, isWritable: true },
            { pubkey: USER, isSigner: false, isWritable: true },
            { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: RENT, isSigner: false, isWritable: false },
            { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
            { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false },
        ];

        const data = Buffer.concat([
            bufferFromUInt64("16927863322537952870"),
            bufferFromUInt64(tokenOut),
            bufferFromUInt64(maxSolCost)
        ]);

        const instruction = new TransactionInstruction({
            keys: keys,
            programId: PUMP_FUN_PROGRAM,
            data: data
        });
        txBuilder.add(instruction);


        const maxAttempts = 6;
        let attempt = 0;
        let success = false;
        let transaction, signature;

        while (attempt < maxAttempts && !success) {
            try {
                attempt++;
                console.log(`Attempt ${attempt} of ${maxAttempts}`);

                transaction = await createTransaction(connection, txBuilder.instructions, payer.publicKey, priorityFeeInSol);
            
                if (transactionMode == TransactionMode.Execution) {

                    let time = Math.floor(Date.now() / 1000);
                    signature = await sendAndConfirmTransactionWrapper(connection, transaction, [payer], mintStr);
                    console.log(`time to sendAndConfirmTransaction ${Math.floor(Date.now() / 1000) - time}s`);
                    
                    if (signature)
                    {
                        success = true;
                        return (signature)
                    }

                } else if (transactionMode == TransactionMode.Simulation) {
                    const simulatedResult = await connection.simulateTransaction(transaction);
                    console.log(simulatedResult);
                    success = true;
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
    } catch (error) {
        console.log(error);
    }
}


export async function pumpFunSell(transactionMode: TransactionMode, payerPrivateKey: string, mintStr: string, priorityFeeInSol: number = 0, slippageDecimal: number = 0.25) {
    try {
        let connection: Connection
        connection = new Connection(
            URL_EXTRA_NODE,
            'confirmed'
        );

        const coinData = await getCoinData(mintStr);
        if (!coinData) {
            console.error('Failed to retrieve coin data...');
            return;
        }

        const payer = await getKeyPairFromPrivateKey(payerPrivateKey);
        const owner = payer.publicKey;
        const mint = new PublicKey(mintStr);
        const txBuilder = new Transaction();

        const tokenAccountAddress = await getAssociatedTokenAddress(
            mint,
            owner,
            false
        );

        const tokenAccountInfo = await connection.getAccountInfo(tokenAccountAddress);

        let tokenAccount: PublicKey;
        if (!tokenAccountInfo) {
            txBuilder.add(
                createAssociatedTokenAccountInstruction(
                    payer.publicKey,
                    tokenAccountAddress,
                    payer.publicKey,
                    mint
                )
            );
            tokenAccount = tokenAccountAddress;
        } else {
            tokenAccount = tokenAccountAddress;
        }

        const mintInfo = await getMint(connection, mint);
        if (!mintInfo)
            return ;
        const decimals = mintInfo.decimals;

        let tokenBalance
        let rawTokenBalance

        rawTokenBalance = Number(await getTokenBalance(payer.publicKey.toString(), mintStr))
        if (rawTokenBalance == 0)
        {
            console.log(`rawTokenBalance on sell for (${mintStr}) is 0 so already sell.`)
            return ;
        }

        tokenBalance = rawTokenBalance * Math.pow(10, decimals);

        const minSolOutput = Math.floor(tokenBalance! * (1 - slippageDecimal) * coinData["virtual_sol_reserves"] / coinData["virtual_token_reserves"]);

        const keys = [
            { pubkey: GLOBAL, isSigner: false, isWritable: false },
            { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: new PublicKey(coinData['bonding_curve']), isSigner: false, isWritable: true },
            { pubkey: new PublicKey(coinData['associated_bonding_curve']), isSigner: false, isWritable: true },
            { pubkey: tokenAccount, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: true },
            { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: ASSOC_TOKEN_ACC_PROG, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
            { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false }
        ];

        let buffer_token_balance: Buffer
        try {
            buffer_token_balance = bufferFromUInt64(tokenBalance)
        } catch {
            buffer_token_balance = bufferFromUInt64(Math.floor(tokenBalance))
        }

        const data = Buffer.concat([
            bufferFromUInt64("12502976635542562355"),
            buffer_token_balance,
            bufferFromUInt64(minSolOutput)
        ]);

        const instruction = new TransactionInstruction({
            keys: keys,
            programId: PUMP_FUN_PROGRAM,
            data: data
        });
        txBuilder.add(instruction);


        const maxAttempts = 6;
        let attempt = 0;
        let success = false;
        let transaction, signature;

        while (attempt < maxAttempts && !success) {
            try {
                attempt++;
                console.log(`Attempt ${attempt} of ${maxAttempts}`);

                transaction = await createTransaction(connection, txBuilder.instructions, payer.publicKey, priorityFeeInSol);

                if (transactionMode == TransactionMode.Execution) {

                    let time = Math.floor(Date.now() / 1000)
                    signature = await sendAndConfirmTransactionWrapper(connection, transaction, [payer], mintStr);
                    console.log(`time to sendAndConfirmTransaction ${Math.floor(Date.now() / 1000) - time}s`)

                    if (signature)
                    {
                        success = true;
                        return (signature)
                    }
                }
                else if (transactionMode == TransactionMode.Simulation) {
                    const simulatedResult = await connection.simulateTransaction(transaction);
                    console.log(simulatedResult)
                    success = true;
                }
            }
            catch (error) {
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
    }
    catch (error) {
        console.log(error)
    }
}

export async function getAcBalance(adresse: string, solUsdPrice: number) {
    try {
        const connection = new Connection(
            URL_EXTRA_NODE,
            'confirmed'
        );

        return ((await getSolanaAccountBalance(connection, adresse)) * solUsdPrice);
    }
    catch (error) {
        console.log(error)
    }
}