import { useState, useEffect } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { formatWeiToEthString, formatTimestamp } from '../utils/formatting';
import {
    VITE_GAME_CONTRACT_ADDRESS,
    GAME_CONTRACT_ABI,
    TARGET_CHAIN_ID
} from '../config/contract';

interface UseActiveRoundProps {
    latestCreatedRoundId: string;
    nextRoundId: string;
    isGamePaused: boolean | null;
}

export const useActiveRound = ({
    latestCreatedRoundId,
    nextRoundId,
    isGamePaused
}: UseActiveRoundProps) => {
    const { isConnected, chain } = useAccount();
    const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });

    // Local state for active round info
    const [activeRoundParticipants, setActiveRoundParticipants] = useState('0');
    const [activeRoundPot, setActiveRoundPot] = useState('0');
    const [activeRoundMessage, setActiveRoundMessage] = useState("Checking for active round...");
    const [isLatestRoundBettable, setIsLatestRoundBettable] = useState(false);
    const [isLatestRoundStakeable, setIsLatestRoundStakeable] = useState(false);
    const [activeRoundEndTimeDisplay, setActiveRoundEndTimeDisplay] = useState("N/A");
    const [predictionDeadlineTimestamp, setPredictionDeadlineTimestamp] = useState<number | null>(null);

    useEffect(() => {
        const checkActiveRound = async () => {
            setIsLatestRoundBettable(false);
            setIsLatestRoundStakeable(false);
            setActiveRoundEndTimeDisplay("N/A");

            if (!publicClient || latestCreatedRoundId === 'N/A' || isGamePaused === null || nextRoundId === 'N/A') {
                setActiveRoundMessage("Loading round status...");
                return;
            }
            if (latestCreatedRoundId === '0') {
                setActiveRoundMessage(`No rounds created yet. Waiting for admin to create Round ${nextRoundId}.`);
                return;
            }
            if (isGamePaused) {
                setActiveRoundMessage(`Game is paused. Round ${latestCreatedRoundId} may not be active.`);
                return;
            }

            try {
                // Fetch details for the latestCreatedRoundId
                const roundDataArr = await publicClient.readContract({
                    abi: GAME_CONTRACT_ABI,
                    address: VITE_GAME_CONTRACT_ADDRESS,
                    functionName: 'rounds',
                    args: [BigInt(latestCreatedRoundId)]
                } as any) as any[]; // Type assertion for generic array return

                if (roundDataArr && roundDataArr[0].toString() !== "0") {
                    const roundEndTime = Number(roundDataArr[0]);
                    const isLatestResolved = roundDataArr[2]; // index 2 is 'resolved'

                    setActiveRoundEndTimeDisplay(formatTimestamp(roundEndTime));

                    if (!isLatestResolved) { // If latestCreatedRoundId is NOT resolved
                        const deadlineTimestamp = Number(roundDataArr[1]); // index 1
                        setIsLatestRoundStakeable(true);
                        setPredictionDeadlineTimestamp(deadlineTimestamp);

                        // Fetch stats for active/unresolved round
                        try {
                            const [bettors, totalPotWei] = await Promise.all([
                                publicClient.readContract({
                                    abi: GAME_CONTRACT_ABI,
                                    address: VITE_GAME_CONTRACT_ADDRESS,
                                    functionName: 'getBettorsForRound',
                                    args: [BigInt(latestCreatedRoundId)]
                                } as any) as Promise<any[]>,
                                publicClient.readContract({
                                    abi: GAME_CONTRACT_ABI,
                                    address: VITE_GAME_CONTRACT_ADDRESS,
                                    functionName: 'totalCollectedPerRound',
                                    args: [BigInt(latestCreatedRoundId)]
                                } as any) as Promise<bigint>
                            ]);
                            setActiveRoundParticipants(bettors.length.toString());
                            setActiveRoundPot(formatWeiToEthString(totalPotWei));
                        } catch (statsErr) {
                            console.error("Error fetching active round stats:", statsErr);
                        }

                        if (deadlineTimestamp * 1000 > Date.now()) {
                            setActiveRoundMessage(`Round ${latestCreatedRoundId} is ACTIVE for betting until ${formatTimestamp(deadlineTimestamp)}.`);
                            setIsLatestRoundBettable(true);
                        } else {
                            setActiveRoundMessage(`Round ${latestCreatedRoundId} betting closed. Awaiting resolution.`);
                        }
                    } else { // If latestCreatedRoundId IS resolved
                        setActiveRoundMessage(`Round ${latestCreatedRoundId} is resolved. Waiting for admin to create Round ${nextRoundId}.`);
                        setActiveRoundEndTimeDisplay("N/A");
                    }
                } else {
                    setActiveRoundMessage(`Data for Round ${latestCreatedRoundId} not found. Waiting for admin to create Round ${nextRoundId}.`);
                    setActiveRoundEndTimeDisplay("N/A");
                }
            } catch (error) {
                console.error("Error checking active round status:", error);
                setActiveRoundMessage("Could not determine active round status due to an error.");
                setActiveRoundEndTimeDisplay("Error");
            }
        };

        if (isConnected && chain?.id === TARGET_CHAIN_ID) {
            checkActiveRound();
        } else {
            setActiveRoundMessage("Connect wallet and switch to target network.");
            setIsLatestRoundBettable(false);
            setIsLatestRoundStakeable(false);
            setActiveRoundEndTimeDisplay("N/A");
        }
    }, [isConnected, chain, publicClient, latestCreatedRoundId, isGamePaused, nextRoundId]);

    return {
        activeRoundMessage,
        isLatestRoundBettable,
        isLatestRoundStakeable,
        activeRoundEndTimeDisplay,
        predictionDeadlineTimestamp,
        activeRoundParticipants,
        activeRoundPot
    };
};
