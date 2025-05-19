# BTC Price Prediction Game

## 🚀 Overview

The BTC Price Prediction Game is a decentralized application (dApp) that allows users to connect their Web3 wallets, predict the future price of Bitcoin (BTC), and participate in prediction rounds. Users can place bets on their predictions, and winners are determined based on the actual BTC price at the end of a round. The application also includes administrative features for managing game rounds, settings, and fees.

This project is built on the Base Mainnet (or a configurable target network) and interacts with a custom smart contract for game logic and Chainlink oracles for price feeds.

## ✨ Features

* **Wallet Integration:** Connects with popular Web3 wallets (e.g., MetaMask, Coinbase Wallet) via RainbowKit.
* **Network Agnostic:** Configured for Base Mainnet but can be targeted to other EVM-compatible networks.
* **User Authentication:** Displays user address and balance.
* **BTC & ETH Price Feeds:** Fetches and displays live prices for BTC/USD (from game contract's oracle) and ETH/USD (from a direct Chainlink feed).
* **Game Status Display:** Shows current game contract details, active round information, entry fees, and game pause status.
* **Round Participation:**
    * Place bets on BTC price for active rounds.
    * View details of specific past or current rounds (prediction deadline, end time, total pot, prize pool).
    * Raise stake in an ongoing round (adds to the prize pool).
* **Prize Claiming:** Users can claim their winnings for resolved rounds where they were a winner.
* **Bet History:** Users can view their past bets, predictions, and outcomes.
* **Admin Panel (Conditional):**
    * Create new prediction rounds.
    * Resolve completed rounds.
    * Manage token gating (set ERC20 token and minimum balance for participation).
    * Toggle token gating on/off.
    * Set game parameters: entry fee, prize pool percentage, max bet amount.
    * Update the BTC price oracle address used by the game contract.
    * Pause/Unpause the game.
    * Withdraw admin fees.
* **Notifications:** Provides user feedback for actions, transactions, and errors.

## 🛠️ Tech Stack

* **Frontend:** React, Vite
* **CSS:** Tailwind CSS
* **Web3 Integration:**
    * Wagmi: React Hooks for Ethereum.
    * RainbowKit: Wallet connection UI.
    * Viem: Low-level Ethereum interface for formatting, ABI interaction, etc.
* **Smart Contract:** (Assumed to be Solidity, deployed on an EVM-compatible chain like Base)
* **Price Feeds:** Chainlink Data Feeds

## ⚙️ Configuration

The application relies on environment variables for crucial settings. These are typically set in a `.env` file in the project root. Refer to `.env.example` if available.

Key configuration variables (used in `src/config/contract.js`):

* `VITE_GAME_CONTRACT_ADDRESS`: The deployed address of your BTC Price Prediction Game smart contract.
* `VITE_BASE_CHAIN_ID`: The chain ID of the target network (e.g., 8453 for Base Mainnet).
* `VITE_BASE_NETWORK_NAME`: The human-readable name of the target network.
* `VITE_BASE_BLOCK_EXPLORER_URL`: The URL of the block explorer for the target network.
* `VITE_ETH_USD_PRICE_FEED_ADDRESS`: The address of the Chainlink ETH/USD price feed on the target network.

The main contract ABI (`BTCPricePredictionGameABI.json`) is expected to be in the `src` directory and is imported by `src/config/contract.js`.

## 📦 Setup & Running Locally

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the project root and populate it with the necessary contract addresses, network details, and your RPC provider URL (e.g., from Alchemy, Infura if Vite config uses it for `wagmi` provider).
    Example `.env` content:
    ```env
    VITE_GAME_CONTRACT_ADDRESS=0xYourGameContractAddress...
    VITE_BASE_CHAIN_ID=8453
    VITE_BASE_NETWORK_NAME="Base Mainnet"
    VITE_BASE_BLOCK_EXPLORER_URL=[https://basescan.org](https://basescan.org)
    VITE_ETH_USD_PRICE_FEED_ADDRESS=0xChainlinkEthUsdFeedAddress...
    # Add your VITE_ALCHEMY_ID or similar if your wagmi/RainbowKit setup requires it
    VITE_ALCHEMY_ID=your_alchemy_api_key 
    ```
    *(Note: Ensure your `wagmi` and `RainbowKit` setup in `main.jsx` or a similar entry point is configured to use these environment variables for providers if needed.)*

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application should now be running, typically on `http://localhost:5173`.

## 🧩 Code Structure Highlights

The application is structured with modularity in mind:

* **`src/App.jsx`**: The main application component, acting as an orchestrator.
* **`src/components/ui/`**: Contains reusable UI components like `Button.jsx`, `Card.jsx`, `Input.jsx`, `Notification.jsx`.
* **`src/config/contract.js`**: Centralizes all contract addresses, ABIs, and network configuration.
* **`src/utils/formatting.js`**: Provides helper functions for data formatting (e.g., Wei to ETH, timestamps).
* **`src/hooks/`**: Contains custom React Hooks to encapsulate specific logic and state management:
    * `useGameContractReads.js`: Manages reading data from the main game smart contract.
    * `useOraclePrices.js`: Manages fetching and state for ETH and BTC oracle prices.
    * `useBetHistory.js`: Manages fetching and state for user's bet history.
    * *(Future hooks for player actions, admin actions, etc.)*

## 🤝 Contributing

(Placeholder for contribution guidelines if this were an open-source project)

## 📄 License

(Placeholder for license information, e.g., MIT)


# Project Roadmap: Phase 2 - Further Modularization

This document outlines the next steps for enhancing the modularity and maintainability of the BTC Price Prediction Game frontend. Phase 1 focused on separating UI components, configuration, utility functions, and creating initial custom hooks for data reading (`useGameContractReads`, `useOraclePrices`, `useBetHistory`).

Phase 2 will concentrate on encapsulating contract write operations and breaking down the main `App.jsx` component into more manageable feature-specific components.

## I. Custom Hooks for Contract Write Operations

The primary goal here is to move all `writeContractAsync` calls and related logic (like preparing arguments, handling specific errors, and potentially managing `isPending` states for specific actions) out of `App.jsx` and into dedicated custom hooks.

### 1. `usePlayerActions.js` Hook
   * **Objective:** Encapsulate all smart contract write functions initiated by regular players.
   * **Functions to include:**
      * `placeBet`: Logic from `handlePlaceBetSubmit` (excluding form event handling, but including argument preparation and the `writeContractAsync` call).
      * `claimPrize`: Logic from `handleDirectClaimPrize`.
      * `raiseStake`: Logic from `handleRaiseStakeSubmit`.
   * **Return Values:**
      * Functions to trigger these actions (e.g., `executePlaceBet`, `executeClaimPrize`).
      * Potentially a shared `isActionPending` state if a generic loading state for player actions is desired, or individual pending states.
      * The `writeContractResult` from `useWriteContract` could be returned if needed by `App.jsx` for the global `useWaitForTransactionReceipt`, or `useWaitForTransactionReceipt` could be used *within* this hook if actions have very different post-transaction needs.

### 2. `useAdminActions.js` Hook
   * **Objective:** Encapsulate all smart contract write functions initiated by the administrator.
   * **Functions to include (based on the `adminActionWrapper` and its callers):**
      * `createRound`
      * `resolveRound`
      * `setGatingToken`
      * `toggleTokenGating`
      * `setEntryFee`
      * `setPrizePoolPercentage`
      * `setMaxBetAmount`
      * `setOracleAddress`
      * `pauseGame`
      * `unpauseGame`
      * `withdrawAdminFees`
   * **Internal Logic:** Could utilize a refined version of the existing `adminActionWrapper` internally.
   * **Return Values:**
      * Functions for each admin action.
      * Similar to `usePlayerActions`, consider how `isPending` and `writeContractResult` are handled.

### 3. (Optional) `useTransactionWatcher.js` Hook
   * **Objective:** If the `useWaitForTransactionReceipt` logic in `App.jsx` (handling `onSuccess` and `onError` for *all* transactions) becomes too generic or if different actions require vastly different post-transaction side effects, this hook could be considered.
   * **Alternatively:** The `useWaitForTransactionReceipt` logic can remain in `App.jsx` if the `onSuccess` (refetching data, showing notifications) is largely the same for most transactions. Or, individual action hooks (`usePlayerActions`, `useAdminActions`) could manage their own transaction watching if their success/error handling is highly specific. For now, keeping it in `App.jsx` is fine.

## II. Feature-Specific Components (Deconstructing `App.jsx` JSX)

Once the logic for data fetching (Phase 1) and contract writing (Phase 2, Step I) is encapsulated in hooks, the `App.jsx` component will primarily be responsible for:
   * Orchestrating these hooks.
   * Managing minimal global UI state (like notifications, if not moved to a context).
   * Rendering the main layout and routing (if routing were introduced).
   * Composing larger "feature" or "section" components.

The current large JSX block within `App.jsx` can be broken down:

### 1. `Header.jsx` (If not already a smart component)
   * **Current:** Likely just UI.
   * **Future:** Could consume `useAccount` directly if it needs more complex logic related to wallet display. For now, passing props is fine.

### 2. `GameStatusSection.jsx`
   * **Objective:** Display all information related to the overall game status and live oracle prices.
   * **Data Hooks Used:** `useGameContractReads`, `useOraclePrices`.
   * **Props Received:** Data from these hooks, `showNotif` function.
   * **Internal Logic:** Handles the "Refresh Game Status" button and calls the appropriate refetch functions from the hooks.

### 3. `PlayerActionsSection.jsx`
   * **Objective:** Contain all UI and forms related to actions a player can take (query round, place bet, claim prize, raise stake).
   * **Data Hooks Used:** `useGameContractReads` (for entry fees, round info), `useOraclePrices` (for USD conversions), `usePlayerActions` (for executing actions).
   * **Props Received:** Relevant data from hooks, `showNotif`.
   * **Internal Logic:** Manages form state for inputs, calls action functions from `usePlayerActions`.

### 4. `BetHistorySection.jsx`
   * **Objective:** Display the user's bet history.
   * **Data Hooks Used:** `useBetHistory`, `usePlayerActions` (for the "Claim Prize" button within the history).
   * **Props Received:** Data from hooks, `showNotif`.
   * **Internal Logic:** Handles the "Refresh History" button.

### 5. `AdminPanelSection.jsx`
   * **Objective:** Contain all UI and forms for administrative functions. This component would only be rendered if `isAdmin` is true.
   * **Data Hooks Used:** `useGameContractReads` (for current settings), `useAdminActions` (for executing admin functions).
   * **Props Received:** Data from hooks, `showNotif`, `userAddress` (for default withdrawal address).
   * **Internal Logic:** Manages form states for various admin settings, calls action functions from `useAdminActions`.

### 6. `NetworkGuard.jsx` (or similar)
   * **Objective:** Handle the UI for when the user is not connected or is on the wrong network.
   * **Props Received:** `isConnected`, `chain`, `TARGET_CHAIN_ID`, `TARGET_NETWORK_NAME`, `switchChain` function.

## III. Refining `App.jsx`

After the above steps, `App.jsx` should be significantly smaller. Its main responsibilities will be:

* **Initializing Hooks:** Calling all the main custom hooks.
* **Global State/Context:** Managing `notification` state (or providing a NotificationContext).
* **Layout Composition:** Rendering the main page structure (`div` containers) and the feature components (`Header`, `GameStatusSection`, `PlayerActionsSection`, etc.), passing them the necessary data and functions obtained from the hooks.
* **Global Transaction Watcher:** The `useWaitForTransactionReceipt` hook will likely remain here to handle common post-transaction tasks like global data refetches and success/error notifications.

## IV. Review and Refactor

* **Prop Drilling:** As components are created, be mindful of prop drilling. If data needs to pass through many layers, consider if a more specific hook is needed by a lower-level component or if React Context is appropriate for truly global data (e.g., theme, user auth status - though Wagmi handles auth).
* **Hook Dependencies:** Continuously review dependency arrays for `useEffect` and `useCallback` in all hooks and components.
* **Error Handling:** Ensure consistent and user-friendly error handling across all actions and data fetching.
* **Loading States:** Provide clear loading indicators for all asynchronous operations.

This roadmap provides a structured approach to continue improving your application's architecture. Each step builds upon the previous, leading to a more robust, maintainable, and scalable codebase.
