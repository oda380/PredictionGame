// src/hooks/useOraclePrices.js
import { useState, useCallback, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { ETH_USD_PRICE_FEED_ADDRESS, PRICE_FEED_ABI, ZERO_ADDRESS, TARGET_CHAIN_ID } from '../config/contract'; // Adjust path as needed
import { formatTokenUnits, formatTimestampGMT } from '../utils/formatting'; // Adjust path as needed

/**
 * Custom hook to fetch and manage ETH and BTC oracle prices.
 * @param {string | null} btcGameContractFeedAddress - The BTC price feed address obtained from the game contract.
 * @param {Function} showNotif - Function to display notifications.
 * @returns {object} An object containing ETH and BTC price data, loading states, and refetch functions.
 */
export function useOraclePrices(btcGameContractFeedAddress, showNotif) {
    const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });

    // ETH Price State
    const [currentEthPrice, setCurrentEthPrice] = useState(null); // Raw ETH price as number
    const [currentEthPriceDisplay, setCurrentEthPriceDisplay] = useState('N/A'); // Formatted ETH price for UI
    const [ethPriceTimestamp, setEthPriceTimestamp] = useState('N/A');
    const [isEthPriceLoading, setIsEthPriceLoading] = useState(false);

    // BTC Price State
    const [currentBtcPrice, setCurrentBtcPrice] = useState('N/A'); // Formatted BTC price for UI
    const [btcPriceTimestamp, setBtcPriceTimestamp] = useState('N/A');
    const [isBtcPriceLoading, setIsBtcPriceLoading] = useState(false);

    // Generic price fetching function
    const fetchPriceData = useCallback(async (feedAddress, setRawPrice, setDisplayPrice, setTimestamp, setIsLoading, currencyName, isEth = false) => {
        if (!publicClient || !feedAddress || feedAddress === ZERO_ADDRESS) {
            showNotif(`${currencyName} Price Feed: Address not configured or invalid.`, "error");
            if (setRawPrice) setRawPrice(null);
            setDisplayPrice('Oracle N/A');
            setTimestamp('N/A');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setDisplayPrice('Fetching...');
        try {
            const decimalsData = await publicClient.readContract({
                address: feedAddress,
                abi: PRICE_FEED_ABI,
                functionName: 'decimals',
            });
            const roundData = await publicClient.readContract({
                address: feedAddress,
                abi: PRICE_FEED_ABI,
                functionName: 'latestRoundData',
            });

            if (!roundData || typeof roundData[1] === 'undefined' || typeof roundData[3] === 'undefined' || typeof decimalsData === 'undefined') {
                throw new Error(`Invalid ${currencyName} price feed data or decimals.`);
            }

            const priceValue = roundData[1]; // answer
            const updatedAt = roundData[3]; // updatedAt
            const decimals = Number(decimalsData);

            const priceAsNumber = parseFloat(formatTokenUnits(priceValue, decimals));

            if (isEth && setRawPrice) {
                setRawPrice(priceAsNumber); // Store raw number for ETH for calculations
            }
            setDisplayPrice(`$${priceAsNumber.toFixed(2)}`);
            setTimestamp(formatTimestampGMT(updatedAt));
            showNotif(`${currencyName} price updated.`, "success");

        } catch (e) {
            console.error(`Error fetching ${currencyName} price:`, e);
            if (setRawPrice) setRawPrice(null);
            setDisplayPrice('Error');
            setTimestamp('Error');
            showNotif(`${currencyName} Price Error: ${e.message}.`, "error");
        } finally {
            setIsLoading(false);
        }
    }, [publicClient, showNotif]); // formatTokenUnits & formatTimestampGMT are stable utils

    // Specific fetcher for ETH price
    const fetchCurrentEthPrice = useCallback(() => {
        fetchPriceData(
            ETH_USD_PRICE_FEED_ADDRESS,
            setCurrentEthPrice, // setRawPrice for ETH
            setCurrentEthPriceDisplay,
            setEthPriceTimestamp,
            setIsEthPriceLoading,
            "ETH",
            true // isEth = true
        );
    }, [fetchPriceData]);

    // Specific fetcher for BTC price
    const fetchCurrentBtcPrice = useCallback(() => {
        if (btcGameContractFeedAddress && btcGameContractFeedAddress !== ZERO_ADDRESS) {
            fetchPriceData(
                btcGameContractFeedAddress,
                null, // No raw price state for BTC needed directly by App.jsx currently
                setCurrentBtcPrice, // setDisplayPrice for BTC
                setBtcPriceTimestamp,
                setIsBtcPriceLoading,
                "BTC"
            );
        } else {
             // Only show notification if it's explicitly called, not on initial load without address
            // showNotif("BTC Price Feed: Address not available from game contract.", "info");
            setCurrentBtcPrice('Oracle N/A');
            setBtcPriceTimestamp('N/A');
        }
    }, [fetchPriceData, btcGameContractFeedAddress]);

    // Effect to fetch ETH price on mount or when publicClient is available
    useEffect(() => {
        if (publicClient) {
            fetchCurrentEthPrice();
        }
    }, [publicClient, fetchCurrentEthPrice]);

    // Effect to fetch BTC price when its feed address becomes available or changes
    useEffect(() => {
        if (publicClient && btcGameContractFeedAddress && btcGameContractFeedAddress !== ZERO_ADDRESS) {
            fetchCurrentBtcPrice();
        } else if (!btcGameContractFeedAddress || btcGameContractFeedAddress === ZERO_ADDRESS) {
            // Reset BTC price if feed address becomes invalid/unavailable
            setCurrentBtcPrice('Oracle N/A');
            setBtcPriceTimestamp('N/A');
        }
    }, [publicClient, btcGameContractFeedAddress, fetchCurrentBtcPrice]);

    return {
        // ETH Price Data
        currentEthPrice, // Raw number, useful for calculations
        currentEthPriceDisplay,
        ethPriceTimestamp,
        isEthPriceLoading,
        fetchCurrentEthPrice, // Expose refetch function

        // BTC Price Data
        currentBtcPrice, // This is already display-formatted
        btcPriceTimestamp,
        isBtcPriceLoading,
        fetchCurrentBtcPrice, // Expose refetch function
    };
}
