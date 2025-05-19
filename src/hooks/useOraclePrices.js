// src/hooks/useOraclePrices.js
import { useState, useEffect, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { ETH_USD_PRICE_FEED_ADDRESS, PRICE_FEED_ABI, ZERO_ADDRESS, TARGET_CHAIN_ID } from '../config/contract';
import { formatTokenUnits, formatTimestampGMT } from '../utils/formatting';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

/**
 * Custom hook to fetch and manage ETH and BTC oracle prices using useReadContract for caching.
 * @param {string | null} btcGameContractFeedAddress - The BTC price feed address from the game contract.
 * @param {Function} showNotif - Function to display notifications.
 * @returns {object} An object containing ETH and BTC price data, loading states, and refetch functions.
 */
export function useOraclePrices(btcGameContractFeedAddress, showNotif) {
    // --- ETH Price Feed ---
    const { 
        data: ethPriceRoundData, 
        isLoading: isEthPriceDataLoading, 
        refetch: refetchEthPriceData,
        error: ethPriceError 
    } = useReadContract({
        address: ETH_USD_PRICE_FEED_ADDRESS,
        abi: PRICE_FEED_ABI,
        functionName: 'latestRoundData',
        chainId: TARGET_CHAIN_ID,
        query: {
            staleTime: FIVE_MINUTES_IN_MS, // Cache ETH price for 5 minutes
            refetchOnWindowFocus: false, // Optional: disable refetch on window focus
            enabled: !!ETH_USD_PRICE_FEED_ADDRESS && ETH_USD_PRICE_FEED_ADDRESS !== ZERO_ADDRESS, // Only enable if address is valid
        },
    });

    const { 
        data: ethDecimalsData, 
        isLoading: isEthDecimalsLoading 
    } = useReadContract({
        address: ETH_USD_PRICE_FEED_ADDRESS,
        abi: PRICE_FEED_ABI,
        functionName: 'decimals',
        chainId: TARGET_CHAIN_ID,
        query: {
            staleTime: Infinity, // Decimals rarely change, cache indefinitely
            refetchOnWindowFocus: false,
            enabled: !!ETH_USD_PRICE_FEED_ADDRESS && ETH_USD_PRICE_FEED_ADDRESS !== ZERO_ADDRESS,
        },
    });

    // Derived ETH Price State
    const [currentEthPrice, setCurrentEthPrice] = useState(null); // Raw number
    const [currentEthPriceDisplay, setCurrentEthPriceDisplay] = useState('N/A');
    const [ethPriceTimestamp, setEthPriceTimestamp] = useState('N/A');

    useEffect(() => {
        if (ethPriceRoundData && ethDecimalsData !== undefined) {
            try {
                // ethPriceRoundData: [roundId, answer, startedAt, updatedAt, answeredInRound]
                const priceValue = ethPriceRoundData[1];
                const updatedAt = ethPriceRoundData[3];
                const decimals = Number(ethDecimalsData);
                const priceAsNumber = parseFloat(formatTokenUnits(priceValue, decimals));

                setCurrentEthPrice(priceAsNumber);
                setCurrentEthPriceDisplay(`$${priceAsNumber.toFixed(2)}`);
                setEthPriceTimestamp(formatTimestampGMT(updatedAt));
            } catch (e) {
                console.error("Error processing ETH price data:", e);
                setCurrentEthPrice(null);
                setCurrentEthPriceDisplay('Error');
                setEthPriceTimestamp('Error');
                if (showNotif) showNotif("Error processing ETH price.", "error");
            }
        } else if (ethPriceError) {
            console.error("Error fetching ETH price feed:", ethPriceError);
            setCurrentEthPrice(null);
            setCurrentEthPriceDisplay('Oracle Error');
            setEthPriceTimestamp('Error');
            if (showNotif) showNotif(`ETH Price Feed Error: ${ethPriceError.shortMessage || ethPriceError.message}`, "error");
        }
    }, [ethPriceRoundData, ethDecimalsData, showNotif, ethPriceError]);


    // --- BTC Price Feed (from game contract's feed address) ---
    const { 
        data: btcPriceRoundData, 
        isLoading: isBtcPriceDataLoading, 
        refetch: refetchBtcPriceData,
        error: btcPriceError
    } = useReadContract({
        address: btcGameContractFeedAddress, // Dynamic address
        abi: PRICE_FEED_ABI,
        functionName: 'latestRoundData',
        chainId: TARGET_CHAIN_ID,
        query: {
            staleTime: FIVE_MINUTES_IN_MS, // Cache BTC price for 5 minutes
            refetchOnWindowFocus: false,
            enabled: !!btcGameContractFeedAddress && btcGameContractFeedAddress !== ZERO_ADDRESS, // Only run if address is valid
        },
    });

    const { 
        data: btcDecimalsData, 
        isLoading: isBtcDecimalsLoading 
    } = useReadContract({
        address: btcGameContractFeedAddress,
        abi: PRICE_FEED_ABI,
        functionName: 'decimals',
        chainId: TARGET_CHAIN_ID,
        query: {
            staleTime: Infinity,
            refetchOnWindowFocus: false,
            enabled: !!btcGameContractFeedAddress && btcGameContractFeedAddress !== ZERO_ADDRESS,
        },
    });

    // Derived BTC Price State
    const [currentBtcPriceDisplay, setCurrentBtcPriceDisplay] = useState('N/A');
    const [btcPriceTimestamp, setBtcPriceTimestamp] = useState('N/A');

    useEffect(() => {
        if (!btcGameContractFeedAddress || btcGameContractFeedAddress === ZERO_ADDRESS) {
            setCurrentBtcPriceDisplay('Oracle N/A'); // If no address, show N/A
            setBtcPriceTimestamp('N/A');
            return;
        }
        if (btcPriceRoundData && btcDecimalsData !== undefined) {
            try {
                const priceValue = btcPriceRoundData[1];
                const updatedAt = btcPriceRoundData[3];
                const decimals = Number(btcDecimalsData);
                const priceAsNumber = parseFloat(formatTokenUnits(priceValue, decimals));

                setCurrentBtcPriceDisplay(`$${priceAsNumber.toFixed(2)}`);
                setBtcPriceTimestamp(formatTimestampGMT(updatedAt));
            } catch (e) {
                console.error("Error processing BTC price data:", e);
                setCurrentBtcPriceDisplay('Error');
                setBtcPriceTimestamp('Error');
                if (showNotif) showNotif("Error processing BTC price.", "error");
            }
        } else if (btcPriceError) {
            console.error("Error fetching BTC price feed:", btcPriceError);
            setCurrentBtcPriceDisplay('Oracle Error');
            setBtcPriceTimestamp('Error');
            if (showNotif) showNotif(`BTC Price Feed Error: ${btcPriceError.shortMessage || btcPriceError.message}`, "error");
        }
    }, [btcPriceRoundData, btcDecimalsData, btcGameContractFeedAddress, showNotif, btcPriceError]);

    const handleRefetchEthPrice = useCallback(async () => {
        if (showNotif) showNotif("Refreshing ETH price...", "info");
        await refetchEthPriceData();
    }, [refetchEthPriceData, showNotif]);

    const handleRefetchBtcPrice = useCallback(async () => {
        if (!btcGameContractFeedAddress || btcGameContractFeedAddress === ZERO_ADDRESS) {
            if (showNotif) showNotif("BTC Price Feed address not set in contract.", "error");
            return;
        }
        if (showNotif) showNotif("Refreshing BTC price...", "info");
        await refetchBtcPriceData();
    }, [refetchBtcPriceData, btcGameContractFeedAddress, showNotif]);


    return {
        currentEthPrice, // Raw number
        currentEthPriceDisplay,
        ethPriceTimestamp,
        isEthPriceLoading: isEthPriceDataLoading || isEthDecimalsLoading,
        fetchCurrentEthPrice: handleRefetchEthPrice,

        currentBtcPrice: currentBtcPriceDisplay, // Already display-formatted
        btcPriceTimestamp,
        isBtcPriceLoading: isBtcPriceDataLoading || isBtcDecimalsLoading,
        fetchCurrentBtcPrice: handleRefetchBtcPrice,
    };
}
