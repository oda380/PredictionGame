import React, { useState, useEffect, useCallback } from 'react';
// Viem utilities
import { parseEther } from 'viem'; 

// Import constants and ABIs from the config file
import {
    VITE_GAME_CONTRACT_ADDRESS, 
    GAME_CONTRACT_ABI, 
    TARGET_CHAIN_ID,
    TARGET_NETWORK_NAME,
    BLOCK_EXPLORER_URL,
    ZERO_ADDRESS
} from './config/contract';

// Import utility functions
import {
    formatWeiToEthString,
    calculateUsdValue,
    formatPrediction,
    formatTimestamp,
} from './utils/formatting'; 

// Import custom hooks
import { useGameContractReads } from './hooks/useGameContractReads'; 
import { useOraclePrices } from './hooks/useOraclePrices';     
import { useBetHistory } from './hooks/useBetHistory'; 

// RainbowKit and Wagmi imports
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { 
    useAccount, 
    useBalance, 
    useSwitchChain, 
    useWriteContract,
    useWaitForTransactionReceipt,
    usePublicClient,
} from 'wagmi';

// Import UI Components
import Notification from './components/ui/Notification';
import Card from './components/ui/Card';
import Input from './components/ui/Input';
import Button from './components/ui/Button';

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
        isTokenGatingEnabled, 
        tokenGatingEnabledDisplay, 
        gatingTokenAddress,
        minGatingTokenBalance,
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

    // --- Local UI State ---
    const [userBalanceDisplay, setUserBalanceDisplay] = useState('N/A');
    const [userBalanceUsd, setUserBalanceUsd] = useState('N/A');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isGameStatusRefreshing, setIsGameStatusRefreshing] = useState(false);
    const [queryRoundId, setQueryRoundId] = useState('');
    const [queriedRoundInfo, setQueriedRoundInfo] = useState(null);
    const [currentParticipantsCount, setCurrentParticipantsCount] = useState('N/A');
    const [activeRoundMessage, setActiveRoundMessage] = useState("Checking for active round...");
    // --- NEW STATE: Tracks if the latest round is open for betting ---
    const [isLatestRoundBettable, setIsLatestRoundBettable] = useState(false);


    // --- Wagmi Write Hook ---
    const { data: writeContractResult, writeContractAsync, isPending: isWritePending } = useWriteContract();

    // --- Effects ---
    useEffect(() => { // Update displayed balance
        if (balanceData && currentEthPrice) { 
            const balanceEth = parseFloat(balanceData.formatted).toFixed(5); 
            setUserBalanceDisplay(balanceEth);
            setUserBalanceUsd(calculateUsdValue(balanceEth, currentEthPrice));
        } else if (balanceData) {
             setUserBalanceDisplay(parseFloat(balanceData.formatted).toFixed(5));
             setUserBalanceUsd('N/A');
        } else {
            setUserBalanceDisplay('N/A');
            setUserBalanceUsd('N/A');
        }
    }, [balanceData, currentEthPrice]); 

    useEffect(() => { // Set admin status
        if (userAddress && contractOwner) {
            setIsAdmin(contractOwner.toLowerCase() === userAddress.toLowerCase());
        } else {
            setIsAdmin(false);
        }
    }, [userAddress, contractOwner]);

    useEffect(() => {
        if (isConnected && chain?.id === TARGET_CHAIN_ID && publicClient) {
            // Hooks manage their own initial fetching based on enabled flags and staleTime
        }
    }, [isConnected, chain, publicClient]);
    
    useEffect(() => {
        if (isConnected && userAddress && currentEthPrice !== null && chain?.id === TARGET_CHAIN_ID && publicClient) {
            fetchBetHistory();
        }
    }, [isConnected, userAddress, currentEthPrice, chain, publicClient, fetchBetHistory]);


    // Determine Active Round Status and if it's bettable
    useEffect(() => {
        const checkActiveRound = async () => {
            setIsLatestRoundBettable(false); // Default to not bettable

            if (!publicClient || latestCreatedRoundId === 'N/A' || isGamePaused === null) {
                setActiveRoundMessage("Loading round status...");
                return;
            }
            if (latestCreatedRoundId === '0') {
                setActiveRoundMessage("No active rounds available. Admin can create the first round.");
                return;
            }
            if (isGamePaused) {
                setActiveRoundMessage(`Game is paused. Round ${latestCreatedRoundId} may not be active for betting.`);
                return;
            }
            
            try {
                const roundDataArr = await publicClient.readContract({ 
                    abi: GAME_CONTRACT_ABI, 
                    address: VITE_GAME_CONTRACT_ADDRESS, 
                    functionName: 'rounds', 
                    args: [BigInt(latestCreatedRoundId)] 
                });

                if (roundDataArr && !roundDataArr[2]) { // Not resolved
                    const deadlineTimestamp = Number(roundDataArr[1]); 
                    if (deadlineTimestamp * 1000 > Date.now()) { 
                        setActiveRoundMessage(`Round ${latestCreatedRoundId} is ACTIVE for betting until ${formatTimestamp(deadlineTimestamp)}.`);
                        setIsLatestRoundBettable(true); // <<<< SET BETTABLE STATE
                    } else {
                        setActiveRoundMessage(`Round ${latestCreatedRoundId} betting closed. Awaiting resolution.`);
                    }
                } else if (roundDataArr && roundDataArr[2]) { // Resolved
                    setActiveRoundMessage(`Round ${latestCreatedRoundId} is resolved. No active round for betting.`);
                } else {
                     setActiveRoundMessage("Could not determine status for the latest round.");
                }
            } catch (error) {
                console.error("Error checking active round status in readContract:", error);
                setActiveRoundMessage("Could not determine active round status due to an error.");
            }
        };

        if (isConnected && chain?.id === TARGET_CHAIN_ID) {
            checkActiveRound();
        } else {
            setActiveRoundMessage("Connect wallet and switch to target network.");
            setIsLatestRoundBettable(false);
        }
    }, [isConnected, chain, publicClient, latestCreatedRoundId, isGamePaused, formatTimestamp]);


    // --- Event Handlers ---
    const baseWriteConfig = { 
        abi: GAME_CONTRACT_ABI,
        address: VITE_GAME_CONTRACT_ADDRESS,
    };

    const handleFetchRoundDetails = async () => {
        // ... (no changes to this function)
        if (!publicClient || !queryRoundId) { showNotif("Please enter a Round ID to fetch details.", "error"); return; }
        try {
            const roundIdBigInt = BigInt(queryRoundId);
            const roundDataArr = await publicClient.readContract({ ...baseWriteConfig, functionName: 'rounds', args: [roundIdBigInt]});
            if (!roundDataArr || roundDataArr[0].toString() === "0") { 
                showNotif(`Round ${queryRoundId} not found or has not been initialized.`, "error");
                setQueriedRoundInfo(null); setCurrentParticipantsCount('N/A'); return;
            }
            const resolvedStatusFromContract = roundDataArr[2]; 
            const isResolvedDisplayString = typeof resolvedStatusFromContract === 'boolean' ? (resolvedStatusFromContract ? "Yes" : "No") : "Unknown";
            const bettors = await publicClient.readContract({...baseWriteConfig, functionName: 'getBettorsForRound', args: [roundIdBigInt]});
            const totalPotWei = await publicClient.readContract({...baseWriteConfig, functionName: 'totalCollectedPerRound', args: [roundIdBigInt]});
            let prizePoolEth = 'N/A', adminFeeEth = 'N/A';
            const totalPotEth = formatWeiToEthString(totalPotWei);

            if (prizePoolPercentage !== null) { 
                const prizePercent = prizePoolPercentage; 
                const prizePoolWei = (BigInt(totalPotWei.toString()) * BigInt(prizePercent)) / 100n;
                const adminFeeWei = BigInt(totalPotWei.toString()) - prizePoolWei;
                prizePoolEth = formatWeiToEthString(prizePoolWei);
                adminFeeEth = formatWeiToEthString(adminFeeWei);
            }
            setQueriedRoundInfo({ 
                predictionDeadline: formatTimestamp(roundDataArr[1]), 
                roundEndTime: formatTimestamp(roundDataArr[0]), 
                isResolved: isResolvedDisplayString,
                totalPot: `${totalPotEth} ETH${currentEthPrice ? ` (~$${calculateUsdValue(totalPotEth, currentEthPrice)} USD)` : ''}`, 
                prizePool: `${prizePoolEth} ETH${currentEthPrice ? ` (~$${calculateUsdValue(prizePoolEth, currentEthPrice)} USD)` : ''}`,
                adminFee: `${adminFeeEth} ETH${currentEthPrice ? ` (~$${calculateUsdValue(adminFeeEth, currentEthPrice)} USD)` : ''}`,
            });
            setCurrentParticipantsCount(bettors.length.toString());
            showNotif(`Details for round ${queryRoundId} loaded successfully.`, "success");
        } catch (e) { 
            showNotif(`Workspace Round Details Error: ${e.message}`, "error"); 
            console.error("Error in handleFetchRoundDetails:", e); 
            setQueriedRoundInfo(null); setCurrentParticipantsCount('N/A');
        }
    };
    
    const handleDirectClaimPrize = async (roundIdToClaim) => { 
        // ... (no changes to this function)
        if (!roundIdToClaim) { showNotif("Round ID for claiming is missing.", "error"); return; }
        try {
            showNotif(`Attempting to claim prize for round ${roundIdToClaim}...`, "info");
            await writeContractAsync({ ...baseWriteConfig, functionName: 'claimPrize', args: [BigInt(roundIdToClaim)] });
        } catch (e) { showNotif(`Claim Prize Error: ${e.shortMessage || e.message}`, "error"); console.error("Claim Prize Error:", e); }
    };
    
    // --- MODIFIED handlePlaceBetSubmit ---
    const handlePlaceBetSubmit = async (event) => {
        event.preventDefault();
        if (!publicClient || !userAddress) { 
            showNotif("Wallet not connected or client not ready.", "error"); return;
        }
        // Use the latestCreatedRoundId directly, as it's now displayed as read-only
        const betRoundId = latestCreatedRoundId; 
        const predictionStr = event.target.prediction.value; // Still get prediction from form

        if (!isLatestRoundBettable || !betRoundId || betRoundId === '0' || betRoundId === 'N/A') {
             showNotif("No active round available for betting or round ID is invalid.", "error"); 
             return;
        }
        if (!predictionStr) { showNotif("Please enter your BTC price prediction.", "error"); return; }

        console.log(`Attempting to place bet for active round ${betRoundId} by user ${userAddress}`);
        try {
            console.log("Checking if bet already placed by reading 'bets' mapping...");
            const userBetDetailsArr = await publicClient.readContract({
                ...baseWriteConfig, functionName: 'bets', args: [BigInt(betRoundId), userAddress]
            });
            
            console.log("User bet details from contract ('bets' mapping):", userBetDetailsArr);
            if (userBetDetailsArr && userBetDetailsArr[3] === true) { 
                console.log("Bet already placed condition met. UserBetDetailsArr[3] (placed flag):", userBetDetailsArr[3]);
                showNotif("You have already placed a bet for this round.", "error"); 
                return;
            }
            console.log("Bet not yet placed or 'placed' flag is false. UserBetDetailsArr[3]:", userBetDetailsArr ? userBetDetailsArr[3] : "'userBetDetailsArr' is undefined/null");

            const predictionValue = parseFloat(predictionStr);
            if (isNaN(predictionValue)) {
                showNotif("Invalid prediction value. Please enter a number.", "error"); return;
            }
            const rawPrediction = BigInt(Math.round(predictionValue * (10**4))); 
            
            if (entryFeeInWei === undefined || entryFeeInWei === null) { 
                showNotif("Entry fee not loaded. Please refresh the page or game status.", "error"); return; 
            }
            
            showNotif("Submitting your bet transaction...", "info"); 
            await writeContractAsync({ ...baseWriteConfig, functionName: 'placeBet', args: [rawPrediction, BigInt(betRoundId)], value: entryFeeInWei });
        } catch (e) { 
            console.error("Error during place bet submission:", e);
            if (e.message.includes("bets") || e.message.includes("readContract")) { 
                 showNotif(`Error checking previous bet status: ${e.shortMessage || e.message}`, "error");
            } else { 
                 showNotif(`Place Bet Transaction Error: ${e.shortMessage || e.message}`, "error"); 
            }
        }
    };
    
    const handleClaimPrizeSubmit = async (event) => { 
        // ... (no changes to this function)
        event.preventDefault(); 
        const claimRoundId = event.target.claimRoundId.value;
        if (!claimRoundId) { showNotif("Please enter a Round ID to claim from.", "error"); return; }
        handleDirectClaimPrize(claimRoundId); 
    };

    const handleRaiseStakeSubmit = async (event) => {
        // ... (no changes to this function)
        event.preventDefault();
        const roundId = event.target.raiseStakeRoundId.value;
        const amountUsdStr = event.target.raiseStakeAmountUsd.value; 
        if (!roundId || !amountUsdStr) {
            showNotif("Please provide both Round ID and USD amount to raise stake.", "error"); return;
        }
        if (!currentEthPrice || currentEthPrice <= 0) { 
            showNotif("Current ETH/USD price is not available or invalid. Cannot calculate ETH amount.", "error"); return;
        }
        try {
            const amountUsd = parseFloat(amountUsdStr);
            if (isNaN(amountUsd) || amountUsd <= 0) {
                showNotif("Invalid USD amount. Please enter a positive number.", "error"); return;
            }
            const amountEth = amountUsd / currentEthPrice;
            const amountWei = parseEther(amountEth.toFixed(18)); 
            showNotif(`Raising stake for round ${roundId} by ${amountEth.toFixed(6)} ETH (~$${amountUsdStr} USD)...`, "info");
            await writeContractAsync({
                ...baseWriteConfig, functionName: 'raiseStakeInRound', args: [BigInt(roundId)], value: amountWei,
            });
        } catch (e) {
            showNotif(`Raise Stake Error: ${e.shortMessage || e.message}`, "error");
            console.error("Error raising stake:", e);
        }
    };

    // Admin Handlers (simplified for brevity, actual logic remains)
    const adminActionWrapper = async (functionName, args = [], successMsgPrefix = "Processing", value) => { try { showNotif(`${successMsgPrefix}...`, "info"); await writeContractAsync({ ...baseWriteConfig, functionName, args, value }); } catch (e) { showNotif(`Admin Action (${functionName}) Error: ${e.shortMessage || e.message}`, "error"); console.error(e);}};
    const handleCreateRound = async (e) => { e.preventDefault(); const fd = new FormData(e.target); const end = BigInt(Math.floor(new Date(fd.get('roundEndTimeAdmin')).getTime()/1000)); const dead = BigInt(Math.floor(new Date(fd.get('predictionDeadlineAdmin')).getTime()/1000)); if (isNaN(end) || isNaN(dead) || end <= dead || end <= Math.floor(Date.now()/1000)) { showNotif("Invalid dates.", "error"); return; } adminActionWrapper('createRound', [end, dead], "Creating round");};
    const handleResolveRound = async (e) => { e.preventDefault(); const id = new FormData(e.target).get('resolveRoundIdAdmin'); if(!id || isNaN(id) || BigInt(id) <= 0) {showNotif("Invalid ID.", "error"); return;} adminActionWrapper('resolveRound', [BigInt(id)], `Resolving ${id}`); };
    const handleSetGatingToken = async (e) => { e.preventDefault(); const fd = new FormData(e.target); const addr = fd.get('gatingTokenAddress') || ZERO_ADDRESS; const bal = fd.get('minGatingTokenBalance') ? BigInt(fd.get('minGatingTokenBalance')) : 0n; if (addr !== ZERO_ADDRESS && !/^0x[a-fA-F0-9]{40}$/.test(addr)) { showNotif("Invalid token address.", "error"); return; } adminActionWrapper('setGatingToken', [addr, bal], "Setting gating token"); };
    const handleToggleGating = async () => { if(isTokenGatingEnabled === null) {showNotif("Gating status not loaded.", "error"); return;} adminActionWrapper('toggleTokenGating', [!isTokenGatingEnabled], `Toggling gating`); }; 
    const handleSetEntryFee = async (e) => { e.preventDefault(); const feeStr = new FormData(e.target).get('newEntryFee')||"0"; try {const fee = parseEther(feeStr); if(fee < 0) throw Error("Negative fee"); adminActionWrapper('setEntryFee', [fee], "Setting entry fee");} catch(err) {showNotif(`Invalid fee: ${err.message}`, "error");} };
    const handleSetPrizePoolPercentage = async (e) => { e.preventDefault(); const percStr = new FormData(e.target).get('newPrizePoolPercentage'); const perc = parseInt(percStr); if (isNaN(perc) || perc < 0 || perc > 100) {showNotif("Percentage 0-100.", "error"); return;} adminActionWrapper('setPrizePoolPercentage', [BigInt(perc)], "Setting prize %"); };
    const handleSetMaxBetAmount = async (e) => { e.preventDefault(); const amtStr = new FormData(e.target).get('newMaxBetAmount')||"0"; try{const amt = parseEther(amtStr); if(amt < 0) throw Error("Negative amount"); adminActionWrapper('setMaxBetAmount', [amt], "Setting max bet");} catch(err) {showNotif(`Invalid amount: ${err.message}`, "error");} };
    const handleSetOracleAddress = async (e) => { e.preventDefault(); const addr = new FormData(e.target).get('newOracleAddress'); if(!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {showNotif("Invalid oracle address.", "error"); return;} adminActionWrapper('setOracleAddress', [addr], "Setting BTC oracle"); };
    const handlePauseGame = async () => { if(isGamePaused === true) {showNotif("Already paused.", "info"); return;} adminActionWrapper('pauseGame', [], "Pausing game");} 
    const handleUnpauseGame = async () => { if(isGamePaused === false) {showNotif("Already unpaused.", "info"); return;} adminActionWrapper('unpauseGame', [], "Unpausing game");} 
    const handleWithdrawAdminFees = async (e) => { e.preventDefault(); const to = new FormData(e.target).get('withdrawToAddress'); if(!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) {showNotif("Invalid address.", "error"); return;} adminActionWrapper('withdrawAdminFees', [to], "Withdrawing fees"); };

    // --- Transaction Watcher ---
     useWaitForTransactionReceipt({ 
        hash: writeContractResult, 
        onSuccess: async (data) => { 
            showNotif(`Transaction successful! Hash: ${data.transactionHash.substring(0,10)}...`, "success"); 
            await refetchAllGameData(); 
            await refetchBalance();     
            await fetchCurrentEthPrice(); 
            await fetchBetHistory();    
            if (queryRoundId) { 
                await handleFetchRoundDetails(); 
            }
        },
        onError: (error) => {
            showNotif(`Transaction Failed: ${error.shortMessage || error.message}`, "error");
        }
    });

    // --- JSX Structure ---
    return (
        <div className="bg-gray-100 text-gray-800 min-h-screen p-4 md:p-8 font-['Inter',_sans-serif]">
            <div className="container mx-auto max-w-6xl">
                <header className="mb-8 p-6 bg-white rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-center">
                    <h1 className="text-3xl font-bold text-blue-600 mb-4 sm:mb-0">BTC Price Prediction Game</h1>
                    <div className="flex flex-col items-end">
                        {isConnected && chain && <p className="text-xs text-gray-500 mb-1">{chain.name} (ID: {chain.id})</p>}
                        <ConnectButton 
                            accountStatus={{smallScreen: 'avatar', largeScreen: 'full'}}
                            showBalance={{smallScreen: false, largeScreen: true}} 
                        />
                         {isConnected && userAddress && (
                             <p className="text-xs text-gray-500 mt-1">
                                 Your Balance: {userBalanceDisplay} ETH 
                                 {userBalanceUsd !== 'N/A' && ` (~$${userBalanceUsd} USD)`}
                            </p>
                        )}
                    </div>
                </header>

                <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification({ message: '', type: '' })} />

                {isConnected && chain?.id === TARGET_CHAIN_ID ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <Card title="Game Status" className="md:col-span-1">
                                {/* ... (Game Status content remains the same) ... */}
                                <p className="text-sm mb-1"><strong>Contract:</strong> 
                                    <a href={`${BLOCK_EXPLORER_URL}/address/${VITE_GAME_CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1 break-all">
                                        {VITE_GAME_CONTRACT_ADDRESS ? VITE_GAME_CONTRACT_ADDRESS.substring(0,10) + "..." : "N/A"}
                                    </a>
                                </p>
                                <p className="text-sm mb-1"><strong>Next Round ID:</strong> <span className="font-semibold">{nextRoundId}</span></p>
                                <p className="text-sm mb-1"><strong>Latest Created Round:</strong> <span className="font-semibold">{latestCreatedRoundId}</span></p>
                                <p className="text-sm mb-1"><strong>Active Round:</strong> <span className="font-semibold">{activeRoundMessage}</span></p> 
                                <p className="text-sm mb-1">
                                    <strong>Entry Fee:</strong> <span className="font-semibold">{entryFeeDisplay} ETH</span> 
                                    {entryFeeInWei && currentEthPrice ? 
                                        <span className="text-xs text-gray-500"> (~${calculateUsdValue(formatWeiToEthString(entryFeeInWei), currentEthPrice)} USD)</span>
                                        : (entryFeeDisplay !== 'N/A' ? <span className="text-xs text-gray-500"> (USD N/A)</span> : '')}
                                </p>
                                <p className="text-sm mb-3"><strong>Game Paused:</strong> <span className="font-semibold">{gamePausedDisplay}</span></p>
                                
                                <Button 
                                    onClick={async () => { 
                                        setIsGameStatusRefreshing(true);
                                        await Promise.all([ 
                                            refetchAllGameData(),
                                            fetchCurrentEthPrice(),
                                            fetchCurrentBtcPrice() 
                                        ]);
                                        setIsGameStatusRefreshing(false);
                                        showNotif("Game status and prices refreshed.", "success");
                                    }} 
                                    variant="secondary" 
                                    className="mt-2 mb-3 w-full text-xs py-1 px-2" 
                                    disabled={!publicClient || isGameStatusRefreshing || isEthPriceLoading || isBtcPriceLoading}
                                >
                                    {isGameStatusRefreshing ? "Refreshing..." : "Refresh Game Status & Prices"}
                                </Button>
                                <hr className="my-3"/>

                                <h3 className="text-gray-700 text-md font-semibold mb-1">Live BTC Price</h3>
                                <p className="text-lg font-bold text-green-600">{isBtcPriceLoading ? "Loading..." : currentBtcPrice}</p>
                                <p className="text-xs text-gray-500">As of (GMT): {btcPriceTimestamp}</p>
                                <Button onClick={fetchCurrentBtcPrice} variant="secondary" className="mt-2 text-xs py-1 px-2" disabled={!publicClient || !btcPriceFeedAddress || btcPriceFeedAddress === ZERO_ADDRESS || isBtcPriceLoading}>
                                    {isBtcPriceLoading ? "Refreshing..." : "Refresh BTC"}
                                </Button>
                                <hr className="my-3"/>

                                <h3 className="text-gray-700 text-md font-semibold mb-1">Live ETH Price</h3>
                                <p className="text-lg font-bold text-purple-600">{isEthPriceLoading ? "Loading..." : currentEthPriceDisplay}</p>
                                <p className="text-xs text-gray-500">As of (GMT): {ethPriceTimestamp}</p>
                                <Button onClick={fetchCurrentEthPrice} variant="secondary" className="mt-2 text-xs py-1 px-2" disabled={!publicClient || isEthPriceLoading}>
                                     {isEthPriceLoading ? "Refreshing..." : "Refresh ETH"}
                                </Button>
                            </Card>
                            
                            <Card title="Round Information & Actions" className="md:col-span-2">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div>
                                        {/* ... (Query Round Details content remains the same) ... */}
                                        <h3 className="text-gray-700 text-lg font-semibold mb-2">Query Round Details</h3>
                                        <div className="mb-3 flex items-end gap-2">
                                            <div className="flex-grow">
                                                <Input label="Round ID:" id="queryRoundIdInput" type="number" value={queryRoundId} onChange={e => setQueryRoundId(e.target.value)} placeholder="Enter round ID" />
                                            </div>
                                            <Button onClick={handleFetchRoundDetails} variant="secondary" className="mb-4 h-12" disabled={!publicClient || !queryRoundId}>Fetch Details</Button>
                                        </div>
                                        {queriedRoundInfo && (
                                            <div className="text-sm space-y-1 bg-gray-50 p-3 rounded-md mb-4">
                                                <p><strong>Prediction Deadline:</strong> {queriedRoundInfo.predictionDeadline}</p>
                                                <p><strong>Round End Time:</strong> {queriedRoundInfo.roundEndTime}</p>
                                                <p><strong>Is Resolved:</strong> {queriedRoundInfo.isResolved}</p>
                                                <p><strong>Participants:</strong> {currentParticipantsCount}</p>
                                                <p><strong>Total Pot:</strong> {queriedRoundInfo.totalPot}</p>
                                                <p><strong>Prize Pool:</strong> {queriedRoundInfo.prizePool}</p>
                                                <p><strong>Admin Fee:</strong> {queriedRoundInfo.adminFee}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        {/* --- MODIFIED "Place Your Bet" Form --- */}
                                        <form onSubmit={handlePlaceBetSubmit} className="mb-6">
                                            <h3 className="text-lg font-semibold mb-3 text-gray-700">Place Your Bet on Current Active Round</h3>
                                            <Input 
                                                label="Current Active Round ID:" 
                                                id="betRoundIdDisplay" // Changed ID as it's not directly used for submission value
                                                name="betRoundIdDisplay" 
                                                type="text" // Changed to text as it's read-only display
                                                value={isLatestRoundBettable && latestCreatedRoundId !== '0' && latestCreatedRoundId !== 'N/A' ? latestCreatedRoundId : "No active round for betting"} 
                                                readOnly // Make the field uneditable
                                            />
                                            <Input 
                                                label="Your BTC Price Prediction (e.g., 65000.1234):" 
                                                id="prediction" 
                                                name="prediction" 
                                                type="number" 
                                                step="0.0001" 
                                                required 
                                            />
                                            <Button 
                                                type="submit" 
                                                className="w-full" 
                                                disabled={!isConnected || !isLatestRoundBettable || isGamePaused === true || isWritePending}
                                            >
                                                {isWritePending ? "Placing Bet..." : "Place Bet"}
                                            </Button>
                                        </form>
                                        {/* --- END MODIFIED "Place Your Bet" Form --- */}
                                        <hr className="my-4"/>
                                        <form onSubmit={handleClaimPrizeSubmit}> 
                                             <h3 className="text-lg font-semibold mb-3 text-gray-700">Claim Prize</h3>
                                            <Input label="Round ID to Claim From:" id="claimRoundId" name="claimRoundId" type="number" required />
                                            <Button type="submit" className="w-full" disabled={!isConnected || isWritePending}>
                                                {isWritePending ? "Claiming..." : "Claim Prize"}
                                            </Button>
                                        </form>
                                        <hr className="my-4"/>
                                        <form onSubmit={handleRaiseStakeSubmit}>
                                            <h3 className="text-lg font-semibold mb-3 text-gray-700">Raise Stake for Round</h3>
                                            <Input label="Round ID to Add Stake To:" id="raiseStakeRoundId" name="raiseStakeRoundId" type="number" required />
                                            <Input label="Amount (USD) to Add:" id="raiseStakeAmountUsd" name="raiseStakeAmountUsd" type="number" step="any" placeholder="e.g., 10.00" required />
                                            <Button type="submit" variant="secondary" className="w-full" disabled={!isConnected || isWritePending || !currentEthPrice}>
                                                {isWritePending ? "Processing..." : "Raise Stake (USD)"}
                                            </Button>
                                        </form>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <Card title="My Bet History" titleColor="text-indigo-600">
                            {/* ... (Bet History content remains the same) ... */}
                            {isLoadingHistory && <p className="text-sm text-gray-500">Loading history...</p>}
                            {!isLoadingHistory && betHistory.length === 0 && <p className="text-sm text-gray-500">No bets found in the checked block range.</p>}
                            {!isLoadingHistory && betHistory.length > 0 && (
                                <div className="space-y-4 max-h-96 overflow-y-auto p-1">
                                    {betHistory.map((bet, index) => (
                                        <div key={`${bet.roundId}-${index}-${userAddress}`} className="p-3 bg-gray-50 rounded-md border border-gray-200 text-sm">
                                            <p><strong>Round ID:</strong> {bet.roundId}</p>
                                            <p><strong>Your Prediction:</strong> {bet.userPrediction}</p>
                                            <p><strong>Deadline:</strong> {bet.predictionDeadline}</p>
                                            <p><strong>End Time:</strong> {bet.roundEndTime}</p>
                                            <p><strong>Resolved:</strong> {bet.isResolved ? "Yes" : "No"}</p>
                                            {bet.isResolved && (
                                                <>
                                                    <p><strong>You Won:</strong> {bet.isWinner ? <span className="text-green-600 font-semibold">Yes!</span> : "No"}</p>
                                                    {bet.isWinner && (
                                                        <>
                                                            <p><strong>Prize:</strong> {bet.prizeAmountEth} ETH 
                                                                {bet.prizeAmountUsd !== 'N/A' && ` (~$${bet.prizeAmountUsd} USD)`}
                                                            </p>
                                                            {!bet.hasClaimed ? (
                                                                <Button onClick={() => handleDirectClaimPrize(bet.roundId)} 
                                                                    className="mt-2 text-xs py-1 px-2 bg-green-500 hover:bg-green-600"
                                                                    disabled={isWritePending}
                                                                >
                                                                    {isWritePending ? "Processing..." : `Claim for Round ${bet.roundId}`}
                                                                </Button>
                                                            ) : <p className="text-green-700 mt-1">Claimed!</p>}
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                             <Button onClick={fetchBetHistory} variant="secondary" className="mt-4 text-xs" disabled={isLoadingHistory || !isConnected || !userAddress}>
                                {isLoadingHistory ? "Refreshing..." : "Refresh History"}
                            </Button>
                        </Card>

                        {isAdmin && ( 
                            <Card title="Admin Panel" titleColor="text-amber-500" className="border-l-4 border-amber-400 mt-8">
                                {/* ... (Admin Panel content remains the same) ... */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <Card title="Create Round" titleColor="text-gray-700" className="bg-gray-50 !mb-0">
                                        <form onSubmit={handleCreateRound}>
                                            <Input label="Round End Time:" id="roundEndTimeAdmin" name="roundEndTimeAdmin" type="datetime-local" required />
                                            <Input label="Prediction Deadline:" id="predictionDeadlineAdmin" name="predictionDeadlineAdmin" type="datetime-local" required />
                                            <Button type="submit" className="w-full" disabled={isWritePending}>{isWritePending ? "Processing..." : "Create Round"}</Button>
                                        </form>
                                    </Card>
                                    <Card title="Resolve Round" titleColor="text-gray-700" className="bg-gray-50 !mb-0">
                                        <form onSubmit={handleResolveRound}>
                                            <Input label="Round ID to Resolve:" id="resolveRoundIdAdmin" name="resolveRoundIdAdmin" type="number" required />
                                            <Button type="submit" variant="warning" className="w-full" disabled={isWritePending}>{isWritePending ? "Processing..." : "Resolve Round"}</Button>
                                        </form>
                                    </Card>
                                    <Card title="Token Gating" titleColor="text-gray-700" className="bg-gray-50 !mb-0">
                                        <form onSubmit={handleSetGatingToken} className="mb-4">
                                            <Input label="Gating Token Address (ERC20):" name="gatingTokenAddress" id="gatingTokenAddress" placeholder="0x... (blank to clear)" defaultValue={gatingTokenAddress !== "N/A" ? gatingTokenAddress : ""} />
                                            <Input label="Min. Token Balance (raw):" name="minGatingTokenBalance" id="minGatingTokenBalance" type="text" placeholder="e.g., 1000000000000000000" defaultValue={minGatingTokenBalance !== "N/A" ? minGatingTokenBalance : ""} />
                                            <Button type="submit" variant="secondary" className="w-full" disabled={isWritePending}>{isWritePending ? "Processing..." : "Set Gating Token"}</Button>
                                        </form>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm">Enable Token Gating:</span>
                                            <Button onClick={handleToggleGating} variant="secondary" className="px-3 py-1 text-xs" disabled={isWritePending || isTokenGatingEnabled === null }>{tokenGatingEnabledDisplay}</Button>
                                        </div>
                                        <p className="text-xs mt-1">Status: <span className="font-medium">{tokenGatingEnabledDisplay}</span></p>
                                        <p className="text-xs mt-1">Token: <span className="font-medium break-all">{gatingTokenAddress}</span></p>
                                        <p className="text-xs mt-1">Min Balance: <span className="font-medium">{minGatingTokenBalance}</span></p>
                                    </Card>
                                    <Card title="Game Settings" titleColor="text-gray-700" className="bg-gray-50 !mb-0">
                                        <form onSubmit={handleSetEntryFee} className="mb-3">
                                            <Input label="New Entry Fee (ETH):" id="newEntryFee" name="newEntryFee" type="number" step="any" required defaultValue={entryFeeDisplay !== "N/A" ? entryFeeDisplay : ""} />
                                            <Button type="submit" variant="secondary" className="w-full text-sm" disabled={isWritePending}>{isWritePending ? "Processing..." : "Set Entry Fee"}</Button>
                                        </form>
                                        <form onSubmit={handleSetPrizePoolPercentage} className="mb-3">
                                            <Input label="Prize Pool % (0-100):" id="newPrizePoolPercentage" name="newPrizePoolPercentage" type="number" min="0" max="100" required defaultValue={prizePoolPercentage !== null ? prizePoolPercentage.toString() : ""} />
                                            <Button type="submit" variant="secondary" className="w-full text-sm" disabled={isWritePending}>{isWritePending ? "Processing..." : "Set Prize %"}</Button>
                                        </form>
                                        <form onSubmit={handleSetMaxBetAmount} className="mb-3">
                                            <Input label="New Max Bet Amount (ETH):" id="newMaxBetAmount" name="newMaxBetAmount" type="number" step="any" placeholder="e.g. 0.1 (0 for no limit)" defaultValue={"0"} />
                                            <Button type="submit" variant="secondary" className="w-full text-sm" disabled={isWritePending}>{isWritePending ? "Processing..." : "Set Max Bet"}</Button>
                                        </form>
                                        <form onSubmit={handleSetOracleAddress}>
                                            <Input label="New BTC Oracle Address:" id="newOracleAddress" name="newOracleAddress" placeholder="0x..." required defaultValue={btcPriceFeedAddress || ""} />
                                            <Button type="submit" variant="secondary" className="w-full text-sm" disabled={isWritePending}>{isWritePending ? "Processing..." : "Set BTC Oracle"}</Button>
                                        </form>
                                    </Card>
                                    <Card title="Maintenance" titleColor="text-gray-700" className="bg-gray-50 !mb-0">
                                        <Button onClick={handlePauseGame} variant="warning" className="w-full mb-2" disabled={isWritePending || isGamePaused === true}>{isWritePending ? "Processing..." : "Pause Game"}</Button>
                                        <Button onClick={handleUnpauseGame} variant="warning" className="w-full mb-4" disabled={isWritePending || isGamePaused === false}>{isWritePending ? "Processing..." : "Unpause Game"}</Button>
                                        <form onSubmit={handleWithdrawAdminFees}>
                                            <Input label="Withdraw Fees To Address:" id="withdrawToAddress" name="withdrawToAddress" placeholder="0x..." required defaultValue={userAddress || ''}/>
                                            <Button type="submit" variant="danger" className="w-full" disabled={isWritePending}>{isWritePending ? "Processing..." : "Withdraw Admin Fees"}</Button>
                                        </form>
                                    </Card>
                                </div>
                        </Card>
                        )}
                    </>
                ) : (
                    <Card title="Connect to Play">
                        <p className="text-center text-gray-600">
                            Please connect your wallet. If connected, ensure you are on the {TARGET_NETWORK_NAME}.
                        </p>
                        {isConnected && chain?.id !== TARGET_CHAIN_ID && (
                             <div className="mt-4 text-center">
                                <Button onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })} variant="warning">
                                    Switch to {TARGET_NETWORK_NAME}
                                </Button>
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
}

export default App;
