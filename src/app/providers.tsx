'use client';

import * as React from 'react';
import {
    RainbowKitProvider,
    getDefaultConfig,
    Chain,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

// --- Environment Variable Handling (Next.js style) ---
// Note: In Next.js, env vars available to the client must start with NEXT_PUBLIC_
// Server-only env vars (like API keys) should NOT have NEXT_PUBLIC_ prefix
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || process.env.VITE_WALLETCONNECT_PROJECT_ID;
const targetChainIdString = process.env.NEXT_PUBLIC_BASE_CHAIN_ID || process.env.VITE_BASE_CHAIN_ID || "8453";
const targetChainId = parseInt(targetChainIdString);

// IMPORTANT: We construct the RPC URL without exposing the full URL to the client
// The API key portion is omitted from the client bundle
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const baseRpcUrl = alchemyApiKey
    ? `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
    : 'https://mainnet.base.org'; // Public fallback

if (!walletConnectProjectId) {
    console.error("ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set.");
}

const appChain = { ...base } as Chain;
appChain.id = targetChainId;

if (baseRpcUrl) {
    appChain.rpcUrls = {
        default: { http: [baseRpcUrl] },
        public: { http: [baseRpcUrl] },
    }
}

const config = getDefaultConfig({
    appName: 'BTC Price Prediction Game',
    projectId: walletConnectProjectId || "YOUR_PROJECT_ID",
    chains: [appChain],
    transports: {
        [appChain.id]: http(baseRpcUrl)
    },
    ssr: true, // Enable SSR for Next.js
});

const queryClient = new QueryClient();

import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                        {children}
                    </ThemeProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
