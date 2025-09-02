var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import axios from 'axios';
import { delay } from '../tx_server.js';
function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
export function getCoinData(mintStr) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const url = `https://frontend-api.pump.fun/coins/${mintStr}`;
            const response = yield axios.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
                    "Accept": "*/*",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Referer": "https://www.pump.fun/",
                    "Origin": "https://www.pump.fun",
                    "Connection": "keep-alive",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "cross-site",
                    "If-None-Match": 'W/"43a-tWaCcS4XujSi30IFlxDCJYxkMKg"'
                }
            });
            if (response.status === 200) {
                return response.data;
            }
            else {
                console.log(`ERROR: (${mintStr}) 407 when try to getCoin data. Retry`);
                yield delay(1000 * randomIntFromInterval(5, 15));
                return getCoinData(mintStr);
            }
        }
        catch (error) {
            console.log(`ERROR: (${mintStr}) 407 when try to getCoin data. Retry`);
            yield delay(1000 * randomIntFromInterval(5, 15));
            return getCoinData(mintStr);
        }
    });
}
export function getCreatorInfo(publicKey) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const url = `https://frontend-api.pump.fun/following/followers/${publicKey}`;
            const response = yield axios.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
                    "Accept": "*/*",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Referer": "https://www.pump.fun/",
                    "Origin": "https://www.pump.fun",
                    "Connection": "keep-alive",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "cross-site",
                    "If-None-Match": 'W/"43a-tWaCcS4XujSi30IFlxDCJYxkMKg"'
                }
            });
            if (response.status === 200) {
                return response.data;
            }
            else {
                console.log(`ERROR: (${publicKey}) 407 when try to getInfoDev data. Retry`);
                yield delay(1000 * randomIntFromInterval(5, 15));
                return getCoinData(publicKey);
            }
        }
        catch (error) {
            console.log(`ERROR: (${publicKey}) 407 when try to getInfoDev data. Retry`);
            yield delay(1000 * randomIntFromInterval(5, 15));
            return getCoinData(publicKey);
        }
    });
}
