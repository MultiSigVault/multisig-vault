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
Code Style
This project uses ESLint and Prettier for code consistency:

bash
# Format all files
npm run format

# Check and fix linting issues
npm run lint:fix
📚 API Documentation
API documentation is available via Swagger at:

text
http://localhost:3001/api/docs
API Endpoints
Authentication
Method	Endpoint	Description
POST	/api/v1/auth/login	Login with wallet signature
POST	/api/v1/auth/refresh	Refresh access token
POST	/api/v1/auth/logout	Logout user
GET	/api/v1/auth/me	Get current user
Vaults
Method	Endpoint	Description
POST	/api/v1/vaults	Create vault
GET	/api/v1/vaults	List all vaults
GET	/api/v1/vaults/:id	Get vault by ID
GET	/api/v1/vaults/vaultId/:vaultId	Get vault by vaultId
GET	/api/v1/vaults/signer/:address	Get vaults by signer
PUT	/api/v1/vaults/:id	Update vault
PATCH	/api/v1/vaults/:id/status	Update vault status
POST	/api/v1/vaults/:id/signers	Add signer
DELETE	/api/v1/vaults/:id/signers/:signer	Remove signer
PATCH	/api/v1/vaults/:id/threshold	Update threshold
POST	/api/v1/vaults/:id/policies	Set spending policy
GET	/api/v1/vaults/:id/policies/:signer	Get spending policy
PUT	/api/v1/vaults/:id/timelock-config	Update timelock config
PUT	/api/v1/vaults/:id/schedule-config	Update schedule config
POST	/api/v1/vaults/:id/recovery	Initiate recovery
POST	/api/v1/vaults/:id/recovery/approve	Approve recovery
GET	/api/v1/vaults/:id/audit	Get audit log
GET	/api/v1/vaults/stats	Get platform stats
Transactions
Method	Endpoint	Description
POST	/api/v1/transactions	Submit transaction
POST	/api/v1/transactions/batch	Batch submit transactions
GET	/api/v1/transactions/vault/:vaultId	Get vault transactions
GET	/api/v1/transactions/:id	Get transaction by ID
GET	/api/v1/transactions/txid/:transactionId	Get transaction by transactionId
POST	/api/v1/transactions/approve	Approve transaction
POST	/api/v1/transactions/revoke	Revoke approval
POST	/api/v1/transactions/execute	Execute transaction
POST	/api/v1/transactions/:transactionId/reject	Reject transaction
POST	/api/v1/transactions/:transactionId/cancel	Cancel transaction
GET	/api/v1/transactions/stats/:vaultId	Get transaction stats
GET	/api/v1/transactions/pending/:vaultId	Get pending transactions
GET	/api/v1/transactions/signer/:vaultId/:signerAddress	Get transactions by signer
Example Request
bash
# Create vault
curl -X POST http://localhost:3001/api/v1/vaults \
  -H "Content-Type: application/json" \
  -d '{
    "signers": ["GABC123...", "GDEF456...", "GHIJ789..."],
    "threshold": 2,
    "name": "Team Treasury",
    "description": "Main team operational funds"
  }'

# Submit transaction
curl -X POST http://localhost:3001/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "vaultId": 1,
    "toAddress": "GXYZ987...",
    "amount": 10000000,
    "tokenAddress": "native",
    "description": "Payment to freelancer"
  }'

# Approve transaction
curl -X POST http://localhost:3001/api/v1/transactions/approve \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": 1,
    "signerAddress": "GABC123..."
  }'
🗄 Database Schema
Vaults Table
Column	Type	Description
id	SERIAL	Primary key
vault_id	INTEGER	Unique vault identifier
signers	TEXT[]	Array of signer addresses
threshold	INTEGER	Number of approvals required
name	VARCHAR(100)	Vault name
description	TEXT	Vault description
creator_address	VARCHAR(56)	Creator wallet address
is_active	BOOLEAN	Vault active status
balance	BIGINT	Current vault balance
total_transactions	INTEGER	Total executed transactions
spending_policies	JSONB	Spending policies per signer
spending_trackers	JSONB	Spending tracking data
timelock_config	JSONB	Time lock configuration
schedule_config	JSONB	Schedule configuration
recovery_config	JSONB	Recovery configuration
audit_logs	JSONB	Audit log entries
metadata	JSONB	Additional metadata
created_at	TIMESTAMP	Creation timestamp
updated_at	TIMESTAMP	Last update timestamp
Transactions Table
Column	Type	Description
id	SERIAL	Primary key
transaction_id	INTEGER	Unique transaction identifier
vault_id	INTEGER	Foreign key to vaults
from_address	VARCHAR(56)	Sender address
to_address	VARCHAR(56)	Recipient address
amount	BIGINT	Transaction amount in stroops
token_address	VARCHAR(56)	Token contract address
status	VARCHAR(20)	pending/approved/executed/rejected/cancelled/failed/timelocked/scheduled
approvals	TEXT[]	Array of approving signers
revocations	TEXT[]	Array of revoked approvals
required_approvals	INTEGER	Required approvals count
description	TEXT	Transaction description
metadata	JSONB	Additional metadata
spending_policy_check	JSONB	Spending policy validation data
timelock_id	BIGINT	Associated timelock ID
schedule_id	BIGINT	Associated schedule ID
release_time	BIGINT	Time lock release timestamp
failure_reason	TEXT	Failure reason if failed
executed_at	BIGINT	Execution timestamp
approved_at	BIGINT	Approval timestamp
stellar_tx_hash	VARCHAR(66)	Stellar transaction hash
created_at	TIMESTAMP	Creation timestamp
updated_at	TIMESTAMP	Last update timestamp
Users Table
Column	Type	Description
id	SERIAL	Primary key
wallet_address	VARCHAR(56)	Unique wallet address
email	VARCHAR(255)	User email
name	VARCHAR(100)	User name
avatar_url	VARCHAR(255)	Profile picture URL
stellar_accounts	JSONB	Linked Stellar accounts
roles	JSONB	User roles (admin, maintainer, contributor)
preferences	JSONB	User preferences (theme, notifications)
vault_access	JSONB	Access permissions per vault
metadata	JSONB	Additional metadata
is_active	BOOLEAN	User active status
last_login	BIGINT	Last login timestamp
created_at	TIMESTAMP	Creation timestamp
updated_at	TIMESTAMP	Last update timestamp
Audit Logs Table
Column	Type	Description
id	SERIAL	Primary key
vault_id	INTEGER	Foreign key to vaults
action	VARCHAR(50)	Action performed
actor	VARCHAR(56)	Actor address
details	JSONB	Action details
ipfs_hash	VARCHAR(100)	IPFS hash for immutable storage
timestamp	BIGINT	Action timestamp
🔧 Environment Variables
Variable	Required	Default	Description
NODE_ENV	No	development	Environment (development/production)
PORT	No	3001	Server port
DB_HOST	Yes	localhost	PostgreSQL host
DB_PORT	No	5432	PostgreSQL port
DB_USERNAME	Yes	postgres	Database username
DB_PASSWORD	Yes	-	Database password
DB_DATABASE	Yes	multisig_vault	Database name
REDIS_HOST	No	localhost	Redis host
REDIS_PORT	No	6379	Redis port
JWT_SECRET	Yes	-	JWT signing secret
JWT_EXPIRATION	No	7d	JWT expiration time
STELLAR_NETWORK	No	testnet	Stellar network (testnet/mainnet)
HORIZON_URL	No	https://horizon-testnet.stellar.org	Horizon URL
CONTRACT_ID	Yes	-	Smart contract ID
🧪 Testing
The project uses Jest for unit and integration testing.

Running Tests
bash
# Run all unit tests
npm run test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch

# Run end-to-end tests
npm run test:e2e
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

Built on Stellar Soroban | Secure Multi-Signature Treasury Management
