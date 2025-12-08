# BitForecast - BTC Price Prediction Arena

A decentralized prediction game where users forecast Bitcoin prices and compete for ETH prize pools on Base Network.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)
![Base](https://img.shields.io/badge/Base-Mainnet-0052FF?logo=coinbase)

## 🎯 Overview

BitForecast is a decentralized application (dApp) that allows users to:

- Connect their Web3 wallets (MetaMask, Coinbase Wallet, etc.)
- Predict future Bitcoin prices for timed prediction rounds
- Compete with other traders for ETH prize pools
- Claim winnings trustlessly via smart contract

Built on **Base Mainnet** with Chainlink price oracles for fair, verifiable outcomes.

## ✨ Features

### For Players
- **Wallet Integration** - Connect via RainbowKit with support for 100+ wallets
- **Live Price Feeds** - Real-time BTC/USD and ETH/USD prices from Chainlink oracles
- **Place Predictions** - Submit your BTC price forecast before the round deadline
- **Raise Stakes** - Increase your position in active rounds
- **Cancel Bets** - Withdraw before round deadline if allowed
- **View History** - Track all your past predictions, outcomes, and prizes
- **Claim Prizes** - Winners claim directly from the smart contract

### For Admins
- **Round Management** - Create and resolve prediction rounds
- **Token Gating** - Require ERC20 token holdings to participate
- **Fee Configuration** - Set entry fees and prize pool percentages
- **Oracle Management** - Update BTC price feed address
- **Game Controls** - Pause/unpause the game, withdraw admin fees

### UI/UX
- **Dark/Light Modes** - "Deep Cyberpunk" dark mode and "Orbital Daylight" light mode
- **Mobile Responsive** - Optimized layouts for all screen sizes
- **Glass Morphism** - Premium transparent panel design
- **Theme Toggle** - Instant theme switching with next-themes

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19 |
| Styling | Tailwind CSS 4 |
| Web3 | Wagmi 2, Viem 2 |
| Wallet UI | RainbowKit 2 |
| Theme | next-themes |
| Icons | Lucide React |
| Blockchain | Base (Mainnet/Sepolia) |
| Oracles | Chainlink Data Feeds |

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Admin panel page
│   ├── api/                # API routes (bet-history, auth)
│   ├── globals.css         # Global styles & CSS variables
│   └── providers.tsx       # Wagmi, RainbowKit, Theme providers
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── ...
│   ├── AdminPanel.tsx      # Admin controls
│   ├── BetHistoryList.tsx  # User's prediction history
│   ├── GameStatusCard.tsx  # Live prices & game info
│   ├── PredictionForm.tsx  # Place prediction UI
│   └── RoundQuery.tsx      # Query past rounds
├── hooks/
│   ├── useBetHistory.ts    # Fetch user's bet history
│   ├── useGameContractReads.ts  # Read game contract state
│   ├── useOraclePrices.ts  # Fetch live prices
│   ├── useActiveRound.ts   # Active round state
│   ├── useRoundDetails.ts  # Query specific round
│   ├── useAdminAuth.ts     # Admin SIWE authentication
│   └── usePlayerActions.ts # Player contract interactions
├── config/
│   └── contract.ts         # Contract addresses, ABIs, chain config
├── types/
│   └── game.ts             # TypeScript interfaces
├── utils/
│   └── formatting.ts       # Value formatting helpers
└── App.jsx                 # Main application component
```

## ⚙️ Environment Variables

Create a `.env.local` file in the project root:

```env
# Required
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=    # Get at https://cloud.walletconnect.com/
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=       # Deployed game contract

# Network (Base Mainnet = 8453, Base Sepolia = 84532)
NEXT_PUBLIC_BASE_CHAIN_ID=8453
NEXT_PUBLIC_BASE_NETWORK_NAME="Base Mainnet"
NEXT_PUBLIC_BASE_BLOCK_EXPLORER_URL="https://basescan.org"

# Price Feeds
NEXT_PUBLIC_ETH_USD_PRICE_FEED_ADDRESS=  # Chainlink ETH/USD on Base
NEXT_PUBLIC_ALCHEMY_API_KEY=             # For RPC (client-side, rate-limited)

# Server-side only
ALCHEMY_API_KEY=                         # For bet history API
CG_API_KEY=                              # CoinGecko API (optional)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- A wallet with some ETH on Base

### Installation

```bash
# Clone the repository
git clone <your-repository-url>
cd PredictionGame

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## 🎨 Theming

The app uses CSS variables for theming, defined in `src/app/globals.css`:

### Dark Mode ("Deep Cyberpunk")
- Slate-950 backgrounds
- Neon cyan/purple/amber accents
- Glowing hover effects

### Light Mode ("Orbital Daylight")
- Cool white backgrounds
- 600-weight accent colors for contrast
- Subtle tinted shadows

Toggle themes using the sun/moon button in the header.

## 📱 Responsive Design

- **Desktop**: Full layout with side-by-side panels
- **Tablet**: Stacked layout with adjusted spacing
- **Mobile**: Compact header, simplified landing page, optimized controls

## 🔐 Smart Contract

The game interacts with a Solidity smart contract that handles:

- Round creation and resolution
- Bet placement and cancellation
- Prize pool distribution
- Chainlink oracle integration
- Admin controls and token gating

Key contract functions:
- `placeBet(rawPrediction, roundId)` - Submit prediction
- `claimPrize(roundId)` - Claim winnings
- `cancelBet(roundId)` - Cancel before deadline
- `rounds(roundId)` - Get round info
- `bets(roundId, address)` - Get user's bet

## 🔄 Data Flow

1. **On Connect**: Fetch bet history, game state, live prices
2. **Manual Refresh**: User clicks refresh buttons
3. **After Transaction**: Refetch relevant data on success
4. **Bet History**: Only updates on connect, refresh click, or after placing bet

## 📄 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

Built with ❤️ for the Base ecosystem
