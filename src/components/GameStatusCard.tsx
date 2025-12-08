// src/components/GameStatusCard.tsx
import React from 'react';
import { Address } from 'viem';
import Card from './ui/Card';
import Button from './ui/Button';
import { formatWeiToEthString, calculateUsdValue } from '../utils/formatting';
import { BLOCK_EXPLORER_URL, GAME_CONTRACT_ADDRESS, ZERO_ADDRESS } from '../config/contract';

interface GameStatusCardProps {
    nextRoundId: string;
    latestCreatedRoundId: string;
    activeRoundMessage: string;
    isLatestRoundBettable: boolean;
    isLatestRoundStakeable: boolean;
    activeRoundEndTimeDisplay: string;
    entryFeeDisplay: string;
    entryFeeInWei: bigint | undefined;
    gamePausedDisplay: string;
    currentEthPrice: number | null;
    currentEthPriceDisplay: string;
    ethPriceTimestamp: string;
    isEthPriceLoading: boolean;
    currentBtcPrice: string;
    btcPriceTimestamp: string;
    isBtcPriceLoading: boolean;
    btcPriceFeedAddress: Address | null;
    onRefreshAll: () => Promise<void>;
    onRefreshEthPrice: () => Promise<void>;
    onRefreshBtcPrice: () => Promise<void>;
    isGameStatusRefreshing: boolean;
    hasPublicClient: boolean;
}

const GameStatusCard: React.FC<GameStatusCardProps> = ({
    nextRoundId,
    latestCreatedRoundId,
    activeRoundMessage,
    isLatestRoundBettable,
    isLatestRoundStakeable,
    activeRoundEndTimeDisplay,
    entryFeeDisplay,
    entryFeeInWei,
    gamePausedDisplay,
    currentEthPrice,
    currentEthPriceDisplay,
    ethPriceTimestamp,
    isEthPriceLoading,
    currentBtcPrice,
    btcPriceTimestamp,
    isBtcPriceLoading,
    btcPriceFeedAddress,
    onRefreshAll,
    onRefreshEthPrice,
    onRefreshBtcPrice,
    isGameStatusRefreshing,
    hasPublicClient,
}) => {
    return (
        <Card title="" className="md:col-span-1" accent="cyan">
            {/* Hero Price Display */}
            <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 mb-3">
                    <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Live Price</span>
                </div>

                {/* BTC Price Hero */}
                <div className="mb-4">
                    <p className="text-4xl font-bold font-mono bg-gradient-to-r from-amber-400 to-orange-500 text-transparent bg-clip-text">
                        {isBtcPriceLoading ? (
                            <span className="animate-pulse">Loading...</span>
                        ) : currentBtcPrice}
                    </p>
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-500/80 mt-1">
                        BTC/USD • {btcPriceTimestamp}
                    </p>
                </div>

                {/* ETH Price Secondary */}
                <div className="bg-slate-100 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700/50">
                    <p className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                        {isEthPriceLoading ? "..." : currentEthPriceDisplay}
                    </p>
                    <p className="text-xs font-bold text-purple-500 dark:text-purple-400/60">ETH/USD</p>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-100 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700/50">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Round</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">#{latestCreatedRoundId || '—'}</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700/50">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Entry Fee</p>
                    <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{entryFeeDisplay} ETH</p>
                </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-500 dark:text-slate-400">Status</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${gamePausedDisplay === 'Yes'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                    : (isLatestRoundBettable || isLatestRoundStakeable)
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${gamePausedDisplay === 'Yes'
                        ? 'bg-red-500 dark:bg-red-400'
                        : (isLatestRoundBettable || isLatestRoundStakeable)
                            ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse'
                            : 'bg-amber-500 dark:bg-amber-400'
                        }`}></span>
                    {gamePausedDisplay === 'Yes'
                        ? 'Paused'
                        : (isLatestRoundBettable || isLatestRoundStakeable)
                            ? 'Active Round'
                            : 'Idle'}
                </span>
            </div>

            {/* Active Round Info */}
            <div className="bg-slate-100 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700/50 mb-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Current Round</p>
                <p className="text-sm text-slate-800 dark:text-white font-medium">{activeRoundMessage}</p>
                {(isLatestRoundBettable || isLatestRoundStakeable) &&
                    activeRoundEndTimeDisplay !== "N/A" &&
                    activeRoundEndTimeDisplay !== "Error" &&
                    latestCreatedRoundId !== '0' && (
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
                            ⏰ Ends: {activeRoundEndTimeDisplay}
                        </p>
                    )}
            </div>

            {/* Refresh Button */}
            <Button
                onClick={onRefreshAll}
                variant="glass"
                size="sm"
                className="w-full"
                disabled={!hasPublicClient || isGameStatusRefreshing || isEthPriceLoading || isBtcPriceLoading}
            >
                {isGameStatusRefreshing ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Refreshing...
                    </>
                ) : "↻ Refresh Prices"}
            </Button>

            {/* Contract Link */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/30">
                <a
                    href={`${BLOCK_EXPLORER_URL}/address/${GAME_CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-1"
                >
                    <span>View Contract</span>
                    <span>↗</span>
                </a>
            </div>
        </Card>
    );
};

export default GameStatusCard;
