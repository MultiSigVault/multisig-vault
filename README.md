# 🔐 MultiSig Vault

### A production-ready multi-signature treasury vault for DAOs and teams on Stellar Soroban

**Secure | Decentralized | Transparent**

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Smart Contract](#-smart-contract)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Docker](#-docker)
- [Contributing](#-contributing)
- [Security](#-security)
- [Drips Wave Program](#-drips-wave-program)
- [License](#-license)

---

## 🎯 Overview

**MultiSig Vault** is a decentralized treasury management platform built on Stellar Soroban that requires multiple approvals before funds can be moved. Perfect for DAOs, teams, and organizations that need secure, transparent fund management.

### Use Cases

| Use Case | Description |
|----------|-------------|
| 🏢 **DAO Treasuries** | Manage community funds with multi-sig governance |
| 👥 **Team Operations** | Payroll, expenses, and subscriptions with approval workflow |
| 💰 **Investment Clubs** | Pool funds with collective decision-making |
| 🎯 **Grant Programs** | Disburse grants with multi-party approval |
| 🏦 **Community Funds** | Transparent management of community resources |

---

## 🛠 Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Smart Contract** | Rust (Soroban SDK) | 25.1.0 |
| **Backend Framework** | NestJS | 10.x |
| **Backend Language** | TypeScript | 5.x |
| **Frontend Framework** | Next.js | 14.2 |
| **Frontend Language** | TypeScript | 5.x |
| **Database** | PostgreSQL | 15.x |
| **ORM** | TypeORM | 0.3.x |
| **Wallet** | Freighter API | 1.7.1 |
| **Testing** | Jest | 29.x |
| **Blockchain** | Stellar Soroban | - |

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Multi-Signature Escrow** | 2-of-3, 3-of-5, or custom approval thresholds |
| 📊 **Spending Policies** | Per-signer daily, weekly, monthly limits |
| ⏰ **Time-Locked Withdrawals** | Large transfers require waiting period |
| 📅 **Scheduled Payments** | Recurring payroll, subscriptions, or one-time future payments |
| 👨‍👩‍👧‍👦 **Social Recovery** | Guardian-based key recovery system |
| 📝 **Audit Log** | IPFS-backed immutable transaction history |
| 🛡️ **Emergency Override** | 2FA-protected emergency procedures |
| 📈 **Analytics Dashboard** | Real-time treasury metrics and insights |

---

## 📁 Project Structure

multisig-vault/
├── contract/ # Rust Soroban Smart Contract (8,000+ lines)
│ ├── src/
│ │ ├── lib.rs # Main contract entry with all traits
│ │ ├── vault.rs # Vault creation and management
│ │ ├── transaction.rs # Transaction submission and approval
│ │ ├── policy.rs # Spending policies per signer
│ │ ├── recovery.rs # Social recovery system
│ │ ├── timelock.rs # Time-locked withdrawals
│ │ ├── scheduled.rs # Scheduled/recurring payments
│ │ ├── audit.rs # Audit log with IPFS
│ │ └── test.rs # Comprehensive tests (100+ test cases)
│ └── Cargo.toml # Rust dependencies
│
├── backend/ # NestJS Backend API (12,000+ lines)
│ ├── src/
│ │ ├── main.ts # Application entry point
│ │ ├── app.module.ts # Root module with all imports
│ │ ├── config/ # Database and app configuration
│ │ ├── common/ # Shared guards, interceptors, pipes
│ │ └── modules/
│ │ ├── users/ # User authentication and management
│ │ ├── vaults/ # Vault CRUD operations
│ │ └── transactions/ # Transaction tracking and approval
│ ├── package.json
│ ├── tsconfig.json
│ ├── Dockerfile
│ └── docker-compose.yml
│
├── frontend/ # Next.js Dashboard (8,000+ lines)
│ ├── src/
│ │ ├── app/
│ │ │ ├── layout.tsx # Root layout with providers
│ │ │ ├── page.tsx # Landing page with hero section
│ │ │ ├── vaults/ # Vault listing and detail pages
│ │ │ └── transactions/ # Transaction history
│ │ ├── components/
│ │ │ ├── wallet/ # Freighter wallet integration
│ │ │ ├── vault/ # Vault cards and forms
│ │ │ └── ui/ # Reusable UI components
│ │ ├── lib/ # Stellar SDK utilities
│ │ └── styles/ # Tailwind CSS styles
│ ├── package.json
│ ├── tailwind.config.js
│ └── next.config.js
│
├── mobile/ # React Native (optional future)
│
├── .github/
│ └── workflows/ # CI/CD pipelines
│ ├── contract-ci.yml # Rust contract tests and deployment
│ ├── backend-ci.yml # NestJS tests and build
│ └── frontend-ci.yml # Next.js tests and build
│
├── .gitignore
├── LICENSE
└── README.md

---

## 📋 Prerequisites

| Requirement | Version | Installation |
|-------------|---------|--------------|
| Node.js | 18.x+ | https://nodejs.org/ |
| Rust | 1.70+ | https://rustup.rs/ |
| PostgreSQL | 15.x+ | https://www.postgresql.org/ |
| Freighter Wallet | Latest | https://www.freighter.app/ |

---

## 🚀 Getting Started

### Clone the Repository

```bash
git clone https://github.com/MultiSigVault/multisig-vault.git
cd multisig-vault
```

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run typeorm migration:run
npm run start:dev
```

Backend will run at: http://localhost:3001  
API Docs: http://localhost:3001/api/v1/docs

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend will run at: http://localhost:3000

### Smart Contract Setup

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
cargo test
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/multisig_vault_contract.wasm \
  --network testnet
```

---

## 📜 Smart Contract

### Contract Functions

| Function | Description | Auth Required |
|----------|------------|---------------|
| create_vault | Create new multi-sig vault | Creator |
| submit_transaction | Propose a new transaction | Any signer |
| approve_transaction | Approve a pending transaction | Signer |
| revoke_approval | Revoke an existing approval | Signer |
| execute_transaction | Execute after threshold met | Anyone |
| set_spending_policy | Set limits per signer | Admin |
| add_guardian | Add recovery guardian | Admin |
| initiate_recovery | Start key recovery process | Any guardian |
| create_timelock | Add time delay to transaction | Proposer |
| schedule_transaction | Set recurring payment | Admin |

### Contract Errors

| Error | Code | Description |
|-------|------|------------|
| NotAuthorized | 1 | Only authorized participants |
| VaultNotFound | 2 | Vault ID does not exist |
| TransactionNotFound | 3 | Transaction ID does not exist |
| InsufficientApprovals | 4 | Not enough approvals yet |
| ThresholdTooHigh | 6 | Threshold exceeds signer count |
| PolicyViolation | 16 | Spending limit exceeded |
| TimeLockActive | 17 | Time lock not expired |
| ScheduleNotReady | 19 | Scheduled transaction not ready |

---

## 📚 API Documentation

http://localhost:3001/api/v1/docs

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm run test
npm run test:cov
npm run test:e2e
```

### Contract Tests

```bash
cd contract
cargo test
cargo test -- --nocapture
cargo test test_vault_creation -- --exact
```

### Frontend Tests

```bash
cd frontend
npm run test
npm run test:watch
```

---

## 🐳 Docker

```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

---

## 🤝 Contributing

### Commit Convention

| Type | Description | Example |
|------|------------|---------|
| feat | New feature | feat: add spending policy limits |
| fix | Bug fix | fix: correct threshold validation |
| docs | Documentation | docs: update API swagger |
| style | Code style | style: format with prettier |
| refactor | Code refactor | refactor: optimize storage queries |
| test | Testing | test: add recovery edge cases |
| chore | Maintenance | chore: update dependencies |

### Pull Request Process

1. Fork the repository  
2. Create a feature branch  
3. Commit your changes  
4. Push to your branch  
5. Open a Pull Request  

---

## 🔒 Security

### Reporting Vulnerabilities

Do NOT open public issues for security vulnerabilities.  
Email: security@multisigvault.com  

### Best Practices

- Never commit `.env` files  
- Use environment variables  
- Validate all inputs  
- Enable 2FA  
- Perform audits regularly  

---

## 🏆 Drips Wave Program

### Bounty Categories

| Difficulty | Points |
|-----------|--------|
| Easy | 100 |
| Medium | 150 |
| Hard | 200 |

### How to Claim

1. Find issue labeled `drips-wave`  
2. Comment `@drips-bot claim`  
3. Submit PR  
4. Get rewarded  

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 📞 Contact

- Website: multisigvault.com  
- Twitter: @MultiSigVault  
- Discord: discord.gg/multisigvault  
- Email: team@multisigvault.com  

---

Built with ❤️ on Stellar Soroban
