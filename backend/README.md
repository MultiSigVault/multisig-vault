=================================================================
BACKEND README - Copy this into backend/README.md
=================================================================

# MultiSig Vault Backend

A robust, scalable NestJS backend for the MultiSig Vault multi-signature treasury platform on Stellar.

## Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview

MultiSig Vault is a decentralized treasury management platform. The backend provides:

- Vault Management - Create, update, pause, resume vaults
- Transaction Processing - Submit, approve, revoke, execute
- Spending Policies - Daily/weekly/monthly limits per signer
- Time Locks - Delayed transaction execution
- Scheduled Payments - Recurring payments
- Social Recovery - Guardian-based key recovery
- Audit Logging - Complete transaction history

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 18+ |
| Framework | NestJS 10+ |
| Language | TypeScript |
| Database | PostgreSQL + TypeORM |
| Cache | Redis + BullMQ |
| Auth | JWT |
| Testing | Jest |
| API Docs | Swagger/OpenAPI |

## Project Structure
backend/
├── src/
│ ├── main.ts # Application entry point
│ ├── app.module.ts # Root module
│ ├── common/ # Shared utilities
│ │ ├── guards/ # Auth guards
│ │ └── interceptors/ # Request interceptors
│ ├── config/ # Configuration
│ ├── modules/
│ │ ├── users/ # User management
│ │ ├── vaults/ # Vault CRUD
│ │ └── transactions/ # Transaction processing
│ └── database/ # Database entities
├── test/ # E2E tests
├── package.json
└── README.md

text

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
git clone https://github.com/MultiSigVault/multisig-vault.git
cd multisig-vault/backend
npm install
cp .env.example .env
npm run start:dev
API Documentation
Swagger available at: http://localhost:3001/api/docs

Contributing
Pull requests welcome! See CONTRIBUTING.md for guidelines.

License
MIT

Built on Stellar Soroban | Secure Multi-Signature Treasury
