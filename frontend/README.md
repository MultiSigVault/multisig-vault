# MultiSig Vault Frontend

A modern Next.js dashboard for managing multi-signature vaults on Stellar.

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Wallet Integration](#wallet-integration)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

MultiSig Vault Frontend enables users to connect their Freighter wallet, create vaults, submit transactions, and approve multi-signature payments.

## ✨ Features

| Feature | Description |
|---------|-------------|
| Wallet Connect | Freighter wallet integration |
| Vault Management | Create, view, manage vaults |
| Transaction Approval | Approve/reject pending transactions |

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Wallet | Freighter API |

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── vaults/
│   │   └── transactions/
│   ├── components/
│   │   ├── wallet/
│   │   ├── vault/
│   │   └── ui/
│   ├── lib/
│   │   └── stellar/
│   └── styles/
└── package.json
```

## 🚀 Quick Start

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## 👛 Wallet Integration

Install Freighter extension from freighter.app

Click "Connect Wallet" button

Approve connection in Freighter

## 🤝 Contributing

Pull requests welcome! See CONTRIBUTING.md for guidelines.

## 📄 License

MIT

Built on Stellar Soroban | Secure Multi-Signature Treasury
