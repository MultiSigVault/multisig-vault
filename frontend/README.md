# MultiSig Vault Frontend

[![Next.js](https://img.shields.io/badge/Next.js-14.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC)](https://tailwindcss.com/)
[![Stellar SDK](https://img.shields.io/badge/Stellar_SDK-11.0-purple)](https://stellar.github.io/js-stellar-sdk/)

## 🚀 Overview

The MultiSig Vault Frontend is a modern, responsive web application for managing multi-signature wallets on the Stellar blockchain. Built with Next.js 14, TypeScript, and Tailwind CSS, it provides a seamless interface for creating and managing secure multi-signature vaults.

## ✨ Features

- **Wallet Integration**: Connect with Freighter wallet
- **Vault Management**: Create, view, and manage multi-signature vaults
- **Transaction Management**: Create, approve, and execute transactions
- **Real-time Updates**: Live balance and transaction status updates
- **Security Policies**: Configure daily limits, allowed assets, and custom rules
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark Mode Ready**: Built-in dark mode support

## 📋 Prerequisites

- Node.js 18+ or Bun 1.0+
- Freighter wallet extension installed
- Stellar account with testnet tokens (for development)

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/your-org/multisig-vault.git
cd multisig-vault/frontend

# Install dependencies
bun install
# or
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
bun run dev
# or
npm run dev

🔧 Environment Variables
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_CONTRACT_ID=your_contract_id
NEXT_PUBLIC_API_URL=http://localhost:3001

📁 Project Structure
frontend/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── vaults/         # Vault management pages
│   │   ├── transactions/   # Transaction history
│   │   └── api/            # API routes
│   ├── components/         # React components
│   │   ├── ui/            # Reusable UI components
│   │   ├── vault/         # Vault-specific components
│   │   └── wallet/        # Wallet integration
│   ├── lib/               # Utilities and libraries
│   │   ├── stellar/       # Stellar SDK utilities
│   │   └── utils/         # Helper functions
│   ├── hooks/             # Custom React hooks
│   ├── contexts/          # React contexts
│   └── styles/            # Global styles
├── public/                # Static assets
└── package.json          # Dependencies

🚦 Usage
Connect Wallet
Install Freighter wallet

Click "Connect Wallet" button

Approve connection in Freighter

Create Vault
Navigate to "Create Vault"

Fill in vault details (name, signers, threshold)

Configure security policies

Deploy vault contract

Create Transaction
Select a vault

Click "New Transaction"

Enter destination, amount, and asset

Submit for approval

Approve Transaction
Go to pending transactions

Review transaction details

Click "Approve" or "Reject"

Sign with Freighter
🧪 Testing
# Run unit tests
bun run test

# Run e2e tests
bun run test:e2e

# Run with coverage
bun run test:coverage
🏗️ Building for Production
# Create production build
bun run build

# Start production server
bun run start
📦 Deployment
Vercel (Recommended)
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

Docker
# Build Docker image
docker build -t multisig-vault-frontend .

# Run container
docker run -p 3000:3000 multisig-vault-frontend
🔒 Security Best Practices
Always verify transaction details before signing

Use hardware wallets for large holdings

Regularly audit signer permissions

Implement rate limiting for API routes

Use environment variables for sensitive data

Keep dependencies updated

🤝 Contributing
Fork the repository

Create feature branch (git checkout -b feature/amazing)

Commit changes (git commit -m 'Add amazing feature')

Push to branch (git push origin feature/amazing)

Open Pull Request

📄 License
MIT © 2024 MultiSig Vault

🌟 Support
Documentation: docs.multisigvault.com

Discord: discord.gg/multisigvault

Twitter: @MultiSigVault