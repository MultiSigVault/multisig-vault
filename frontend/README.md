MultiSig Vault Frontend

A modern Next.js dashboard for managing multi-signature vaults on Stellar.

📋 Table of Contents
Overview
Features
Tech Stack
Project Structure
Quick Start
Wallet Integration
Contributing
License
🎯 Overview

MultiSig Vault Frontend enables users to connect their Freighter wallet, create vaults, submit transactions, and approve multi-signature payments.

✨ Features
Feature	Description
Wallet Connect	Freighter wallet integration
Vault Management	Create, view, manage vaults
Transaction Approval	Approve/reject pending transactions
Real-time Updates	Live activity feed
Dark Mode	Light/dark theme support
🛠 Tech Stack
Category	Technology
Framework	Next.js 14
Language	TypeScript
Styling	Tailwind CSS
Wallet	Freighter API
📁 Project Structure

frontend/
├── src/
│ ├── app/
│ │ ├── vaults/
│ │ └── transactions/
│ ├── components/
│ │ ├── wallet/
│ │ ├── vault/
│ │ └── ui/
│ ├── lib/
│ │ └── stellar/
│ └── styles/
└── package.json

🚀 Quick Start
cd frontend
npm install
cp .env.example .env.local
npm run dev

👛 Wallet Integration

Install Freighter extension from freighter.app

Click "Connect Wallet" button

Approve connection in Freighter

Your wallet address appears

🤝 Contributing

Pull requests welcome! See CONTRIBUTING.md for guidelines.

📄 License

MIT

Built on Stellar Soroban | Secure Multi-Signature Treasury
