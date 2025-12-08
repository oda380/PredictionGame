// src/hooks/useBetHistory.ts
import { useState, useCallback } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import {
    GAME_CONTRACT_ADDRESS,
    GAME_CONTRACT_ABI,
} from '../config/contract';
import {
    formatWeiToEthString,
    calculateUsdValue,
    formatPrediction,
    formatTimestamp,
} from '../utils/formatting';
import { BetHistoryItem } from '../types/game';

type ShowNotifFn = (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;

interface UseBetHistoryReturn {
    betHistory: BetHistoryItem[];
    isLoadingHistory: boolean;
    fetchBetHistory: () => Promise<void>;
}

export function useBetHistory(
    prizePoolPercentage: number | null,
    currentEthPrice: number | null,
    showNotif?: ShowNotifFn
): UseBetHistoryReturn {
    const { address: userAddress } = useAccount();
    const publicClient = usePublicClient();

    const [betHistory, setBetHistory] = useState<BetHistoryItem[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const fetchBetHistory = useCallback(async () => {
        if (!userAddress || !publicClient) {
            setBetHistory([]);
            return;
        }

        setIsLoadingHistory(true);
        setBetHistory([]);

        try {
            // Call our server-side API route (keeps Basescan API key secure)
            const response = await fetch(`/api/bet-history/${userAddress}`);
            const data = await response.json();

            if (!response.ok || data.error) {
                if (data && data.error && data.error.includes('No transactions')) {
                    showNotif?.("No transactions found for this address.", "info");
                } else {
                    console.error('Bet history API error:', data.error || response.statusText);
                    showNotif?.("Error fetching bet history.", "warning");
                }
                setIsLoadingHistory(false);
                return;
            }

            const contractTxs = data.transactions;
            const betItems: BetHistoryItem[] = [];

            // Process each transaction (already filtered and limited by API)
            for (const tx of contractTxs) {
                try {
                    // Get transaction receipt to find BetPlaced event
                    const receipt = await publicClient.getTransactionReceipt({
                        hash: tx.hash as `0x${string}`
                    });

                    // Find BetPlaced event in logs
                    // BetPlaced event signature: BetPlaced(address indexed user, uint256 rawPrediction, uint256 indexed roundId, uint256 amount);
                    const betPlacedTopic = '0x7363e6581df4db69463222156be4a09656528b9f1302890fa4c0b60819b69fc6';

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const receiptLogs = receipt.logs as any[];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const betPlacedLog = receiptLogs.find((log: any) =>
                        log.topics && log.topics[0] === betPlacedTopic
                    );

                    if (betPlacedLog && betPlacedLog.topics) {
                        // Round ID is the 3rd topic (index 2) in BetPlaced event
                        const roundId = BigInt(betPlacedLog.topics[2]);

                        // Fetch round details
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const roundDetails = await (publicClient as any).readContract({
                            address: GAME_CONTRACT_ADDRESS,
                            abi: GAME_CONTRACT_ABI,
                            functionName: 'rounds',
                            args: [roundId]
                        }) as readonly [bigint, bigint, boolean];

                        // Fetch bet details
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const betDetails = await (publicClient as any).readContract({
                            address: GAME_CONTRACT_ADDRESS,
                            abi: GAME_CONTRACT_ABI,
                            functionName: 'bets',
                            args: [roundId, userAddress]
                        }) as readonly [bigint, bigint, boolean, boolean];
                        // [rawPrediction, amount, claimed, placed]

                        // Fetch winners to determine win status
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const winners = await (publicClient as any).readContract({
                            address: GAME_CONTRACT_ADDRESS,
                            abi: GAME_CONTRACT_ABI,
                            functionName: 'getWinnersForRound',
                            args: [roundId]
                        }) as readonly string[];

                        // Fetch total collected for round to calc prize
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const totalPotWei = await (publicClient as any).readContract({
                            address: GAME_CONTRACT_ADDRESS,
                            abi: GAME_CONTRACT_ABI,
                            functionName: 'totalCollectedPerRound',
                            args: [roundId]
                        }) as bigint;

                        const prediction = betDetails[0];
                        const hasClaimed = betDetails[2];
                        const isResolved = roundDetails[2];

                        // Check if user is in winners list (case insensitive comparison)
                        const isWinner = winners.some(w => w.toLowerCase() === userAddress.toLowerCase());

                        let estimatedPrizeWei = 0n;
                        let prizeDisplayEth = '0';

                        if (isWinner && isResolved && winners.length > 0 && prizePoolPercentage !== null) {
                            // Calc based on contract logic: (pot * pct / 100) / winnersCount
                            const prizePoolWei = (totalPotWei * BigInt(prizePoolPercentage)) / 100n;
                            estimatedPrizeWei = prizePoolWei / BigInt(winners.length);
                            prizeDisplayEth = formatWeiToEthString(estimatedPrizeWei);
                        } else if (hasClaimed) {
                            prizeDisplayEth = "Claimed";
                        }

                        // If claimed, estimatedPrizeWei is effectively 0 for future claims
                        if (hasClaimed) estimatedPrizeWei = 0n;

                        betItems.push({
                            roundId: roundId.toString(),
                            userPrediction: formatPrediction(prediction),
                            predictionDeadline: formatTimestamp(roundDetails[1]),
                            roundEndTime: formatTimestamp(roundDetails[0]),
                            isResolved,
                            isWinner,
                            hasClaimed,
                            prizeAmountWei: estimatedPrizeWei,
                            prizeAmountEth: hasClaimed ? "Claimed" : (isWinner ? prizeDisplayEth : "0"),
                            prizeAmountUsd: (isWinner && !hasClaimed && currentEthPrice && estimatedPrizeWei > 0n)
                                ? calculateUsdValue(formatWeiToEthString(estimatedPrizeWei), currentEthPrice)
                                : 'N/A'
                        });
                    }
                } catch (txError) {
                    console.error(`Error processing transaction ${tx.hash}:`, txError);
                }
            }

            setBetHistory(betItems);
            if (betItems.length === 0) {
                showNotif?.("No bets found for this address.", "info");
            }
        } catch (error) {
            console.error("Error fetching bet history:", error);
            showNotif?.("Error fetching bet history. Try refreshing.", "error");
        } finally {
            setIsLoadingHistory(false);
        }
    }, [userAddress, publicClient, currentEthPrice, showNotif, prizePoolPercentage]);

    return {
        betHistory,
        isLoadingHistory,
        fetchBetHistory
    };
}
