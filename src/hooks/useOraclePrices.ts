// src/hooks/useOraclePrices.ts
import { useState, useEffect, useCallback } from 'react';
import { Address } from 'viem';
import { formatTimestampGMT } from '../utils/formatting';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

type ShowNotifFn = (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;

interface UseOraclePricesReturn {
    currentEthPrice: number | null;
    currentEthPriceDisplay: string;
    ethPriceTimestamp: string;
    isEthPriceLoading: boolean;
    fetchCurrentEthPrice: () => Promise<void>;
    currentBtcPrice: string;
    btcPriceTimestamp: string;
    isBtcPriceLoading: boolean;
    fetchCurrentBtcPrice: () => Promise<void>;
}

interface CoinGeckoResponse {
    bitcoin: {
        price: number | null;
        lastUpdated: number | null;
    };
    ethereum: {
        price: number | null;
        lastUpdated: number | null;
    };
}

export function useOraclePrices(
    btcGameContractFeedAddress: Address | null,
    showNotif?: ShowNotifFn
): UseOraclePricesReturn {
    // State for ETH
    const [currentEthPrice, setCurrentEthPrice] = useState<number | null>(null);
    const [currentEthPriceDisplay, setCurrentEthPriceDisplay] = useState('N/A');
    const [ethPriceTimestamp, setEthPriceTimestamp] = useState('N/A');
    const [isEthPriceLoading, setIsEthPriceLoading] = useState(false);

    // State for BTC
    const [currentBtcPriceDisplay, setCurrentBtcPriceDisplay] = useState('N/A');
    const [btcPriceTimestamp, setBtcPriceTimestamp] = useState('N/A');
    const [isBtcPriceLoading, setIsBtcPriceLoading] = useState(false);

    // Fetch prices from CoinGecko API
    const fetchPrices = useCallback(async () => {
        try {
            const response = await fetch('/api/prices/coingecko');

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data: CoinGeckoResponse = await response.json();

            // Update ETH price
            if (data.ethereum.price !== null) {
                setCurrentEthPrice(data.ethereum.price);
                setCurrentEthPriceDisplay(`$${data.ethereum.price.toFixed(2)}`);
                if (data.ethereum.lastUpdated) {
                    setEthPriceTimestamp(formatTimestampGMT(BigInt(data.ethereum.lastUpdated)));
                }
            } else {
                setCurrentEthPrice(null);
                setCurrentEthPriceDisplay('N/A');
            }

            // Update BTC price
            if (data.bitcoin.price !== null) {
                setCurrentBtcPriceDisplay(`$${data.bitcoin.price.toFixed(2)}`);
                if (data.bitcoin.lastUpdated) {
                    setBtcPriceTimestamp(formatTimestampGMT(BigInt(data.bitcoin.lastUpdated)));
                }
            } else {
                setCurrentBtcPriceDisplay('N/A');
            }

        } catch (error) {
            console.error('Error fetching prices from CoinGecko:', error);
            setCurrentEthPriceDisplay('Error');
            setCurrentBtcPriceDisplay('Error');
            if (showNotif) {
                showNotif('Failed to fetch prices from CoinGecko', 'error');
            }
        }
    }, [showNotif]);

    // Initial fetch on mount
    useEffect(() => {
        fetchPrices();

        // Set up auto-refresh every 5 minutes
        const interval = setInterval(fetchPrices, FIVE_MINUTES_IN_MS);

        return () => clearInterval(interval);
    }, [fetchPrices]);

    const handleRefetchEthPrice = useCallback(async () => {
        if (showNotif) showNotif("Refreshing ETH price...", "info");
        setIsEthPriceLoading(true);
        await fetchPrices();
        setIsEthPriceLoading(false);
    }, [fetchPrices, showNotif]);

    const handleRefetchBtcPrice = useCallback(async () => {
        if (showNotif) showNotif("Refreshing BTC price...", "info");
        setIsBtcPriceLoading(true);
        await fetchPrices();
        setIsBtcPriceLoading(false);
    }, [fetchPrices, showNotif]);

    return {
        currentEthPrice,
        currentEthPriceDisplay,
        ethPriceTimestamp,
        isEthPriceLoading,
        fetchCurrentEthPrice: handleRefetchEthPrice,
        currentBtcPrice: currentBtcPriceDisplay,
        btcPriceTimestamp,
        isBtcPriceLoading,
        fetchCurrentBtcPrice: handleRefetchBtcPrice,
    };
}
