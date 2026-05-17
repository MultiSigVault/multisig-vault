# MultiSig Vault Backend

A robust, scalable NestJS backend for the MultiSig Vault multi-signature treasury platform on Stellar. This repository contains the core API and services that power the vault ecosystem.

## 📋 Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [API Documentation](#api-documentation)
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

| Category | Technology |
|----------|------------|
| Runtime | Node.js (v18+) |
| Framework | NestJS 10+ |
| Language | TypeScript |
| Database | PostgreSQL with TypeORM |
| Cache | Redis + BullMQ |
| Authentication | JWT |
| Blockchain | Stellar SDK, Soroban SDK |
| Testing | Jest |
| API Docs | Swagger/OpenAPI |

## 📁 Project Structure
backend/
├── src/
│ ├── main.ts # Application entry point
│ ├── app.module.ts # Root module
│ ├── common/ # Shared utilities and components
│ │ ├── guards/ # Authentication & authorization guards
│ │ └── interceptors/ # Request/response interceptors
│ ├── config/ # Configuration management
│ │ ├── database.config.ts
│ │ └── app.config.ts
│ ├── database/ # Database setup and migrations
│ │ ├── migrations/
│ │ ├── seeds/
│ │ └── entities/
│ ├── modules/ # Feature modules
│ │ ├── users/ # User management module
│ │ │ ├── users.module.ts
│ │ │ ├── users.controller.ts
│ │ │ ├── users.service.ts
│ │ │ ├── entities/
│ │ │ └── dtos/
│ │ ├── vaults/ # Vault management module
│ │ │ ├── vaults.module.ts
│ │ │ ├── vaults.controller.ts
│ │ │ ├── vaults.service.ts
│ │ │ ├── entities/
│ │ │ └── dtos/
│ │ └── transactions/ # Transaction processing module
│ │ ├── transactions.module.ts
│ │ ├── transactions.controller.ts
│ │ ├── transactions.service.ts
│ │ ├── entities/
│ │ └── dtos/
│ └── shared/ # Shared services (mail, notifications, etc.)
│ ├── mail/
│ └── logger/
├── test/ # End-to-end tests
│ └── app.e2e.spec.ts
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

text

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
The application will be available at http://localhost:3001

💻 Development
Available Scripts
bash
# Development
npm run start          # Start the application
npm run start:dev     # Start with hot reload
npm run start:debug   # Start with debug mode

# Building
npm run build         # Build for production
npm run build:watch   # Build with watch mode

# Testing
npm run test          # Run unit tests
npm run test:watch    # Run tests with watch mode
npm run test:cov      # Run tests with coverage
npm run test:e2e      # Run e2e tests

# Database
npm run typeorm migration:run     # Run migrations
npm run typeorm migration:revert  # Revert last migration
npm run seed                      # Seed the database

# Linting & Formatting
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting errors
npm run format       # Format with Prettier
Code Style
This project uses ESLint and Prettier for code consistency:

bash
# Format all files
npm run format

# Check and fix linting issues
npm run lint:fix
Environment Variables
See .env.example for all available environment variables:

env
# App
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=multisig_vault

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d

# Stellar
STELLAR_NETWORK=testnet
HORIZON_URL=https://horizon-testnet.stellar.org
CONTRACT_ID=your_contract_id
📚 API Documentation
API documentation is available via Swagger at:

text
http://localhost:3001/api/docs
To regenerate OpenAPI documentation:

bash
npm run swagger
🧪 Testing
The project uses Jest for unit and integration testing.

Running Tests
bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
Writing Tests
Create test files next to the modules with .spec.ts suffix:

typescript
// Example: vaults.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { VaultsService } from './vaults.service';

describe('VaultsService', () => {
  let service: VaultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VaultsService],
    }).compile();

    service = module.get<VaultsService>(VaultsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
🐳 Docker
Build Docker Image
bash
docker build -t multisig-backend .
Run with Docker Compose
bash
docker-compose up -d
Docker Compose Configuration
yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: multisig_vault
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    environment:
      DB_HOST: postgres
      REDIS_HOST: redis

volumes:
  postgres_data:
🤝 Contributing
We welcome contributions! Please read our CONTRIBUTING.md for detailed guidelines on:

Setting up your development environment

Making code changes

Creating pull requests

Code review process

Commit message conventions

Commit Convention
We follow conventional commits:

Type	Description
feat	New feature
fix	Bug fix
docs	Documentation update
style	Code style changes
refactor	Code refactor
test	Add or update tests
chore	Maintenance tasks
🔒 Security
Never commit .env files with sensitive data

Always use environment variables for secrets

Validate all user inputs

Follow OWASP security guidelines

Report security issues to the maintainers

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🆘 Support
For issues, questions, or suggestions:

Check existing GitHub Issues

Create a new issue with a clear description

Contact the maintainers

