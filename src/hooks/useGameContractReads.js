// src/hooks/useGameContractReads.js
import { useReadContract } from 'wagmi';
import { GAME_CONTRACT_ABI, VITE_GAME_CONTRACT_ADDRESS, TARGET_CHAIN_ID, ZERO_ADDRESS } from '../config/contract';
import { formatWeiToEthString } from '../utils/formatting';
import { useCallback } from 'react';

const DEFAULT_STALE_TIME = 1 * 60 * 1000; // 1 minute
const LONG_STALE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook to read and manage data from the BTC Price Prediction Game contract.
 * Applies staleTime to reduce unnecessary refetches.
 * @returns {object} An object containing game data, derived states, and refetch functions.
 */
export function useGameContractReads() {
    const baseReadConfig = (functionName, args = [], options = {}) => ({
        abi: GAME_CONTRACT_ABI,
        address: VITE_GAME_CONTRACT_ADDRESS,
        chainId: TARGET_CHAIN_ID,
        functionName,
        args,
        query: {
            staleTime: DEFAULT_STALE_TIME, // Default stale time for most reads
            refetchOnWindowFocus: false, // Generally disable aggressive refetch on focus
            refetchOnMount: true, // Fetch when component mounts (if data is stale)
            ...options, // Allow overriding query options
        },
    });

    const { data: nextRoundIdData, refetch: refetchNextRoundId } = useReadContract(baseReadConfig('getNextRoundId'));
    const { data: latestCreatedRoundIdData, refetch: refetchLatestCreatedRoundId } = useReadContract(baseReadConfig('getLatestCreatedRoundId'));
    const { data: entryFeeData, refetch: refetchEntryFee } = useReadContract(baseReadConfig('entryFee', [], { staleTime: LONG_STALE_TIME })); // Entry fee changes less often
    const { data: gamePausedData, refetch: refetchGamePaused } = useReadContract(baseReadConfig('paused'));
    const { data: contractOwnerData, refetch: refetchContractOwner } = useReadContract(baseReadConfig('owner', [], { staleTime: Infinity })); // Owner rarely changes
    const { data: tokenGatingEnabledData, refetch: refetchTokenGatingEnabled } = useReadContract(baseReadConfig('tokenGatingEnabled'));
    const { data: gatingTokenData, refetch: refetchGatingToken } = useReadContract(baseReadConfig('gatingToken', [], { staleTime: LONG_STALE_TIME }));
    const { data: minGatingTokenBalanceData, refetch: refetchMinGatingBalance } = useReadContract(baseReadConfig('minGatingTokenBalance', [], { staleTime: LONG_STALE_TIME }));
    const { data: btcPriceFeedAddressDataFromContract, refetch: refetchBtcPriceFeedAddress } = useReadContract(baseReadConfig('priceFeed', [], { staleTime: LONG_STALE_TIME }));
    const { data: prizePoolPercentageData, refetch: refetchPrizePoolPercentage } = useReadContract(baseReadConfig('prizePoolPercentage', [], { staleTime: LONG_STALE_TIME }));

    const nextRoundId = nextRoundIdData !== undefined ? nextRoundIdData.toString() : 'N/A';
    const latestCreatedRoundId = latestCreatedRoundIdData !== undefined ? latestCreatedRoundIdData.toString() : 'N/A';
    const entryFeeInWei = entryFeeData;
    const entryFeeDisplay = entryFeeData !== undefined ? formatWeiToEthString(entryFeeData) : 'N/A';
    const isGamePaused = typeof gamePausedData === 'boolean' ? gamePausedData : null;
    const contractOwner = contractOwnerData !== undefined ? contractOwnerData : null;
    const isTokenGatingEnabled = typeof tokenGatingEnabledData === 'boolean' ? tokenGatingEnabledData : null;
    const gatingTokenAddress = gatingTokenData && gatingTokenData !== ZERO_ADDRESS ? gatingTokenData : "N/A";
    const minGatingTokenBalance = minGatingTokenBalanceData !== undefined ? minGatingTokenBalanceData.toString() : "N/A";
    const btcPriceFeedAddress = btcPriceFeedAddressDataFromContract && btcPriceFeedAddressDataFromContract !== ZERO_ADDRESS ? btcPriceFeedAddressDataFromContract : null;
    const prizePoolPercentage = prizePoolPercentageData !== undefined ? Number(prizePoolPercentageData) : null;

    const refetchAllGameData = useCallback(async () => {
        // Manually trigger refetch for all relevant data points
        // Wagmi's useReadContract refetch functions return promises
        await Promise.all([
            refetchNextRoundId(),
            refetchLatestCreatedRoundId(),
            refetchEntryFee(),
            refetchGamePaused(),
            refetchContractOwner(),
            refetchTokenGatingEnabled(),
            refetchGatingToken(),
            refetchMinGatingBalance(),
            refetchBtcPriceFeedAddress(),
            refetchPrizePoolPercentage(),
        ]);
    }, [
        refetchNextRoundId, refetchLatestCreatedRoundId, refetchEntryFee,
        refetchGamePaused, refetchContractOwner, refetchTokenGatingEnabled,
        refetchGatingToken, refetchMinGatingBalance, refetchBtcPriceFeedAddress,
        refetchPrizePoolPercentage
    ]);

    return {
        nextRoundId,
        latestCreatedRoundId,
        entryFeeInWei,
        entryFeeDisplay,
        isGamePaused,
        gamePausedDisplay: isGamePaused === null ? "N/A" : (isGamePaused ? "Yes" : "No"),
        contractOwner,
        isTokenGatingEnabled,
        tokenGatingEnabledDisplay: isTokenGatingEnabled === null ? "N/A" : (isTokenGatingEnabled ? "Enabled" : "Disabled"),
        gatingTokenAddress,
        minGatingTokenBalance,
        btcPriceFeedAddress,
        prizePoolPercentage,
        refetchAllGameData,
    };
}
