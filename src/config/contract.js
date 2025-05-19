// src/config/contract.js

// Import the ABI JSON file.
// Make sure the path is correct relative to this new config file.
// If your 'config' folder is at 'src/config' and ABI is at 'src/',
// the path would be '../BTCPricePredictionGameABI.json'.
// Adjust as necessary.
import contractABI_JSON from '../BTCPricePredictionGameABI.json'; // PLEASE VERIFY THIS PATH

// --- Contract Configuration ---
export const VITE_GAME_CONTRACT_ADDRESS = import.meta.env.VITE_GAME_CONTRACT_ADDRESS || "0x0a426F5306522CfFa651Fd886f55A368fd655526";
export const GAME_CONTRACT_ABI = contractABI_JSON;

// --- Network Configuration ---
export const TARGET_CHAIN_ID = parseInt(import.meta.env.VITE_BASE_CHAIN_ID || "8453", 10);
export const TARGET_NETWORK_NAME = import.meta.env.VITE_BASE_NETWORK_NAME || "Base Mainnet";
export const BLOCK_EXPLORER_URL = import.meta.env.VITE_BASE_BLOCK_EXPLORER_URL || "https://basescan.org";

// --- Price Feed Configuration ---
export const ETH_USD_PRICE_FEED_ADDRESS = import.meta.env.VITE_ETH_USD_PRICE_FEED_ADDRESS || "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";

// ABI for Chainlink Price Feeds
export const PRICE_FEED_ABI = [
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

// --- General Constants ---
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";