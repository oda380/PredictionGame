import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Import constants and ABIs from the config file
import {
    TARGET_CHAIN_ID,
    TARGET_NETWORK_NAME,
} from './config/contract';

// Import utility functions
import { calculateUsdValue } from './utils/formatting';

// Import custom hooks
import { useGameContractReads } from './hooks/useGameContractReads';
import { useOraclePrices } from './hooks/useOraclePrices';
import { useBetHistory } from './hooks/useBetHistory';
import { useActiveRound } from './hooks/useActiveRound';
import { useRoundDetails } from './hooks/useRoundDetails';
import { usePlayerActions } from './hooks/usePlayerActions';

// RainbowKit and Wagmi imports
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
    useAccount,
    useBalance,
    useSwitchChain,
    useWaitForTransactionReceipt,
    usePublicClient,
} from 'wagmi';

// Import UI Components
import Notification from './components/ui/Notification';
import Button from './components/ui/Button';
import BetHistoryList from './components/BetHistoryList';
import GameStatusCard from './components/GameStatusCard';
import PredictionForm from './components/PredictionForm';
import RoundQuery from './components/RoundQuery';
import { ThemeToggle } from './components/ui/ThemeToggle'; // Import Toggle

/**
 * Main application component for the BTC Price Prediction Game.
 */
function App() {
    // --- Wagmi Hooks ---
    const { address: userAddress, isConnected, chain } = useAccount();
    const { data: balanceData, refetch: refetchBalance } = useBalance({
        address: userAddress,
        chainId: TARGET_CHAIN_ID
    });
    const { switchChain } = useSwitchChain();
    const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });

    // --- Notification State ---
    const [notification, setNotification] = useState({ message: '', type: '' });
    const showNotif = useCallback((message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 5000);
    }, []);

    // --- Custom Hooks for Data ---
    const {
        nextRoundId,
        latestCreatedRoundId,
        entryFeeInWei,
        entryFeeDisplay,
        isGamePaused,
        gamePausedDisplay,
        contractOwner,
        btcPriceFeedAddress,
        prizePoolPercentage,
        refetchAllGameData,
    } = useGameContractReads();

    const {
        currentEthPrice,
        currentEthPriceDisplay,
        ethPriceTimestamp,
        isEthPriceLoading,
        fetchCurrentEthPrice,
        currentBtcPrice,
        btcPriceTimestamp,
        isBtcPriceLoading,
        fetchCurrentBtcPrice,
    } = useOraclePrices(btcPriceFeedAddress, showNotif);

    const {
        betHistory,
        isLoadingHistory,
        fetchBetHistory
    } = useBetHistory(prizePoolPercentage, currentEthPrice, showNotif);

    // --- New Refactored Hooks ---
    const {
        activeRoundMessage,
        isLatestRoundBettable,
        isLatestRoundStakeable,
        activeRoundEndTimeDisplay,
        predictionDeadlineTimestamp,
        activeRoundParticipants,
        activeRoundPot
    } = useActiveRound({
        latestCreatedRoundId,
        nextRoundId,
        isGamePaused
    });

    const {
        queryRoundId,
        setQueryRoundId,
        queriedRoundInfo,
        currentParticipantsCount,
        handleFetchRoundDetails,
        isLoadingDetails
    } = useRoundDetails(prizePoolPercentage, currentEthPrice, showNotif);

    const {
        handleDirectClaimPrize,
        handleCancelBet,
        writeContractAsync,
        isWritePending,
        writeContractResult,
        baseWriteConfig
    } = usePlayerActions(showNotif);

    // --- Local UI State ---
    const [userBalanceDisplay, setUserBalanceDisplay] = useState('N/A');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isGameStatusRefreshing, setIsGameStatusRefreshing] = useState(false);

    // --- Effects ---
    useEffect(() => {
        if (balanceData) {
            setUserBalanceDisplay(parseFloat(balanceData.formatted).toFixed(5));
        } else {
            setUserBalanceDisplay('N/A');
        }
    }, [balanceData]);

    useEffect(() => {
        if (userAddress && contractOwner) {
            setIsAdmin(contractOwner.toLowerCase() === userAddress.toLowerCase());
        } else {
            setIsAdmin(false);
        }
    }, [userAddress, contractOwner]);

    // Initial fetch of bet history - only on connect, not on price updates
    // Subsequent refreshes: manual button click or after successful transaction
    useEffect(() => {
        if (isConnected && userAddress && chain?.id === TARGET_CHAIN_ID && publicClient) {
            fetchBetHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, userAddress, chain?.id, publicClient]);


    // --- Transaction Watcher ---
    const {
        data: txReceipt,
        isSuccess: isTxSuccess,
        isError: isTxError,
        error: txError
    } = useWaitForTransactionReceipt({
        hash: writeContractResult,
    });

    // Handle transaction success/failure via useEffect (Wagmi v2 pattern)
    useEffect(() => {
        if (isTxSuccess && txReceipt) {
            showNotif(`Transaction successful! Hash: ${txReceipt.transactionHash.substring(0, 10)}...`, "success");
            // Refetch all relevant data after successful transaction
            const refetchData = async () => {
                await refetchAllGameData();
                await refetchBalance();
                await fetchCurrentEthPrice();
                await fetchBetHistory();
                if (queryRoundId) {
                    await handleFetchRoundDetails();
                }
            };
            refetchData();
        }
        if (isTxError && txError) {
            showNotif(`Transaction Failed: ${txError.shortMessage || txError.message}`, "error");
        }
    }, [isTxSuccess, isTxError, txReceipt, txError, showNotif, refetchAllGameData, refetchBalance, fetchCurrentEthPrice, fetchBetHistory, queryRoundId, handleFetchRoundDetails]);

    // --- Active Bet Logic (Inserted before return) ---
    // Find active bet for the current round
    const activeRoundBet = useMemo(() => {
        if (!betHistory || !latestCreatedRoundId) return null;
        return betHistory.find(b => b.roundId === latestCreatedRoundId && !b.isResolved);
    }, [betHistory, latestCreatedRoundId]);


    // --- JSX Structure ---
    return (
        <div className="min-h-screen p-3 sm:p-4 md:p-8 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
            <div className="container mx-auto max-w-6xl w-full">
                <header className="mb-4 sm:mb-8 p-3 sm:p-6 glass-panel rounded-xl sm:rounded-2xl relative overflow-hidden">
                    {/* Animated gradient border */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 animate-pulse"></div>

                    {/* Main Header Row - Always horizontal */}
                    <div className="flex justify-between items-center gap-2 sm:gap-4">
                        {/* Logo & Brand - Compact on mobile */}
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
                                <span className="text-lg sm:text-2xl font-bold text-white">₿</span>
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl sm:text-3xl font-heading font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-purple-600 to-amber-600 dark:from-cyan-400 dark:via-purple-400 dark:to-amber-400 tracking-tight truncate">
                                    BitForecast
                                </h1>
                                <p className="text-[9px] sm:text-xs font-mono text-slate-500 tracking-wider uppercase hidden xs:block">Price Prediction Arena</p>
                            </div>
                        </div>

                        {/* Right Side Controls */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            {/* Admin Panel Link - Only for admins */}
                            {isAdmin && (
                                <a
                                    href="/admin"
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all"
                                    title="Admin Panel"
                                >
                                    <span className="text-sm sm:text-base">⚙️</span>
                                </a>
                            )}
                            <ThemeToggle />
                            <ConnectButton
                                accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
                                showBalance={false}
                                chainStatus="none"
                            />
                        </div>
                    </div>

                    {/* Connected Info Bar - Second Row on Mobile */}
                    {isConnected && (
                        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/30">
                            {/* Network & Balance */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {chain && (
                                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700/50">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        <span className="hidden xs:inline">{chain.name}</span>
                                        <span className="xs:hidden">Base</span>
                                    </div>
                                )}
                                {balanceData && (
                                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono bg-cyan-50 dark:bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-200 dark:border-cyan-500/30">
                                        <span>💰</span>
                                        <span className="text-cyan-700 dark:text-cyan-400 font-semibold">
                                            {parseFloat(balanceData.formatted).toFixed(4)} ETH
                                        </span>
                                        {currentEthPrice && (
                                            <span className="text-slate-500 dark:text-slate-400">
                                                (${(parseFloat(balanceData.formatted) * currentEthPrice).toFixed(2)})
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Unclaimed Prize Badge */}
                            {betHistory.filter(bet => bet.isResolved && bet.isWinner && !bet.hasClaimed && bet.prizeAmountWei !== undefined && bet.prizeAmountWei > 0n).length > 0 && (
                                <button
                                    onClick={() => document.querySelector('[data-section="bet-history"]')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-amber-100 dark:bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-all animate-pulse"
                                >
                                    <span>🏆</span>
                                    <span>{betHistory.filter(bet => bet.isResolved && bet.isWinner && !bet.hasClaimed && bet.prizeAmountWei !== undefined && bet.prizeAmountWei > 0n).length} Unclaimed</span>
                                </button>
                            )}
                        </div>
                    )}
                </header>

                <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification({ message: '', type: '' })} />

                {isConnected && chain?.id === TARGET_CHAIN_ID ? (
                    <>
                        {/* Main Content: 2-column layout on desktop */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                            {/* Left Column: Prices */}
                            <GameStatusCard
                                nextRoundId={nextRoundId}
                                latestCreatedRoundId={latestCreatedRoundId}
                                activeRoundMessage={activeRoundMessage}
                                isLatestRoundBettable={isLatestRoundBettable}
                                isLatestRoundStakeable={isLatestRoundStakeable}
                                activeRoundEndTimeDisplay={activeRoundEndTimeDisplay}
                                entryFeeDisplay={entryFeeDisplay}
                                entryFeeInWei={entryFeeInWei}
                                gamePausedDisplay={gamePausedDisplay}
                                currentEthPrice={currentEthPrice}
                                currentEthPriceDisplay={currentEthPriceDisplay}
                                ethPriceTimestamp={ethPriceTimestamp}
                                isEthPriceLoading={isEthPriceLoading}
                                currentBtcPrice={currentBtcPrice}
                                btcPriceTimestamp={btcPriceTimestamp}
                                isBtcPriceLoading={isBtcPriceLoading}
                                btcPriceFeedAddress={btcPriceFeedAddress}
                                onRefreshAll={async () => {
                                    setIsGameStatusRefreshing(true);
                                    showNotif("Refreshing all game data...", "info");
                                    await Promise.all([
                                        refetchAllGameData(),
                                        fetchCurrentEthPrice(),
                                        fetchCurrentBtcPrice()
                                    ]);
                                    setIsGameStatusRefreshing(false);
                                    showNotif("Game status and prices refreshed.", "success");
                                }}
                                onRefreshEthPrice={fetchCurrentEthPrice}
                                onRefreshBtcPrice={fetchCurrentBtcPrice}
                                isGameStatusRefreshing={isGameStatusRefreshing}
                                hasPublicClient={!!publicClient}
                            />

                            {/* Right Column: Prediction Form */}
                            <div className="lg:col-span-2 space-y-4">
                                <PredictionForm
                                    showNotif={showNotif}
                                    writeContractAsync={writeContractAsync}
                                    baseWriteConfig={baseWriteConfig}
                                    isWritePending={isWritePending}
                                    isConnected={isConnected}
                                    userAddress={userAddress}
                                    publicClient={publicClient}
                                    latestCreatedRoundId={latestCreatedRoundId}
                                    isLatestRoundBettable={isLatestRoundBettable}
                                    isGamePaused={isGamePaused}
                                    entryFeeInWei={entryFeeInWei}
                                    entryFeeDisplay={entryFeeDisplay}
                                    predictionDeadlineTimestamp={predictionDeadlineTimestamp}
                                    currentEthPrice={currentEthPrice}
                                    activeRoundParticipants={activeRoundParticipants}
                                    activeRoundPot={activeRoundPot}
                                    activeRoundBet={activeRoundBet}
                                    onCancelBet={() => handleCancelBet(activeRoundBet?.roundId)}
                                />


                                {/* Collapsible Round Query */}
                                <RoundQuery
                                    queryRoundId={queryRoundId}
                                    setQueryRoundId={setQueryRoundId}
                                    onFetchRoundDetails={handleFetchRoundDetails}
                                    queriedRoundInfo={queriedRoundInfo}
                                    participantsCount={currentParticipantsCount}
                                    hasPublicClient={!!publicClient}
                                    isLoading={isLoadingDetails}
                                />
                            </div>
                        </div>

                        {/* Bet History */}
                        <div data-section="bet-history">
                            <BetHistoryList
                                betHistory={betHistory}
                                isLoadingHistory={isLoadingHistory}
                                fetchBetHistory={fetchBetHistory}
                                isConnected={isConnected}
                                userAddress={userAddress}
                                isWritePending={isWritePending}
                                onClaimPrize={handleDirectClaimPrize}
                            />
                        </div>
                    </>
                ) : (
                    /* ========== UNCONNECTED LANDING PAGE ========== */
                    <div className="space-y-8">
                        {/* Hero Section */}
                        <div className="glass-panel p-8 sm:p-12 lg:p-16 rounded-2xl text-center relative overflow-hidden">
                            {/* Subtle Background Glow - Desktop Only */}
                            <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-cyan-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

                            <div className="relative z-10">
                                {/* Bitcoin Symbol */}
                                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                    <span className="text-3xl sm:text-4xl font-bold text-white">₿</span>
                                </div>

                                {/* Headline */}
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold mb-4 text-slate-900 dark:text-white tracking-tight">
                                    Bitcoin Price Predictions
                                </h1>
                                <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 mb-8 max-w-xl mx-auto leading-relaxed">
                                    Compete with traders worldwide. Predict the price, win the pool.
                                </p>

                                {/* Connect CTA */}
                                <div className="flex flex-col items-center gap-4">
                                    <ConnectButton />
                                    <p className="text-sm text-slate-400 dark:text-slate-500">
                                        On <span className="font-medium text-cyan-600 dark:text-cyan-400">Base Network</span> · Trustless · Instant Payouts
                                    </p>
                                </div>

                                {/* Wrong Network Warning */}
                                {isConnected && chain?.id !== TARGET_CHAIN_ID && (
                                    <div className="mt-8">
                                        <Button onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })} variant="warning" className="w-full max-w-xs">
                                            Switch to {TARGET_NETWORK_NAME}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* How It Works - Desktop Only */}
                        <div className="hidden sm:grid sm:grid-cols-3 gap-6">
                            <div className="glass-panel p-6 rounded-xl text-center">
                                <div className="w-10 h-10 mx-auto mb-4 rounded-full bg-cyan-500/10 flex items-center justify-center">
                                    <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">1</span>
                                </div>
                                <h3 className="font-heading font-semibold text-slate-800 dark:text-white mb-2">Make Your Prediction</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Enter your BTC price forecast before the round deadline</p>
                            </div>

                            <div className="glass-panel p-6 rounded-xl text-center">
                                <div className="w-10 h-10 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">2</span>
                                </div>
                                <h3 className="font-heading font-semibold text-slate-800 dark:text-white mb-2">Wait for Resolution</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">The round ends and the actual BTC price is recorded</p>
                            </div>

                            <div className="glass-panel p-6 rounded-xl text-center">
                                <div className="w-10 h-10 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400">3</span>
                                </div>
                                <h3 className="font-heading font-semibold text-slate-800 dark:text-white mb-2">Claim Your Prize</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Closest prediction wins the ETH prize pool</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="mt-12 pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
                <div className="container mx-auto max-w-6xl px-3 sm:px-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
                        {/* Branding */}
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                                <span className="text-xs font-bold text-white">₿</span>
                            </div>
                            <span className="font-heading font-semibold text-slate-700 dark:text-slate-300">
                                BitForecast
                            </span>
                            <span className="text-slate-400 dark:text-slate-600">•</span>
                            <span className="text-slate-500 dark:text-slate-500 text-xs">
                                © {new Date().getFullYear()}
                            </span>
                        </div>

                        {/* Network Badge */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Powered by</span>
                            <span className="font-semibold text-cyan-600 dark:text-cyan-400">Base</span>
                            <span>+</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">Chainlink</span>
                        </div>

                        {/* Links */}
                        <div className="flex items-center gap-4 text-xs">
                            <a
                                href={`${process.env.NEXT_PUBLIC_BASE_BLOCK_EXPLORER_URL || 'https://basescan.org'}/address/${process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                            >
                                Contract ↗
                            </a>
                            <a
                                href="https://docs.chain.link/data-feeds"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                            >
                                Oracle Docs ↗
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;
