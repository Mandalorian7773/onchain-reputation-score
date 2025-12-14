# On-Chain Reputation System

A decentralized reputation system that generates verifiable developer profiles from public data sources (GitHub, LeetCode, wallet activity) and anchors them on Polygon blockchain for trustless verification.

## 🚀 Features

- **Deterministic Scoring**: Reproducible reputation scores from public data
- **Blockchain Anchoring**: Profile hashes stored on Polygon Amoy for immutable verification
- **Trustless Verification**: Anyone can independently verify profiles without trusting the backend
- **Multi-Source Analysis**: GitHub repositories, LeetCode solutions, wallet persistence
- **AI-Powered Insights**: Role fit assessment and anomaly detection

## 🛠 Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Polygon Amoy testnet wallet with MATIC

### Backend Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```

3. **Update .env with your values**
   ```env
   # MongoDB
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
   
   # Smart Contract (Polygon Amoy)
   ANCHOR_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
   CONTRACT_ADDRESS=0xfe89992DFc79612745D2Adf9755Bb5fcDD9574a6
   ```

4. **Generate a backend wallet**
   ```bash
   node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
   ```

5. **Fund the wallet**
   - Get testnet MATIC from: https://faucet.polygon.technology/
   - Select "Polygon Amoy" network

6. **Start the backend**
   ```bash
   npm start
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**
   ```bash
   # Update frontend/.env
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```

3. **Start the frontend**
   ```bash
   npm start
   ```

## 🔗 Smart Contract

- **Network**: Polygon Amoy Testnet
- **Contract**: `0xfe89992DFc79612745D2Adf9755Bb5fcDD9574a6`
- **Explorer**: https://amoy.polygonscan.com/address/0xfe89992DFc79612745D2Adf9755Bb5fcDD9574a6

## 🧪 How Verification Works

1. **Profile Creation**: Public data → Deterministic scoring → Hash generation → Blockchain anchoring
2. **Verification**: Re-fetch data → Recompute hash → Compare with on-chain anchors
3. **Trustless**: No need to trust the backend database - everything verifiable from blockchain + public APIs

## 🎯 Usage

1. **Generate Profile**: Enter GitHub/LeetCode username or wallet address
2. **View Results**: See deterministic scores and AI insights
3. **Verify Profile**: Click "Verify" to independently validate the profile
4. **Share**: Profile URLs are shareable and independently verifiable

## 🔧 API Endpoints

- `POST /api/profile` - Generate new profile
- `GET /api/profile/:profileId` - Get existing profile
- `GET /api/anchors/:profileId` - Get on-chain anchors
- `GET /api/verify/:profileId` - Verify profile integrity
