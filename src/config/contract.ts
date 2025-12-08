// src/config/contract.ts

import { Address } from 'viem';
import contractABI_JSON from '../BTCPricePredictionGameABI.json';

// --- Contract Configuration ---
export const GAME_CONTRACT_ADDRESS: Address = (
    process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS ||
    "0x0a426F5306522CfFa651Fd886f55A368fd655526"
) as Address;

// Legacy alias for backward compatibility
export const VITE_GAME_CONTRACT_ADDRESS = GAME_CONTRACT_ADDRESS;

export const GAME_CONTRACT_ABI = contractABI_JSON as readonly object[];

// --- Network Configuration ---
export const TARGET_CHAIN_ID: number = parseInt(
    process.env.NEXT_PUBLIC_BASE_CHAIN_ID || "8453",
    10
);

export const TARGET_NETWORK_NAME: string =
    process.env.NEXT_PUBLIC_BASE_NETWORK_NAME || "Base Mainnet";

export const BLOCK_EXPLORER_URL: string =
    process.env.NEXT_PUBLIC_BASE_BLOCK_EXPLORER_URL || "https://basescan.org";

// --- Price Feed Configuration ---
export const ETH_USD_PRICE_FEED_ADDRESS: Address = (
    process.env.NEXT_PUBLIC_ETH_USD_PRICE_FEED_ADDRESS ||
    "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"
) as Address;

// ABI for Chainlink Price Feeds
export const PRICE_FEED_ABI = [
    {
        inputs: [],
        name: "latestRoundData",
        outputs: [
            { internalType: "uint80", name: "roundId", type: "uint80" },
            { internalType: "int256", name: "answer", type: "int256" },
            { internalType: "uint256", name: "startedAt", type: "uint256" },
            { internalType: "uint256", name: "updatedAt", type: "uint256" },
            { internalType: "uint80", name: "answeredInRound", type: "uint80" }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function"
    }
] as const;

// --- General Constants ---
export const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";
