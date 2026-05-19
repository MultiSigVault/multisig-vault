# MultiSig Vault Backend

A robust, scalable NestJS backend for the MultiSig Vault multi-signature treasury platform on Stellar. This repository contains the core API and services that power the vault ecosystem.

## 📋 Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Docker](#docker)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

MultiSig Vault is a decentralized treasury management platform designed to help DAOs, teams, and organizations manage funds with multi-signature security. The backend provides:

- **Vault Management**: Create, update, pause, and resume multi-signature vaults
- **Transaction Processing**: Submit, approve, revoke, and execute transactions
- **Spending Policies**: Configure daily, weekly, monthly limits per signer
- **Time Locks**: Delayed transaction execution for security
- **Scheduled Payments**: Recurring payments (daily, weekly, monthly, yearly)
- **Social Recovery**: Guardian-based key recovery system
- **Audit Logging**: Complete immutable transaction history with IPFS
- **API Documentation**: Auto-generated Swagger documentation

## 🛠 Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Runtime | Node.js | 18+ |
| Framework | NestJS | 10.x |
| Language | TypeScript | 5.x |
| Database | PostgreSQL | 15.x |
| ORM | TypeORM | 0.3.x |
| Cache | Redis | 7.x |
| Queue | BullMQ | 4.x |
| Authentication | JWT | - |
| WebSocket | Socket.IO | 4.x |
| Testing | Jest | 29.x |
| API Docs | Swagger/OpenAPI | 7.x |
| Linting | ESLint | 8.x |
| Formatting | Prettier | 3.x |

## 📁 Project Structure

backend/
├── src/
│ ├── main.ts # Application entry point
│ ├── app.module.ts # Root module
│ ├── common/ # Shared utilities and components
│ │ ├── decorators/ # Custom decorators (auth, roles, etc.)
│ │ ├── filters/ # Exception filters
│ │ ├── guards/ # Authentication & authorization guards
│ │ ├── interceptors/ # Request/response interceptors
│ │ ├── pipes/ # Validation and transformation pipes
│ │ ├── dtos/ # Common DTOs (pagination, responses)
│ │ └── utils/ # Utility functions and helpers
│ │
│ ├── config/ # Configuration management
│ │ ├── database.config.ts
│ │ ├── app.config.ts
│ │ └── validation.schema.ts
│ │
│ ├── database/ # Database setup and migrations
│ │ ├── migrations/
│ │ ├── seeds/
│ │ └── entities/ # Database entities
│ │
│ ├── modules/ # Feature modules
│ │ ├── auth/ # Authentication module
│ │ │ ├── auth.module.ts
│ │ │ ├── auth.controller.ts
│ │ │ ├── auth.service.ts
│ │ │ ├── strategies/ # Passport strategies
│ │ │ ├── guards/
│ │ │ └── dtos/
│ │ │
│ │ ├── users/ # User management module
│ │ │ ├── users.module.ts
│ │ │ ├── users.controller.ts
│ │ │ ├── users.service.ts
│ │ │ ├── entities/
│ │ │ └── dtos/
│ │ │
│ │ ├── vaults/ # Vault management module
│ │ │ ├── vaults.module.ts
│ │ │ ├── vaults.controller.ts
│ │ │ ├── vaults.service.ts
│ │ │ ├── entities/
│ │ │ └── dtos/
│ │ │
│ │ └── transactions/ # Transaction processing module
│ │ ├── transactions.module.ts
│ │ ├── transactions.controller.ts
│ │ ├── transactions.service.ts
│ │ ├── entities/
│ │ └── dtos/
│ │
│ └── shared/ # Shared services (mail, notifications, etc.)
│ ├── mail/
│ ├── notifications/
│ └── logger/
│
├── test/ # End-to-end tests
│ └── app.e2e.spec.ts
│
├── package.json
├── tsconfig.json
├── nest-cli.json
├── jest.config.js
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── Dockerfile
├── docker-compose.yml
└── README.md


## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.x
- npm, yarn, or pnpm
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Clone the repository
git clone https://github.com/MultiSigVault/multisig-vault.git
cd multisig-vault/backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run typeorm migration:run

# Seed the database (optional)
npm run seed

# Start the development server
npm run start:dev
```

The application will be available at http://localhost:3001

💻 Development

### Available Scripts

```bash
# Development
npm run start          # Start the application
npm run start:dev      # Start with hot reload
npm run start:debug    # Start with debug mode

# Building
npm run build          # Build for production
npm run build:watch    # Build with watch mode

# Testing
npm run test           # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Run tests with coverage
npm run test:e2e       # Run e2e tests

# Database
npm run typeorm migration:run     # Run migrations
npm run typeorm migration:revert  # Revert last migration
npm run seed                       # Seed the database

# Linting & Formatting
npm run lint          # Run ESLint
npm run lint:fix      # Fix linting errors
npm run format        # Format with Prettier
```

### Code Style

```bash
# Format all files
npm run format

# Check and fix linting issues
npm run lint:fix
```

## 📚 API Documentation

API documentation is available via Swagger at:

http://localhost:3001/api/docs

## 🗄 Database Schema
(…continues exactly as you wrote…)
