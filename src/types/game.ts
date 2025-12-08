// src/types/game.ts

import { Address } from 'viem';

/**
 * Round information from the smart contract
 */
export interface RoundInfo {
    roundEndTime: number;
    predictionDeadline: number;
    resolved: boolean;
}

/**
 * Bet details from the smart contract
 */
export interface BetDetails {
    prediction: bigint;
    timestamp: number;
    hasClaimed: boolean;
    exists: boolean;
}

/**
 * Queried round info for display
 */
export interface QueriedRoundInfo {
    predictionDeadline: string;
    roundEndTime: string;
    isResolved: string;
    totalPot: string;
    prizePool: string;
    adminFee: string;
}

/**
 * Bet history item from events
 */
export interface BetHistoryItem {
    roundId: string;
    userPrediction: string;
    predictionDeadline: string;
    roundEndTime: string;
    isResolved: boolean;
    isWinner: boolean;
    prizeAmountEth: string;
    prizeAmountUsd: string;
    prizeAmountWei?: bigint;
    hasClaimed: boolean;
}

/**
 * Game data from useGameContractReads hook
 */
export interface GameData {
    nextRoundId: string;
    latestCreatedRoundId: string;
    entryFeeInWei: bigint | null;
    entryFeeDisplay: string;
    isGamePaused: boolean | null;
    gamePausedDisplay: string;
    contractOwner: Address | null;
    isTokenGatingEnabled: boolean | null;
    tokenGatingEnabledDisplay: string;
    gatingTokenAddress: string;
    minGatingTokenBalance: string;
    btcPriceFeedAddress: Address | null;
    prizePoolPercentage: number | null;
    refetchAllGameData: () => Promise<void>;
}

/**
 * Oracle prices from useOraclePrices hook
 */
export interface OraclePrices {
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

/**
 * Notification state
 */
export interface NotificationState {
    message: string;
    type: 'success' | 'error' | 'info' | '';
}

/**
 * Base contract write config
 */
export interface BaseWriteConfig {
    abi: readonly object[];
    address: Address;
}
