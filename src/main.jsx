import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Or './App' if your App component is in App.js
import './index.css';    // Your main CSS file with Tailwind directives

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
// We will define the Base chain using environment variables below
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { http, defineChain } from 'viem';

// --- Environment Variables ---
// These are expected to be in your .env file and prefixed with VITE_ (for Vite projects)
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const baseChainId = parseInt(import.meta.env.VITE_BASE_CHAIN_ID || "8453", 10); // Default to Base Mainnet if not set
const baseNetworkName = import.meta.env.VITE_BASE_NETWORK_NAME || "Base Mainnet";
const baseRpcUrl = import.meta.env.VITE_BASE_RPC_URL || "https://mainnet.base.org"; // Fallback to public RPC
const baseBlockExplorerUrl = import.meta.env.VITE_BASE_BLOCK_EXPLORER_URL || "https://basescan.org";

// Log loaded environment variables for debugging
console.log("main.jsx - VITE_WALLETCONNECT_PROJECT_ID:", walletConnectProjectId);
console.log("main.jsx - VITE_BASE_CHAIN_ID:", baseChainId);
console.log("main.jsx - VITE_BASE_NETWORK_NAME:", baseNetworkName);
console.log("main.jsx - VITE_BASE_RPC_URL:", baseRpcUrl);
console.log("main.jsx - VITE_BASE_BLOCK_EXPLORER_URL:", baseBlockExplorerUrl);


if (!walletConnectProjectId) {
  console.warn("VITE_WALLETCONNECT_PROJECT_ID is not set in your .env file. WalletConnect features might not work. Get one from https://cloud.walletconnect.com");
}
if (!import.meta.env.VITE_BASE_RPC_URL) {
  console.warn("VITE_BASE_RPC_URL is not set in your .env file. Using default public RPC (https://mainnet.base.org) which might be unstable. Consider using a dedicated RPC from Alchemy, Infura, etc.");
}

// Define the Base chain using environment variables
const configuredBaseChain = defineChain({
    id: baseChainId,
    name: baseNetworkName,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: [baseRpcUrl] },
        public: { http: [baseRpcUrl] }, // Often good to define public as well
    },
    blockExplorers: {
        default: { name: `${baseNetworkName} Scan`, url: baseBlockExplorerUrl },
    },
    testnet: false, // Set to true if this is a testnet configuration (e.g., Base Sepolia)
});

// Configure Wagmi with RainbowKit's getDefaultConfig
const config = getDefaultConfig({
  appName: 'BTC Prediction Game',
  projectId: walletConnectProjectId || "YOUR_WALLETCONNECT_PROJECT_ID_FALLBACK", // Provide a fallback
  chains: [configuredBaseChain], // Pass the chain defined using env variables
  transports: {
    // For each chain you support, define a transport.
    // http() without arguments will use the rpcUrl from the chain definition.
    [configuredBaseChain.id]: http(), 
  },
  ssr: false, // Set to true if using Server-Side Rendering
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? darkTheme() : lightTheme()} // Auto dark/light theme
          modalSize="compact" // Or "wide"
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);