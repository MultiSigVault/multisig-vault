[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.70%2B-orange)](https://www.rust-lang.org/)
[![Soroban](https://img.shields.io/badge/Soroban-25.1.0-purple)](https://soroban.stellar.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-00BFFF)](https://stellar.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![GitHub stars](https://img.shields.io/github/stars/MultiSigVault/multisig-vault)](https://github.com/MultiSigVault/multisig-vault/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/MultiSigVault/multisig-vault)](https://github.com/MultiSigVault/multisig-vault/issues)

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
| Node.js | 18.x+ | [nodejs.org](https://nodejs.org/) |
| Rust | 1.70+ | [rustup.rs](https://rustup.rs/) |
| PostgreSQL | 15.x+ | [postgresql.org](https://www.postgresql.org/) |
| Freighter Wallet | Latest | [freighter.app](https://www.freighter.app/) |

---

## 🚀 Getting Started

### Clone the Repository

```bash
git clone https://github.com/MultiSigVault/multisig-vault.git
cd multisig-vault

Backend Setup
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run typeorm migration:run
npm run start:dev
Backend will run at: http://localhost:3001
API Docs: http://localhost:3001/api/v1/docs

Frontend Setup
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your backend URL
npm run dev
Frontend will run at: http://localhost:3000
Smart Contract Setup
cd contract
cargo build --target wasm32-unknown-unknown --release
cargo test
# Deploy to testnet (requires soroban CLI)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/multisig_vault_contract.wasm \
  --network testnet

  📜 Smart Contract
Contract Functions
Function	Description	Auth Required
create_vault	Create new multi-sig vault	Creator
submit_transaction	Propose a new transaction	Any signer
approve_transaction	Approve a pending transaction	Signer
revoke_approval	Revoke an existing approval	Signer
execute_transaction	Execute after threshold met	Anyone
set_spending_policy	Set limits per signer	Admin
add_guardian	Add recovery guardian	Admin
initiate_recovery	Start key recovery process	Any guardian
create_timelock	Add time delay to transaction	Proposer
schedule_transaction	Set recurring payment	Admin
Contract Errors
Error	Code	Description
NotAuthorized	1	Only authorized participants
VaultNotFound	2	Vault ID does not exist
TransactionNotFound	3	Transaction ID does not exist
InsufficientApprovals	4	Not enough approvals yet
ThresholdTooHigh	6	Threshold exceeds signer count
PolicyViolation	16	Spending limit exceeded
TimeLockActive	17	Time lock not expired
ScheduleNotReady	19	Scheduled transaction not ready

📚 API Documentation
Full API documentation is available via Swagger at:
http://localhost:3001/api/v1/docs

API Endpoints
Method	Endpoint	Description
POST	/api/v1/vaults	Create vault
GET	/api/v1/vaults	List user vaults
GET	/api/v1/vaults/:id	Get vault details
POST	/api/v1/vaults/:vaultId/transactions	Submit transaction
POST	/api/v1/vaults/:vaultId/transactions/:transactionId/approve	Approve transaction
POST	/api/v1/vaults/:vaultId/transactions/:transactionId/execute	Execute transaction
GET	/api/v1/vaults/:vaultId/transactions/stats	Get transaction stats
POST	/api/v1/users/auth/login	Authenticate with wallet
GET	/api/v1/users/profile	Get user profile
🧪 Testing
Backend Tests
bash
cd backend
# Unit tests
npm run test
# With coverage
npm run test:cov
# E2E tests
npm run test:e2e
Contract Tests
bash
cd contract
# Run all tests
cargo test
# Run with output
cargo test -- --nocapture
# Run specific test
cargo test test_vault_creation -- --exact
Frontend Tests
bash
cd frontend
npm run test
npm run test:watch
🐳 Docker
Using Docker Compose
bash
# Start all services (PostgreSQL, Redis, Backend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
Docker Commands
bash
# Build backend image
docker build -t multisig-vault-backend ./backend

# Run backend container
docker run -p 3001:3001 --env-file .env multisig-vault-backend
🤝 Contributing
We welcome contributions! Please follow these guidelines:

Commit Convention
Type	Description	Example
feat	New feature	feat: add spending policy limits
fix	Bug fix	fix: correct threshold validation
docs	Documentation	docs: update API swagger
style	Code style	style: format with prettier
refactor	Code refactor	refactor: optimize storage queries
test	Testing	test: add recovery edge cases
chore	Maintenance	chore: update dependencies
Pull Request Process
Fork the repository

Create a feature branch (git checkout -b feat/amazing-feature)

Commit your changes using conventional commits

Push to the branch (git push origin feat/amazing-feature)

Open a Pull Request

🔒 Security
Reporting Vulnerabilities
Do NOT open public issues for security vulnerabilities.

Please email: security@multisigvault.com

We will respond within 48 hours.

Security Best Practices
✅ Never commit .env files

✅ Always use environment variables for secrets

✅ Validate all user inputs

✅ Use 2FA for admin operations

✅ Regular security audits

✅ Keep dependencies updated

🏆 Drips Wave Program
This project participates in the Stellar Drips Wave Program!

Bounty Categories
Difficulty	Points	Example Issues
🟢 Easy	100	UI fixes, documentation improvements, test coverage
🟡 Medium	150	API endpoints, policy system enhancements, analytics
🔴 Hard	200	Multi-sig logic optimizations, recovery system, ZK proofs
How to Claim Bounties
Find an issue labeled drips-wave

Comment @drips-bot claim to claim it

Submit your PR with the solution

Get reviewed and merged

Receive XLM rewards!

Current Open Bounties
Add support for custom tokens (200 pts)

Implement batch transactions (150 pts)

Add notification system (100 pts)

Improve mobile responsiveness (100 pts)

Add more test coverage (150 pts)

📄 License
MIT License - See LICENSE file for details.

🙏 Acknowledgments
Stellar Development Foundation for Soroban

Freighter Wallet for excellent wallet integration

All contributors who make this project possible

📞 Contact
Platform	Link
🌐 Website	multisigvault.com
🐦 Twitter	@MultiSigVault
💬 Discord	discord.gg/multisigvault
📧 Email	team@multisigvault.com
⭐ Star History
https://api.star-history.com/svg?repos=MultiSigVault/multisig-vault&type=Date

Built with ❤️ on Stellar Soroban | Secure Treasury Management for DAOs and Teams
