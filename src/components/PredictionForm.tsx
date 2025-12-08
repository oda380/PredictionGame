// src/components/PredictionForm.tsx
import React from 'react';
import { parseEther, Address, PublicClient } from 'viem';
import Input from './ui/Input';
import Button from './ui/Button';
import CountdownTimer from './ui/CountdownTimer';
import HowItWorksModal from './ui/HowItWorksModal';
import Card from './ui/Card';

interface BaseWriteConfig {
    abi: readonly object[];
    address: Address;
}

interface PredictionFormProps {
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
    isGamePaused: boolean | null;
    entryFeeInWei: bigint | undefined;
    entryFeeDisplay: string;
    predictionDeadlineTimestamp: number | null; // Unix timestamp
    currentEthPrice: number | null;
    activeRoundParticipants?: string;
    activeRoundPot?: string;
    activeRoundBet?: any; // Avoiding complex import, treat as shape
    onCancelBet?: () => Promise<void>;
}

const PredictionForm: React.FC<PredictionFormProps> = ({
    showNotif,
    writeContractAsync,
    baseWriteConfig,
    isWritePending,
    isConnected,
    userAddress,
    publicClient,
    latestCreatedRoundId,
    isLatestRoundBettable,
    isGamePaused,
    entryFeeInWei,
    entryFeeDisplay,
    predictionDeadlineTimestamp,
    currentEthPrice,
    activeRoundParticipants = "0",
    activeRoundPot = "0",
    activeRoundBet,
    onCancelBet
}) => {
    const [isHowItWorksOpen, setIsHowItWorksOpen] = React.useState(false);

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
            showNotif("No active round available for betting.", "error");
            return;
        }
        if (!predictionStr) {
            showNotif("Please enter your BTC price prediction.", "error");
            return;
        }

        try {
            const prediction = parseFloat(predictionStr);
            if (isNaN(prediction) || prediction <= 0) {
                showNotif("Invalid prediction. Please enter a valid positive number.", "error");
                return;
            }
            const predictionForContract = parseEther(prediction.toFixed(18));

            showNotif(`Submitting prediction for round ${betRoundId}...`, "info");
            await writeContractAsync({
                ...baseWriteConfig,
                functionName: 'placeBet',
                args: [predictionForContract, BigInt(betRoundId)],
                value: entryFeeInWei,
            });
            showNotif(`Prediction submitted successfully!`, "success");
        } catch (e) {
            const error = e as { shortMessage?: string; message?: string };
            showNotif(`Error: ${error.shortMessage || error.message}`, "error");
            console.error("Place bet error:", e);
        }
    };

    const canSubmit = isConnected && isLatestRoundBettable && !isGamePaused && !isWritePending;
    const hasActiveRound = isLatestRoundBettable && latestCreatedRoundId !== '0' && latestCreatedRoundId !== 'N/A';

    return (
        <Card accent="cyan" className="">
            <div className="relative z-10">
                {/* Header with countdown */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                            <span className="text-xl">🎯</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-heading font-bold text-heading-primary">Place Your Prediction</h3>
                            <button
                                type="button"
                                onClick={() => setIsHowItWorksOpen(true)}
                                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                                <span className="underline decoration-dashed decoration-cyan-500/50">How it works</span>
                                <span className="bg-cyan-500/20 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">?</span>
                            </button>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Predict BTC price at round end</p>
                        </div>
                    </div>

                    {/* Countdown Timer */}
                    {hasActiveRound && predictionDeadlineTimestamp && (
                        <CountdownTimer
                            targetTimestamp={predictionDeadlineTimestamp}
                            className="text-sm"
                        />
                    )}
                </div>

                {/* Round Info Bar */}
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/60 rounded-xl p-3 mb-4 border border-slate-200 dark:border-slate-700/50">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Active Round</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                            {hasActiveRound ? `#${latestCreatedRoundId}` : "No active round"}
                        </p>
                        {hasActiveRound && (
                            <div className="flex items-center gap-3 mt-1 text-[10px]">
                                <span title="Participants" className="text-slate-500 dark:text-slate-400 font-medium">👥 {activeRoundParticipants}</span>
                                <span title="Current Pot" className="text-slate-500 dark:text-slate-400 font-medium">💰 {activeRoundPot} ETH</span>
                            </div>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Entry Fee</p>
                        <div className="flex flex-col items-end">
                            <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400 font-mono leading-none">{entryFeeDisplay} ETH</p>
                            {parseFloat(entryFeeDisplay) > 0 && currentEthPrice && (
                                <p className="text-xs text-slate-400 font-mono mt-0.5">
                                    ≈ ${(parseFloat(entryFeeDisplay) * currentEthPrice).toFixed(2)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Hero Countdown & Form Content */}
                {/* CHECK: activeRoundBet? */}
                {activeRoundBet ? (
                    <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl p-5 border border-slate-200 dark:border-slate-700/50 text-center animate-fadeIn">
                        <div className="mb-3">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/20 mb-2">
                                <span className="text-2xl">🔒</span>
                            </div>
                            <h4 className="text-slate-900 dark:text-white font-bold text-lg">Prediction Locked</h4>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">You have placed a bet for Round #{latestCreatedRoundId}</p>
                        </div>

                        <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg p-3 mb-4 border border-slate-200 dark:border-slate-700/50">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Your Prediction</p>
                            <p className="text-2xl font-mono font-bold text-cyan-600 dark:text-cyan-400">${activeRoundBet.userPrediction}</p>
                        </div>

                        <div className="text-xs text-body-secondary mb-4 font-medium">
                            Want to change it? You must cancel your current bet first.
                            <br />
                            <span className="text-amber-600 dark:text-amber-400">Entry fee will be refunded.</span>
                        </div>

                        <Button
                            variant="secondary"
                            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            onClick={onCancelBet}
                            disabled={isWritePending}
                        >
                            {isWritePending ? "Cancelling..." : "Cancel & Edit Prediction"}
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* New Hero Countdown Section */}
                        {hasActiveRound && predictionDeadlineTimestamp && (
                            <div className="mb-6 flex justify-center hover:scale-105 transition-transform duration-300">
                                <CountdownTimer
                                    targetTimestamp={predictionDeadlineTimestamp}
                                    size="lg"
                                    label="ENTRY CLOSING IN..."
                                />
                            </div>
                        )}

                        {/* Prediction Form */}
                        <form onSubmit={handlePlaceBetSubmit}>
                            <Input
                                label="Your BTC Price Prediction (USD)"
                                id="prediction"
                                name="prediction"
                                type="number"
                                step="0.0001"
                                placeholder="e.g. 98500.25"
                                required
                                disabled={!canSubmit}
                            />

                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                className="w-full mt-2"
                                disabled={!canSubmit}
                            >
                                {isWritePending ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Submitting...
                                    </>
                                ) : (
                                    <>🚀 Submit Prediction</>
                                )}
                            </Button>

                            {!hasActiveRound && (
                                <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 mt-3">
                                    Waiting for a new round to start...
                                </p>
                            )}
                        </form>
                    </>
                )}
            </div>

            <HowItWorksModal
                isOpen={isHowItWorksOpen}
                onClose={() => setIsHowItWorksOpen(false)}
            />
        </Card>
    );
};

export default PredictionForm;
