import { useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatWeiToEthString, calculateUsdValue, formatPrediction, formatTimestamp } from '../utils/formatting';
import {
    VITE_GAME_CONTRACT_ADDRESS,
    GAME_CONTRACT_ABI,
    TARGET_CHAIN_ID
} from '../config/contract';

interface RoundInfo {
    predictionDeadline: string;
    roundEndTime: string;
    isResolved: string;
    totalPot: string;
    prizePool: string;
    adminFee: string;
    actualPrice?: string;
    roundEndPrice?: string;
    winners: any[];
}

export const useRoundDetails = (
    prizePoolPercentage: bigint | null,
    currentEthPrice: number | null,
    showNotif: (msg: string, type: 'success' | 'error' | 'info') => void
) => {
    const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });

    const [queryRoundId, setQueryRoundId] = useState('');
    const [queriedRoundInfo, setQueriedRoundInfo] = useState<RoundInfo | null>(null);
    const [currentParticipantsCount, setCurrentParticipantsCount] = useState('N/A');
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    const baseWriteConfig = {
        abi: GAME_CONTRACT_ABI,
        address: VITE_GAME_CONTRACT_ADDRESS,
    };

    const handleFetchRoundDetails = async () => {
        if (!publicClient || !queryRoundId) {
            showNotif("Please enter a Round ID to fetch details.", "error");
            return;
        }

        setIsLoadingDetails(true);
        try {
            const roundIdBigInt = BigInt(queryRoundId);
            const roundDataArr = await publicClient.readContract({
                ...baseWriteConfig,
                functionName: 'rounds',
                args: [roundIdBigInt]
            } as any) as any[];

            if (!roundDataArr || roundDataArr[0].toString() === "0") {
                showNotif(`Round ${queryRoundId} not found or has not been initialized.`, "error");
                setQueriedRoundInfo(null);
                setCurrentParticipantsCount('N/A');
                setIsLoadingDetails(false);
                return;
            }

            const resolvedStatusFromContract = roundDataArr[2];
            const isResolvedDisplayString = typeof resolvedStatusFromContract === 'boolean'
                ? (resolvedStatusFromContract ? "Yes" : "No")
                : "Unknown";

            const bettors = await publicClient.readContract({
                ...baseWriteConfig,
                functionName: 'getBettorsForRound',
                args: [roundIdBigInt]
            } as any) as any[];

            const totalPotWei = await publicClient.readContract({
                ...baseWriteConfig,
                functionName: 'totalCollectedPerRound',
                args: [roundIdBigInt]
            } as any) as bigint;

            let prizePoolEth = 'N/A', adminFeeEth = 'N/A';
            const totalPotEth = formatWeiToEthString(totalPotWei);

            if (prizePoolPercentage !== null) {
                const prizePercent = prizePoolPercentage;
                const prizePoolWei = (BigInt(totalPotWei.toString()) * BigInt(prizePercent)) / 100n;
                const adminFeeWei = BigInt(totalPotWei.toString()) - prizePoolWei;
                prizePoolEth = formatWeiToEthString(prizePoolWei);
                adminFeeEth = formatWeiToEthString(adminFeeWei);
            }

            // --- New Data Fetching: Winners, Predictions, Actual Price ---
            let winnersInfo: any[] = [];
            let actualPriceDisplay: string | null = null;
            let roundEndPriceDisplay: string | null = null;

            // Fetch Historical Price at Round End Time
            try {
                const roundEndTimeBigInt = roundDataArr[0];
                if (roundEndTimeBigInt > 0n) {
                    const histRes = await fetch(`/api/prices/historical/${roundEndTimeBigInt.toString()}`);
                    if (histRes.ok) {
                        const histData = await histRes.json();
                        if (histData.price) {
                            roundEndPriceDisplay = histData.price.toFixed(2);
                        }
                    }
                }
            } catch (histErr) {
                console.error("Error fetching historical price:", histErr);
            }

            if (resolvedStatusFromContract) {
                // 1. Fetch Actual Price from Logs
                try {
                    const logs = await publicClient.getLogs({
                        address: VITE_GAME_CONTRACT_ADDRESS,
                        event: {
                            type: 'event',
                            name: 'RoundResolved',
                            inputs: [
                                { type: 'uint256', indexed: true, name: 'roundId' },
                                { type: 'uint256', indexed: false, name: 'actualPrice' },
                                { type: 'uint256', indexed: false, name: 'numberOfWinners' }
                            ]
                        } as any,
                        args: { roundId: roundIdBigInt },
                        fromBlock: 'earliest',
                        toBlock: 'latest'
                    });

                    if (logs && logs.length > 0) {
                        const log = logs[0] as any;
                        if (log.args && log.args.actualPrice) {
                            actualPriceDisplay = formatPrediction(log.args.actualPrice);
                        }
                    }
                } catch (logErr) {
                    console.error("Error fetching resolve logs:", logErr);
                }

                // 2. Fetch Winners and their Predictions
                try {
                    const winnerAddresses = await publicClient.readContract({
                        ...baseWriteConfig,
                        functionName: 'getWinnersForRound',
                        args: [roundIdBigInt]
                    } as any) as string[];

                    const winnerPromises = winnerAddresses.map(async (addr) => {
                        const betInfo = await publicClient.readContract({
                            ...baseWriteConfig,
                            functionName: 'bets',
                            args: [roundIdBigInt, addr]
                        } as any) as any[];
                        return {
                            address: addr,
                            prediction: formatPrediction(betInfo[0])
                        };
                    });

                    winnersInfo = await Promise.all(winnerPromises);
                } catch (winErr) {
                    console.error("Error fetching winners info:", winErr);
                }
            }

            setQueriedRoundInfo({
                predictionDeadline: formatTimestamp(roundDataArr[1]),
                roundEndTime: formatTimestamp(roundDataArr[0]),
                isResolved: isResolvedDisplayString,
                totalPot: `${totalPotEth} ETH${currentEthPrice ? ` (~$${calculateUsdValue(totalPotEth, currentEthPrice)} USD)` : ''}`,
                prizePool: `${prizePoolEth} ETH${currentEthPrice ? ` (~$${calculateUsdValue(prizePoolEth, currentEthPrice)} USD)` : ''}`,
                adminFee: `${adminFeeEth} ETH${currentEthPrice ? ` (~$${calculateUsdValue(adminFeeEth, currentEthPrice)} USD)` : ''}`,
                actualPrice: actualPriceDisplay ? `$${actualPriceDisplay}` : undefined,
                roundEndPrice: roundEndPriceDisplay ? `$${roundEndPriceDisplay}` : undefined,
                winners: winnersInfo
            });
            setCurrentParticipantsCount(bettors.length.toString());
            showNotif(`Details for round ${queryRoundId} loaded successfully.`, "success");
        } catch (e: any) {
            showNotif(`Fetch Round Details Error: ${e.message}`, "error");
            console.error("Error in handleFetchRoundDetails:", e);
            setQueriedRoundInfo(null);
            setCurrentParticipantsCount('N/A');
        } finally {
            setIsLoadingDetails(false);
        }
    };

    return {
        queryRoundId,
        setQueryRoundId,
        queriedRoundInfo,
        currentParticipantsCount,
        handleFetchRoundDetails,
        isLoadingDetails
    };
};
