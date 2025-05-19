// src/hooks/useGameContractReads.js
import { useReadContract } from 'wagmi';
import { GAME_CONTRACT_ABI, VITE_GAME_CONTRACT_ADDRESS, TARGET_CHAIN_ID, ZERO_ADDRESS } from '../config/contract'; // Adjust path as needed
import { formatWeiToEthString } from '../utils/formatting'; // Adjust path as needed
import { useCallback } from 'react';

/**
 * Custom hook to read and manage data from the BTC Price Prediction Game contract.
 * @returns {object} An object containing game data, derived states, and refetch functions.
 */
export function useGameContractReads() {
    // Base configuration for all read calls to the game contract
    const baseReadConfig = {
        abi: GAME_CONTRACT_ABI,
        address: VITE_GAME_CONTRACT_ADDRESS,
        chainId: TARGET_CHAIN_ID,
    };

    // --- Raw Data Fetches ---
    const { data: nextRoundIdData, refetch: refetchNextRoundId } = useReadContract({ ...baseReadConfig, functionName: 'getNextRoundId' });
    const { data: latestCreatedRoundIdData, refetch: refetchLatestCreatedRoundId } = useReadContract({ ...baseReadConfig, functionName: 'getLatestCreatedRoundId' });
    const { data: entryFeeData, refetch: refetchEntryFee } = useReadContract({ ...baseReadConfig, functionName: 'entryFee' });
    const { data: gamePausedData, refetch: refetchGamePaused } = useReadContract({ ...baseReadConfig, functionName: 'paused' });
    const { data: contractOwnerData, refetch: refetchContractOwner } = useReadContract({ ...baseReadConfig, functionName: 'owner' });
    const { data: tokenGatingEnabledData, refetch: refetchTokenGatingEnabled } = useReadContract({ ...baseReadConfig, functionName: 'tokenGatingEnabled' });
    const { data: gatingTokenData, refetch: refetchGatingToken } = useReadContract({ ...baseReadConfig, functionName: 'gatingToken' });
    const { data: minGatingTokenBalanceData, refetch: refetchMinGatingBalance } = useReadContract({ ...baseReadConfig, functionName: 'minGatingTokenBalance' });
    const { data: btcPriceFeedAddressDataFromContract, refetch: refetchBtcPriceFeedAddress } = useReadContract({ ...baseReadConfig, functionName: 'priceFeed' });
    const { data: prizePoolPercentageData, refetch: refetchPrizePoolPercentage } = useReadContract({ ...baseReadConfig, functionName: 'prizePoolPercentage' });
    // Add any other read hooks needed from the contract, e.g., maxBetAmount if it's readable

    // --- Derived States ---
    const nextRoundId = nextRoundIdData !== undefined ? nextRoundIdData.toString() : 'N/A';
    const latestCreatedRoundId = latestCreatedRoundIdData !== undefined ? latestCreatedRoundIdData.toString() : 'N/A';
    const entryFeeInWei = entryFeeData; // Keep the BigInt for transactions
    const entryFeeDisplay = entryFeeData !== undefined ? formatWeiToEthString(entryFeeData) : 'N/A';
    const isGamePaused = typeof gamePausedData === 'boolean' ? gamePausedData : null; // Keep boolean, handle "N/A" in UI
    const contractOwner = contractOwnerData !== undefined ? contractOwnerData : null;
    const isTokenGatingEnabled = typeof tokenGatingEnabledData === 'boolean' ? tokenGatingEnabledData : null;
    const gatingTokenAddress = gatingTokenData && gatingTokenData !== ZERO_ADDRESS ? gatingTokenData : "N/A";
    const minGatingTokenBalance = minGatingTokenBalanceData !== undefined ? minGatingTokenBalanceData.toString() : "N/A";
    const btcPriceFeedAddress = btcPriceFeedAddressDataFromContract && btcPriceFeedAddressDataFromContract !== ZERO_ADDRESS ? btcPriceFeedAddressDataFromContract : null;
    const prizePoolPercentage = prizePoolPercentageData !== undefined ? Number(prizePoolPercentageData) : null;


    // --- Combined Refetch Function ---
    const refetchAllGameData = useCallback(async () => {
        // Using Promise.all to await all refetches concurrently
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
            // Add other refetch calls here
        ]);
    }, [ // Add all refetch functions to the dependency array
        refetchNextRoundId, refetchLatestCreatedRoundId, refetchEntryFee,
        refetchGamePaused, refetchContractOwner, refetchTokenGatingEnabled,
        refetchGatingToken, refetchMinGatingBalance, refetchBtcPriceFeedAddress,
        refetchPrizePoolPercentage
    ]);

    return {
        // Raw data (optional to return if only derived is needed)
        // entryFeeData, gamePausedData, contractOwnerData, etc.

        // Derived and formatted data for UI
        nextRoundId,
        latestCreatedRoundId,
        entryFeeInWei, // Useful for transactions
        entryFeeDisplay,
        isGamePaused, // boolean or null
        gamePausedDisplay: isGamePaused === null ? "N/A" : (isGamePaused ? "Yes" : "No"), // For UI
        contractOwner,
        isTokenGatingEnabled, // boolean or null
        tokenGatingEnabledDisplay: isTokenGatingEnabled === null ? "N/A" : (isTokenGatingEnabled ? "Enabled" : "Disabled"), // For UI
        gatingTokenAddress,
        minGatingTokenBalance,
        btcPriceFeedAddress, // string or null
        prizePoolPercentage, // number or null

        // Refetch functions
        refetchAllGameData, // Primary refetch for all data points
        // Individual refetches can also be exposed if needed for more granular updates
        refetchEntryFee,
        refetchGamePaused,
        refetchBtcPriceFeedAddress,
        // ... etc.
    };
}
