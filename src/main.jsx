// src/main.jsx (or your Wagmi/RainbowKit config file)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider, http } from 'wagmi';
import { base } from 'wagmi/chains'; // Import the base chain definition
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// --- Critical: Environment Variable Check ---
// Ensure these environment variables are set in your Vercel project settings.
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const baseRpcUrl = import.meta.env.VITE_BASE_MAINNET_RPC_URL; // Your Alchemy URL
const targetChainId = parseInt(import.meta.env.VITE_BASE_CHAIN_ID || "8453"); // Default to Base Mainnet if not set

if (!walletConnectProjectId) {
  console.error("ERROR: VITE_WALLETCONNECT_PROJECT_ID is not set. WalletConnect will not work.");
  // You might want to throw an error or display a message to the user in development
}
if (!baseRpcUrl) {
  console.warn(
    "WARNING: VITE_BASE_MAINNET_RPC_URL is not set. Falling back to public RPC for Base. " +
    "This is NOT recommended for production due to rate limits."
  );
}

// --- Configure your target chain (e.g., Base Mainnet) ---
// Start with the default chain definition from wagmi/chains
const appChain = { ...base }; 

// Override the RPC URL with your dedicated one from the environment variable
appChain.rpcUrls = {
  default: {
    http: [baseRpcUrl || base.rpcUrls.default.http[0]], // Use your custom RPC, fallback to wagmi's default if yours isn't set
  },
  public: { // It's good practice to also set the public one if your custom one is defined
    http: [baseRpcUrl || base.rpcUrls.default.http[0]],
  },
};

// Ensure the chain ID is correct (especially if VITE_BASE_CHAIN_ID might be a string)
appChain.id = targetChainId; 
// You can also override the name if needed, though usually not necessary if importing from wagmi/chains
// appChain.name = import.meta.env.VITE_BASE_NETWORK_NAME || base.name;


// --- Wagmi Configuration ---
const config = getDefaultConfig({
  appName: 'BTC Price Prediction Game',
  projectId: walletConnectProjectId || "YOUR_FALLBACK_WALLETCONNECT_PROJECT_ID", // Fallback needed if env var is missing
  chains: [appChain], // Pass the configured chain object
  transports: {
    [appChain.id]: http(appChain.rpcUrls.default.http[0]), // Use the (potentially overridden) RPC URL
  },
  // ssr: true, // Set to true if using a Next.js app with SSR (for Vite/React, usually false or not needed)
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);