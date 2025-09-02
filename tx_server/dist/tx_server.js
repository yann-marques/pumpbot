var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from 'express';
import bodyParser from 'body-parser';
import TelegramBot from 'node-telegram-bot-api';
import { CHAT_ID, PRIVATE_KEY, TOKEN_BOT, PUBLIC_KEY } from "./CONFIG.js";
import { pumpFunBuy, pumpFunSell } from './apiTx/swap.js';
import { TransactionMode } from './apiTx/types.js';
import { getTokenBalance } from './apiTx/utils.js';
import { raydium_swap } from './apiTx/raydium/index.js';
const bot = new TelegramBot(TOKEN_BOT, { polling: true });
export function sendSms(message) {
    return __awaiter(this, void 0, void 0, function* () {
        bot.sendMessage(CHAT_ID, message);
    });
}
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export function getFrenchDateTime() {
    const date = new Date();
    const optionsDate = {
        timeZone: 'Europe/Paris',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    };
    const optionsTime = {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    };
    const dateFormatter = new Intl.DateTimeFormat('fr-FR', optionsDate);
    const formattedDate = dateFormatter.format(date);
    const timeFormatter = new Intl.DateTimeFormat('fr-FR', optionsTime);
    const formattedTime = timeFormatter.format(date);
    return `${formattedDate} ${formattedTime}`;
}
const app = express();
const PORT = 3000;
app.use(bodyParser.json());
app.post('/go_raydium', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { testMode, mintStr, tokenName, percentageSinceBuy } = req.body;
    sendSms(`➡️➡️ (${tokenName}) Go on Raydium! [${mintStr.substring(0, 5)}.] ➡️➡️\nHe leave pumpfun at +${percentageSinceBuy}\n${getFrenchDateTime()}\n\nhttps://bullx.io/terminal?chainId=1399811149&address=${mintStr}`);
    res.status(200).send('Go on raydium');
}));
app.post('/pump_buy', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { testMode, mintStr, solIn, priorityFeeInSol, slippageDecimal, tokenName } = req.body;
    sendSms(`🟢🟢 Buy (Pumpfun) ! (${tokenName}) [${mintStr.substring(0, 5)}.] 🟢🟢\n${getFrenchDateTime()}\n\nhttps://bullx.io/terminal?chainId=1399811149&address=${mintStr}`);
    if (!testMode) {
        try {
            const signature = yield pumpFunBuy(TransactionMode.Execution, PRIVATE_KEY, mintStr, solIn, priorityFeeInSol, slippageDecimal);
            if (signature) {
                res.status(200).send({ signature });
            }
            else {
                res.status(500).send('Failed to execute transaction after all retries !');
            }
        }
        catch (error) {
            res.status(500).send('Error executing transaction');
        }
    }
    else {
        console.log('Tx received but in simu mode.');
        res.status(200).send('Tx received but in simu mode.');
    }
}));
app.post('/pump_sell', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { testMode, mintStr, poolAddr, priorityFeeInSol, slippageDecimal, tokenName, percentageSinceBuy } = req.body;
    if (percentageSinceBuy <= 0)
        sendSms(`🔻🔻 Sell (Pumpfun) ! (${tokenName}) [${mintStr.substring(0, 5)}.] 🔻🔻\n${percentageSinceBuy}% since buy\n${getFrenchDateTime()}\n\nhttps://bullx.io/terminal?chainId=1399811149&address=${mintStr}`);
    else
        sendSms(`🎉🎉🎉 Sell (Pumpfun) ! (${tokenName}) [${mintStr.substring(0, 5)}.] 🎉🎉🎉\n${percentageSinceBuy}% since buy\n${getFrenchDateTime()}\n\nhttps://bullx.io/terminal?chainId=1399811149&address=${mintStr}`);
    if (!testMode) {
        try {
            const signature = yield pumpFunSell(TransactionMode.Execution, PRIVATE_KEY, mintStr, priorityFeeInSol, slippageDecimal);
            if (signature) {
                res.status(200).send({ signature });
            }
            else {
                res.status(500).send('Failed to execute transaction after all retries !');
            }
        }
        catch (error) {
            res.status(500).send('Error executing transaction');
        }
    }
    else {
        console.log('Tx received but in simu mode.');
        res.status(200).send('Tx received but in simu mode.');
    }
}));
app.post('/raydium_buy', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { testMode, mintStr, poolAddr, solIn, priorityFeeInSol, slippageDecimal, tokenName, percentageSinceBuy } = req.body;
    sendSms(`🟢🟢 Buy (Raydium) ! (${tokenName}) [${mintStr.substring(0, 5)}.] 🟢🟢\n${getFrenchDateTime()}\n\nhttps://bullx.io/terminal?chainId=1399811149&address=${mintStr}`);
    if (!testMode) {
        if (poolAddr)
            raydium_swap(mintStr, poolAddr, solIn, false);
        else
            console.log('Fatal error: tx received but without poolAddr for raydium');
    }
    else {
        console.log('Tx received but in simu mode.');
        res.status(200).send('Tx received but in simu mode.');
    }
}));
app.post('/raydium_sell', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { testMode, mintStr, poolAddr, priorityFeeInSol, slippageDecimal, tokenName, percentageSinceBuy } = req.body;
    if (percentageSinceBuy > 0)
        sendSms(`🎉🎉🎉 Sell (Raydium) ! (${tokenName}) [${mintStr.substring(0, 5)}.] 🎉🎉🎉\n${percentageSinceBuy}% since buy\n${getFrenchDateTime()}\n\nhttps://bullx.io/terminal?chainId=1399811149&address=${mintStr}`);
    else
        sendSms(`🔻🔻 Sell fall (Raydium) ! (${tokenName}) [${mintStr.substring(0, 5)}.] 🔻🔻\n${percentageSinceBuy}% since buy\n${getFrenchDateTime()}\n\nhttps://bullx.io/terminal?chainId=1399811149&address=${mintStr}`);
    if (!testMode) {
        if (poolAddr) {
            const token_a_amount = yield getTokenBalance(PUBLIC_KEY, mintStr);
            if (token_a_amount == 0) {
                console.log('token_a_amount is 0');
                return;
            }
            raydium_swap(mintStr, poolAddr, token_a_amount, true);
        }
        else
            console.log('Fatal error: tx received but without poolAddr for raydium');
    }
    else {
        console.log('Tx received but in simu mode.');
        res.status(200).send('Tx received but in simu mode.');
    }
}));
// Lancement du serveur
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
