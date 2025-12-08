// src/components/AdminPanel.tsx
import React from 'react';
import { parseEther, Address } from 'viem';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import { ZERO_ADDRESS } from '../config/contract';

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
        latestCreatedRoundId,
        isLatestRoundStakeable,
        pendingRounds,
    } = gameData;

    const adminActionWrapper = async (
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
    };

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

    const handleCreateRound = async (e: React.FormEvent<HTMLFormElement>) => {
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
    };

    const handleResolveRound = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const id = new FormData(e.currentTarget).get('resolveRoundIdAdmin') as string;
        if (!id || isNaN(Number(id)) || BigInt(id) <= 0) {
            showNotif("Invalid ID.", "error");
            return;
        }
        adminActionWrapper('resolveRound', [BigInt(id)], `Resolving ${id}`);
    };

    const handleSetGatingToken = async (e: React.FormEvent<HTMLFormElement>) => {
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
            // For NFTs, just use the count directly
            rawBalance = amountStr ? BigInt(Math.floor(Number(amountStr))) : 0n;
        } else {
            // For ERC-20, apply decimals conversion
            const decimals = decimalsStr ? parseInt(decimalsStr) : 18;
            const amount = amountStr ? parseFloat(amountStr) : 0;
            // Convert to raw units: amount * 10^decimals
            rawBalance = BigInt(Math.floor(amount * Math.pow(10, decimals)));
        }

        adminActionWrapper('setGatingToken', [addr, rawBalance], "Setting gating token");
    };


    const handleToggleGating = async () => {
        if (isTokenGatingEnabled === null) {
            showNotif("Gating status not loaded.", "error");
            return;
        }
        adminActionWrapper('toggleTokenGating', [!isTokenGatingEnabled], `Toggling gating`);
    };

    const handleSetEntryFee = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const feeStr = (new FormData(e.currentTarget).get('newEntryFee') as string) || "0";
        try {
            const fee = parseEther(feeStr);
            if (fee < 0) throw Error("Negative fee");
            adminActionWrapper('setEntryFee', [fee], "Setting entry fee");
        } catch (err) {
            showNotif(`Invalid fee: ${(err as Error).message}`, "error");
        }
    };

    const handleSetPrizePoolPercentage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const percStr = new FormData(e.currentTarget).get('newPrizePoolPercentage') as string;
        const perc = parseInt(percStr);
        if (isNaN(perc) || perc < 0 || perc > 100) {
            showNotif("Percentage 0-100.", "error");
            return;
        }
        adminActionWrapper('setPrizePoolPercentage', [BigInt(perc)], "Setting prize %");
    };

    const handleSetMaxBetAmount = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const amtStr = (new FormData(e.currentTarget).get('newMaxBetAmount') as string) || "0";
        try {
            const amt = parseEther(amtStr);
            if (amt < 0) throw Error("Negative amount");
            adminActionWrapper('setMaxBetAmount', [amt], "Setting max bet");
        } catch (err) {
            showNotif(`Invalid amount: ${(err as Error).message}`, "error");
        }
    };

    const handleSetOracleAddress = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const addr = new FormData(e.currentTarget).get('newOracleAddress') as string;
        if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
            showNotif("Invalid oracle address.", "error");
            return;
        }
        adminActionWrapper('setOracleAddress', [addr], "Setting BTC oracle");
    };

    const handlePauseGame = async () => {
        if (isGamePaused === true) {
            showNotif("Already paused.", "info");
            return;
        }
        adminActionWrapper('pauseGame', [], "Pausing game");
    };

    const handleUnpauseGame = async () => {
        if (isGamePaused === false) {
            showNotif("Already unpaused.", "info");
            return;
        }
        adminActionWrapper('unpauseGame', [], "Unpausing game");
    };

    const handleWithdrawAdminFees = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const to = new FormData(e.currentTarget).get('withdrawToAddress') as string;
        if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) {
            showNotif("Invalid address.", "error");
            return;
        }
        adminActionWrapper('withdrawAdminFees', [to], "Withdrawing fees");
    };

    const handleRaiseStake = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const amountEthStr = new FormData(e.currentTarget).get('raiseStakeAmount') as string;
        if (!amountEthStr || isNaN(parseFloat(amountEthStr)) || parseFloat(amountEthStr) <= 0) {
            showNotif("Please enter a valid ETH amount.", "error");
            return;
        }
        // Use selectedRoundId if multiple rounds, otherwise use the single pending round
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
    };

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
                <div className="p-5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-cyan-500/20 shadow-lg dark:shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:border-cyan-500/40 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <span className="text-lg">➕</span>
                        </div>
                        <h3 className="font-heading font-bold text-cyan-600 dark:text-cyan-400">Create Round</h3>
                    </div>
                    <form onSubmit={handleCreateRound}>
                        <Input label="Round End Time" id="roundEndTimeAdmin" name="roundEndTimeAdmin" type="datetime-local" required />
                        <Input label="Prediction Deadline" id="predictionDeadlineAdmin" name="predictionDeadlineAdmin" type="datetime-local" required />
                        <Button type="submit" variant="primary" size="sm" className="w-full" disabled={isWritePending}>{isWritePending ? "Processing..." : "Create Round"}</Button>
                    </form>
                </div>

                {/* Resolve Round Card */}
                {(() => {
                    const hasPendingRounds = pendingRounds.length > 0;
                    const hasMultiple = pendingRounds.length > 1;
                    return (
                        <div className={`p-5 rounded-xl bg-white dark:bg-slate-900/90 border shadow-lg transition-all duration-300 ${hasPendingRounds
                            ? 'border-slate-200 dark:border-purple-500/20 dark:shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:border-purple-500/40'
                            : 'border-slate-200 dark:border-slate-700/50 opacity-60'}`}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasPendingRounds ? 'bg-purple-500/20' : 'bg-slate-300/30 dark:bg-slate-700/30'}`}>
                                    <span className="text-lg">✓</span>
                                </div>
                                <div>
                                    <h3 className={`font-heading font-bold ${hasPendingRounds ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-500'}`}>Resolve Round</h3>
                                    {hasPendingRounds ? (
                                        <p className="text-xs text-slate-500">
                                            {hasMultiple ? `${pendingRounds.length} pending rounds` : `Pending: Round #${pendingRounds[0]}`}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-red-500 dark:text-red-400">No round to resolve</p>
                                    )}
                                </div>
                            </div>
                            <form onSubmit={handleResolveRound}>
                                <div className="mb-3">
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Round ID</label>
                                    {hasMultiple ? (
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
                                <Button
                                    type="submit"
                                    variant="warning"
                                    size="sm"
                                    className="w-full"
                                    disabled={isWritePending || !hasPendingRounds}
                                >
                                    {!hasPendingRounds ? "No Round to Resolve" : isWritePending ? "Processing..." : "Resolve Round"}
                                </Button>
                            </form>
                        </div>
                    );
                })()}

                {/* Raise Stake Card */}
                {(() => {
                    const hasPendingRounds = pendingRounds.length > 0;
                    const hasMultiple = pendingRounds.length > 1;
                    return (
                        <div className={`p-5 rounded-xl bg-white dark:bg-slate-900/90 border shadow-lg transition-all duration-300 ${hasPendingRounds
                            ? 'border-slate-200 dark:border-amber-500/20 dark:shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:border-amber-500/40'
                            : 'border-slate-200 dark:border-slate-700/50 opacity-60'}`}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasPendingRounds ? 'bg-amber-500/20' : 'bg-slate-300/30 dark:bg-slate-700/30'}`}>
                                    <span className="text-lg">💰</span>
                                </div>
                                <div>
                                    <h3 className={`font-heading font-bold ${hasPendingRounds ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-500'}`}>Raise Stake</h3>
                                    {hasPendingRounds ? (
                                        <p className="text-xs text-slate-500">
                                            {hasMultiple ? `${pendingRounds.length} active rounds` : `Active: Round #${pendingRounds[0]}`}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-red-500 dark:text-red-400">No active round</p>
                                    )}
                                </div>
                            </div>
                            <form onSubmit={handleRaiseStake}>
                                {/* Round Selection */}
                                <div className="mb-3">
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Round</label>
                                    {hasMultiple ? (
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
                                <Button
                                    type="submit"
                                    variant="warning"
                                    size="sm"
                                    className="w-full"
                                    disabled={isWritePending || !hasPendingRounds}
                                >
                                    {!hasPendingRounds ? "No Active Round" : isWritePending ? "Processing..." : "Add to Prize Pool"}
                                </Button>
                            </form>
                        </div>
                    );
                })()}

                {/* Token Gating */}
                <div className="p-5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-emerald-500/20 shadow-lg dark:shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:border-emerald-500/40 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <span className="text-lg">🔐</span>
                        </div>
                        <h3 className="font-heading font-bold text-emerald-600 dark:text-emerald-400">Token Gating</h3>
                    </div>

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

                        {/* Decimals for ERC-20 - Only show if ERC20 is selected */}
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

                        <Button type="submit" variant="secondary" size="sm" className="w-full" disabled={isWritePending}>{isWritePending ? "..." : "Set Gating Token"}</Button>
                    </form>

                    {/* Current Status */}
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950/50 text-xs text-slate-500 dark:text-slate-400 mb-3 border border-slate-200 dark:border-slate-800">
                        <p>Current: <span className="text-slate-700 dark:text-slate-300 break-all">{gatingTokenAddress}</span></p>
                        <p>Min Balance (raw): <span className="text-slate-700 dark:text-slate-300">{minGatingTokenBalance}</span></p>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Gating Status:</span>
                        <Button onClick={handleToggleGating} variant="glass" size="sm" disabled={isWritePending || isTokenGatingEnabled === null}>{tokenGatingEnabledDisplay}</Button>
                    </div>
                </div>

                {/* Game Settings */}
                <div className="p-5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-amber-500/20 shadow-lg dark:shadow-[0_0_20px_rgba(251,191,36,0.1)] hover:border-amber-500/40 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <span className="text-lg">⚙️</span>
                        </div>
                        <h3 className="font-heading font-bold text-amber-600 dark:text-amber-400">Game Settings</h3>
                    </div>
                    <form onSubmit={handleSetEntryFee} className="mb-3">
                        <Input label="Entry Fee (ETH)" id="newEntryFee" name="newEntryFee" type="number" step="any" required defaultValue={entryFeeDisplay !== "N/A" ? entryFeeDisplay : ""} />
                        <Button type="submit" variant="secondary" size="sm" className="w-full" disabled={isWritePending}>{isWritePending ? "..." : "Set Fee"}</Button>
                    </form>
                    <form onSubmit={handleSetPrizePoolPercentage} className="mb-3">
                        <Input label="Prize Pool %" id="newPrizePoolPercentage" name="newPrizePoolPercentage" type="number" min="0" max="100" required defaultValue={prizePoolPercentage !== null ? prizePoolPercentage.toString() : ""} />
                        <Button type="submit" variant="secondary" size="sm" className="w-full" disabled={isWritePending}>{isWritePending ? "..." : "Set %"}</Button>
                    </form>
                    <form onSubmit={handleSetOracleAddress}>
                        <Input label="BTC Oracle Address" id="newOracleAddress" name="newOracleAddress" placeholder="0x..." required defaultValue={btcPriceFeedAddress || ""} />
                        <Button type="submit" variant="secondary" size="sm" className="w-full" disabled={isWritePending}>{isWritePending ? "..." : "Set Oracle"}</Button>
                    </form>
                </div>

                {/* Maintenance */}
                <div className="p-5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-red-500/20 shadow-lg dark:shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:border-red-500/40 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <span className="text-lg">🛠️</span>
                        </div>
                        <h3 className="font-heading font-bold text-red-600 dark:text-red-400">Maintenance</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <Button onClick={handlePauseGame} variant="warning" size="sm" disabled={isWritePending || isGamePaused === true}>Pause</Button>
                        <Button onClick={handleUnpauseGame} variant="success" size="sm" disabled={isWritePending || isGamePaused === false}>Unpause</Button>
                    </div>
                    <form onSubmit={handleWithdrawAdminFees}>
                        <Input label="Withdraw To" id="withdrawToAddress" name="withdrawToAddress" placeholder="0x..." required defaultValue={userAddress || ''} />
                        <Button type="submit" variant="danger" size="sm" className="w-full" disabled={isWritePending}>{isWritePending ? "..." : "Withdraw Fees"}</Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;

