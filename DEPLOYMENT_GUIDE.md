# PREDIX AI Deployment Guide

## Overview
This guide covers the complete deployment of PREDIX AI on Polygon 2.0 Amoy Testnet and Mainnet.

## Prerequisites

### System Requirements
- Node.js 18+
- Python 3.9+
- Git
- Docker (optional)

### Required Accounts & Keys
- Polygon wallet with POL tokens
- Supabase account
- CoinGecko API key (optional)
- Chainlink price feed access

## Environment Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd predix-ai
```

### 2. Install Dependencies
```bash
# Root dependencies
npm install

# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../frontend-predix && npm install

# AI Engine dependencies
cd ../ai-engine && pip install -r requirements.txt

# Smart contracts dependencies
cd ../contracts && npm install
```

### 3. Environment Variables

#### Backend (.env)
```env
# Server Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-domain.com

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Blockchain
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key
CHAINLINK_POL_USD_FEED=0x001382149eBa3441043c1c66972b4772963f5D43

# AI Engine
AI_ENGINE_URL=http://localhost:8000
AI_ENGINE_API_KEY=your_ai_api_key

# Security
JWT_SECRET=your_jwt_secret_key
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_WS_URL=wss://your-api-domain.com

# Contract Addresses (populated after deployment)
NEXT_PUBLIC_ROUND_MANAGER_ADDRESS=
NEXT_PUBLIC_PREDICTION_POOL_ADDRESS=
NEXT_PUBLIC_ORACLE_HANDLER_ADDRESS=
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS=
NEXT_PUBLIC_AI_ORACLE_ADAPTER_ADDRESS=
```

#### AI Engine (.env)
```env
# Model Configuration
MODEL_PATH=models/predix_lstm_model.h5
SEQUENCE_LENGTH=60
FEATURE_COUNT=20
CONFIDENCE_THRESHOLD=0.6
MAX_CONSECUTIVE_LOSSES=5
EMERGENCY_STOP_THRESHOLD=0.3

# Data Sources
COINGECKO_API_KEY=your_coingecko_api_key
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key

# Blockchain
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_ai_operator_private_key
```

## Deployment Steps

### 1. Deploy Smart Contracts

#### Testnet Deployment
```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network amoy
```

#### Mainnet Deployment
```bash
npx hardhat run scripts/deploy.js --network polygon
```

### 2. Setup Database

#### Create Supabase Tables
```sql
-- Rounds table
CREATE TABLE rounds (
  id SERIAL PRIMARY KEY,
  round_id INTEGER UNIQUE NOT NULL,
  ai_prediction INTEGER NOT NULL,
  signature_hash VARCHAR(66) NOT NULL,
  start_time TIMESTAMP,
  voting_end_time TIMESTAMP,
  freeze_end_time TIMESTAMP,
  resolution_time TIMESTAMP,
  start_price DECIMAL(20,8),
  end_price DECIMAL(20,8),
  phase VARCHAR(20) DEFAULT 'voting',
  resolved BOOLEAN DEFAULT false,
  winning_direction INTEGER,
  total_follow_stake DECIMAL(30,18) DEFAULT '0',
  total_counter_stake DECIMAL(30,18) DEFAULT '0',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User stakes table
CREATE TABLE user_stakes (
  id SERIAL PRIMARY KEY,
  round_id INTEGER NOT NULL,
  user_address VARCHAR(42) NOT NULL,
  amount DECIMAL(30,18) NOT NULL,
  direction INTEGER NOT NULL,
  claimed BOOLEAN DEFAULT false,
  reward DECIMAL(30,18) DEFAULT '0',
  transaction_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Predictions table
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  round_id INTEGER NOT NULL,
  direction INTEGER NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  features_hash VARCHAR(64),
  signature_hash VARCHAR(64),
  model_version VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rounds_round_id ON rounds(round_id);
CREATE INDEX idx_user_stakes_round_user ON user_stakes(round_id, user_address);
CREATE INDEX idx_predictions_round_id ON predictions(round_id);
```

### 3. Deploy AI Engine

#### Using Docker
```bash
cd ai-engine
docker build -t predix-ai-engine .
docker run -d --name predix-ai -p 8000:8000 --env-file .env predix-ai-engine
```

#### Direct Deployment
```bash
cd ai-engine
python main.py
```

### 4. Deploy Backend API

#### Using PM2
```bash
cd backend
npm install -g pm2
pm2 start src/server.ts --name predix-api --interpreter ts-node
pm2 save
pm2 startup
```

#### Using Docker
```bash
cd backend
docker build -t predix-backend .
docker run -d --name predix-api -p 3001:3001 --env-file .env predix-backend
```

### 5. Deploy Frontend

#### Vercel Deployment
```bash
cd frontend-predix
npm run build
vercel --prod
```

#### Netlify Deployment
```bash
npm run build
netlify deploy --prod --dir=.next
```

## Post-Deployment Configuration

### 1. Update Contract Addresses
Update all environment variables with deployed contract addresses.

### 2. Initialize AI Model
```bash
# Train initial model with historical data
curl -X POST http://your-ai-engine/model/train
```

### 3. Start Automated Rounds
```bash
# Enable automated round creation
curl -X POST http://your-backend/api/admin/start-automation
```

### 4. Verify System Health
```bash
# Check all services
curl http://your-backend/api/health/detailed
curl http://your-ai-engine/health
```

## Monitoring & Maintenance

### Health Checks
- Backend API: `/api/health/detailed`
- AI Engine: `/health`
- Smart Contracts: Monitor via blockchain explorer

### Key Metrics to Monitor
- Round completion rate
- AI prediction accuracy
- User participation
- Transaction success rate
- System uptime

### Backup Procedures
- Database: Automated Supabase backups
- AI Models: Regular model checkpoints
- Configuration: Version-controlled environment files

## Security Considerations

### Smart Contract Security
- Multi-signature wallet for contract ownership
- Time-locked upgrades
- Regular security audits

### API Security
- Rate limiting enabled
- JWT authentication
- HTTPS only
- Input validation

### AI Engine Security
- Secure model storage
- Encrypted API communications
- Signature verification for predictions

## Troubleshooting

### Common Issues

#### Contract Deployment Fails
- Check POL balance for gas fees
- Verify RPC endpoint connectivity
- Ensure correct network configuration

#### AI Engine Not Responding
- Check model file existence
- Verify data source connectivity
- Review error logs

#### Frontend Connection Issues
- Verify contract addresses
- Check RPC endpoint
- Confirm wallet network

### Support Contacts
- Technical Issues: tech@predix.ai
- Smart Contract: contracts@predix.ai
- AI Engine: ai@predix.ai

## Scaling Considerations

### High Traffic Handling
- Load balancer for API endpoints
- Redis caching for frequently accessed data
- CDN for frontend assets

### Multi-Region Deployment
- Geographically distributed API servers
- Regional database replicas
- Edge computing for AI predictions

This completes the PREDIX AI deployment guide. The system is now ready for production use on Polygon 2.0!
