// src/components/RoundQuery.tsx
import React, { useState } from 'react';
import Input from './ui/Input';
import Button from './ui/Button';

interface WinnerInfo {
    address: string;
    prediction: string;
}

interface RoundInfo {
    roundEndTime: string;
    predictionDeadline: string;
    totalPot: string;
    prizePool: string;
    adminFee: string;
    isResolved: string;
    actualPrice?: string;
    roundEndPrice?: string;
    winners?: WinnerInfo[];
}

interface RoundQueryProps {
    queryRoundId: string;
    setQueryRoundId: (id: string) => void;
    onFetchRoundDetails: () => Promise<void>;
    queriedRoundInfo: RoundInfo | null;
    participantsCount: string;
    hasPublicClient: boolean;
}

const RoundQuery: React.FC<RoundQueryProps> = ({
    queryRoundId,
    setQueryRoundId,
    onFetchRoundDetails,
    queriedRoundInfo,
    participantsCount,
    hasPublicClient,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="rounded-xl glass-panel overflow-hidden">
            {/* Collapsible Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-xl">🔍</span>
                    <span className="font-heading font-semibold text-heading-primary">Round Explorer</span>
                </div>
                <span className={`text-body-secondary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>

            {/* Expandable Content */}
            {isExpanded && (
                <div className="p-4 pt-0 border-t border-[var(--border-panel)] animate-slide-up">
                    <div className="flex items-end gap-2 mb-4 pt-4">
                        <div className="flex-grow">
                            <Input
                                label=""
                                id="queryRoundIdInput"
                                type="number"
                                value={queryRoundId}
                                onChange={e => setQueryRoundId(e.target.value)}
                                placeholder="Enter Round ID"
                            />
                        </div>
                        <Button
                            onClick={onFetchRoundDetails}
                            variant="glass"
                            size="sm"
                            className="mb-4"
                            disabled={!hasPublicClient || !queryRoundId}
                        >
                            Search
                        </Button>
                    </div>

                    {queriedRoundInfo && (
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-[var(--border-panel)] space-y-2 text-sm">
                            <div className="flex justify-between border-b border-[var(--border-panel)] pb-2 mb-2">
                                <span className="text-body-secondary">Status</span>
                                <span className={queriedRoundInfo.isResolved === "Yes" ? "text-emerald-400" : "text-amber-400"}>
                                    {queriedRoundInfo.isResolved === "Yes" ? "✓ Resolved" : "⏳ Pending"}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-body-secondary text-xs">Total Pot</p>
                                    <p className="text-heading-primary font-mono">{queriedRoundInfo.totalPot}</p>
                                </div>
                                <div>
                                    <p className="text-body-secondary text-xs">Prize Pool</p>
                                    <p className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{queriedRoundInfo.prizePool}</p>
                                </div>
                                <div>
                                    <p className="text-body-secondary text-xs">Participants</p>
                                    <p className="text-heading-primary font-mono">{participantsCount}</p>
                                </div>
                                <div>
                                    <p className="text-body-secondary text-xs">Admin Fee</p>
                                    <p className="text-body-secondary font-mono">{queriedRoundInfo.adminFee}</p>
                                </div>
                            </div>

                            {/* Prices Section */}
                            {(queriedRoundInfo.actualPrice || queriedRoundInfo.roundEndPrice) && (
                                <div className="mt-3 pt-2 border-t border-[var(--border-panel)]">
                                    <div className="grid grid-cols-2 gap-2 text-center">
                                        {queriedRoundInfo.actualPrice && (
                                            <div>
                                                <p className="text-body-secondary text-xs">Winning Price</p>
                                                <p className="text-amber-400 font-mono font-bold text-lg">{queriedRoundInfo.actualPrice}</p>
                                            </div>
                                        )}
                                        {queriedRoundInfo.roundEndPrice && (
                                            <div>
                                                <p className="text-body-secondary text-xs text-blue-500 dark:text-blue-300">At Round End (~)</p>
                                                <p className="text-blue-600 dark:text-blue-400 font-mono font-bold text-lg">{queriedRoundInfo.roundEndPrice}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {queriedRoundInfo.winners && queriedRoundInfo.winners.length > 0 && (
                                <div className="mt-3 pt-2 border-t border-[var(--border-panel)]">
                                    <p className="text-body-secondary text-xs mb-2">Winners</p>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                        {queriedRoundInfo.winners.map((winner, idx) => (
                                            <div key={idx} className="bg-white dark:bg-slate-900/50 p-2 rounded border border-[var(--border-panel)] text-xs flex justify-between items-center">
                                                <span className="font-mono text-emerald-600 dark:text-emerald-400 truncate w-1/2" title={winner.address}>
                                                    {winner.address.slice(0, 6)}...{winner.address.slice(-4)}
                                                </span>
                                                <span className="font-mono text-heading-primary">
                                                    ${winner.prediction}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-3 pt-2 border-t border-[var(--border-panel)] text-xs text-body-secondary">
                                <p>End: {queriedRoundInfo.roundEndTime}</p>
                                <p>Deadline: {queriedRoundInfo.predictionDeadline}</p>
                            </div>
                        </div>
                    )}

                    {!queriedRoundInfo && (
                        <p className="text-sm text-slate-500 text-center py-2">
                            Enter a round ID to view details
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default RoundQuery;
