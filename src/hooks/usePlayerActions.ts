import { useWriteContract } from 'wagmi';
import {
    VITE_GAME_CONTRACT_ADDRESS,
    GAME_CONTRACT_ABI
} from '../config/contract';

export const usePlayerActions = (
    showNotif: (msg: string, type: 'success' | 'error' | 'info') => void
) => {
    const { writeContractAsync, isPending: isWritePending, data: writeContractResult } = useWriteContract();

    const baseWriteConfig = {
        abi: GAME_CONTRACT_ABI,
        address: VITE_GAME_CONTRACT_ADDRESS,
    };

    const handleDirectClaimPrize = async (roundIdToClaim: string) => {
        if (!roundIdToClaim) {
            showNotif("Round ID for claiming is missing.", "error");
            return;
        }
        try {
            showNotif(`Attempting to claim prize for round ${roundIdToClaim}...`, "info");
            await writeContractAsync({
                ...baseWriteConfig,
                functionName: 'claimPrize',
                args: [BigInt(roundIdToClaim)]
            } as any);
        } catch (e: any) {
            showNotif(`Claim Prize Error: ${e.shortMessage || e.message}`, "error");
            console.error("Claim Prize Error:", e);
        }
    };

    const handleCancelBet = async (roundIdToCancel: string) => {
        if (!roundIdToCancel) {
            showNotif("Round ID for cancellation is missing.", "error");
            return;
        }
        try {
            showNotif(`Cancelling bet for round ${roundIdToCancel}...`, "info");
            await writeContractAsync({
                ...baseWriteConfig,
                functionName: 'cancelBet',
                args: [BigInt(roundIdToCancel)]
            } as any);
        } catch (e: any) {
            showNotif(`Cancel Bet Error: ${e.shortMessage || e.message}`, "error");
            console.error("Cancel Bet Error:", e);
        }
    };

    return {
        handleDirectClaimPrize,
        handleCancelBet,
        writeContractAsync, // Still needed for PredictionForm, or could be wrapped
        isWritePending,
        writeContractResult,
        baseWriteConfig
    };
};
