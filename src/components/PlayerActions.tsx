// src/components/PlayerActions.tsx
import React from 'react';
import { parseEther, Address, PublicClient } from 'viem';
import Input from './ui/Input';
import Button from './ui/Button';

interface BaseWriteConfig {
    abi: readonly object[];
    address: Address;
}

interface PlayerActionsProps {
    showNotif: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    writeContractAsync: (config: BaseWriteConfig & {
        functionName: string;
        args?: readonly unknown[];
        value?: bigint
    }) => Promise<unknown>;
    baseWriteConfig: BaseWriteConfig;
    isWritePending: boolean;
    isConnected: boolean;
    userAddress: Address | undefined;
    publicClient: PublicClient | undefined;
    latestCreatedRoundId: string;
    isLatestRoundBettable: boolean;
    isLatestRoundStakeable: boolean;
    isGamePaused: boolean | null;
    entryFeeInWei: bigint | undefined;
    currentEthPrice: number | null;
}

const PlayerActions: React.FC<PlayerActionsProps> = ({
    showNotif,
    writeContractAsync,
    baseWriteConfig,
    isWritePending,
    isConnected,
    userAddress,
    publicClient,
    latestCreatedRoundId,
    isLatestRoundBettable,
    isLatestRoundStakeable,
    isGamePaused,
    entryFeeInWei,
    currentEthPrice,
}) => {
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
            });
        } catch (e) {
            const error = e as { shortMessage?: string; message?: string };
            showNotif(`Claim Prize Error: ${error.shortMessage || error.message}`, "error");
            console.error("Claim Prize Error:", e);
        }
    };

    const handlePlaceBetSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!publicClient || !userAddress) {
            showNotif("Wallet not connected or client not ready.", "error");
            return;
        }
        const betRoundId = latestCreatedRoundId;
        const formData = new FormData(event.currentTarget);
        const predictionStr = formData.get('prediction') as string;

        if (!isLatestRoundBettable || !betRoundId || betRoundId === '0' || betRoundId === 'N/A') {
            showNotif("No active round available for betting or round ID is invalid.", "error");
            return;
        }
        if (!predictionStr) {
            showNotif("Please enter your BTC price prediction.", "error");
            return;
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const userBetDetailsArr = await (publicClient as any).readContract({
                abi: baseWriteConfig.abi,
                address: baseWriteConfig.address,
                functionName: 'bets',
                args: [BigInt(betRoundId), userAddress]
            }) as readonly [bigint, bigint, boolean, boolean];

            if (userBetDetailsArr && userBetDetailsArr[3] === true) {
                showNotif("You have already placed a bet for this round. Only one bet per round is allowed.", "error");
                return;
            }
            const predictionValue = parseFloat(predictionStr);
            if (isNaN(predictionValue)) {
                showNotif("Invalid prediction value. Please enter a number.", "error");
                return;
            }
            const rawPrediction = BigInt(Math.round(predictionValue * (10 ** 4)));
            if (entryFeeInWei === undefined) {
                showNotif("Entry fee not loaded. Please refresh the page or game status.", "error");
                return;
            }
            showNotif("Submitting your bet transaction...", "info");
            await writeContractAsync({
                ...baseWriteConfig,
                functionName: 'placeBet',
                args: [rawPrediction, BigInt(betRoundId)],
                value: entryFeeInWei
            });
        } catch (e) {
            console.error("Error during place bet submission:", e);
            const error = e as { shortMessage?: string; message?: string };
            if (error.message?.includes("bets") || error.message?.includes("readContract")) {
                showNotif(`Error checking previous bet status: ${error.shortMessage || error.message}`, "error");
            } else {
                showNotif(`Place Bet Transaction Error: ${error.shortMessage || error.message}`, "error");
            }
        }
    };

    const handleClaimPrizeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const claimRoundId = formData.get('claimRoundId') as string;
        if (!claimRoundId) {
            showNotif("Please enter a Round ID to claim from.", "error");
            return;
        }
        handleDirectClaimPrize(claimRoundId);
    };

    const handleRaiseStakeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const roundId = latestCreatedRoundId;
        const formData = new FormData(event.currentTarget);
        const amountUsdStr = formData.get('raiseStakeAmountUsd') as string;

        if (!isLatestRoundStakeable || !roundId || roundId === '0' || roundId === 'N/A') {
            showNotif("No active round available to raise stake or round ID is invalid.", "error");
            return;
        }
        if (!amountUsdStr) {
            showNotif("Please provide USD amount to raise stake.", "error");
            return;
        }
        if (!currentEthPrice || currentEthPrice <= 0) {
            showNotif("Current ETH/USD price is not available or invalid. Cannot calculate ETH amount.", "error");
            return;
        }

        try {
            const amountUsd = parseFloat(amountUsdStr);
            if (isNaN(amountUsd) || amountUsd <= 0) {
                showNotif("Invalid USD amount. Please enter a positive number.", "error");
                return;
            }
            const amountEth = amountUsd / currentEthPrice;
            const amountWei = parseEther(amountEth.toFixed(18));

            showNotif(`Raising stake for round ${roundId} by ${amountEth.toFixed(6)} ETH (~$${amountUsdStr} USD)...`, "info");
            await writeContractAsync({
                ...baseWriteConfig,
                functionName: 'raiseStakeInRound',
                args: [BigInt(roundId)],
                value: amountWei,
            });
        } catch (e) {
            const error = e as { shortMessage?: string; message?: string };
            showNotif(`Raise Stake Error: ${error.shortMessage || error.message}`, "error");
            console.error("Error raising stake:", e);
        }
    };

    return (
        <div className="space-y-6">
            {/* Place Prediction - Primary CTA */}
            <form onSubmit={handlePlaceBetSubmit} className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/80 border border-cyan-500/20 overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                            <span className="text-xl">🎯</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-heading font-bold text-white">Place Prediction</h3>
                            <p className="text-xs text-slate-500">Predict BTC price at round end</p>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-xl p-3 mb-4 border border-slate-700/30">
                        <p className="text-xs text-slate-500 mb-1">Active Round</p>
                        <p className="text-xl font-bold text-white font-mono">
                            {isLatestRoundBettable && latestCreatedRoundId !== '0' && latestCreatedRoundId !== 'N/A'
                                ? `#${latestCreatedRoundId}`
                                : "No active round"}
                        </p>
                    </div>

                    <Input
                        label="Your BTC Price Prediction"
                        id="prediction"
                        name="prediction"
                        type="number"
                        step="0.0001"
                        placeholder="e.g. 98500.00"
                        required
                        hint="Enter your predicted BTC/USD price"
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full mt-2"
                        disabled={!isConnected || !isLatestRoundBettable || isGamePaused === true || isWritePending}
                    >
                        {isWritePending ? "Placing Prediction..." : "🚀 Submit Prediction"}
                    </Button>
                </div>
            </form>

            {/* Secondary Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Claim Prize */}
                <form onSubmit={handleClaimPrizeSubmit} className="p-5 rounded-xl bg-slate-800/40 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <span className="text-lg">🏆</span>
                        </div>
                        <h3 className="font-heading font-bold text-emerald-400">Claim Prize</h3>
                    </div>
                    <Input label="Round ID" id="claimRoundId" name="claimRoundId" type="number" required placeholder="Enter round #" />
                    <Button type="submit" variant="success" size="sm" className="w-full" disabled={!isConnected || isWritePending}>
                        {isWritePending ? "Claiming..." : "Claim Prize"}
                    </Button>
                </form>

                {/* Raise Stake */}
                <form onSubmit={handleRaiseStakeSubmit} className="p-5 rounded-xl bg-slate-800/40 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <span className="text-lg">🔥</span>
                        </div>
                        <h3 className="font-heading font-bold text-amber-400">Raise Stake</h3>
                    </div>
                    <input type="hidden" name="raiseStakeRoundIdDisplay" value={latestCreatedRoundId} />
                    <Input
                        label="Amount (USD)"
                        id="raiseStakeAmountUsd"
                        name="raiseStakeAmountUsd"
                        type="number"
                        step="any"
                        placeholder="$10.00"
                        required
                        hint={isLatestRoundStakeable && latestCreatedRoundId !== '0' ? `Round #${latestCreatedRoundId}` : "No active round"}
                    />
                    <Button
                        type="submit"
                        variant="warning"
                        size="sm"
                        className="w-full"
                        disabled={!isConnected || !isLatestRoundStakeable || isWritePending || !currentEthPrice}
                    >
                        {isWritePending ? "Adding..." : "Add Stake"}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default PlayerActions;
