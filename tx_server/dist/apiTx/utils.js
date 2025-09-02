var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ComputeBudgetProgram, Keypair } from '@solana/web3.js';
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getMint, AccountLayout } from '@solana/spl-token';
import { TOKEN_PROGRAM_ID } from './constants.js';
import bs58 from 'bs58';
import { URL_EXTRA_NODE } from '../CONFIG.js';
//import { raydium_swap } from './raydium/index.js'
export function getKeyPairFromPrivateKey(key) {
    return __awaiter(this, void 0, void 0, function* () {
        return Keypair.fromSecretKey(new Uint8Array(bs58.decode(key)));
    });
}
export function createTransaction(connection, instructions, payer, priorityFeeInSol) {
    return __awaiter(this, void 0, void 0, function* () {
        const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
            units: 100000,
        });
        const transaction = new Transaction();
        transaction.add(modifyComputeUnits);
        if (priorityFeeInSol > 0) {
            const microLamports = priorityFeeInSol * 1000000000; // convert SOL to microLamports
            const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
                microLamports,
            });
            transaction.add(addPriorityFee);
        }
        transaction.add(...instructions);
        transaction.feePayer = payer;
        transaction.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
        return transaction;
    });
}
export function getTokenBalance(walletAddress, mintAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = new Connection(URL_EXTRA_NODE, 'confirmed');
        const walletPublicKey = new PublicKey(walletAddress);
        const mintPublicKey = new PublicKey(mintAddress);
        let tokenAccounts;
        try {
            tokenAccounts = yield connection.getParsedTokenAccountsByOwner(walletPublicKey, {
                mint: mintPublicKey,
            });
        }
        catch (error) {
            throw new Error();
        }
        if (tokenAccounts.value.length === 0) {
            return (0);
        }
        const accountInfo = tokenAccounts.value[0].account.data.parsed.info;
        const tokenBalance = accountInfo.tokenAmount.uiAmount;
        return tokenBalance;
    });
}
export function getDecimals(mintAddresse) {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = new Connection(URL_EXTRA_NODE, 'confirmed');
        const mint = new PublicKey(mintAddresse);
        const mintInfo = yield getMint(connection, mint);
        if (!mintInfo)
            return (0);
        const decimals = mintInfo.decimals;
        return (decimals);
    });
}
export function getSolanaAccountBalance(connection, publicKeyString) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const publicKey = new PublicKey(publicKeyString);
            const balance = yield connection.getBalance(publicKey);
            const solBalance = balance / Math.pow(10, 9);
            return solBalance;
        }
        catch (error) {
            console.error('Error fetching Solana account balance:', error);
            return (0);
        }
    });
}
export function getTokensOwnedByAccount(accountPubkey) {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = new Connection(URL_EXTRA_NODE, 'confirmed');
        const publicKey = new PublicKey(accountPubkey);
        // Fetch all token accounts owned by the account
        const tokenAccounts = yield connection.getTokenAccountsByOwner(publicKey, {
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
    });
}
export function sendAndConfirmTransactionWrapper(connection, transaction, signers, mintStr) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const timeout = new Promise((_, reject) => setTimeout(() => {
                reject(new Error('Transaction confirmation timed out'));
            }, 13 * 1000) // 13 seconds timeout
            );
            let signature;
            try {
                signature = yield Promise.race([
                    (() => __awaiter(this, void 0, void 0, function* () {
                        const sig = yield sendAndConfirmTransaction(connection, transaction, signers, { skipPreflight: true, preflightCommitment: 'confirmed', maxRetries: 4 });
                        return sig;
                    }))(),
                    timeout,
                ]);
            }
            catch (error) {
                console.error('Error:', error);
                return null;
            }
            if (signature) {
                console.log('Transaction confirmed with signature:', signature);
            }
            return signature;
        }
        catch (error) {
            console.error('Error sending transaction:', error);
            return null;
        }
    });
}
export function getTop2OnCurveHolder(tokenMintAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const connection = new Connection(URL_EXTRA_NODE, 'confirmed');
            const mint = new PublicKey(tokenMintAddress);
            const largestAccountsResponse = yield connection.getTokenLargestAccounts(mint);
            const largestAccounts = largestAccountsResponse.value;
            const top20percent = [];
            for (const accountInfo of largestAccounts) {
                console.log(`${(Number(accountInfo.amount) / 1000000000000000) * 100}`);
                top20percent.push((Number(accountInfo.amount) / 1000000000000000) * 100);
            }
            return (top20percent);
        }
        catch (error) {
            console.log(error);
        }
    });
}
export function bufferFromUInt64(value) {
    let buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(BigInt(value));
    return buffer;
}
export function bufferFromUF64(value) {
    let buffer = Buffer.alloc(8);
    buffer.writeDoubleLE(value);
    return buffer;
}
