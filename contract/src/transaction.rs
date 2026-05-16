//! # Transaction Module
//!
//! Handles transaction submission, approval, execution, and management.
//! Core multi-signature functionality with comprehensive validation.

use soroban_sdk::{Address, Env, Vec, String};
use soroban_sdk::storage::StorageKey;

use crate::Error;

/// Transaction status enum
#[derive(Clone, Debug, PartialEq)]
pub enum TransactionStatus {
    /// Transaction is pending approval
    Pending,
    /// Transaction has been approved (threshold met)
    Approved,
    /// Transaction has been executed
    Executed,
    /// Transaction was rejected/cancelled
    Rejected,
    /// Transaction failed during execution
    Failed,
    /// Transaction was cancelled by proposer
    Cancelled,
}

/// Transaction structure with full metadata
#[derive(Clone, Debug)]
pub struct Transaction {
    /// Unique transaction ID within vault
    pub id: u32,
    /// Vault ID this transaction belongs to
    pub vault_id: u32,
    /// Recipient address
    pub to: Address,
    /// Amount in stroops
    pub amount: i128,
    /// Optional transaction data/memo
    pub data: String,
    /// Current status
    pub status: TransactionStatus,
    /// Addresses that have approved
    pub approvals: Vec<Address>,
    /// Number of approvals required
    pub threshold: u32,
    /// Proposer address
    pub proposer: Address,
    /// Submission timestamp
    pub submitted_at: u64,
    /// Execution timestamp (if executed)
    pub executed_at: Option<u64>,
    /// Optional time lock ID if applicable
    pub timelock_id: Option<u32>,
    /// Optional schedule ID if recurring
    pub schedule_id: Option<u32>,
    /// Failure reason (if failed)
    pub failure_reason: Option<String>,
    /// Approval timestamp for each signer
    pub approval_timestamps: Vec<(Address, u64)>,
    /// Transaction hash on Stellar (after execution)
    pub stellar_tx_hash: Option<String>,
    /// Gas used for execution
    pub gas_used: Option<u64>,
}

impl Transaction {
    /// Create a new transaction
    pub fn new(
        id: u32,
        vault_id: u32,
        to: Address,
        amount: i128,
        data: String,
        threshold: u32,
        proposer: Address,
        submitted_at: u64,
    ) -> Self {
        Self {
            id,
            vault_id,
            to,
            amount,
            data,
            status: TransactionStatus::Pending,
            approvals: Vec::new(&soroban_sdk::Env::default()),
            threshold,
            proposer,
            submitted_at,
            executed_at: None,
            timelock_id: None,
            schedule_id: None,
            failure_reason: None,
            approval_timestamps: Vec::new(&soroban_sdk::Env::default()),
            stellar_tx_hash: None,
            gas_used: None,
        }
    }
    
    /// Add an approval with timestamp
    pub fn add_approval(&mut self, signer: Address) -> Result<(), Error> {
        if self.status != TransactionStatus::Pending && self.status != TransactionStatus::Approved {
            return Err(Error::TransactionNotPending);
        }
        
        if self.approvals.contains(&signer) {
            return Err(Error::AlreadyApproved);
        }
        
        self.approvals.push_back(signer.clone());
        self.approval_timestamps.push_back((signer, self.submitted_at));
        
        // Check if threshold met
        if self.approvals.len() as u32 >= self.threshold {
            self.status = TransactionStatus::Approved;
        }
        
        Ok(())
    }
    
    /// Revoke an approval
    pub fn revoke_approval(&mut self, signer: Address) -> Result<(), Error> {
        if self.status != TransactionStatus::Pending && self.status != TransactionStatus::Approved {
            return Err(Error::TransactionNotPending);
        }
        
        let index = self.approvals.iter().position(|s| s == &signer);
        if let Some(idx) = index {
            self.approvals.remove(idx);
            
            // Also remove from approval timestamps
            let ts_index = self.approval_timestamps.iter().position(|(s, _)| s == &signer);
            if let Some(ts_idx) = ts_index {
                self.approval_timestamps.remove(ts_idx);
            }
            
            // Reset status if below threshold
            if self.status == TransactionStatus::Approved && self.approvals.len() as u32 < self.threshold {
                self.status = TransactionStatus::Pending;
            }
            Ok(())
        } else {
            Err(Error::AlreadyRevoked)
        }
    }
    
    /// Mark transaction as executed
    pub fn mark_executed(&mut self, executed_at: u64, tx_hash: Option<String>, gas: Option<u64>) {
        self.status = TransactionStatus::Executed;
        self.executed_at = Some(executed_at);
        self.stellar_tx_hash = tx_hash;
        self.gas_used = gas;
    }
    
    /// Mark transaction as failed
    pub fn mark_failed(&mut self, reason: String) {
        self.status = TransactionStatus::Failed;
        self.failure_reason = Some(reason);
    }
    
    /// Mark transaction as rejected
    pub fn mark_rejected(&mut self) {
        self.status = TransactionStatus::Rejected;
    }
    
    /// Mark transaction as cancelled
    pub fn mark_cancelled(&mut self) {
        self.status = TransactionStatus::Cancelled;
    }
    
    /// Get number of approvals
    pub fn approval_count(&self) -> u32 {
        self.approvals.len() as u32
    }
    
    /// Check if a signer has approved
    pub fn has_approved(&self, signer: &Address) -> bool {
        self.approvals.contains(signer)
    }
    
    /// Check if transaction is ready for execution
    pub fn is_ready_for_execution(&self) -> bool {
        self.status == TransactionStatus::Approved && self.approvals.len() as u32 >= self.threshold
    }
    
    /// Get remaining approvals needed
    pub fn remaining_approvals(&self) -> u32 {
        if self.approval_count() >= self.threshold {
            0
        } else {
            self.threshold - self.approval_count()
        }
    }
    
    /// Get approval percentage (0-100)
    pub fn approval_percentage(&self) -> u32 {
        if self.threshold == 0 {
            return 0;
        }
        (self.approval_count() * 100) / self.threshold
    }
    
    /// Check if transaction can be cancelled
    pub fn can_cancel(&self, caller: &Address, proposer: &Address) -> bool {
        caller == proposer || self.status == TransactionStatus::Pending
    }
    
    /// Get time since submission
    pub fn time_since_submission(&self, current_time: u64) -> u64 {
        current_time - self.submitted_at
    }
}

/// Transaction storage key
pub struct TransactionKey(pub u32, pub u32);

impl StorageKey for TransactionKey {
    fn to_raw(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.push(b't');
        bytes.push((self.0 >> 24) as u8);
        bytes.push((self.0 >> 16) as u8);
        bytes.push((self.0 >> 8) as u8);
        bytes.push(self.0 as u8);
        bytes.push((self.1 >> 24) as u8);
        bytes.push((self.1 >> 16) as u8);
        bytes.push((self.1 >> 8) as u8);
        bytes.push(self.1 as u8);
        bytes
    }
}

/// Transaction counter key for a vault
pub struct TransactionCounterKey(pub u32);

impl StorageKey for TransactionCounterKey {
    fn to_raw(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.push(b'n');
        bytes.push((self.0 >> 24) as u8);
        bytes.push((self.0 >> 16) as u8);
        bytes.push((self.0 >> 8) as u8);
        bytes.push(self.0 as u8);
        bytes
    }
}

/// Transaction manager for a vault
#[derive(Clone, Debug)]
pub struct TransactionManager {
    /// List of transaction IDs for this vault
    pub transaction_ids: Vec<u32>,
    /// Next transaction ID
    pub next_transaction_id: u32,
}

impl TransactionManager {
    /// Create new transaction manager
    pub fn new(env: &Env) -> Self {
        Self {
            transaction_ids: Vec::new(env),
            next_transaction_id: 1,
        }
    }
    
    /// Load transaction manager from storage
    pub fn load(env: &Env, vault_id: u32) -> Self {
        let key = TransactionCounterKey(vault_id);
        let ids_key = format!("tx_ids_{}", vault_id);
        
        let transaction_ids: Vec<u32> = env.storage().get(&ids_key).unwrap_or_else(|| Vec::new(env));
        let next_transaction_id: u32 = env.storage().get(&key).unwrap_or(1);
        
        Self {
            transaction_ids,
            next_transaction_id,
        }
    }
    
    /// Save transaction manager to storage
    pub fn save(&self, env: &Env, vault_id: u32) {
        let key = TransactionCounterKey(vault_id);
        let ids_key = format!("tx_ids_{}", vault_id);
        
        env.storage().set(&key, &self.next_transaction_id);
        env.storage().set(&ids_key, &self.transaction_ids);
    }
    
    /// Add a transaction
    pub fn add_transaction(
        &mut self,
        env: &Env,
        vault_id: u32,
        transaction: Transaction,
    ) -> Result<(), Error> {
        // Check for duplicate
        if self.transaction_ids.contains(&transaction.id) {
            return Err(Error::DuplicateTransaction);
        }
        
        // Add to list
        self.transaction_ids.push_back(transaction.id);
        
        // Save transaction
        let tx_key = TransactionKey(vault_id, transaction.id);
        env.storage().set(&tx_key, &transaction);
        
        Ok(())
    }
    
    /// Get transaction by ID
    pub fn get_transaction(&self, env: &Env, vault_id: u32, tx_id: u32) -> Option<Transaction> {
        let tx_key = TransactionKey(vault_id, tx_id);
        env.storage().get(&tx_key)
    }
    
    /// Update transaction
    pub fn update_transaction(&self, env: &Env, vault_id: u32, transaction: &Transaction) {
        let tx_key = TransactionKey(vault_id, transaction.id);
        env.storage().set(&tx_key, transaction);
    }
    
    /// Get all transactions
    pub fn get_all_transactions(&self, env: &Env, vault_id: u32) -> Vec<Transaction> {
        let mut transactions: Vec<Transaction> = Vec::new(env);
        
        for tx_id in self.transaction_ids.iter() {
            if let Some(tx) = self.get_transaction(env, vault_id, *tx_id) {
                transactions.push_back(tx);
            }
        }
        
        transactions
    }
    
    /// Get pending transactions
    pub fn get_pending_transactions(&self, env: &Env, vault_id: u32) -> Vec<Transaction> {
        let mut pending: Vec<Transaction> = Vec::new(env);
        
        for tx_id in self.transaction_ids.iter() {
            if let Some(tx) = self.get_transaction(env, vault_id, *tx_id) {
                if matches!(tx.status, TransactionStatus::Pending | TransactionStatus::Approved) {
                    pending.push_back(tx);
                }
            }
        }
        
        pending
    }
    
    /// Get executed transactions
    pub fn get_executed_transactions(&self, env: &Env, vault_id: u32) -> Vec<Transaction> {
        let mut executed: Vec<Transaction> = Vec::new(env);
        
        for tx_id in self.transaction_ids.iter() {
            if let Some(tx) = self.get_transaction(env, vault_id, *tx_id) {
                if tx.status == TransactionStatus::Executed {
                    executed.push_back(tx);
                }
            }
        }
        
        executed
    }
    
    /// Get next transaction ID
    pub fn get_next_id(&mut self) -> u32 {
        let id = self.next_transaction_id;
        self.next_transaction_id += 1;
        id
    }
    
    /// Get total transaction count
    pub fn total_count(&self) -> u32 {
        self.transaction_ids.len() as u32
    }
    
    /// Get approved count for a specific transaction
    pub fn get_approval_count(&self, env: &Env, vault_id: u32, tx_id: u32) -> u32 {
        if let Some(tx) = self.get_transaction(env, vault_id, tx_id) {
            tx.approval_count()
        } else {
            0
        }
    }
}

/// Transaction event for off-chain tracking
#[derive(Clone, Debug)]
pub struct TransactionEvent {
    pub vault_id: u32,
    pub transaction_id: u32,
    pub event_type: TransactionEventType,
    pub timestamp: u64,
}

#[derive(Clone, Debug)]
pub enum TransactionEventType {
    Submitted { proposer: Address, to: Address, amount: i128 },
    Approved { signer: Address, approvals: u32, threshold: u32 },
    Revoked { signer: Address, approvals: u32 },
    Executed { executor: Address, tx_hash: Option<String> },
    Failed { reason: String },
    Rejected { by: Address },
    Cancelled { by: Address },
}

/// Transaction batch for multi-transaction operations
#[derive(Clone, Debug)]
pub struct TransactionBatch {
    pub batch_id: u32,
    pub vault_id: u32,
    pub transactions: Vec<Transaction>,
    pub status: BatchStatus,
    pub created_at: u64,
    pub created_by: Address,
    pub total_amount: i128,
}

#[derive(Clone, Debug, PartialEq)]
pub enum BatchStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

impl TransactionBatch {
    /// Create a new transaction batch
    pub fn new(
        batch_id: u32,
        vault_id: u32,
        transactions: Vec<Transaction>,
        created_by: Address,
        created_at: u64,
    ) -> Self {
        let total_amount = transactions.iter().fold(0, |sum, tx| sum + tx.amount);
        
        Self {
            batch_id,
            vault_id,
            transactions,
            status: BatchStatus::Pending,
            created_at,
            created_by,
            total_amount,
        }
    }
    
    /// Execute all transactions in batch
    pub fn execute_batch(&mut self) -> Result<(), Error> {
        if self.status != BatchStatus::Pending {
            return Err(Error::TransactionNotPending);
        }
        
        self.status = BatchStatus::Processing;
        
        for tx in self.transactions.iter() {
            if tx.status != TransactionStatus::Approved {
                self.status = BatchStatus::Failed;
                return Err(Error::InsufficientApprovals);
            }
        }
        
        self.status = BatchStatus::Completed;
        Ok(())
    }
    
    /// Get completion percentage
    pub fn completion_percentage(&self) -> u32 {
        if self.transactions.is_empty() {
            return 0;
        }
        let executed = self.transactions.iter()
            .filter(|tx| tx.status == TransactionStatus::Executed)
            .count();
        (executed * 100 / self.transactions.len()) as u32
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{Env, Address};
    
    fn create_test_env() -> Env {
        let env = Env::default();
        env.mock_all_auths();
        env
    }
    
    #[test]
    fn test_transaction_creation() {
        let env = create_test_env();
        let to = Address::generate(&env);
        let proposer = Address::generate(&env);
        
        let tx = Transaction::new(
            1, 1, to, 1000, String::from_str(&env, "Test"), 
            2, proposer, 1000,
        );
        
        assert_eq!(tx.id, 1);
        assert_eq!(tx.amount, 1000);
        assert_eq!(tx.status, TransactionStatus::Pending);
        assert_eq!(tx.approval_count(), 0);
    }
    
    #[test]
    fn test_add_approval() {
        let env = create_test_env();
        let to = Address::generate(&env);
        let proposer = Address::generate(&env);
        let signer = Address::generate(&env);
        
        let mut tx = Transaction::new(
            1, 1, to, 1000, String::from_str(&env, "Test"),
            2, proposer, 1000,
        );
        
        tx.add_approval(signer).unwrap();
        assert_eq!(tx.approval_count(), 1);
        assert_eq!(tx.status, TransactionStatus::Pending);
        
        // Add second approval to meet threshold
        let signer2 = Address::generate(&env);
        tx.add_approval(signer2).unwrap();
        assert_eq!(tx.approval_count(), 2);
        assert_eq!(tx.status, TransactionStatus::Approved);
    }
    
    #[test]
    fn test_revoke_approval() {
        let env = create_test_env();
        let to = Address::generate(&env);
        let proposer = Address::generate(&env);
        let signer = Address::generate(&env);
        
        let mut tx = Transaction::new(
            1, 1, to, 1000, String::from_str(&env, "Test"),
            2, proposer, 1000,
        );
        
        tx.add_approval(signer.clone()).unwrap();
        assert_eq!(tx.approval_count(), 1);
        
        tx.revoke_approval(signer).unwrap();
        assert_eq!(tx.approval_count(), 0);
    }
    
    #[test]
    fn test_mark_executed() {
        let env = create_test_env();
        let to = Address::generate(&env);
        let proposer = Address::generate(&env);
        
        let mut tx = Transaction::new(
            1, 1, to, 1000, String::from_str(&env, "Test"),
            1, proposer, 1000,
        );
        
        tx.mark_executed(2000, Some(String::from_str(&env, "0x123")), Some(100));
        assert_eq!(tx.status, TransactionStatus::Executed);
        assert_eq!(tx.executed_at, Some(2000));
        assert_eq!(tx.stellar_tx_hash, Some(String::from_str(&env, "0x123")));
    }
    
    #[test]
    fn test_remaining_approvals() {
        let env = create_test_env();
        let to = Address::generate(&env);
        let proposer = Address::generate(&env);
        
        let mut tx = Transaction::new(
            1, 1, to, 1000, String::from_str(&env, "Test"),
            3, proposer, 1000,
        );
        
        assert_eq!(tx.remaining_approvals(), 3);
        
        let signer1 = Address::generate(&env);
        tx.add_approval(signer1).unwrap();
        assert_eq!(tx.remaining_approvals(), 2);
    }
    
    #[test]
    fn test_approval_percentage() {
        let env = create_test_env();
        let to = Address::generate(&env);
        let proposer = Address::generate(&env);
        
        let mut tx = Transaction::new(
            1, 1, to, 1000, String::from_str(&env, "Test"),
            4, proposer, 1000,
        );
        
        assert_eq!(tx.approval_percentage(), 0);
        
        let signer = Address::generate(&env);
        tx.add_approval(signer).unwrap();
        assert_eq!(tx.approval_percentage(), 25);
    }
}