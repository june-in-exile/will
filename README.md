# Web3 Will System

A blockchain-based will management system that utilizes Permit2, CREATE2, Zero-Knowledge Proofs (ZKP), and IPFS to handle on-chain estates left by testators.

## 🏗️ Project Architecture

```
will-project/
├── apps/
│   ├── frontend/          # React + Vite frontend application
│   └── backend/           # Node.js + Express backend API
├── contracts/             # Foundry smart contracts
├── zkp/                   # Circom zero-knowledge proofs
├── shared/                # Shared code (types, utilities, constants)
└── package.json           # Root dependency management
```

## 🚀 Quick Start

### Prerequisites

Ensure you have the following tools installed:

- **Node.js** (v18+)
- **pnpm** (recommended package manager)
- **Foundry** (Solidity development toolkit)
- **Circom** (Zero-knowledge circuit compiler)

```bash
# Install pnpm
npm install -g pnpm

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install Circom (macOS)
brew install circom
```

### Installation and Setup

1. **Clone the repository**

```bash
git clone https://github.com/june-in-exile/will.git
cd will
```

2. **Install dependencies & generate ZKP & build smart contracts**

```bash
pnpm install
pnpm build
```

3. **Start development environment**

```bash
# Start both frontend and backend
pnpm dev

# Or start separately
pnpm dev:frontend  # http://localhost:5173
pnpm dev:backend   # http://localhost:3001
```

## 📝 Available Commands

### Development Commands

```bash
# Development mode
pnpm dev                  # Start both frontend and backend
pnpm dev:frontend         # Start frontend only (Vite)
pnpm dev:backend          # Start backend only (Node.js)

# Build
pnpm build                # Build all modules
pnpm build:frontend       # Build frontend
pnpm build:backend        # Build backend
pnpm build:contracts      # Compile smart contracts

# Code quality
pnpm type-check            # TypeScript type checking
pnpm lint                 # ESLint code checking
pnpm lint --fix           # Auto-fix ESLint issues
pnpm format               # Prettier formatting

# Cleanup
pnpm clean                # Clean all build artifacts
```

### Dependency Management

```bash
# Check outdated dependencies
pnpm deps:check

# Update all dependencies to latest versions
pnpm deps:update

# Security audit
pnpm deps:audit

# Clean and reinstall dependencies
pnpm deps:clean
```

## 🔧 Project Configuration

### Environment Variables

Copy the `.env.example` file as `.env`:

```bash
cp .env.example .env
```

Fill in the fields required to interact with the contracts:

```bash
ARB_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
ARBSCAN_API_KEY=YOUR_ARBSCAN_API_KEY

EXECUTOR=0x_YOUR_EXECUTOR_ADDRESS
EXECUTOR_PRIVATE_KEY=YOUR_EXECUTOR_PRIVATE_KEY_WITHOUT_0X

TESTATOR=0x_YOUR_TESTATOR_ADDRESS
TESTATOR_PRIVATE_KEY=YOUR_TESTATOR_PRIVATE_KEY_WITHOUT_0X
```

Fill in the fields required to interact with IPFS:

```bash
PINATA_JWT=YOUR_PINATA_JWT_TOKEN
```

The other fileds would be automatically updated during the execution.

## 🏗️ System Architecture

### Frontend (React + Vite)

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: CSS Modules
- **State Management**: React Hooks
- **Web3 Integration**: ethers.js + Permit2 SDK

### Backend (Node.js + Express)

- **Runtime**: Node.js (ESM)
- **Framework**: Express
- **Language**: TypeScript
- **Encryption**: Symmetric encryption + Zero-knowledge proofs
- **Storage**: IPFS + Pinata

### Smart Contracts (Solidity + Foundry)

- **Development Framework**: Foundry
- **Testing**: Forge
- **Deployment**: Forge Script
- **Features**: CREATE2, Permit2 integration

### Zero-Knowledge Proofs (Circom)

- **Circuit Language**: Circom
- **Proving System**: Groth16
- **Purpose**: Private content verification and format validation

## 🚨 Troubleshooting

### Common Issues

1. **TypeScript module resolution errors**

```bash
# Clean and reinstall
pnpm clean
pnpm install
```

2. **ESLint parsing errors**

```bash
# Check ESLint configuration
pnpm lint --debug
```

3. **Smart contract compilation failures**

```bash
# Clean Foundry cache
cd contracts && forge clean && forge build
```

4. **Deprecated dependency warnings**

```bash
# Check and update dependencies
pnpm deps:check
pnpm deps:update
```

### Project Reset

```bash
# Complete reset
pnpm clean
pnpm deps:clean
cd contracts && forge clean
cd zkp && make clean
cd apps/backend && make clean
pnpm install
pnpm build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [Foundry](https://github.com/foundry-rs/foundry) - Smart contract development toolkit
- [Circom](https://github.com/iden3/circom) - Zero-knowledge circuit compiler
- [IPFS](https://ipfs.io/) - Decentralized storage
- [Vite](https://vitejs.dev/) - Fast build tool
- [Permit2](https://github.com/Uniswap/permit2) - Token approval system