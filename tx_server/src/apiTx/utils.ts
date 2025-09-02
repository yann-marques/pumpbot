import { ComputeBudgetProgram, Keypair } from '@solana/web3.js';
import { Connection, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction, SendTransactionError } from '@solana/web3.js';
import { getAccount, TokenAccountNotFoundError, Account, getMint, AccountLayout } from '@solana/spl-token';
import { getLogs, getSimulationComputeUnits } from '@solana-developers/helpers'
import { GLOBAL, FEE_RECIPIENT, SYSTEM_PROGRAM_ID, RENT, PUMP_FUN_ACCOUNT, PUMP_FUN_PROGRAM, ASSOC_TOKEN_ACC_PROG, TOKEN_PROGRAM_ID } from './constants.js';
import bs58 from 'bs58';

import { sendSms } from '../tx_server.js';
import { URL_EXTRA_NODE } from '../CONFIG.js'

//import { raydium_swap } from './raydium/index.js'

export async function getKeyPairFromPrivateKey(key: string) {
    return Keypair.fromSecretKey(
        new Uint8Array(bs58.decode(key))
    );
}

export async function createTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  priorityFeeInSol: number,
): Promise<Transaction> {

    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 100000,
    });

    const transaction = new Transaction();
    transaction.add(modifyComputeUnits)

    if (priorityFeeInSol > 0) {
        const microLamports = priorityFeeInSol * 1_000_000_000; // convert SOL to microLamports
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports,
        });
        transaction.add(addPriorityFee);
    }

    transaction.add(...instructions);

    transaction.feePayer = payer;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    return transaction;
}

export async function getTokenBalance(
    walletAddress: string,
    mintAddress: string
  ): Promise<number> {

    const connection = new Connection(
        URL_EXTRA_NODE,
        'confirmed'
    );

    const walletPublicKey = new PublicKey(walletAddress);
    const mintPublicKey = new PublicKey(mintAddress);
    let tokenAccounts: any
  
    try {
        tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
          mint: mintPublicKey,
        });
    } catch (error)
    {
        throw new Error()
    }
  
    if (tokenAccounts.value.length === 0) {
        return (0);
    }
  
    const accountInfo = tokenAccounts.value[0].account.data.parsed.info;
    const tokenBalance = accountInfo.tokenAmount.uiAmount;
  
    return tokenBalance;
}

export async function getDecimals(
    mintAddresse: string
    ): Promise<number> {

    const connection = new Connection(
        URL_EXTRA_NODE,
        'confirmed'
    );

    const mint = new PublicKey(mintAddresse);

    const mintInfo = await getMint(connection, mint);
    if (!mintInfo)
        return (0);
    const decimals = mintInfo.decimals;
    return (decimals)
}

export async function getSolanaAccountBalance(
    connection: Connection,
    publicKeyString: string,
  ): Promise<number> {
    try {
        const publicKey = new PublicKey(publicKeyString);
        const balance = await connection.getBalance(publicKey);
        const solBalance = balance / 10**9;
        return solBalance;

    } catch (error) {
        console.error('Error fetching Solana account balance:', error);
        return (0);
    }
}

export async function getTokensOwnedByAccount(accountPubkey: string) {
    const connection = new Connection(
        URL_EXTRA_NODE,
        'confirmed'
    );
    const publicKey = new PublicKey(accountPubkey);
  
    // Fetch all token accounts owned by the account
    const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID
    });
  
    const tokens = tokenAccounts.value.map(tokenAccount => {
        const accountData = AccountLayout.decode(tokenAccount.account.data);
        return {
            tokenMint: new PublicKey(accountData.mint).toBase58(),
            amount: accountData.amount,
            owner: new PublicKey(accountData.owner).toBase58(),
        };
    });
  
    return tokens;
}

export async function sendAndConfirmTransactionWrapper(connection: Connection, transaction: Transaction, signers: any[], mintStr: string) {
    try {
        const timeout = new Promise((_, reject) =>
            setTimeout(() => {
                reject(new Error('Transaction confirmation timed out'));
            }, 13 * 1000) // 13 seconds timeout
        );
        
        let signature;
        try {
            signature = await Promise.race([
                (async () => {
                    const sig = await sendAndConfirmTransaction(connection, transaction, signers, { skipPreflight: true, preflightCommitment: 'confirmed', maxRetries: 4 });
                    return sig;
                })(),
                timeout,
            ]);
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
        
        if (signature) {
            console.log('Transaction confirmed with signature:', signature);
        }
        return signature;
    } catch (error) {
        console.error('Error sending transaction:', error);
        return null;
    }
}

export async function getTop2OnCurveHolder(tokenMintAddress: string) {
    try {
        const connection = new Connection(
            URL_EXTRA_NODE,
            'confirmed'
        );
    
        const mint = new PublicKey(tokenMintAddress);
      
        const largestAccountsResponse = await connection.getTokenLargestAccounts(mint);
        const largestAccounts = largestAccountsResponse.value;

        const top20percent = []
        
        for (const accountInfo of largestAccounts) {
            console.log(`${ (Number(accountInfo.amount) / 1000000000000000) * 100}`);
            top20percent.push( (Number(accountInfo.amount) / 1000000000000000) * 100 );
        }

        return (top20percent)

    } catch (error) {
        console.log(error)
    }
}

export function bufferFromUInt64(value: number | string) {
    let buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(BigInt(value));
    return buffer;
}

export function bufferFromUF64(value: number) {
    let buffer = Buffer.alloc(8);
    buffer.writeDoubleLE(value);
    return buffer;
}