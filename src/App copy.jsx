import React, { useState, useEffect, useCallback } from 'react';
// Viem utilities will be used for formatting, parsing, etc.
import { formatEther, parseEther, zeroAddress, defineChain, formatUnits } from 'viem'; 
import { getLogs } from 'viem/actions'; 

import contractABI_JSON from './BTCPricePredictionGameABI.json'; 

// RainbowKit and Wagmi imports
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { 
    useAccount, 
    useBalance, 
    useSwitchChain, 
    useReadContract, 
    useWriteContract,
    useWaitForTransactionReceipt,
    usePublicClient,
} from 'wagmi';

// --- Contract Configuration ---
const contractAddress = import.meta.env.VITE_GAME_CONTRACT_ADDRESS || "0x52DC260E1E85e1A5E58BB35233d08daA773055a1"; 
const contractABI = contractABI_JSON; 

const targetChainId = parseInt(import.meta.env.VITE_BASE_CHAIN_ID || "8453", 10);
const targetNetworkName = import.meta.env.VITE_BASE_NETWORK_NAME || "Base Mainnet";
const blockExplorerUrl = import.meta.env.VITE_BASE_BLOCK_EXPLORER_URL || "https://basescan.org";

// Chainlink Price Feed for ETH/USD on Base Mainnet
const ethUsdPriceFeedAddress = import.meta.env.VITE_ETH_USD_PRICE_FEED_ADDRESS || "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"; 

const priceFeedABI = [ 
    {
        "inputs": [], "name": "latestRoundData",
        "outputs": [
            { "internalType": "uint80", "name": "roundId", "type": "uint80" },
            { "internalType": "int256", "name": "answer", "type": "int256" },
            { "internalType": "uint256", "name": "startedAt", "type": "uint256" },
            { "internalType": "uint256", "name": "updatedAt", "type": "uint256" },
            { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }
        ], "stateMutability": "view", "type": "function"
    },
    {
        "inputs": [], "name": "decimals",
        "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
        "stateMutability": "view", "type": "function"
    }
];


// --- Helper Components - Defined ONCE at the top level ---
const Notification = ({ message, type, onDismiss }) => {
    if (!message) return null;
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
    return (
        <div className={`fixed bottom-5 right-5 text-white p-4 rounded-lg shadow-lg ${bgColor} z-50 transition-opacity duration-300 ease-in-out`}>
            {message}
            <button onClick={onDismiss} className="ml-4 font-bold hover:text-gray-200">X</button>
        </div>
    );
};

const Card = ({ children, title, titleColor = "text-blue-600", className = "" }) => (
    <div className={`bg-white p-6 rounded-lg shadow-md mb-6 ${className}`}>
        {title && <h2 className={`text-xl font-semibold mb-4 ${titleColor}`}>{title}</h2>}
        {children}
    </div>
);

const Input = ({ label, id, type = "text", value, onChange, placeholder, required, step, min, max, name, defaultValue }) => (
    <div className="mb-4">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
            type={type} id={id} name={name || id} value={value} defaultValue={defaultValue} onChange={onChange}
            placeholder={placeholder} required={required} step={step} min={min} max={max}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
    </div>
);

const Button = ({ children, onClick, type = "button", variant = "primary", className = "", disabled = false }) => {
    const baseStyle = "px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ease-in-out";
    let variantStyle = "";
    switch (variant) {
        case "secondary": variantStyle = "text-white bg-gray-600 hover:bg-gray-700 focus:ring-gray-500"; break;
        case "danger": variantStyle = "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500"; break;
        case "warning": variantStyle = "text-white bg-amber-500 hover:bg-amber-600 focus:ring-amber-400"; break;
        default: variantStyle = "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";
    }
    return (
        <button type={type} onClick={onClick} disabled={disabled}
            className={`${baseStyle} ${variantStyle} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >{children}</button>
    );
};
// --- End Helper Components ---


function App() {
    // Wagmi hooks
    const { address: userAddress, isConnected, chain } = useAccount();
    const { data: balanceData, refetch: refetchBalance } = useBalance({ address: userAddress, chainId: targetChainId });
    const { switchChain } = useSwitchChain();
    const publicClient = usePublicClient({ chainId: targetChainId });

    // Local state
    const [userBalanceDisplay, setUserBalanceDisplay] = useState('N/A');
    const [userBalanceUsd, setUserBalanceUsd] = useState('N/A');
    const [isAdmin, setIsAdmin] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' });
    
    const [currentBtcPrice, setCurrentBtcPrice] = useState('N/A');
    const [btcPriceTimestamp, setBtcPriceTimestamp] = useState('N/A');
    const [isBtcPriceLoading, setIsBtcPriceLoading] = useState(false);
    const [currentEthPrice, setCurrentEthPrice] = useState(null); 
    const [currentEthPriceDisplay, setCurrentEthPriceDisplay] = useState('N/A'); 
    const [ethPriceTimestamp, setEthPriceTimestamp] = useState('N/A');
    const [isEthPriceLoading, setIsEthPriceLoading] = useState(false);
    const [isGameStatusRefreshing, setIsGameStatusRefreshing] = useState(false);

    const [queryRoundId, setQueryRoundId] = useState('');
    const [queriedRoundInfo, setQueriedRoundInfo] = useState(null);
    const [currentParticipantsCount, setCurrentParticipantsCount] = useState('N/A');
    const [betHistory, setBetHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    
    const [activeRoundMessage, setActiveRoundMessage] = useState("Checking for active round...");

    // Wagmi write contract hooks
    const { data: writeContractResult, writeContractAsync, isPending: isWritePending } = useWriteContract();

    // --- Helper Functions - Defined ONCE within App scope ---
    const showNotif = useCallback((message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 5000);
    }, []); 

    const formatWeiToEthString = useCallback((weiValue) => { 
        if (weiValue === null || typeof weiValue === 'undefined') return '0';
        try { return parseFloat(formatEther(BigInt(weiValue))).toFixed(5); } 
        catch (e) { console.error("Error formatting ETH from wei:", e, weiValue); return 'Error'; }
    }, []);
    const calculateUsdValue = useCallback((ethAmountString, ethPriceNumber) => {
        if (ethAmountString === 'N/A' || ethAmountString === 'Error' || !ethPriceNumber || isNaN(parseFloat(ethAmountString))) return 'N/A';
        const ethValue = parseFloat(ethAmountString);
        return (ethValue * ethPriceNumber).toFixed(2); 
    }, []);
    const formatPrediction = useCallback((rawPrediction) => {
        if (rawPrediction === undefined) return 'N/A';
        return (Number(rawPrediction) / (10**4)).toFixed(4);
    }, []);
    const formatTimestamp = useCallback((timestamp) => {
        if (!timestamp || timestamp.toString() === "0") return "N/A";
        return new Date(Number(timestamp) * 1000).toLocaleString();
    }, []);
    const formatTimestampGMT = useCallback((timestamp) => {
        if (!timestamp || timestamp.toString() === "0") return "N/A";
        return new Date(Number(timestamp) * 1000).toUTCString();
    }, []);


    // --- Wagmi Read Contract Hooks for Game Data ---
    const { data: nextRoundIdData, refetch: refetchNextRoundId } = useReadContract({ abi: contractABI, address: contractAddress, functionName: 'getNextRoundId', chainId: targetChainId, });
    const { data: latestCreatedRoundIdData, refetch: refetchLatestCreatedRoundId } = useReadContract({ abi: contractABI, address: contractAddress, functionName: 'getLatestCreatedRoundId', chainId: targetChainId, });
    const { data: entryFeeData, refetch: refetchEntryFee } = useReadContract({ abi: contractABI, address: contractAddress, functionName: 'entryFee', chainId: targetChainId, });
    const { data: gamePausedData, refetch: refetchGamePaused } = useReadContract({ abi: contractABI, address: contractAddress, functionName: 'paused', chainId: targetChainId, });
    const { data: contractOwnerData } = useReadContract({ abi: contractABI, address: contractAddress, functionName: 'owner', chainId: targetChainId, });
    const { data: tokenGatingEnabledData, refetch: refetchTokenGatingEnabled } = useReadContract({ abi: contractABI, address: contractAddress, functionName: 'tokenGatingEnabled', chainId: targetChainId, });
    const { data: gatingTokenData, refetch: refetchGatingToken } = useReadContract({ abi: contractABI, address: contractAddress, functionName: 'gatingToken', chainId: targetChainId, });
    const { data: minGatingTokenBalanceData, refetch: refetchMinGatingBalance } = useReadContract({ abi: contractABI, address: contractAddress, functionName: 'minGatingTokenBalance', chainId: targetChainId, });
    const { data: btcPriceFeedAddressDataFromContract, refetch: refetchBtcPriceFeedAddress } = useReadContract({ abi: contractABI, address: contractAddress, functionName: 'priceFeed', chainId: targetChainId, });
    const { data: prizePoolPercentageData, refetch: refetchPrizePoolPercentage } = useReadContract({ abi: contractABI, address: contractAddress, functionName: 'prizePoolPercentage', chainId: targetChainId });

    // Derived state from wagmi hooks
    const nextRoundId = nextRoundIdData ? nextRoundIdData.toString() : 'N/A';
    const latestCreatedRoundId = latestCreatedRoundIdData ? latestCreatedRoundIdData.toString() : 'N/A';
    const entryFee = entryFeeData ? formatWeiToEthString(entryFeeData) : 'N/A'; 
    const gamePaused = typeof gamePausedData === 'boolean' ? (gamePausedData ? "Yes" : "No") : 'N/A';
    const gatingEnabled = typeof tokenGatingEnabledData === 'boolean' ? tokenGatingEnabledData : false;
    const gatingTokenDisplay = gatingTokenData && gatingTokenData !== zeroAddress ? gatingTokenData : "N/A";
    const gatingMinBalanceDisplay = minGatingTokenBalanceData ? minGatingTokenBalanceData.toString() : "N/A";
    const entryFeeUsd = entryFeeData && currentEthPrice ? calculateUsdValue(formatWeiToEthString(entryFeeData), currentEthPrice) : 'N/A';

    // Update user balance display
    useEffect(() => {
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
    }, [balanceData, currentEthPrice, calculateUsdValue]);

    // Fetch ETH Price
    const fetchCurrentEthPriceData = useCallback(async () => {
        if (!publicClient || !ethUsdPriceFeedAddress || ethUsdPriceFeedAddress === zeroAddress) {
            showNotif("ETH Price Feed Address not configured or invalid.", "error");
            setCurrentEthPrice(null); setCurrentEthPriceDisplay('Oracle N/A'); setEthPriceTimestamp('N/A');
            return;
        }
        setIsEthPriceLoading(true); setCurrentEthPriceDisplay('Fetching...');
        try {
            const decimals = await publicClient.readContract({ address: ethUsdPriceFeedAddress, abi: priceFeedABI, functionName: 'decimals' });
            const roundData = await publicClient.readContract({ address: ethUsdPriceFeedAddress, abi: priceFeedABI, functionName: 'latestRoundData' });
            if (!roundData || typeof roundData[1] === 'undefined' || typeof roundData[3] === 'undefined') throw new Error("Invalid ETH price feed data.");
            const priceValue = roundData[1]; const updatedAtTimestamp = roundData[3]; 
            const priceAsNumber = parseFloat(formatUnits(priceValue, Number(decimals))); 
            setCurrentEthPrice(priceAsNumber); setCurrentEthPriceDisplay(`$${priceAsNumber.toFixed(2)}`);
            setEthPriceTimestamp(formatTimestampGMT(updatedAtTimestamp));
        } catch (e) { 
            console.error("Error ETH price:", e); 
            setCurrentEthPrice(null); setCurrentEthPriceDisplay('Error'); setEthPriceTimestamp('Error');
            showNotif(`ETH Price Error: ${e.message}. Check RPC & feed address.`, "error");
        } finally {
            setIsEthPriceLoading(false);
        }
    }, [publicClient, showNotif, formatTimestampGMT]); 

    // Fetch BTC Price
    const fetchCurrentBtcPriceData = useCallback(async () => { 
        if (!publicClient || !btcPriceFeedAddressDataFromContract || btcPriceFeedAddressDataFromContract === zeroAddress) {
            showNotif("BTC Price Feed Address not set in game contract.", "error");
            setCurrentBtcPrice('Oracle N/A'); setBtcPriceTimestamp('N/A');
            return;
        }
        setIsBtcPriceLoading(true); setCurrentBtcPrice('Fetching...');
        try {
            const decimals = await publicClient.readContract({ address: btcPriceFeedAddressDataFromContract, abi: priceFeedABI, functionName: 'decimals' });
            const data = await publicClient.readContract({ address: btcPriceFeedAddressDataFromContract, abi: priceFeedABI, functionName: 'latestRoundData' });
            if (!data || typeof data[1] === 'undefined' || typeof data[3] === 'undefined') throw new Error("Invalid BTC price feed data.");
            const priceValue = data[1]; const updatedAt = data[3]; 
            setCurrentBtcPrice(`$${parseFloat(formatUnits(priceValue, Number(decimals))).toFixed(2)}`);
            setBtcPriceTimestamp(formatTimestampGMT(updatedAt));
        } catch (e) { console.error("Error BTC price:", e); setCurrentBtcPrice('Error'); showNotif(`BTC Price Error: ${e.message}`,"error");}
        finally {
            setIsBtcPriceLoading(false);
        }
    }, [publicClient, btcPriceFeedAddressDataFromContract, showNotif, formatTimestampGMT]);


    // Determine Admin Status
    useEffect(() => {
        if (userAddress && contractOwnerData) setIsAdmin(contractOwnerData.toLowerCase() === userAddress.toLowerCase());
        else setIsAdmin(false);
    }, [userAddress, contractOwnerData]);

    // Fetch Bet History
    const fetchBetHistory = useCallback(async () => {
        if (!userAddress || !publicClient || !contractABI || contractABI.length === 0) return;
        setIsLoadingHistory(true);
        try {
            const betPlacedEventAbiItem = contractABI.find(item => item.type === 'event' && item.name === 'BetPlaced');
            if (!betPlacedEventAbiItem) {
                showNotif("BetPlaced event ABI not found.", "error"); setIsLoadingHistory(false); return;
            }
            const latestBlockNumber = await publicClient.getBlockNumber();
            const CHUNK_SIZE = BigInt(490); 
            const NUMBER_OF_CHUNKS_TO_FETCH = 20; 
            let allLogs = [];
            for (let i = 0; i < NUMBER_OF_CHUNKS_TO_FETCH; i++) {
                const toBlock = latestBlockNumber - (CHUNK_SIZE * BigInt(i));
                let fromBlock = toBlock - CHUNK_SIZE + 1n; 
                if (toBlock < 0n) break; 
                if (fromBlock < 0n) fromBlock = 0n;
                if (toBlock < fromBlock && i > 0) break;
                try {
                    const logs = await publicClient.getLogs({
                        address: contractAddress, event: betPlacedEventAbiItem, args: { user: userAddress },
                        fromBlock: fromBlock, toBlock: toBlock
                    });
                    if (logs.length > 0) allLogs = [...allLogs, ...logs];
                } catch (chunkError) { console.error(`Error logs chunk ${fromBlock}-${toBlock}:`, chunkError); break; }
                if (fromBlock === 0n) break; 
            }
            const uniqueLogs = allLogs.filter((log, index, self) => index === self.findIndex((l) => (l.blockNumber === log.blockNumber && l.transactionIndex === log.transactionIndex && l.logIndex === log.logIndex)));
            uniqueLogs.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber) || Number(b.logIndex) - Number(a.logIndex) );

            const historyProcessingPromises = uniqueLogs.map(async (log) => {
                const { roundId, rawPrediction } = log.args;
                const roundDetailsArr = await publicClient.readContract({abi: contractABI, address: contractAddress, functionName: 'rounds', args: [roundId]});
                const userBetDetailsArr = await publicClient.readContract({abi: contractABI, address: contractAddress, functionName: 'bets', args: [roundId, userAddress]});
                let prizeAmountEth = 'N/A', prizeAmountUsd = 'N/A', isWinner = false;
                if (roundDetailsArr[2]) { // resolved
                    const winnersList = await publicClient.readContract({abi: contractABI, address: contractAddress, functionName: 'getWinnersForRound', args: [roundId]});
                    isWinner = winnersList.some(winnerAddr => winnerAddr.toLowerCase() === userAddress.toLowerCase());
                    if (isWinner) {
                        const totalPot = await publicClient.readContract({abi: contractABI, address: contractAddress, functionName: 'totalCollectedPerRound', args: [roundId]});
                        const prizePercentData = await publicClient.readContract({abi: contractABI, address: contractAddress, functionName: 'prizePoolPercentage'});
                        if (winnersList.length > 0) {
                            const pool = (BigInt(totalPot.toString()) * BigInt(prizePercentData.toString())) / 100n;
                            const individualPrizeWei = pool / BigInt(winnersList.length);
                            prizeAmountEth = formatWeiToEthString(individualPrizeWei); 
                            if (currentEthPrice) prizeAmountUsd = calculateUsdValue(prizeAmountEth, currentEthPrice);
                        }
                    }
                }
                return { roundId: roundId.toString(), predictionDeadline: formatTimestamp(roundDetailsArr[1]), roundEndTime: formatTimestamp(roundDetailsArr[0]), userPrediction: formatPrediction(rawPrediction), isResolved: roundDetailsArr[2], isWinner, hasClaimed: userBetDetailsArr[2], prizeAmountEth, prizeAmountUsd };
            });
            const processedHistory = await Promise.all(historyProcessingPromises);
            setBetHistory(processedHistory); 
            if (uniqueLogs.length > 0) showNotif("Bet history loaded.", "success");
            else showNotif("No past bets found in the checked range.", "success");
        } catch (e) { console.error("Error fetching bet history:", e); showNotif(`Bet History Error: ${e.message}`, "error"); }
        setIsLoadingHistory(false);
    }, [userAddress, publicClient, currentEthPrice, formatWeiToEthString, formatPrediction, calculateUsdValue, showNotif, formatTimestamp]); 


    // Initial data fetches and refetches on connection/chain change
    useEffect(() => {
        if (isConnected && chain?.id === targetChainId && publicClient) {
            fetchCurrentEthPriceData();
        }
    }, [isConnected, chain, publicClient, fetchCurrentEthPriceData]);

    useEffect(() => {
        if (isConnected && chain?.id === targetChainId && publicClient && currentEthPrice !== null) {
            refetchNextRoundId(); refetchLatestCreatedRoundId(); refetchEntryFee(); 
            refetchGamePaused(); refetchTokenGatingEnabled(); refetchGatingToken(); 
            refetchMinGatingBalance(); refetchBalance(); 
            refetchBtcPriceFeedAddress().then(() => {
                fetchCurrentBtcPriceData();
            });
            fetchBetHistory();
        }
    }, [isConnected, chain, publicClient, currentEthPrice, 
        refetchNextRoundId, refetchLatestCreatedRoundId, refetchEntryFee, 
        refetchGamePaused, refetchTokenGatingEnabled, refetchGatingToken, 
        refetchMinGatingBalance, refetchBalance, refetchBtcPriceFeedAddress, 
        fetchCurrentBtcPriceData, fetchBetHistory
    ]);
    
    // Determine Active Round Status
    useEffect(() => {
        const checkActiveRound = async () => {
            if (isConnected && chain?.id === targetChainId && publicClient && latestCreatedRoundId !== 'N/A' && latestCreatedRoundId !== '0' && gamePaused !== 'N/A') {
                if (gamePaused === "Yes") {
                    setActiveRoundMessage(`Game is paused. Round ${latestCreatedRoundId} is not active for betting.`);
                    return;
                }
                try {
                    const roundDataArr = await publicClient.readContract({ abi: contractABI, address: contractAddress, functionName: 'rounds', args: [BigInt(latestCreatedRoundId)] });
                    if (roundDataArr && !roundDataArr[2]) { 
                        const deadlineTimestamp = Number(roundDataArr[1]);
                        if (deadlineTimestamp * 1000 > Date.now()) { 
                            setActiveRoundMessage(`Round ${latestCreatedRoundId} is ACTIVE for betting until ${formatTimestamp(deadlineTimestamp)}.`);
                        } else {
                            setActiveRoundMessage(`Round ${latestCreatedRoundId} betting closed. Awaiting resolution.`);
                        }
                    } else if (roundDataArr && roundDataArr[2]) { 
                        setActiveRoundMessage(`Round ${latestCreatedRoundId} is resolved. No active round for betting.`);
                    } else {
                         setActiveRoundMessage("No active round found or latest round data unavailable.");
                    }
                } catch (error) {
                    console.error("Error checking active round:", error);
                    setActiveRoundMessage("Could not determine active round status.");
                }
            } else if (gamePaused === "Yes") {
                setActiveRoundMessage("Game is currently paused.");
            } 
            else if (isConnected && chain?.id === targetChainId) { 
                setActiveRoundMessage("No active rounds or still loading data.");
            } else {
                setActiveRoundMessage("Connect wallet and switch to target network.");
            }
        };
        if (latestCreatedRoundId !== 'N/A' && gamePaused !== 'N/A' && publicClient) { 
            checkActiveRound();
        }
    }, [isConnected, chain, publicClient, latestCreatedRoundId, gamePaused, formatTimestamp]);


    // --- Event Handlers for Player Actions ---
    const handleFetchRoundDetails = async () => {
        if (!publicClient || !queryRoundId) { showNotif("Enter Round ID.", "error"); return; }
        try {
            const roundIdBigInt = BigInt(queryRoundId);
            const roundDataArr = await publicClient.readContract({abi: contractABI, address: contractAddress, functionName: 'rounds', args: [roundIdBigInt]});
            
            if (!roundDataArr || roundDataArr[0].toString() === "0") { 
                showNotif(`Round ${queryRoundId} not found or not initialized.`, "error");
                setQueriedRoundInfo(null); setCurrentParticipantsCount('N/A'); return;
            }
            const resolvedStatusFromContract = roundDataArr[2]; 
            const isResolvedDisplayString = typeof resolvedStatusFromContract === 'boolean' ? (resolvedStatusFromContract ? "Yes" : "No") : "Unknown";
            
            const bettors = await publicClient.readContract({abi: contractABI, address: contractAddress, functionName: 'getBettorsForRound', args: [roundIdBigInt]});
            const totalPotWei = await publicClient.readContract({abi: contractABI, address: contractAddress, functionName: 'totalCollectedPerRound', args: [roundIdBigInt]});
            
            let prizePoolEth = 'N/A';
            let adminFeeEth = 'N/A';
            const totalPotEth = formatWeiToEthString(totalPotWei);

            if (prizePoolPercentageData !== undefined) { 
                const prizePercent = Number(prizePoolPercentageData);
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

        } catch (e) { 
            showNotif(`Fetch Details Error: ${e.message}`, "error"); 
            console.error("Error in handleFetchRoundDetails:", e); 
            setQueriedRoundInfo(null); setCurrentParticipantsCount('N/A');
        }
    };
    
    const handleDirectClaimPrize = async (roundIdToClaim) => { 
        if (!roundIdToClaim) { showNotif("Round ID missing.", "error"); return; }
        try {
            showNotif(`Attempting to claim for round ${roundIdToClaim}...`, "success");
            await writeContractAsync({ abi: contractABI, address: contractAddress, functionName: 'claimPrize', args: [BigInt(roundIdToClaim)] });
        } catch (e) { showNotif(`Claim Prize Error: ${e.shortMessage || e.message}`, "error"); console.error(e); }
    };
    
    const handlePlaceBetSubmit = async (event) => {
        event.preventDefault();
        if (!publicClient || !userAddress) { // Check if publicClient and userAddress are available
            showNotif("Wallet not connected or client not ready.", "error");
            return;
        }
        const betRoundId = event.target.betRoundId.value;
        const predictionStr = event.target.prediction.value;
        if (!betRoundId || !predictionStr) { showNotif("Fill all bet fields.", "error"); return; }

        try {
            // Client-side check if bet already placed
            const userBetDetailsArr = await publicClient.readContract({
                abi: contractABI,
                address: contractAddress,
                functionName: 'bets',
                args: [BigInt(betRoundId), userAddress]
            });
            // bets mapping returns: rawPrediction, amount, claimed, placed
            // placed is at index 3
            if (userBetDetailsArr && userBetDetailsArr[3] === true) {
                showNotif("You have already placed a bet for this round. Only one bet per round is allowed.", "error");
                return;
            }

            const predictionValue = parseFloat(predictionStr);
            const rawPrediction = BigInt(Math.round(predictionValue * (10**4)));
            const fee = entryFeeData; 
            if (typeof fee === 'undefined') { showNotif("Entry fee not loaded.", "error"); return; }
            
            showNotif("Submitting bet...", "success");
            await writeContractAsync({ abi: contractABI, address: contractAddress, functionName: 'placeBet', args: [rawPrediction, BigInt(betRoundId)], value: fee });
        } catch (e) { showNotif(`Place Bet Error: ${e.shortMessage || e.message}`, "error"); console.error(e); }
    };
    
    const handleClaimPrizeSubmit = async (event) => { 
        event.preventDefault(); 
        const claimRoundId = event.target.claimRoundId.value;
        handleDirectClaimPrize(claimRoundId);
    };

    const handleRaiseStakeSubmit = async (event) => {
        event.preventDefault();
        const roundId = event.target.raiseStakeRoundId.value;
        const amountUsdStr = event.target.raiseStakeAmountUsd.value; 

        if (!roundId || !amountUsdStr) {
            showNotif("Please provide Round ID and USD amount to raise stake.", "error");
            return;
        }
        if (!currentEthPrice || currentEthPrice <= 0) {
            showNotif("Current ETH/USD price is not available or invalid. Cannot calculate ETH amount.", "error");
            return;
        }

        try {
            const amountUsd = parseFloat(amountUsdStr);
            if (isNaN(amountUsd) || amountUsd <= 0) {
                showNotif("Invalid USD amount.", "error");
                return;
            }
            const amountEth = amountUsd / currentEthPrice;
            const amountWei = parseEther(amountEth.toString()); 

            showNotif(`Raising stake for round ${roundId} by ${amountEth.toFixed(6)} ETH (~$${amountUsdStr} USD)...`, "success");
            await writeContractAsync({
                abi: contractABI,
                address: contractAddress,
                functionName: 'raiseStakeInRound', 
                args: [BigInt(roundId)],
                value: amountWei,
            });
        } catch (e) {
            showNotif(`Raise Stake Error: ${e.shortMessage || e.message}`, "error");
            console.error("Error raising stake:", e);
        }
    };

    // Admin Handlers
    const adminActionWrapper = async (functionName, args, successMsgPrefix, value) => {
        try {
            showNotif(`${successMsgPrefix}...`, "success");
            await writeContractAsync({ abi: contractABI, address: contractAddress, functionName, args, value });
        } catch (e) { showNotif(`Admin Action (${functionName}) Error: ${e.shortMessage || e.message}`, "error"); console.error(e); }
    };
    const handleCreateRound = async (e) => { e.preventDefault(); const end = BigInt(Math.floor(new Date(e.target.roundEndTimeAdmin.value).getTime()/1000)); const dead = BigInt(Math.floor(new Date(e.target.predictionDeadlineAdmin.value).getTime()/1000)); adminActionWrapper('createRound', [end, dead], "Creating round");};
    const handleResolveRound = async (e) => { e.preventDefault(); const id = e.target.resolveRoundIdAdmin.value; if(!id) return; adminActionWrapper('resolveRound', [BigInt(id)], `Resolving round ${id}`); };
    const handleSetGatingToken = async (e) => { e.preventDefault(); const addr = e.target.gatingTokenAddress.value || zeroAddress; const bal = e.target.minGatingTokenBalance.value ? BigInt(e.target.minGatingTokenBalance.value) : 0n; adminActionWrapper('setGatingToken', [addr, bal], "Setting gating token"); };
    const handleToggleGating = async () => { const currentStatus = tokenGatingEnabledData; adminActionWrapper('toggleTokenGating', [!currentStatus], `Toggling gating to ${!currentStatus}`); };
    const handleSetEntryFee = async (e) => { e.preventDefault(); const fee = parseEther(e.target.newEntryFee.value||"0"); adminActionWrapper('setEntryFee', [fee], "Setting entry fee"); };
    const handleSetPrizePoolPercentage = async (e) => { e.preventDefault(); const perc = BigInt(parseInt(e.target.newPrizePoolPercentage.value)); adminActionWrapper('setPrizePoolPercentage', [perc], "Setting prize %"); };
    const handleSetMaxBetAmount = async (e) => { e.preventDefault(); const amt = parseEther(e.target.newMaxBetAmount.value||"0"); adminActionWrapper('setMaxBetAmount', [amt], "Setting max bet"); };
    const handleSetOracleAddress = async (e) => { e.preventDefault(); const addr = e.target.newOracleAddress.value; adminActionWrapper('setOracleAddress', [addr], "Setting oracle"); };
    const handlePauseGame = async () => adminActionWrapper('pauseGame', [], "Pausing game");
    const handleUnpauseGame = async () => adminActionWrapper('unpauseGame', [], "Unpausing game");
    const handleWithdrawAdminFees = async (e) => { e.preventDefault(); const to = e.target.withdrawToAddress.value; adminActionWrapper('withdrawAdminFees', [to], "Withdrawing fees"); };

    // Generic useWaitForTransactionReceipt for writeContractAsync results
     useWaitForTransactionReceipt({ 
        hash: writeContractResult, 
        onSuccess: (data) => { 
            showNotif("Transaction successful!", "success"); 
            fetchBetHistory();
            refetchNextRoundId(); refetchLatestCreatedRoundId(); refetchEntryFee();
            refetchGamePaused(); refetchTokenGatingEnabled(); refetchGatingToken();
            refetchMinGatingBalance(); refetchBalance();
            refetchBtcPriceFeedAddress().then(() => fetchCurrentBtcPriceData());
            if (queryRoundId) {
                handleFetchRoundDetails(); 
            }
        },
        onError: (error) => {
            showNotif(`Transaction Failed: ${error.shortMessage || error.message}`, "error");
        }
    });


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

                {isConnected && chain?.id === targetChainId ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <Card title="Game Status" className="md:col-span-1">
                                <p className="text-sm mb-1"><strong>Contract:</strong> 
                                    <a href={`${blockExplorerUrl}/address/${contractAddress}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1 break-all">
                                        {contractAddress ? contractAddress.substring(0,10) + "..." : "N/A"}
                                    </a>
                                </p>
                                <p className="text-sm mb-1"><strong>Next Round ID:</strong> <span className="font-semibold">{nextRoundId}</span></p>
                                <p className="text-sm mb-1"><strong>Latest Created Round:</strong> <span className="font-semibold">{latestCreatedRoundId}</span></p>
                                <p className="text-sm mb-1"><strong>Active Round:</strong> <span className="font-semibold">{activeRoundMessage}</span></p> 
                                <p className="text-sm mb-1">
                                    <strong>Entry Fee:</strong> <span className="font-semibold">{entryFee} ETH</span>
                                    {entryFeeUsd !== 'N/A' && <span className="text-xs text-gray-500"> (~${entryFeeUsd} USD)</span>}
                                </p>
                                <p className="text-sm mb-3"><strong>Game Paused:</strong> <span className="font-semibold">{gamePaused}</span></p>
                                <Button 
                                    onClick={() => {
                                        setIsGameStatusRefreshing(true);
                                        Promise.all([
                                            refetchNextRoundId(),
                                            refetchLatestCreatedRoundId(),
                                            refetchEntryFee(),
                                            refetchGamePaused(),
                                            refetchTokenGatingEnabled(), 
                                            (latestCreatedRoundId !== 'N/A' && latestCreatedRoundId !== '0' && publicClient) ? 
                                                publicClient.readContract({ abi: contractABI, address: contractAddress, functionName: 'rounds', args: [BigInt(latestCreatedRoundId)] })
                                                .then(roundDataArr => {
                                                    if (gamePausedData === true) { 
                                                        setActiveRoundMessage(`Game is paused. Round ${latestCreatedRoundId} is not active for betting.`);
                                                        return;
                                                    }
                                                    if (roundDataArr && !roundDataArr[2]) { 
                                                        const deadlineTimestamp = Number(roundDataArr[1]);
                                                        if (deadlineTimestamp * 1000 > Date.now()) { 
                                                            setActiveRoundMessage(`Round ${latestCreatedRoundId} is ACTIVE for betting until ${formatTimestamp(deadlineTimestamp)}.`);
                                                        } else {
                                                            setActiveRoundMessage(`Round ${latestCreatedRoundId} betting closed. Awaiting resolution.`);
                                                        }
                                                    } else if (roundDataArr && roundDataArr[2]) { 
                                                        setActiveRoundMessage(`Round ${latestCreatedRoundId} is resolved. No active round for betting.`);
                                                    } else {
                                                        setActiveRoundMessage("No active round found or latest round data unavailable.");
                                                    }
                                                }).catch(e => {
                                                    console.error("Error refreshing active round status:", e);
                                                    setActiveRoundMessage("Error refreshing active round status.");
                                                })
                                            : Promise.resolve()

                                        ]).finally(() => setIsGameStatusRefreshing(false));
                                    }} 
                                    variant="secondary" 
                                    className="mt-2 mb-3 w-full text-xs py-1 px-2" 
                                    disabled={!publicClient || isGameStatusRefreshing}
                                >
                                    {isGameStatusRefreshing ? "Refreshing Status..." : "Refresh Game Status"}
                                </Button>
                                <hr className="my-3"/>
                                <h3 className="text-gray-700 text-md font-semibold mb-1">Live BTC Price</h3>
                                <p className="text-lg font-bold text-green-600">{isBtcPriceLoading ? "Loading..." : currentBtcPrice}</p>
                                <p className="text-xs text-gray-500">As of (GMT): {btcPriceTimestamp}</p>
                                <Button onClick={fetchCurrentBtcPriceData} variant="secondary" className="mt-2 text-xs py-1 px-2" disabled={!publicClient || !btcPriceFeedAddressDataFromContract || isBtcPriceLoading}>
                                    {isBtcPriceLoading ? "Refreshing..." : "Refresh BTC"}
                                </Button>
                                <hr className="my-3"/>
                                <h3 className="text-gray-700 text-md font-semibold mb-1">Live ETH Price</h3>
                                <p className="text-lg font-bold text-purple-600">{isEthPriceLoading ? "Loading..." : currentEthPriceDisplay}</p>
                                <p className="text-xs text-gray-500">As of (GMT): {ethPriceTimestamp}</p>
                                <Button onClick={fetchCurrentEthPriceData} variant="secondary" className="mt-2 text-xs py-1 px-2" disabled={!publicClient || isEthPriceLoading}>
                                     {isEthPriceLoading ? "Refreshing..." : "Refresh ETH"}
                                </Button>
                            </Card>
                            
                            <Card title="Round Information & Actions" className="md:col-span-2">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-gray-700 text-lg font-semibold mb-2">Query Round Details</h3>
                                        <div className="mb-3 flex items-end gap-2">
                                            <div className="flex-grow">
                                                <Input label="Round ID:" id="queryRoundIdInput" type="number" value={queryRoundId} onChange={e => setQueryRoundId(e.target.value)} placeholder="Enter round ID" />
                                            </div>
                                            <Button onClick={handleFetchRoundDetails} variant="secondary" className="mb-4 h-12" disabled={!publicClient}>Fetch Details</Button>
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
                                        <form onSubmit={handlePlaceBetSubmit} className="mb-6">
                                            <h3 className="text-lg font-semibold mb-3 text-gray-700">Place Your Bet</h3>
                                            <Input label="Round ID to Bet On:" id="betRoundId" name="betRoundId" type="number" required />
                                            <Input label="Your BTC Price Prediction (e.g., 65000.1234):" id="prediction" name="prediction" type="number" step="0.0001" required />
                                            <Button type="submit" className="w-full" disabled={!isConnected || gamePaused === "Yes" || isWritePending}>
                                                {isWritePending ? "Placing Bet..." : "Place Bet"}
                                            </Button>
                                        </form>
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
                            {isLoadingHistory && <p className="text-sm text-gray-500">Loading history...</p>}
                            {!isLoadingHistory && betHistory.length === 0 && <p className="text-sm text-gray-500">No bets found in your history, or still loading.</p>}
                            {!isLoadingHistory && betHistory.length > 0 && (
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {betHistory.map((bet, index) => (
                                        <div key={`${bet.roundId}-${index}`} className="p-3 bg-gray-50 rounded-md border border-gray-200 text-sm">
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
                                                                    className="mt-2 text-xs py-1 px-2 bg-green-500 hover:bg-green-600">
                                                                    Claim for Round {bet.roundId}
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
                             <Button onClick={fetchBetHistory} variant="secondary" className="mt-4 text-xs" disabled={isLoadingHistory || !isConnected}>
                                {isLoadingHistory ? "Refreshing..." : "Refresh History"}
                            </Button>
                        </Card>

                        {isAdmin && ( <Card title="Admin Panel" titleColor="text-amber-500" className="border-l-4 border-amber-400">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <Card title="Create Round" titleColor="text-gray-700" className="bg-gray-50">
                                        <form onSubmit={handleCreateRound}>
                                            <Input label="Round End Time:" id="roundEndTimeAdmin" name="roundEndTimeAdmin" type="datetime-local" required />
                                            <Input label="Prediction Deadline:" id="predictionDeadlineAdmin" name="predictionDeadlineAdmin" type="datetime-local" required />
                                            <Button type="submit" className="w-full" disabled={isWritePending}>{isWritePending ? "Processing..." : "Create Round"}</Button>
                                        </form>
                                    </Card>
                                    <Card title="Resolve Round" titleColor="text-gray-700" className="bg-gray-50">
                                        <form onSubmit={handleResolveRound}>
                                            <Input label="Round ID to Resolve:" id="resolveRoundIdAdmin" name="resolveRoundIdAdmin" type="number" required />
                                            <Button type="submit" variant="warning" className="w-full" disabled={isWritePending}>{isWritePending ? "Processing..." : "Resolve Round"}</Button>
                                        </form>
                                    </Card>
                                    <Card title="Token Gating" titleColor="text-gray-700" className="bg-gray-50">
                                        <form onSubmit={handleSetGatingToken} className="mb-4">
                                            <Input label="Gating Token Address (ERC20):" id="gatingTokenAddress" name="gatingTokenAddress" placeholder="0x... (leave blank to clear)" />
                                            <Input label="Min. Token Balance (raw amount):" id="minGatingTokenBalance" name="minGatingTokenBalance" type="text" placeholder="e.g., 1000000000000000000" />
                                            <Button type="submit" variant="secondary" className="w-full" disabled={isWritePending}>{isWritePending ? "Processing..." : "Set Gating Token"}</Button>
                                        </form>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm">Enable Token Gating:</span>
                                            <Button onClick={handleToggleGating} variant="secondary" className="px-3 py-1 text-xs" disabled={isWritePending}>{gatingEnabled ? "Disable" : "Enable"}</Button>
                                        </div>
                                        <p className="text-xs mt-1">Status: <span className="font-medium">{gatingEnabled ? "Enabled" : "Disabled"}</span></p>
                                        <p className="text-xs mt-1">Token: <span className="font-medium break-all">{gatingTokenDisplay}</span></p>
                                        <p className="text-xs mt-1">Min Balance: <span className="font-medium">{gatingMinBalanceDisplay}</span></p>
                                    </Card>
                                    <Card title="Game Settings" titleColor="text-gray-700" className="bg-gray-50">
                                        <form onSubmit={handleSetEntryFee} className="mb-3">
                                            <Input label="New Entry Fee (ETH):" id="newEntryFee" name="newEntryFee" type="number" step="any" required />
                                            <Button type="submit" variant="secondary" className="w-full text-sm" disabled={isWritePending}>{isWritePending ? "Processing..." : "Set Entry Fee"}</Button>
                                        </form>
                                        <form onSubmit={handleSetPrizePoolPercentage} className="mb-3">
                                            <Input label="Prize Pool % (0-100):" id="newPrizePoolPercentage" name="newPrizePoolPercentage" type="number" min="0" max="100" required />
                                            <Button type="submit" variant="secondary" className="w-full text-sm" disabled={isWritePending}>{isWritePending ? "Processing..." : "Set Prize %"}</Button>
                                        </form>
                                        <form onSubmit={handleSetMaxBetAmount} className="mb-3">
                                            <Input label="New Max Bet Amount (ETH):" id="newMaxBetAmount" name="newMaxBetAmount" type="number" step="any" required />
                                            <Button type="submit" variant="secondary" className="w-full text-sm" disabled={isWritePending}>{isWritePending ? "Processing..." : "Set Max Bet"}</Button>
                                        </form>
                                        <form onSubmit={handleSetOracleAddress}>
                                            <Input label="New Oracle Address:" id="newOracleAddress" name="newOracleAddress" placeholder="0x..." required />
                                            <Button type="submit" variant="secondary" className="w-full text-sm" disabled={isWritePending}>{isWritePending ? "Processing..." : "Set Oracle"}</Button>
                                        </form>
                                    </Card>
                                    <Card title="Maintenance" titleColor="text-gray-700" className="bg-gray-50">
                                        <Button onClick={handlePauseGame} variant="warning" className="w-full mb-2" disabled={isWritePending}>{isWritePending ? "Processing..." : "Pause Game"}</Button>
                                        <Button onClick={handleUnpauseGame} variant="warning" className="w-full mb-4" disabled={isWritePending}>{isWritePending ? "Processing..." : "Unpause Game"}</Button>
                                        <form onSubmit={handleWithdrawAdminFees}>
                                            <Input label="Withdraw Fees To Address:" id="withdrawToAddress" name="withdrawToAddress" placeholder="0x..." required defaultValue={userAddress || ''}/>
                                            <Button type="submit" variant="danger" className="w-full" disabled={isWritePending}>{isWritePending ? "Processing..." : "Withdraw Admin Fees"}</Button>
                                        </form>
                                    </Card>
                                </div>
                        </Card>)}
                    </>
                ) : (
                    <Card title="Connect to Play">
                        <p className="text-center text-gray-600">
                            Please connect your wallet. If connected, ensure you are on the {targetNetworkName}.
                        </p>
                        {isConnected && chain?.id !== targetChainId && (
                             <div className="mt-4 text-center">
                                <Button onClick={() => switchChain({ chainId: targetChainId })} variant="warning">
                                    Switch to {targetNetworkName}
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
