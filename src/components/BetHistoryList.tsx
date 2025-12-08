// src/components/BetHistoryList.tsx
import React from 'react';
import { Address } from 'viem';
import Card from './ui/Card';
import Button from './ui/Button';
import { BetHistoryItem } from '../types/game';

interface BetHistoryListProps {
    betHistory: BetHistoryItem[];
    isLoadingHistory: boolean;
    fetchBetHistory: () => Promise<void>;
    isConnected: boolean;
    userAddress: Address | undefined;
    isWritePending: boolean;
    onClaimPrize: (roundId: string) => Promise<void>;
}

const BetHistoryList: React.FC<BetHistoryListProps> = ({
    betHistory,
    isLoadingHistory,
    fetchBetHistory,
    isConnected,
    userAddress,
    isWritePending,
    onClaimPrize,
}) => {
    return (
        <Card title="My Predictions" className="h-fit" accent="purple">
            {/* Loading State */}
            {isLoadingHistory && (
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-3"></div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading your predictions...</p>
                </div>
            )}

            {/* Empty State */}
            {!isLoadingHistory && betHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
                        <span className="text-3xl opacity-50">🎯</span>
                    </div>
                    <p className="text-slate-900 dark:text-slate-400 font-medium mb-1">No predictions yet</p>
                    <p className="text-sm text-slate-600 dark:text-slate-500 font-medium">Place your first prediction to see it here</p>
                </div>
            )}

            {/* Bet History List */}
            {!isLoadingHistory && betHistory.length > 0 && (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {betHistory.map((bet, index) => (
                        <div
                            key={`${bet.roundId}-${index}-${userAddress}`}
                            className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500/30 transition-all duration-300 group shadow-sm"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-slate-800 dark:text-white">Round #{bet.roundId}</span>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bet.isResolved
                                    ? bet.isWinner
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                        : 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600/30'
                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${bet.isResolved
                                        ? bet.isWinner ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400'
                                        : 'bg-amber-500 dark:bg-amber-400 animate-pulse'
                                        }`}></span>
                                    {bet.isResolved ? (bet.isWinner ? 'Won' : 'Lost') : 'Active'}
                                </span>
                            </div>

                            {/* Prediction Display */}
                            <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700/50 mb-3">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Your Prediction</p>
                                <p className="text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400">${bet.userPrediction}</p>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                                <span>Ends: {bet.roundEndTime}</span>
                            </div>

                            {/* Winner Claim Section */}
                            {bet.isResolved && bet.isWinner && (
                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/30">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-0.5">🎉 You won!</p>
                                            <p className="font-bold text-slate-900 dark:text-white text-lg">{bet.prizeAmountEth} ETH</p>
                                            {bet.prizeAmountUsd !== 'N/A' && (
                                                <p className="text-xs text-slate-500">≈ ${bet.prizeAmountUsd}</p>
                                            )}
                                        </div>
                                        {!bet.hasClaimed ? (
                                            (bet.prizeAmountWei && bet.prizeAmountWei > 0n) ? (
                                                <Button
                                                    onClick={() => onClaimPrize(bet.roundId)}
                                                    variant="success"
                                                    size="sm"
                                                    disabled={isWritePending}
                                                >
                                                    {isWritePending ? "..." : "Claim Prize"}
                                                </Button>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/30 px-3 py-1.5 rounded-lg opacity-90 cursor-not-allowed">
                                                    Empty Pot
                                                </span>
                                            )
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                                                ✓ Claimed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Refresh Button */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/30">
                <Button
                    onClick={fetchBetHistory}
                    variant="glass"
                    size="sm"
                    className="w-full"
                    disabled={isLoadingHistory || !isConnected}
                >
                    {isLoadingHistory ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading...
                        </>
                    ) : "↻ Refresh History"}
                </Button>
            </div>
        </Card>
    );
};

export default BetHistoryList;
