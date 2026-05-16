# MultiSig Vault Smart Contracts

[![Rust](https://img.shields.io/badge/Rust-1.74-orange)](https://rust-lang.org)
[![Soroban](https://img.shields.io/badge/Soroban-20.0.0-blue)](https://soroban.stellar.org)
[![WASM](https://img.shields.io/badge/WASM-32-bit-purple)](https://webassembly.org)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](https://github.com/your-org/multisig-vault/actions)
[![Coverage](https://img.shields.io/badge/coverage-95%25-green)](https://codecov.io/gh/your-org/multisig-vault)

## 🚀 Overview

Production-ready multi-signature wallet smart contracts built on Stellar Soroban. These contracts enable secure, decentralized management of digital assets with customizable signature thresholds, time locks, and advanced security policies.

## 📦 Contracts

### 1. MultiSigVault Contract
The main vault contract that holds assets and manages multi-signature transactions.

**Features:**
- M-of-N signature requirements
- Transaction proposals and approvals
- Time-locked transactions
- Daily spending limits
- Allowed asset whitelisting
- Emergency pause mechanism

### 2. Factory Contract
Deploys and manages multiple vault instances.

**Features:**
- Create new vaults
- Vault registry
- Template management
- Upgrade coordination

### 3. Policy Contract
Configurable security policies for vaults.

**Features:**
- Spending limits
- Asset restrictions
- Time-based rules
- Multi-factor requirements

## 📁 Contract Structure
contracts/
├── 📁 multisig-vault/
│ ├── 📁 src/
│ │ ├── 📄 lib.rs # Entry point
│ │ ├── 📄 contract.rs # Core logic
│ │ ├── 📄 storage.rs # State management
│ │ ├── 📄 events.rs # Event emission
│ │ ├── 📄 errors.rs # Error types
│ │ └── 📄 utils.rs # Helpers
│ ├── 📁 tests/
│ │ ├── 📄 test_init.rs
│ │ ├── 📄 test_transactions.rs
│ │ ├── 📄 test_approvals.rs
│ │ └── 📄 test_policies.rs
│ └── 📄 Cargo.toml
│
├── 📁 factory/
│ ├── 📁 src/
│ │ ├── 📄 lib.rs
│ │ ├── 📄 contract.rs
│ │ └── 📄 storage.rs
│ ├── 📁 tests/
│ └── 📄 Cargo.toml
│
└── 📁 policy/
├── 📁 src/
├── 📁 tests/
└── 📄 Cargo.toml


## 🛠️ Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install Soroban CLI
cargo install soroban-cli --version 20.0.0

# Install Stellar CLI (optional)
cargo install stellar-cli

🔧 Installation
# Clone repository
git clone https://github.com/your-org/multisig-vault.git
cd multisig-vault/contracts

# Build contracts
cargo build --target wasm32-unknown-unknown --release

# Run tests
cargo test

# Optimize WASM
soroban contract optimize \
  --wasm target/wasm32-unknown-unknown/release/multisig_vault.wasm \
  --wasm-out multisig_vault_optimized.wasm

  📝 Contract Interface
MultiSigVault Contract
// Initialize vault
fn initialize(
    env: Env,
    signers: Vec<Address>,
    threshold: u32,
    daily_limit: Option<i128>,
    allowed_assets: Option<Vec<String>>
) -> Result<(), Error>

// Propose transaction
fn propose_transaction(
    env: Env,
    destination: Address,
    amount: i128,
    asset: String,
    memo: Option<String>
) -> Result<u64, Error>

// Approve transaction
fn approve(
    env: Env,
    transaction_id: u64
) -> Result<(), Error>

// Reject transaction
fn reject(
    env: Env,
    transaction_id: u64
) -> Result<(), Error>

// Execute transaction
fn execute_transaction(
    env: Env,
    transaction_id: u64
) -> Result<(), Error>

// Add signer (requires threshold signatures)
fn add_signer(
    env: Env,
    new_signer: Address
) -> Result<(), Error>

// Remove signer (requires threshold signatures)
fn remove_signer(
    env: Env,
    signer: Address
) -> Result<(), Error>

// Change threshold (requires threshold signatures)
fn change_threshold(
    env: Env,
    new_threshold: u32
) -> Result<(), Error>

// Get vault state
fn get_vault_state(
    env: Env
) -> Result<VaultState, Error>

// Get transaction
fn get_transaction(
    env: Env,
    transaction_id: u64
) -> Result<Transaction, Error>

Data Structures

// Get pending transactions
fn get_pending_transactions(
    env: Env
) -> Result<Vec<Transaction>, Error>
// Vault state
pub struct VaultState {
    pub signers: Vec<Address>,
    pub threshold: u32,
    pub daily_limit: Option<i128>,
    pub allowed_assets: Vec<String>,
    pub total_transactions: u64,
    pub is_paused: bool,
    pub created_at: u64,
}

// Transaction
pub struct Transaction {
    pub id: u64,
    pub proposer: Address,
    pub destination: Address,
    pub amount: i128,
    pub asset: String,
    pub memo: Option<String>,
    pub status: TransactionStatus,
    pub approvals: Vec<Address>,
    pub rejections: Vec<Address>,
    pub created_at: u64,
    pub executed_at: Option<u64>,
}

// Transaction status
pub enum TransactionStatus {
    Pending,
    Approved,
    Executed,
    Rejected,
    Cancelled,
}

// Events
pub struct TransactionProposed {
    pub transaction_id: u64,
    pub proposer: Address,
    pub destination: Address,
    pub amount: i128,
}

pub struct TransactionApproved {
    pub transaction_id: u64,
    pub approver: Address,
    pub approvals_needed: u32,
    pub current_approvals: u32,
}

pub struct TransactionExecuted {
    pub transaction_id: u64,
    pub executor: Address,
    pub executed_at: u64,
}

🧪 Testing
# Run all tests
cargo test

# Run specific test
cargo test test_propose_transaction -- --nocapture

# Run with logging
RUST_LOG=debug cargo test

# Generate coverage report
cargo tarpaulin --ignore-tests

# Run integration tests
cargo test --test integration_tests

Test Coverage
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{Env, Address};

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let signers = vec![
            Address::generate(&env),
            Address::generate(&env),
            Address::generate(&env),
        ];
        
        let client = MultiSigVaultClient::new(&env, &env.register_contract(None));
        client.initialize(&signers, &2, &None, &None);
        
        let state = client.get_vault_state();
        assert_eq!(state.signers.len(), 3);
        assert_eq!(state.threshold, 2);
    }

    #[test]
    fn test_propose_and_approve() {
        let env = Env::default();
        let signers = vec![
            Address::generate(&env),
            Address::generate(&env),
        ];
        
        let client = MultiSigVaultClient::new(&env, &env.register_contract(None));
        client.initialize(&signers, &2, &None, &None);
        
        let tx_id = client.propose_transaction(
            &Address::generate(&env),
            &1000,
            &"XLM".to_string(),
            &None
        );
        
        client.approve(&tx_id, &signers[0]);
        let tx = client.get_transaction(&tx_id);
        assert_eq!(tx.approvals.len(), 1);
        
        client.approve(&tx_id, &signers[1]);
        client.execute_transaction(&tx_id);
        
        let tx = client.get_transaction(&tx_id);
        assert!(matches!(tx.status, TransactionStatus::Executed));
    }
}

🚀 Deployment
Deploy to Testnet
