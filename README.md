# MultiSig Vault Backend

A robust, scalable NestJS backend for the MultiSig Vault multi-signature treasury platform on Stellar.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [License](#license)

## Overview

MultiSig Vault is a decentralized treasury management platform. The backend provides:

- Vault Management
- Transaction Processing
- Spending Policies
- Time Locks
- Scheduled Payments
- Social Recovery
- Audit Logging

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 18+ |
| Framework | NestJS 10+ |
| Language | TypeScript |
| Database | PostgreSQL + TypeORM |
| Cache | Redis + BullMQ |
| Auth | JWT |

## Project Structure
backend/
├── src/
│ ├── main.ts
│ ├── app.module.ts
│ ├── common/
│ │ ├── guards/
│ │ └── interceptors/
│ ├── config/
│ ├── modules/
│ │ ├── users/
│ │ ├── vaults/
│ │ └── transactions/
│ └── database/
├── test/
├── package.json
└── README.md

text

## Getting Started

```bash
git clone https://github.com/MultiSigVault/multisig-vault.git
cd multisig-vault/backend
npm install
cp .env.example .env
npm run start:dev
API Documentation
Swagger available at: http://localhost:3001/api/docs

License
MIT

Built on Stellar Soroban
