// src/utils/formatting.js
import { formatEther as viemFormatEther, formatUnits as viemFormatUnits } from 'viem';

/**
 * Formats a WEI value (BigInt or string) to an ETH string.
 * @param {bigint | string | null | undefined} weiValue - The value in WEI.
 * @returns {string} The formatted ETH string (e.g., "0.00000") or 'Error'/'0'.
 */
export const formatWeiToEthString = (weiValue) => { // Ensure 'export' keyword is present
    if (weiValue === null || typeof weiValue === 'undefined') return '0';
    try {
        // Ensure weiValue is a BigInt for formatEther
        const valueAsBigInt = typeof weiValue === 'string' ? BigInt(weiValue) : weiValue;
        return parseFloat(viemFormatEther(valueAsBigInt)).toFixed(5);
    } catch (e) {
        console.error("Error formatting ETH from wei:", e, weiValue);
        return 'Error';
    }
};

/**
 * Calculates the USD value of an ETH amount given the current ETH price.
 * @param {string} ethAmountString - The amount of ETH as a string (e.g., "1.2345").
 * @param {number | null} ethPriceNumber - The current price of ETH in USD.
 * @returns {string} The USD value formatted to 2 decimal places (e.g., "1500.00") or 'N/A'.
 */
export const calculateUsdValue = (ethAmountString, ethPriceNumber) => {
    if (ethAmountString === 'N/A' || ethAmountString === 'Error' || !ethPriceNumber || isNaN(parseFloat(ethAmountString)) || ethPriceNumber <= 0) {
        return 'N/A';
    }
    const ethValue = parseFloat(ethAmountString);
    return (ethValue * ethPriceNumber).toFixed(2);
};

/**
 * Formats a raw prediction value (scaled by 10^4) to a string with 4 decimal places.
 * @param {bigint | number | undefined} rawPrediction - The raw prediction value.
 * @returns {string} The formatted prediction string or 'N/A'.
 */
export const formatPrediction = (rawPrediction) => {
    if (typeof rawPrediction === 'undefined' || rawPrediction === null) return 'N/A';
    try {
        return (Number(rawPrediction) / (10 ** 4)).toFixed(4);
    } catch(e) {
        console.error("Error formatting prediction:", e, rawPrediction);
        return 'Error';
    }
};

/**
 * Formats a Unix timestamp (seconds) to a localized date and time string.
 * @param {bigint | number | string | undefined} timestamp - The Unix timestamp in seconds.
 * @returns {string} The formatted date-time string or "N/A".
 */
export const formatTimestamp = (timestamp) => {
    if (!timestamp || timestamp.toString() === "0") return "N/A";
    try {
        return new Date(Number(timestamp) * 1000).toLocaleString();
    } catch(e) {
        console.error("Error formatting timestamp:", e, timestamp);
        return 'Error';
    }
};

/**
 * Formats a Unix timestamp (seconds) to a GMT/UTC date and time string.
 * @param {bigint | number | string | undefined} timestamp - The Unix timestamp in seconds.
 * @returns {string} The formatted GMT/UTC date-time string or "N/A".
 */
export const formatTimestampGMT = (timestamp) => {
    if (!timestamp || timestamp.toString() === "0") return "N/A";
     try {
        return new Date(Number(timestamp) * 1000).toUTCString();
    } catch(e) {
        console.error("Error formatting timestamp to GMT:", e, timestamp);
        return 'Error';
    }
};

/**
 * Formats a BigInt or string representing units of a token to a string with specified decimals.
 * Similar to viem's formatUnits but with added safety checks.
 * @param {bigint | string | undefined} value - The raw token value.
 * @param {number} decimals - The number of decimals the token uses.
 * @returns {string} The formatted token amount string or 'Error'.
 */
export const formatTokenUnits = (value, decimals) => {
    if (typeof value === 'undefined' || value === null || typeof decimals === 'undefined' || decimals === null) return 'Error';
    try {
        const valueAsBigInt = typeof value === 'string' ? BigInt(value) : value;
        return viemFormatUnits(valueAsBigInt, Number(decimals));
    } catch (e) {
        console.error("Error formatting token units:", e, value, decimals);
        return 'Error';
    }
};
