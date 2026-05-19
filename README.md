# MultiSig Vault

A production-ready multi-signature treasury vault for DAOs and teams on Stellar Soroban.

## 📋 Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Smart Contract](#smart-contract)
- [Backend API](#backend-api)
- [Frontend Dashboard](#frontend-dashboard)
- [Development](#development)
- [Testing](#testing)
- [Docker](#docker)
- [Contributing](#contributing)
- [Security](#security)
- [Support](#support)
- [License](#license)

## 🎯 Overview

MultiSig Vault is a decentralized treasury management platform built on Stellar Soroban that requires multiple approvals before funds can be moved. Perfect for DAOs, teams, and organizations.

The platform consists of three main components:

| Component | Description | Technology |
|-----------|-------------|------------|
| **Smart Contract** | Multi-signature logic on Stellar | Rust (Soroban) |
| **Backend API** | Vault and transaction management | NestJS |
| **Frontend Dashboard** | User interface for wallet connection | Next.js |

## 🛠 Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Smart Contract | Rust (Soroban SDK) | 25.1.0 |
| Backend Framework | NestJS | 10.x |
| Backend Language | TypeScript | 5.x |
| Frontend Framework | Next.js | 14.2 |
| Frontend Language | TypeScript | 5.x |
| Database | PostgreSQL | 15.x |
| ORM | TypeORM | 0.3.x |
| Wallet | Freighter API | 1.7.1 |
| Testing | Jest | 29.x |

## 📁 Project Structure

```
multisig-vault/
├── backend/ # NestJS Backend API
│   ├── src/
│   │   ├── main.ts # Application entry point
│   │   ├── app.module.ts # Root module
│   │   ├── common/ # Shared utilities
│   │   │   ├── guards/ # Auth guards
│   │   │   └── interceptors/ # Request interceptors
│   │   ├── config/ # Configuration
│   │   ├── modules/
│   │   │   ├── users/ # User management
│   │   │   ├── vaults/ # Vault CRUD
│   │   │   └── transactions/ # Transaction processing
│   │   └── database/ # Database entities
│   ├── test/ # E2E tests
│   └── package.json
│
├── contract/ # Rust Soroban Smart Contract
│   ├── src/
│   │   ├── lib.rs # Main contract entry
│   │   ├── vault.rs # Vault creation and management
│   │   ├── transaction.rs # Transaction submission and approval
│   │   ├── policy.rs # Spending policies and trackers
│   │   ├── recovery.rs # Social recovery system
│   │   ├── timelock.rs # Time-locked transactions
│   │   ├── scheduled.rs # Recurring payments
│   │   ├── audit.rs # Audit logging with IPFS
│   │   └── test.rs # Comprehensive tests
│   └── Cargo.toml
│
├── frontend/ # Next.js Dashboard
│   ├── src/
│   │   ├── app/ # Pages
│   │   │   ├── layout.tsx # Root layout
│   │   │   ├── page.tsx # Landing page
│   │   │   ├── vaults/ # Vault management
│   │   │   └── transactions/ # Transaction history
│   │   ├── components/ # React components
│   │   │   ├── wallet/ # Freighter integration
│   │   │   ├── vault/ # Vault components
│   │   │   └── ui/ # Reusable UI
│   │   ├── lib/ # Utilities
│   │   │   └── stellar/ # Stellar SDK helpers
│   │   └── styles/ # Global styles
│   └── package.json
│
├── .github/
│   └── workflows/ # CI/CD pipelines
│
├── docker-compose.yml
└── README.md
```

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Installation |
|-------------|---------|--------------|
| Node.js | 18+ | https://nodejs.org/ |
| Rust | 1.70+ | https://rustup.rs/ |
| PostgreSQL | 15+ | https://www.postgresql.org/ |
| Freighter Wallet | Latest | https://www.freighter.app/ |

### Clone Repository

```bash
git clone https://github.com/MultiSigVault/multisig-vault.git
cd multisig-vault
```

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Contract Setup

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
cargo test
```

## 📜 Smart Contract

### Contract Functions

| Function | Description |
|----------|------------|
| create_vault | Create new multi-signature vault |
| submit_transaction | Propose new transaction |
| approve_transaction | Approve pending transaction |
| revoke_approval | Revoke existing approval |
| execute_transaction | Execute after threshold met |
| set_spending_policy | Set limits per signer |
| add_guardian | Add recovery guardian |
| initiate_recovery | Start key recovery process |
| create_timelock | Add time delay |
| schedule_transaction | Set up recurring payment |

### Deploy Contract

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/multisig_vault_contract.wasm \
  --network testnet
```

## 🔧 Backend API

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| POST | /api/v1/vaults | Create vault |
| GET | /api/v1/vaults | List vaults |
| GET | /api/v1/vaults/:id | Get vault |
| POST | /api/v1/transactions | Submit transaction |
| POST | /api/v1/transactions/:id/approve | Approve |
| POST | /api/v1/transactions/:id/execute | Execute |
| GET | /api/v1/transactions/vault/:vaultId | List transactions |

### API Documentation

Swagger available at: http://localhost:3001/api/docs

## 💻 Frontend Dashboard

### Wallet Integration

- Install Freighter extension  
- Click "Connect Wallet"  
- Approve connection  

### Pages

| Page | Description |
|------|------------|
| / | Landing page |
| /vaults | List all vaults |
| /vaults/[id] | Vault details |
| /transactions | Transaction history |

## 💻 Development

### Backend Scripts

| Command | Description |
|--------|------------|
| npm run start:dev | Start with hot reload |
| npm run build | Build for production |
| npm run test | Run unit tests |
| npm run test:cov | Run tests with coverage |

### Frontend Scripts

| Command | Description |
|--------|------------|
| npm run dev | Start development server |
| npm run build | Build for production |
| npm run start | Run production build |
| npm run lint | Run ESLint |

### Contract Commands

| Command | Description |
|--------|------------|
| cargo build | Build contract |
| cargo test | Run tests |
| cargo fmt | Format code |
| cargo clippy | Run linter |

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
```

### Frontend Tests

```bash
cd frontend
npm run test
npm run test:e2e
```

## 🐳 Docker

```bash
# Start all services
docker-compose up -d

# Stop services
docker-compose down
```

## 🤝 Contributing

We welcome contributions! Please read our CONTRIBUTING.md for detailed guidelines on:

- Setting up your development environment  
- Making code changes  
- Creating pull requests  
- Code review process  
- Commit message conventions  

### Commit Convention

| Type | Description |
|------|------------|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation update |
| style | Code style changes |
| refactor | Code refactor |
| test | Add or update tests |
| chore | Maintenance tasks |

## 🔒 Security

### Reporting Vulnerabilities

Please DO NOT file public issues for security vulnerabilities.

Email security@multisigvault.com with:

- Description of the vulnerability  
- Steps to reproduce  
- Potential impact  
- Suggested fix (if any)  

### Security Best Practices

- Never commit .env files with sensitive data  
- Always use environment variables for secrets  
- Validate all user inputs  
- Follow OWASP security guidelines  
- Use require_auth() for all sensitive contract functions  
- Regular security audits  

### Security Response

| Severity | Response Time |
|----------|--------------|
| Critical | 24 hours |
| High | 48 hours |
| Medium | 7 days |
| Low | 14 days |

## 🆘 Support

For issues, questions, or suggestions:

| Channel | Link |
|--------|------|
| GitHub Issues | Open an issue |
| Discord | Join Discord |
| Email | team@multisigvault.com |

### Before Creating an Issue

- Check existing GitHub Issues  
- Read the documentation  
- Check Discussions  

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

Built on Stellar Soroban | Secure Multi-Signature Treasury Management
