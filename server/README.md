# Hybrid Blockchain Certificate Authority

A modern Web3-enabled Certificate Authority (CA) built with Next.js, Prisma, and Solidity. This system combines the speed and usability of a traditional Web2 backend with the immutability and transparency of a Smart Contract on the Avalanche Fuji Testnet.

## Core Architecture

This project uses a hybrid approach:

- **Off-chain (Prisma/SQLite)**: Manages users, login sessions, and private keys securely. Handles heavy cryptographic operations (RSA key generation, CSR signing) using `node-forge`.
- **On-chain (Avalanche Fuji)**: The `CertificateRegistry.sol` smart contract acts as an immutable public ledger. It stores hashes of Certificate Signing Requests (CSRs), issued Certificates, and maintains a transparent Certificate Revocation List (CRL).

### Deterministic Wallet Generation

The system utilizes a deterministic wallet mechanism for the CA root. Instead of manually managing a MetaMask wallet for the backend, the system derives an `ethers.Wallet` directly from the `caConfig.rootKeyPem` (the CA's root private key). All admin actions on-chain are signed and executed seamlessly by this derived CA Root Wallet.

## Tech Stack

- **Frontend/Backend**: Next.js (App Router), TailwindCSS, DaisyUI
- **Cryptography**: `node-forge`, `ethers.js`
- **Database**: Prisma ORM, Better-SQLite3
- **Smart Contracts**: Solidity, Foundry

## Prerequisites

- Node.js (v18+)
- Yarn or npm
- Foundry

## Setup & Installation

### 1. Web Application Setup

```bash
# Install dependencies
yarn install  # or npm install

# Generate Prisma Client
yarn db:generate

# Copy `.env.example` to `.env` in the `server` root:
cp .env.example .env

# Push schema to SQLite database
yarn db:push

# Seed the database (creates default CA config and admin user)
yarn db:seed
```

Ensure you have the RPC URL and (optionally) your deployer private key set up.

### 2. Smart Contract Deployment

The smart contract must be deployed to the Avalanche Fuji Testnet.

```bash
cd smart-contracts

# Compile the contract
forge build

# Deploy (replace $PRIVATE_KEY with your deployer wallet private key)
forge script script/DeployCertificateRegistry.s.sol --rpc-url https://api.avax-test.network/ext/bc/C/rpc --broadcast --private-key $PRIVATE_KEY
```

**Important**: Note the deployed `CertificateRegistry` address from the output and update your `CERTIFICATE_REGISTRY_ADDRESS` in `.env`.

### 3. Authorize the CA Root Wallet

Because the backend uses a deterministic CA Root wallet, you must authorize this wallet on your deployed smart contract.

1. Start the web server and log in as admin (`admin` / `admin123`) to view the "Ví Admin" (Admin Wallet) address on the top navbar.
2. Using your deployer private key, grant admin rights to the CA Root Wallet:

```bash
cast send <YOUR_DEPLOYED_CONTRACT_ADDRESS> "addAdmin(address)" <CA_ROOT_WALLET_ADDRESS> --rpc-url https://api.avax-test.network/ext/bc/C/rpc --private-key $PRIVATE_KEY
```

## Running Locally

Start the Next.js development server:

```bash
npm run dev
```

- Access the app at: `http://localhost:3000`
- **Default Admin Account**:
  - Username: `admin`
  - Password: `admin123`
