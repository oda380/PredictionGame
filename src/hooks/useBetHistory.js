// src/hooks/useBetHistory.js
import { useState, useCallback, useEffect } from 'react';
import { usePublicClient, useAccount } from 'wagmi'; // Added useAccount to get userAddress internally
import {
    VITE_GAME_CONTRACT_ADDRESS,
    GAME_CONTRACT_ABI,
    TARGET_CHAIN_ID
} from '../config/contract'; // Adjust path as needed
import {
    formatWeiToEthString,
    calculateUsdValue,
    formatPrediction,
    formatTimestamp,
} from '../utils/formatting'; // Adjust path as needed

/**
 * Custom hook to fetch and manage the user's bet history.
 * @param {number | null} prizePoolPercentage - The current prize pool percentage from the game contract.
 * @param {number | null} currentEthPrice - The current ETH price in USD for value calculations.
 * @param {Function} showNotif - Function to display notifications.
 * @returns {object} An object containing betHistory, isLoadingHistory, and fetchBetHistory function.
 */
export function useBetHistory(prizePoolPercentage, currentEthPrice, showNotif) {
    const { address: userAddress } = useAccount();
    const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });

    const [betHistory, setBetHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const fetchBetHistory = useCallback(async () => {
        if (!userAddress || !publicClient) {
            // showNotif("Connect wallet and ensure you are on the correct network to see history.", "info");
            setBetHistory([]); // Clear history if user is not connected
            return;
        }
        // GAME_CONTRACT_ABI is imported directly.
        if (!GAME_CONTRACT_ABI || GAME_CONTRACT_ABI.length === 0) {
            showNotif("Game ABI not available for history.", "error");
            return;
        }

        setIsLoadingHistory(true);
        setBetHistory([]); // Clear previous history before fetching
        try {
            const betPlacedEventAbiItem = GAME_CONTRACT_ABI.find(item => item.type === 'event' && item.name === 'BetPlaced');
            if (!betPlacedEventAbiItem) {
                showNotif("BetPlaced event ABI definition not found in local ABI.", "error");
                setIsLoadingHistory(false);
                return;
            }

            const latestBlockNumber = await publicClient.getBlockNumber();
            const CHUNK_SIZE = BigInt(499); // Max block range for RPC provider
            const MAX_QUERIES = 20; // Increased to scan a bit further back with smaller chunks
            let allLogs = [];

            console.log(`Starting bet history fetch for ${userAddress}. Latest block: ${latestBlockNumber}, Chunk size: ${CHUNK_SIZE}, Max queries: ${MAX_QUERIES}`);

            for (let i = 0; i < MAX_QUERIES; i++) {
                const toBlock = latestBlockNumber - (CHUNK_SIZE * BigInt(i));
                let fromBlock = toBlock - CHUNK_SIZE + 1n;
                if (toBlock < 0n) { console.log("toBlock became negative, stopping history scan."); break; }
                if (fromBlock < 0n) fromBlock = 0n;
                if (toBlock < fromBlock && i > 0) { console.log("toBlock is less than fromBlock, stopping history scan."); break; }

                try {
                    console.log(`Fetching logs for history: chunk ${i + 1}, blocks ${fromBlock} to ${toBlock}`);
                    const logs = await publicClient.getLogs({
                        address: VITE_GAME_CONTRACT_ADDRESS,
                        event: betPlacedEventAbiItem,
                        args: { user: userAddress },
                        fromBlock: fromBlock,
                        toBlock: toBlock
                    });
                    if (logs.length > 0) {
                        console.log(`Found ${logs.length} logs in chunk ${i + 1}`);
                        allLogs = [...allLogs, ...logs];
                    }
                } catch (chunkError) {
                    console.error(`Error fetching logs for chunk ${fromBlock}-${toBlock}:`, chunkError);
                    showNotif(`Error fetching part of history: ${chunkError.shortMessage || chunkError.message}`, "warning");
                    break;
                }
                if (fromBlock === 0n) { console.log("Reached genesis block (or close enough), stopping history scan."); break; }
            }

            const uniqueLogs = allLogs.filter((log, index, self) =>
                index === self.findIndex((l) => (
                    l.blockNumber === log.blockNumber &&
                    l.transactionIndex === log.transactionIndex &&
                    l.logIndex === log.logIndex
                ))
            );
            uniqueLogs.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber) || Number(b.logIndex) - Number(a.logIndex));
            console.log(`Total unique 'BetPlaced' logs found for user ${userAddress}: ${uniqueLogs.length}`);

            const historyProcessingPromises = uniqueLogs.map(async (log) => {
                const { roundId: logRoundId, rawPrediction: logRawPrediction } = log.args;

                const roundDetailsArr = await publicClient.readContract({
                    abi: GAME_CONTRACT_ABI, address: VITE_GAME_CONTRACT_ADDRESS, functionName: 'rounds', args: [logRoundId]
                });
                const userBetDetailsArr = await publicClient.readContract({
                    abi: GAME_CONTRACT_ABI, address: VITE_GAME_CONTRACT_ADDRESS, functionName: 'bets', args: [logRoundId, userAddress]
                });

                let prizeAmountEth = 'N/A', prizeAmountUsd = 'N/A', isWinner = false;

                if (roundDetailsArr && roundDetailsArr[2]) { // Index 2: isResolved
                    const winnersList = await publicClient.readContract({
                        abi: GAME_CONTRACT_ABI, address: VITE_GAME_CONTRACT_ADDRESS, functionName: 'getWinnersForRound', args: [logRoundId]
                    });
                    isWinner = winnersList.some(winnerAddr => winnerAddr.toLowerCase() === userAddress.toLowerCase());

                    if (isWinner) {
                        const totalPot = await publicClient.readContract({
                            abi: GAME_CONTRACT_ABI, address: VITE_GAME_CONTRACT_ADDRESS, functionName: 'totalCollectedPerRound', args: [logRoundId]
                        });
                        if (prizePoolPercentage !== null && winnersList.length > 0) {
                            const pool = (BigInt(totalPot.toString()) * BigInt(prizePoolPercentage)) / 100n;
                            const individualPrizeWei = pool / BigInt(winnersList.length);
                            prizeAmountEth = formatWeiToEthString(individualPrizeWei);
                            if (currentEthPrice) prizeAmountUsd = calculateUsdValue(prizeAmountEth, currentEthPrice);
                        }
                    }
                }
                return {
                    roundId: logRoundId.toString(),
                    predictionDeadline: formatTimestamp(roundDetailsArr ? roundDetailsArr[1] : 0),
                    roundEndTime: formatTimestamp(roundDetailsArr ? roundDetailsArr[0] : 0),
                    userPrediction: formatPrediction(logRawPrediction),
                    isResolved: roundDetailsArr ? roundDetailsArr[2] : false,
                    isWinner,
                    hasClaimed: userBetDetailsArr ? userBetDetailsArr[2] : false,
                    prizeAmountEth,
                    prizeAmountUsd
                };
            });
            const processedHistory = await Promise.all(historyProcessingPromises);
            setBetHistory(processedHistory);
            if (uniqueLogs.length > 0) showNotif("Bet history loaded.", "success");
            else showNotif("No past bets found in the checked block range.", "info");
        } catch (e) {
            console.error("Error fetching bet history:", e);
            showNotif(`Bet History Error: ${e.message}`, "error");
            setBetHistory([]);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [userAddress, publicClient, prizePoolPercentage, currentEthPrice, showNotif]); // Dependencies

    return {
        betHistory,
        isLoadingHistory,
        fetchBetHistory,
    };
}
