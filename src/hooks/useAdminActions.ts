// src/hooks/useAdminActions.ts
// Extracts admin action handlers for better modularity and testability

import { useCallback } from 'react';
import { parseEther, Address } from 'viem';
import { ZERO_ADDRESS } from '../config/contract';

interface BaseWriteConfig {
    abi: readonly object[];
    address: Address;
}

interface GameData {
    isGamePaused: boolean | null;
    isTokenGatingEnabled: boolean | null;
    pendingRounds: string[];
}

type NotifyFn = (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
type WriteContractFn = (config: BaseWriteConfig & {
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
}) => Promise<unknown>;

interface UseAdminActionsProps {
    writeContractAsync: WriteContractFn;
    baseWriteConfig: BaseWriteConfig;
    showNotif: NotifyFn;
    gameData: GameData;
    selectedRoundId: string;
    selectedTokenType: 'ERC20' | 'ERC721';
}

export function useAdminActions({
    writeContractAsync,
    baseWriteConfig,
    showNotif,
    gameData,
    selectedRoundId,
    selectedTokenType,
}: UseAdminActionsProps) {
    const { isGamePaused, isTokenGatingEnabled, pendingRounds } = gameData;

    // Core wrapper for all admin contract calls
    const adminActionWrapper = useCallback(async (
        functionName: string,
        args: readonly unknown[] = [],
        successMsgPrefix = "Processing",
        value?: bigint
    ) => {
        try {
            showNotif(`${successMsgPrefix}...`, "info");
            await writeContractAsync({ ...baseWriteConfig, functionName, args, value });
        } catch (e) {
            const error = e as { shortMessage?: string; message?: string };
            showNotif(`Admin Action (${functionName}) Error: ${error.shortMessage || error.message}`, "error");
            console.error(e);
        }
    }, [writeContractAsync, baseWriteConfig, showNotif]);

    // Round Management
    const handleCreateRound = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const endTimeStr = formData.get('roundEndTimeAdmin') as string;
        const deadlineStr = formData.get('predictionDeadlineAdmin') as string;
        if (!endTimeStr || !deadlineStr) {
            showNotif("End time and deadline are required.", "error");
            return;
        }
        const endTimestampDate = new Date(endTimeStr);
        const deadlineTimestampDate = new Date(deadlineStr);
        if (isNaN(endTimestampDate.getTime()) || isNaN(deadlineTimestampDate.getTime())) {
            showNotif("Invalid date format provided for end time or deadline.", "error");
            return;
        }
        const end = BigInt(Math.floor(endTimestampDate.getTime() / 1000));
        const dead = BigInt(Math.floor(deadlineTimestampDate.getTime() / 1000));
        const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
        if (end <= dead) { showNotif("End time must be after the prediction deadline.", "error"); return; }
        if (end <= nowInSeconds) { showNotif("Round end time must be in the future.", "error"); return; }
        if (dead <= nowInSeconds) { showNotif("Prediction deadline must be in the future.", "error"); return; }
        adminActionWrapper('createRound', [end, dead], "Creating new round");
    }, [showNotif, adminActionWrapper]);

    const handleResolveRound = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const id = new FormData(e.currentTarget).get('resolveRoundIdAdmin') as string;
        if (!id || isNaN(Number(id)) || BigInt(id) <= 0) {
            showNotif("Invalid ID.", "error");
            return;
        }
        adminActionWrapper('resolveRound', [BigInt(id)], `Resolving ${id}`);
    }, [showNotif, adminActionWrapper]);

    const handleRaiseStake = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const amountEthStr = new FormData(e.currentTarget).get('raiseStakeAmount') as string;
        if (!amountEthStr || isNaN(parseFloat(amountEthStr)) || parseFloat(amountEthStr) <= 0) {
            showNotif("Please enter a valid ETH amount.", "error");
            return;
        }
        const targetRoundId = pendingRounds.length > 1 ? selectedRoundId : pendingRounds[0];
        if (!targetRoundId) {
            showNotif("No active round to raise stake for.", "error");
            return;
        }
        const amountWei = parseEther(amountEthStr);
        adminActionWrapper(
            'raiseStakeInRound',
            [BigInt(targetRoundId)],
            `Adding ${amountEthStr} ETH to Round #${targetRoundId}`,
            amountWei
        );
    }, [showNotif, adminActionWrapper, pendingRounds, selectedRoundId]);

    // Token Gating
    const handleSetGatingToken = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const addr = (fd.get('gatingTokenAddress') as string) || ZERO_ADDRESS;
        const amountStr = fd.get('minGatingTokenBalance') as string;
        const decimalsStr = fd.get('tokenDecimals') as string;

        if (addr !== ZERO_ADDRESS && !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
            showNotif("Invalid token address.", "error");
            return;
        }

        let rawBalance: bigint;
        if (selectedTokenType === 'ERC721') {
            rawBalance = amountStr ? BigInt(Math.floor(Number(amountStr))) : 0n;
        } else {
            const decimals = decimalsStr ? parseInt(decimalsStr) : 18;
            const amount = amountStr ? parseFloat(amountStr) : 0;
            rawBalance = BigInt(Math.floor(amount * Math.pow(10, decimals)));
        }

        adminActionWrapper('setGatingToken', [addr, rawBalance], "Setting gating token");
    }, [showNotif, adminActionWrapper, selectedTokenType]);

    const handleToggleGating = useCallback(async () => {
        if (isTokenGatingEnabled === null) {
            showNotif("Gating status not loaded.", "error");
            return;
        }
        adminActionWrapper('toggleTokenGating', [!isTokenGatingEnabled], `Toggling gating`);
    }, [showNotif, adminActionWrapper, isTokenGatingEnabled]);

    // Game Settings
    const handleSetEntryFee = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const feeStr = (new FormData(e.currentTarget).get('newEntryFee') as string) || "0";
        try {
            const fee = parseEther(feeStr);
            if (fee < 0) throw Error("Negative fee");
            adminActionWrapper('setEntryFee', [fee], "Setting entry fee");
        } catch (err) {
            showNotif(`Invalid fee: ${(err as Error).message}`, "error");
        }
    }, [showNotif, adminActionWrapper]);

    const handleSetPrizePoolPercentage = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const percStr = new FormData(e.currentTarget).get('newPrizePoolPercentage') as string;
        const perc = parseInt(percStr);
        if (isNaN(perc) || perc < 0 || perc > 100) {
            showNotif("Percentage 0-100.", "error");
            return;
        }
        adminActionWrapper('setPrizePoolPercentage', [BigInt(perc)], "Setting prize %");
    }, [showNotif, adminActionWrapper]);

    const handleSetMaxBetAmount = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const amtStr = (new FormData(e.currentTarget).get('newMaxBetAmount') as string) || "0";
        try {
            const amt = parseEther(amtStr);
            if (amt < 0) throw Error("Negative amount");
            adminActionWrapper('setMaxBetAmount', [amt], "Setting max bet");
        } catch (err) {
            showNotif(`Invalid amount: ${(err as Error).message}`, "error");
        }
    }, [showNotif, adminActionWrapper]);

    const handleSetOracleAddress = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const addr = new FormData(e.currentTarget).get('newOracleAddress') as string;
        if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
            showNotif("Invalid oracle address.", "error");
            return;
        }
        adminActionWrapper('setOracleAddress', [addr], "Setting BTC oracle");
    }, [showNotif, adminActionWrapper]);

    // Maintenance
    const handlePauseGame = useCallback(async () => {
        if (isGamePaused === true) {
            showNotif("Already paused.", "info");
            return;
        }
        adminActionWrapper('pauseGame', [], "Pausing game");
    }, [showNotif, adminActionWrapper, isGamePaused]);

    const handleUnpauseGame = useCallback(async () => {
        if (isGamePaused === false) {
            showNotif("Already unpaused.", "info");
            return;
        }
        adminActionWrapper('unpauseGame', [], "Unpausing game");
    }, [showNotif, adminActionWrapper, isGamePaused]);

    const handleWithdrawAdminFees = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const to = new FormData(e.currentTarget).get('withdrawToAddress') as string;
        if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) {
            showNotif("Invalid address.", "error");
            return;
        }
        adminActionWrapper('withdrawAdminFees', [to], "Withdrawing fees");
    }, [showNotif, adminActionWrapper]);

    return {
        // Round Management
        handleCreateRound,
        handleResolveRound,
        handleRaiseStake,
        // Token Gating
        handleSetGatingToken,
        handleToggleGating,
        // Game Settings
        handleSetEntryFee,
        handleSetPrizePoolPercentage,
        handleSetMaxBetAmount,
        handleSetOracleAddress,
        // Maintenance
        handlePauseGame,
        handleUnpauseGame,
        handleWithdrawAdminFees,
    };
}
