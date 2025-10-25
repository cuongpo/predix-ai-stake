# 🧠 Predix AI - AI-Powered Prediction Market

> **Predict with AI, Win with MATIC** - A decentralized prediction market where users can follow or counter AI predictions on Bitcoin price movements.

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-predix--ai--stake.vercel.app-blue?style=for-the-badge)](https://predix-ai-stake.vercel.app/)
[![Polygon](https://img.shields.io/badge/Polygon-Amoy_Testnet-8247E5?style=for-the-badge&logo=polygon)](https://amoy.polygonscan.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

## 🎯 Overview

Predix AI is a revolutionary decentralized prediction market built on Polygon that combines artificial intelligence with blockchain technology. Every 5 minutes, our AI analyzes Bitcoin price movements and makes predictions. Users can either follow the AI's prediction or counter it by staking MATIC tokens.

### 🎮 How It Works

1. **AI Prediction**: Every 5 minutes, the AI analyzes market data and predicts if Bitcoin will go UP or DOWN
2. **Place Your Bet**: Choose to FOLLOW the AI prediction or COUNTER it with MATIC tokens
3. **Win or Learn**: Winners share the losing pool, losers get 20% cashback
4. **Repeat**: New rounds start automatically every 5 minutes

## ✨ Key Features

### 🤖 AI-Powered Predictions
- Advanced AI algorithms analyze Bitcoin price movements
- Real-time predictions every 5 minutes
- Transparent on-chain prediction storage

### 💰 Fair Reward System
- **Winners**: Share the losing pool proportionally
- **Losers**: Receive 20% cashback (no total loss)
- **Platform**: Takes 5% fee for sustainability

### 🔗 Blockchain Integration
- **Network**: Polygon Amoy Testnet
- **Smart Contracts**: Fully auditable and transparent
- **Real-time Data**: Chainlink price feeds for accurate Bitcoin prices

### 🎨 Modern UI/UX
- Responsive design for all devices
- Real-time updates and animations
- Intuitive wallet connection
- Live leaderboards and statistics

## 🛠 Technology Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible components
- **Radix UI** - Headless UI primitives
- **React Query** - Data fetching and caching
- **React Router** - Client-side routing
- **Lucide React** - Beautiful icons

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server development
- **Ethers.js** - Ethereum library for blockchain interaction
- **CORS** - Cross-origin resource sharing

### Smart Contracts
- **Solidity ^0.8.19** - Smart contract language
- **Hardhat** - Development environment
- **OpenZeppelin** - Security-focused contract library
- **Chainlink** - Decentralized oracle network
- **Polygon Amoy** - Layer 2 scaling solution

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Commitlint** - Commit message linting

## [object Object]Start

### Prerequisites
- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet
- Some MATIC tokens on Polygon Amoy Testnet

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/predix-ai-stake.git
cd predix-ai-stake
```

2. **Install dependencies**
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install smart contract dependencies
cd ../smart-contracts
npm install
```

3. **Environment Setup**
```bash
# Frontend (.env)
VITE_CONTRACT_ADDRESS=0x946C1BeAa17fCb39053dA252dd018d02fE22F944
VITE_ORACLE_ADDRESS=0xD59036D4c03fa24b596Cd9D9164f2f2D8f41639B
VITE_NETWORK_ID=80002

# Backend (.env)
PORT=3002
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology/
CONTRACT_ADDRESS=0x946C1BeAa17fCb39053dA252dd018d02fE22F944
```

4. **Start the development servers**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Smart contracts (optional)
cd smart-contracts
npx hardhat node
```

## 📱 Usage

### Connecting Your Wallet
1. Click "Connect Wallet" in the top right
2. Select MetaMask or your preferred wallet
3. Approve the connection request
4. The app will automatically switch to Polygon Amoy Testnet

### Making Predictions
1. View the current AI prediction (UP/DOWN arrow)
2. Choose your stake amount (minimum 1 MATIC)
3. Click "FOLLOW AI" to agree with the prediction
4. Click "COUNTER AI" to bet against the prediction
5. Confirm the transaction in your wallet

### Claiming Rewards
- Rewards are automatically calculated after each round
- Winners can claim their share of the losing pool
- Losers receive 20% cashback automatically
- Check the "Recent Results" section for your performance

## 🏗 Smart Contract Architecture

### Core Contracts

#### PredixAI.sol
- Main prediction market contract
- Handles betting, round management, and rewards
- Integrates with Chainlink price feeds

#### PredixAIOracle.sol
- AI prediction oracle contract
- Stores and manages AI predictions
- Provides prediction data to main contract

#### PredixAIFactory.sol
- Factory contract for creating new prediction markets
- Manages multiple market instances
- Handles deployment and configuration

### Contract Addresses (Polygon Amoy)
- **PredixAI**: `0x946C1BeAa17fCb39053dA252dd018d02fE22F944`
- **PredixAIOracle**: `0xD59036D4c03fa24b596Cd9D9164f2f2D8f41639B`
- **PredixAIFactory**: `0x536d8626AdF6aa721c747dfC8aBB9dE575D929b6`

## 🔧 Development

### Project Structure
```
predix-ai-stake/
├── src/                    # Frontend React application
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   └── lib/               # Utilities and configurations
├── backend/               # Express.js backend server
│   └── src/               # Backend source code
├── smart-contracts/       # Solidity smart contracts
│   ├── contracts/         # Contract source files
│   ├── scripts/           # Deployment scripts
│   └── test/              # Contract tests
└── public/                # Static assets
```

### Available Scripts

#### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

#### Backend
```bash
npm run dev          # Start development server with nodemon
npm run build        # Compile TypeScript
npm start            # Start production server
```

#### Smart Contracts
```bash
npx hardhat compile  # Compile contracts
npx hardhat test     # Run tests
npx hardhat deploy   # Deploy to network
npx hardhat verify   # Verify on block explorer
```

## 🧪 Testing

### Frontend Testing
```bash
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
```

### Smart Contract Testing
```bash
cd smart-contracts
npx hardhat test     # Run all contract tests
npx hardhat coverage # Generate coverage report
```

## 🚀 Deployment

### Frontend Deployment (Vercel)
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main branch

### Backend Deployment
1. Deploy to your preferred cloud provider (Railway, Heroku, etc.)
2. Set environment variables
3. Ensure CORS is configured for your frontend domain

### Smart Contract Deployment
```bash
cd smart-contracts
npx hardhat run scripts/deploy.js --network amoy
npx hardhat verify CONTRACT_ADDRESS --network amoy
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [https://predix-ai-stake.vercel.app/](https://predix-ai-stake.vercel.app/)
- **Lovable Project**: [https://lovable.dev/projects/c275b67f-fe38-40bc-b379-c7156bc4b9bb](https://lovable.dev/projects/c275b67f-fe38-40bc-b379-c7156bc4b9bb)
- **Polygon Amoy Explorer**: [https://amoy.polygonscan.com/](https://amoy.polygonscan.com/)
- **Documentation**: [Coming Soon]

## ⚠️ Disclaimer

This is a testnet application for demonstration purposes only. Do not use real funds. Always DYOR (Do Your Own Research) before participating in any prediction markets or DeFi protocols.

---

**Built with ❤️ for the future of DeFi** | **Powered by AI & Blockchain Technology**
