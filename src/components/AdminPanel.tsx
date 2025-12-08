// src/components/AdminPanel.tsx
// Refactored to use useAdminActions hook for better modularity

import React from 'react';
import { Address } from 'viem';
import Input from './ui/Input';
import Button from './ui/Button';
import { useAdminActions } from '../hooks/useAdminActions';
import AdminCard from './admin/AdminCard';

interface BaseWriteConfig {
    abi: readonly object[];
    address: Address;
}

interface GameData {
    isGamePaused: boolean | null;
    isTokenGatingEnabled: boolean | null;
    tokenGatingEnabledDisplay: string;
    gatingTokenAddress: string;
    minGatingTokenBalance: string;
    entryFeeDisplay: string;
    prizePoolPercentage: number | null;
    btcPriceFeedAddress: Address | null;
    latestCreatedRoundId: string;
    isLatestRoundStakeable: boolean;
    pendingRounds: string[];
}

interface AdminPanelProps {
    showNotif: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    writeContractAsync: (config: BaseWriteConfig & {
        functionName: string;
        args?: readonly unknown[];
        value?: bigint
    }) => Promise<unknown>;
    baseWriteConfig: BaseWriteConfig;
    isWritePending: boolean;
    gameData: GameData;
    userAddress: Address | undefined;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
    showNotif,
    writeContractAsync,
    baseWriteConfig,
    isWritePending,
    gameData,
    userAddress,
}) => {
    const {
        isGamePaused,
        isTokenGatingEnabled,
        tokenGatingEnabledDisplay,
        gatingTokenAddress,
        minGatingTokenBalance,
        entryFeeDisplay,
        prizePoolPercentage,
        btcPriceFeedAddress,
        pendingRounds,
    } = gameData;

    // Local UI state
    const [selectedTokenType, setSelectedTokenType] = React.useState<'ERC20' | 'ERC721'>('ERC20');
    const [selectedRoundId, setSelectedRoundId] = React.useState<string>(pendingRounds.length > 0 ? pendingRounds[0] : '');

    // Update selected round when pendingRounds changes
    React.useEffect(() => {
        if (pendingRounds.length > 0 && !pendingRounds.includes(selectedRoundId)) {
            setSelectedRoundId(pendingRounds[0]);
        } else if (pendingRounds.length === 0) {
            setSelectedRoundId('');
        }
    }, [pendingRounds, selectedRoundId]);

    // Use extracted admin actions hook
    const {
        handleCreateRound,
        handleResolveRound,
        handleRaiseStake,
        handleSetGatingToken,
        handleToggleGating,
        handleSetEntryFee,
        handleSetPrizePoolPercentage,
        handleSetOracleAddress,
        handlePauseGame,
        handleUnpauseGame,
        handleWithdrawAdminFees,
    } = useAdminActions({
        writeContractAsync,
        baseWriteConfig,
        showNotif,
        gameData,
        selectedRoundId,
        selectedTokenType,
    });

    // Derived state
    const hasPendingRounds = pendingRounds.length > 0;
    const hasMultipleRounds = pendingRounds.length > 1;

    return (
        <div className="mt-8">
            {/* Admin Panel Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <span className="text-xl">⚙️</span>
                </div>
                <div>
                    <h2 className="text-xl font-heading font-bold text-amber-600 dark:text-amber-400">Admin Panel</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-500">Manage game settings and rounds</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Create Round Card */}
                <AdminCard icon="➕" title="Create Round" colorScheme="cyan">
                    <form onSubmit={handleCreateRound}>
                        <Input label="Round End Time" id="roundEndTimeAdmin" name="roundEndTimeAdmin" type="datetime-local" required />
                        <Input label="Prediction Deadline" id="predictionDeadlineAdmin" name="predictionDeadlineAdmin" type="datetime-local" required />
                        <Button type="submit" variant="primary" size="sm" className="w-full" disabled={isWritePending}>
                            {isWritePending ? "Processing..." : "Create Round"}
                        </Button>
                    </form>
                </AdminCard>

                {/* Resolve Round Card */}
                <AdminCard
                    icon="✓"
                    title="Resolve Round"
                    subtitle={hasPendingRounds
                        ? (hasMultipleRounds ? `${pendingRounds.length} pending rounds` : `Pending: Round #${pendingRounds[0]}`)
                        : "No round to resolve"
                    }
                    colorScheme="purple"
                    disabled={!hasPendingRounds}
                >
                    <form onSubmit={handleResolveRound}>
                        <div className="mb-3">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Round ID</label>
                            {hasMultipleRounds ? (
                                <select
                                    name="resolveRoundIdAdmin"
                                    value={selectedRoundId}
                                    onChange={(e) => setSelectedRoundId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:border-purple-500/50 focus:outline-none transition-all"
                                >
                                    {pendingRounds.map(id => (
                                        <option key={id} value={id}>Round #{id}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    name="resolveRoundIdAdmin"
                                    value={hasPendingRounds ? pendingRounds[0] : '—'}
                                    disabled
                                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-sm cursor-not-allowed"
                                />
                            )}
                        </div>
                        <Button type="submit" variant="warning" size="sm" className="w-full" disabled={isWritePending || !hasPendingRounds}>
                            {!hasPendingRounds ? "No Round to Resolve" : isWritePending ? "Processing..." : "Resolve Round"}
                        </Button>
                    </form>
                </AdminCard>

                {/* Raise Stake Card */}
                <AdminCard
                    icon="💰"
                    title="Raise Stake"
                    subtitle={hasPendingRounds
                        ? (hasMultipleRounds ? `${pendingRounds.length} active rounds` : `Active: Round #${pendingRounds[0]}`)
                        : "No active round"
                    }
                    colorScheme="amber"
                    disabled={!hasPendingRounds}
                >
                    <form onSubmit={handleRaiseStake}>
                        <div className="mb-3">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Round</label>
                            {hasMultipleRounds ? (
                                <select
                                    name="raiseStakeRoundId"
                                    value={selectedRoundId}
                                    onChange={(e) => setSelectedRoundId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:border-amber-500/50 focus:outline-none transition-all"
                                >
                                    {pendingRounds.map(id => (
                                        <option key={id} value={id}>Round #{id}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    name="raiseStakeRoundId"
                                    value={hasPendingRounds ? `Round #${pendingRounds[0]}` : '—'}
                                    disabled
                                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-sm cursor-not-allowed"
                                />
                            )}
                        </div>
                        <Input
                            label="Amount (ETH)"
                            id="raiseStakeAmount"
                            name="raiseStakeAmount"
                            type="number"
                            step="0.001"
                            min="0"
                            required
                            placeholder={hasPendingRounds ? "0.1" : "—"}
                            disabled={!hasPendingRounds}
                        />
                        <Button type="submit" variant="warning" size="sm" className="w-full" disabled={isWritePending || !hasPendingRounds}>
                            {!hasPendingRounds ? "No Active Round" : isWritePending ? "Processing..." : "Add to Prize Pool"}
                        </Button>
                    </form>
                </AdminCard>

                {/* Token Gating Card */}
                <AdminCard icon="🔐" title="Token Gating" colorScheme="emerald">
                    {/* Warning Box */}
                    <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30">
                        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">⚠️ Important Notes:</p>
                        <ul className="text-xs text-amber-600 dark:text-amber-200/80 list-disc list-inside space-y-0.5">
                            <li><strong>ERC-20:</strong> Enter tokens as human-readable number (decimals applied automatically)</li>
                            <li><strong>ERC-721:</strong> Set Min Balance to 1 to require any NFT from collection</li>
                            <li>ERC-1155 is NOT supported</li>
                        </ul>
                    </div>

                    <form onSubmit={handleSetGatingToken} className="mb-4">
                        {/* Token Type Selector */}
                        <div className="mb-3">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Token Type</label>
                            <div className="flex gap-2">
                                <label className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 border cursor-pointer transition-all ${selectedTokenType === 'ERC20' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-300 dark:border-slate-600 hover:border-cyan-500/50'}`}>
                                    <input
                                        type="radio"
                                        name="tokenType"
                                        value="ERC20"
                                        checked={selectedTokenType === 'ERC20'}
                                        onChange={() => setSelectedTokenType('ERC20')}
                                        className="sr-only"
                                    />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">🪙 ERC-20</span>
                                </label>
                                <label className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 border cursor-pointer transition-all ${selectedTokenType === 'ERC721' ? 'border-purple-500 bg-purple-500/10' : 'border-slate-300 dark:border-slate-600 hover:border-purple-500/50'}`}>
                                    <input
                                        type="radio"
                                        name="tokenType"
                                        value="ERC721"
                                        checked={selectedTokenType === 'ERC721'}
                                        onChange={() => setSelectedTokenType('ERC721')}
                                        className="sr-only"
                                    />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">🖼️ ERC-721</span>
                                </label>
                            </div>
                        </div>

                        <Input label="Contract Address" name="gatingTokenAddress" id="gatingTokenAddress" placeholder="0x..." defaultValue={gatingTokenAddress !== "N/A" ? gatingTokenAddress : ""} />

                        {/* Decimals for ERC-20 */}
                        {selectedTokenType === 'ERC20' && (
                            <div className="mb-2 animate-fadeIn">
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Token Decimals</label>
                                <input
                                    type="number"
                                    name="tokenDecimals"
                                    min="0"
                                    max="18"
                                    defaultValue="18"
                                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:border-cyan-500/50 focus:outline-none transition-all"
                                />
                            </div>
                        )}

                        {/* Min Balance */}
                        <div className="mb-3">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Min. Balance Required</label>
                            <input
                                type="number"
                                name="minGatingTokenBalance"
                                step="any"
                                min="0"
                                defaultValue="1"
                                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:border-cyan-500/50 focus:outline-none transition-all"
                                placeholder={selectedTokenType === 'ERC20' ? "e.g., 100 (for 100 tokens)" : "e.g., 1 (must own 1 NFT)"}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                {selectedTokenType === 'ERC20'
                                    ? 'Amount of tokens user must hold (decimals handled automatically)'
                                    : 'Number of NFTs user must hold from the collection'}
                            </p>
                        </div>

                        <Button type="submit" variant="secondary" size="sm" className="w-full" disabled={isWritePending}>
                            {isWritePending ? "..." : "Set Gating Token"}
                        </Button>
                    </form>

                    {/* Current Status */}
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950/50 text-xs text-slate-500 dark:text-slate-400 mb-3 border border-slate-200 dark:border-slate-800">
                        <p>Current: <span className="text-slate-700 dark:text-slate-300 break-all">{gatingTokenAddress}</span></p>
                        <p>Min Balance (raw): <span className="text-slate-700 dark:text-slate-300">{minGatingTokenBalance}</span></p>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Gating Status:</span>
                        <Button onClick={handleToggleGating} variant="glass" size="sm" disabled={isWritePending || isTokenGatingEnabled === null}>
                            {tokenGatingEnabledDisplay}
                        </Button>
                    </div>
                </AdminCard>

                {/* Game Settings Card */}
                <AdminCard icon="⚙️" title="Game Settings" colorScheme="amber">
                    <form onSubmit={handleSetEntryFee} className="mb-3">
                        <Input label="Entry Fee (ETH)" id="newEntryFee" name="newEntryFee" type="number" step="any" required defaultValue={entryFeeDisplay !== "N/A" ? entryFeeDisplay : ""} />
                        <Button type="submit" variant="secondary" size="sm" className="w-full" disabled={isWritePending}>
                            {isWritePending ? "..." : "Set Fee"}
                        </Button>
                    </form>
                    <form onSubmit={handleSetPrizePoolPercentage} className="mb-3">
                        <Input label="Prize Pool %" id="newPrizePoolPercentage" name="newPrizePoolPercentage" type="number" min="0" max="100" required defaultValue={prizePoolPercentage !== null ? prizePoolPercentage.toString() : ""} />
                        <Button type="submit" variant="secondary" size="sm" className="w-full" disabled={isWritePending}>
                            {isWritePending ? "..." : "Set %"}
                        </Button>
                    </form>
                    <form onSubmit={handleSetOracleAddress}>
                        <Input label="BTC Oracle Address" id="newOracleAddress" name="newOracleAddress" placeholder="0x..." required defaultValue={btcPriceFeedAddress || ""} />
                        <Button type="submit" variant="secondary" size="sm" className="w-full" disabled={isWritePending}>
                            {isWritePending ? "..." : "Set Oracle"}
                        </Button>
                    </form>
                </AdminCard>

                {/* Maintenance Card */}
                <AdminCard icon="🛠️" title="Maintenance" colorScheme="red">
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <Button onClick={handlePauseGame} variant="warning" size="sm" disabled={isWritePending || isGamePaused === true}>
                            Pause
                        </Button>
                        <Button onClick={handleUnpauseGame} variant="success" size="sm" disabled={isWritePending || isGamePaused === false}>
                            Unpause
                        </Button>
                    </div>
                    <form onSubmit={handleWithdrawAdminFees}>
                        <Input label="Withdraw To" id="withdrawToAddress" name="withdrawToAddress" placeholder="0x..." required defaultValue={userAddress || ''} />
                        <Button type="submit" variant="danger" size="sm" className="w-full" disabled={isWritePending}>
                            {isWritePending ? "..." : "Withdraw Fees"}
                        </Button>
                    </form>
                </AdminCard>
            </div>
        </div>
    );
};

export default AdminPanel;
