
import axios from 'axios';

import { delay } from '../tx_server.js'

function randomIntFromInterval(min: number, max: number) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min);
}



export async function getCoinData(mintStr: string) {
    try {
        const url = `https://frontend-api.pump.fun/coins/${mintStr}`;
        const response = await axios.get(url, {
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
        } else {
            console.log(`ERROR: (${mintStr}) 407 when try to getCoin data. Retry`)
            await delay(1000 * randomIntFromInterval(5, 15))
            return getCoinData(mintStr)
        }
    } catch (error) {
        console.log(`ERROR: (${mintStr}) 407 when try to getCoin data. Retry`)
        await delay(1000 * randomIntFromInterval(5, 15))
        return getCoinData(mintStr)
    }
}

export async function getCreatorInfo(publicKey: string) {
    try {
        const url = `https://frontend-api.pump.fun/following/followers/${publicKey}`;
        const response = await axios.get(url, {
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
        } else {
            console.log(`ERROR: (${publicKey}) 407 when try to getInfoDev data. Retry`)
            await delay(1000 * randomIntFromInterval(5, 15))
            return getCoinData(publicKey)
        }
    } catch (error) {
        console.log(`ERROR: (${publicKey}) 407 when try to getInfoDev data. Retry`)
        await delay(1000 * randomIntFromInterval(5, 15))
        return getCoinData(publicKey)
    }
}