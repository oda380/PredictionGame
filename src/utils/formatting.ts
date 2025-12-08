// src/utils/formatting.ts
import { formatEther as viemFormatEther, formatUnits as viemFormatUnits } from 'viem';

/**
 * Formats a WEI value (BigInt or string) to an ETH string.
 */
export const formatWeiToEthString = (weiValue: bigint | string | null | undefined): string => {
    if (weiValue === null || typeof weiValue === 'undefined') return '0';
    try {
        const valueAsBigInt = typeof weiValue === 'string' ? BigInt(weiValue) : weiValue;
        return parseFloat(viemFormatEther(valueAsBigInt)).toFixed(5);
    } catch (e) {
        console.error("Error formatting ETH from wei:", e, weiValue);
        return 'Error';
    }
};

/**
 * Calculates the USD value of an ETH amount given the current ETH price.
 */
export const calculateUsdValue = (ethAmountString: string, ethPriceNumber: number | null): string => {
    if (ethAmountString === 'N/A' || ethAmountString === 'Error' || !ethPriceNumber || isNaN(parseFloat(ethAmountString)) || ethPriceNumber <= 0) {
        return 'N/A';
    }
    const ethValue = parseFloat(ethAmountString);
    return (ethValue * ethPriceNumber).toFixed(2);
};

/**
 * Formats a raw prediction value (scaled by 10^4) to a string.
 * Uses "Smart Formatting": Displays 2 decimals by default (e.g. "98500.12"),
 * but shows up to 4 decimals if necessary (e.g. "98500.1234") to reveal hidden precision.
 */
export const formatPrediction = (rawPrediction: bigint | number | undefined | null): string => {
    if (typeof rawPrediction === 'undefined' || rawPrediction === null) return 'N/A';
    try {
        const value = Number(rawPrediction) / 10000;
        const with4Decimals = value.toFixed(4);

        // If the last two digits are "00", clean it up to 2 decimals
        if (with4Decimals.endsWith('00')) {
            return value.toFixed(2);
        }

        // Otherwise show full 4 decimal precision
        return with4Decimals;
    } catch (e) {
        console.error("Error formatting prediction:", e, rawPrediction);
        return 'Error';
    }
};

/**
 * Formats a Unix timestamp (seconds) to a localized date and time string.
 */
export const formatTimestamp = (timestamp: bigint | number | string | undefined): string => {
    if (!timestamp || timestamp.toString() === "0") return "N/A";
    try {
        return new Date(Number(timestamp) * 1000).toLocaleString();
    } catch (e) {
        console.error("Error formatting timestamp:", e, timestamp);
        return 'Error';
    }
};

/**
 * Formats a Unix timestamp (seconds) to a GMT/UTC date and time string.
 */
export const formatTimestampGMT = (timestamp: bigint | number | string | undefined): string => {
    if (!timestamp || timestamp.toString() === "0") return "N/A";
    try {
        return new Date(Number(timestamp) * 1000).toUTCString();
    } catch (e) {
        console.error("Error formatting timestamp to GMT:", e, timestamp);
        return 'Error';
    }
};

/**
 * Formats a BigInt or string representing units of a token to a string with specified decimals.
 */
export const formatTokenUnits = (value: bigint | string | undefined | null, decimals: number | undefined | null): string => {
    if (typeof value === 'undefined' || value === null || typeof decimals === 'undefined' || decimals === null) return 'Error';
    try {
        const valueAsBigInt = typeof value === 'string' ? BigInt(value) : value;
        return viemFormatUnits(valueAsBigInt, Number(decimals));
    } catch (e) {
        console.error("Error formatting token units:", e, value, decimals);
        return 'Error';
    }
};
