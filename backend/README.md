# MultiSig Vault Backend

A robust, scalable NestJS backend for the MultiSig Vault multi-signature treasury platform on Stellar.

## 📋 Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

MultiSig Vault is a decentralized treasury management platform. The backend provides:

- Vault Management
- Transaction Processing
- Spending Policies
- User Authentication

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 18+ |
| Framework | NestJS 10+ |
| Language | TypeScript |
| Database | PostgreSQL + TypeORM |
| Auth | JWT |

## 📁 Project Structure

```
backend/
├── src/
│   ├── main.ts # Application entry point
│   ├── app.module.ts # Root module
│   ├── common/ # Shared utilities
│   │   ├── guards/ # Auth guards
│   │   └── interceptors/ # Request interceptors
│   ├── config/ # Configuration
│   ├── modules/
│   │   ├── users/ # User management
│   │   ├── vaults/ # Vault CRUD
│   │   └── transactions/ # Transaction processing
│   └── database/ # Database entities
├── test/ # E2E tests
├── package.json
└── README.md
```

## 🚀 Getting Started

```bash
git clone https://github.com/MultiSigVault/multisig-vault.git
cd multisig-vault/backend
npm install
cp .env.example .env
npm run start:dev
```

## 📚 API Documentation

Swagger available at: http://localhost:3001/api/docs

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

## 🤝 Contributing

Pull requests welcome! See CONTRIBUTING.md for guidelines.

## 📄 License

MIT

Built on Stellar Soroban | Secure Multi-Signature Treasury
