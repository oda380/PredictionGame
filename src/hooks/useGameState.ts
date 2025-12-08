// src/hooks/useGameState.ts
import { useReducer, useCallback, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { Address } from 'viem';
import {
    GAME_CONTRACT_ABI,
    GAME_CONTRACT_ADDRESS,
    TARGET_CHAIN_ID
} from '../config/contract';
import {
    formatWeiToEthString,
    calculateUsdValue,
    formatTimestamp
} from '../utils/formatting';

// --- Types ---
interface QueriedRoundInfo {
    predictionDeadline: string;
    roundEndTime: string;
    isResolved: string;
    totalPot: string;
    prizePool: string;
    adminFee: string;
}

interface GameState {
    // Round query state
    queryRoundId: string;
    queriedRoundInfo: QueriedRoundInfo | null;
    currentParticipantsCount: string;
    // Active round status
    activeRoundMessage: string;
    isLatestRoundBettable: boolean;
    isLatestRoundStakeable: boolean;
    activeRoundEndTimeDisplay: string;
    // Loading states
    isGameStatusRefreshing: boolean;
    isQueryingRound: boolean;
}

type GameAction =
    | { type: 'SET_QUERY_ROUND_ID'; payload: string }
    | { type: 'SET_QUERIED_ROUND_INFO'; payload: QueriedRoundInfo | null }
    | { type: 'SET_PARTICIPANTS_COUNT'; payload: string }
    | {
        type: 'SET_ACTIVE_ROUND_STATUS'; payload: {
            message: string;
            bettable: boolean;
            stakeable: boolean;
            endTime: string;
        }
    }
    | { type: 'SET_GAME_STATUS_REFRESHING'; payload: boolean }
    | { type: 'SET_QUERYING_ROUND'; payload: boolean }
    | { type: 'RESET_ACTIVE_ROUND' }
    | { type: 'RESET_ROUND_QUERY' };

// --- Initial State ---
const initialState: GameState = {
    queryRoundId: '',
    queriedRoundInfo: null,
    currentParticipantsCount: 'N/A',
    activeRoundMessage: 'Checking for active round...',
    isLatestRoundBettable: false,
    isLatestRoundStakeable: false,
    activeRoundEndTimeDisplay: 'N/A',
    isGameStatusRefreshing: false,
    isQueryingRound: false,
};

// --- Reducer ---
function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'SET_QUERY_ROUND_ID':
            return { ...state, queryRoundId: action.payload };
        case 'SET_QUERIED_ROUND_INFO':
            return { ...state, queriedRoundInfo: action.payload };
        case 'SET_PARTICIPANTS_COUNT':
            return { ...state, currentParticipantsCount: action.payload };
        case 'SET_ACTIVE_ROUND_STATUS':
            return {
                ...state,
                activeRoundMessage: action.payload.message,
                isLatestRoundBettable: action.payload.bettable,
                isLatestRoundStakeable: action.payload.stakeable,
                activeRoundEndTimeDisplay: action.payload.endTime,
            };
        case 'SET_GAME_STATUS_REFRESHING':
            return { ...state, isGameStatusRefreshing: action.payload };
        case 'SET_QUERYING_ROUND':
            return { ...state, isQueryingRound: action.payload };
        case 'RESET_ACTIVE_ROUND':
            return {
                ...state,
                activeRoundMessage: 'Connect wallet and switch to target network.',
                isLatestRoundBettable: false,
                isLatestRoundStakeable: false,
                activeRoundEndTimeDisplay: 'N/A',
            };
        case 'RESET_ROUND_QUERY':
            return {
                ...state,
                queriedRoundInfo: null,
                currentParticipantsCount: 'N/A'
            };
        default:
            return state;
    }
}

// --- Hook ---
interface UseGameStateProps {
    isConnected: boolean;
    chainId: number | undefined;
    latestCreatedRoundId: string;
    nextRoundId: string;
    isGamePaused: boolean | null;
    prizePoolPercentage: number | null;
    currentEthPrice: number | null;
    showNotif?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export function useGameState({
    isConnected,
    chainId,
    latestCreatedRoundId,
    nextRoundId,
    isGamePaused,
    prizePoolPercentage,
    currentEthPrice,
    showNotif,
}: UseGameStateProps) {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });

    // Set query round ID
    const setQueryRoundId = useCallback((id: string) => {
        dispatch({ type: 'SET_QUERY_ROUND_ID', payload: id });
    }, []);

    // Check active round status
    const checkActiveRound = useCallback(async () => {
        if (!publicClient || latestCreatedRoundId === 'N/A' || isGamePaused === null || nextRoundId === 'N/A') {
            dispatch({
                type: 'SET_ACTIVE_ROUND_STATUS', payload: {
                    message: 'Loading round status...',
                    bettable: false,
                    stakeable: false,
                    endTime: 'N/A'
                }
            });
            return;
        }
        if (latestCreatedRoundId === '0') {
            dispatch({
                type: 'SET_ACTIVE_ROUND_STATUS', payload: {
                    message: `No rounds created yet. Waiting for admin to create Round ${nextRoundId}.`,
                    bettable: false,
                    stakeable: false,
                    endTime: 'N/A'
                }
            });
            return;
        }
        if (isGamePaused) {
            dispatch({
                type: 'SET_ACTIVE_ROUND_STATUS', payload: {
                    message: `Game is paused. Round ${latestCreatedRoundId} may not be active.`,
                    bettable: false,
                    stakeable: false,
                    endTime: 'N/A'
                }
            });
            return;
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const roundDataArr = await (publicClient as any).readContract({
                abi: GAME_CONTRACT_ABI,
                address: GAME_CONTRACT_ADDRESS,
                functionName: 'rounds',
                args: [BigInt(latestCreatedRoundId)]
            }) as readonly [bigint, bigint, boolean];

            if (roundDataArr && roundDataArr[0].toString() !== "0") {
                const roundEndTime = Number(roundDataArr[0]);
                const isLatestResolved = roundDataArr[2];
                const endTimeDisplay = formatTimestamp(roundEndTime);

                if (!isLatestResolved) {
                    const deadlineTimestamp = Number(roundDataArr[1]);
                    if (deadlineTimestamp * 1000 > Date.now()) {
                        dispatch({
                            type: 'SET_ACTIVE_ROUND_STATUS', payload: {
                                message: `Round ${latestCreatedRoundId} is ACTIVE for betting until ${formatTimestamp(deadlineTimestamp)}.`,
                                bettable: true,
                                stakeable: true,
                                endTime: endTimeDisplay
                            }
                        });
                    } else {
                        dispatch({
                            type: 'SET_ACTIVE_ROUND_STATUS', payload: {
                                message: `Round ${latestCreatedRoundId} betting closed. Awaiting resolution.`,
                                bettable: false,
                                stakeable: true,
                                endTime: endTimeDisplay
                            }
                        });
                    }
                } else {
                    dispatch({
                        type: 'SET_ACTIVE_ROUND_STATUS', payload: {
                            message: `Round ${latestCreatedRoundId} is resolved. Waiting for admin to create Round ${nextRoundId}.`,
                            bettable: false,
                            stakeable: false,
                            endTime: 'N/A'
                        }
                    });
                }
            } else {
                dispatch({
                    type: 'SET_ACTIVE_ROUND_STATUS', payload: {
                        message: `Data for Round ${latestCreatedRoundId} not found. Waiting for admin to create Round ${nextRoundId}.`,
                        bettable: false,
                        stakeable: false,
                        endTime: 'N/A'
                    }
                });
            }
        } catch (error) {
            console.error("Error checking active round status:", error);
            dispatch({
                type: 'SET_ACTIVE_ROUND_STATUS', payload: {
                    message: 'Could not determine active round status due to an error.',
                    bettable: false,
                    stakeable: false,
                    endTime: 'Error'
                }
            });
        }
    }, [publicClient, latestCreatedRoundId, nextRoundId, isGamePaused]);

    // Fetch round details
    const fetchRoundDetails = useCallback(async () => {
        if (!publicClient || !state.queryRoundId) {
            showNotif?.("Please enter a Round ID to fetch details.", "error");
            return;
        }
        dispatch({ type: 'SET_QUERYING_ROUND', payload: true });
        try {
            const roundIdBigInt = BigInt(state.queryRoundId);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const roundDataArr = await (publicClient as any).readContract({
                abi: GAME_CONTRACT_ABI,
                address: GAME_CONTRACT_ADDRESS,
                functionName: 'rounds',
                args: [roundIdBigInt]
            }) as readonly [bigint, bigint, boolean];

            if (!roundDataArr || roundDataArr[0].toString() === "0") {
                showNotif?.(`Round ${state.queryRoundId} not found or has not been initialized.`, "error");
                dispatch({ type: 'RESET_ROUND_QUERY' });
                return;
            }

            const resolvedStatus = roundDataArr[2];
            const isResolvedDisplay = typeof resolvedStatus === 'boolean' ? (resolvedStatus ? "Yes" : "No") : "Unknown";

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bettors = await (publicClient as any).readContract({
                abi: GAME_CONTRACT_ABI,
                address: GAME_CONTRACT_ADDRESS,
                functionName: 'getBettorsForRound',
                args: [roundIdBigInt]
            }) as readonly Address[];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const totalPotWei = await (publicClient as any).readContract({
                abi: GAME_CONTRACT_ABI,
                address: GAME_CONTRACT_ADDRESS,
                functionName: 'totalCollectedPerRound',
                args: [roundIdBigInt]
            }) as bigint;

            let prizePoolEth = 'N/A', adminFeeEth = 'N/A';
            const totalPotEth = formatWeiToEthString(totalPotWei);

            if (prizePoolPercentage !== null) {
                const prizePoolWei = (BigInt(totalPotWei.toString()) * BigInt(prizePoolPercentage)) / 100n;
                const adminFeeWei = BigInt(totalPotWei.toString()) - prizePoolWei;
                prizePoolEth = formatWeiToEthString(prizePoolWei);
                adminFeeEth = formatWeiToEthString(adminFeeWei);
            }

            dispatch({
                type: 'SET_QUERIED_ROUND_INFO', payload: {
                    predictionDeadline: formatTimestamp(roundDataArr[1]),
                    roundEndTime: formatTimestamp(roundDataArr[0]),
                    isResolved: isResolvedDisplay,
                    totalPot: `${totalPotEth} ETH${currentEthPrice ? ` (~$${calculateUsdValue(totalPotEth, currentEthPrice)} USD)` : ''}`,
                    prizePool: `${prizePoolEth} ETH${currentEthPrice ? ` (~$${calculateUsdValue(prizePoolEth, currentEthPrice)} USD)` : ''}`,
                    adminFee: `${adminFeeEth} ETH${currentEthPrice ? ` (~$${calculateUsdValue(adminFeeEth, currentEthPrice)} USD)` : ''}`,
                }
            });
            dispatch({ type: 'SET_PARTICIPANTS_COUNT', payload: bettors.length.toString() });
            showNotif?.(`Details for round ${state.queryRoundId} loaded successfully.`, "success");
        } catch (e) {
            showNotif?.(`Fetch Round Details Error: ${(e as Error).message}`, "error");
            console.error("Error in fetchRoundDetails:", e);
            dispatch({ type: 'RESET_ROUND_QUERY' });
        } finally {
            dispatch({ type: 'SET_QUERYING_ROUND', payload: false });
        }
    }, [publicClient, state.queryRoundId, prizePoolPercentage, currentEthPrice, showNotif]);

    // Auto-check active round when connected
    useEffect(() => {
        if (isConnected && chainId === TARGET_CHAIN_ID) {
            checkActiveRound();
        } else {
            dispatch({ type: 'RESET_ACTIVE_ROUND' });
        }
    }, [isConnected, chainId, checkActiveRound]);

    return {
        // State
        ...state,
        // Actions
        setQueryRoundId,
        fetchRoundDetails,
        checkActiveRound,
    };
}
