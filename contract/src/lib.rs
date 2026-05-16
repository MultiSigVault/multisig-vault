//! # MultiSig Vault Contract
//!
//! A production-ready multi-signature treasury vault for DAOs and teams on Stellar Soroban.
//!
//! ## Features
//! - Multi-signature escrow with configurable thresholds (2-of-3, 3-of-5, etc.)
//! - Spending policies per signer (daily/weekly/monthly limits)
//! - Time-locked withdrawals for large transfers
//! - Scheduled recurring payments (payroll, subscriptions)
//! - Social recovery with guardians
//! - IPFS-backed immutable audit logging
//!
//! ## Contract Functions
//! - `create_vault` - Create a new multi-sig vault
//! - `submit_transaction` - Propose a new transaction
//! - `approve_transaction` - Approve a pending transaction
//! - `revoke_approval` - Revoke an existing approval
//! - `execute_transaction` - Execute after threshold met
//! - `set_spending_policy` - Set limits per signer
//! - `add_guardian` - Add recovery guardian
//! - `initiate_recovery` - Start key recovery process
//! - `create_timelock` - Add time delay to transaction
//! - `schedule_transaction` - Set recurring payment

#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

mod vault;
mod transaction;
mod policy;
mod recovery;
mod timelock;
mod scheduled;
mod audit;
mod test;

pub use vault::{Vault, VaultStorage};
pub use transaction::{Transaction, TransactionStatus, TransactionManager};
pub use policy::{SpendingPolicy, SpendingTracker, PolicyStorage};
pub use recovery::{RecoveryData, RecoveryStatus, GuardianManager, RecoveryConfig};
pub use timelock::{TimeLock, TimeLockStatus, TimeLockPolicy, TimeLockQueue};
pub use scheduled::{ScheduledTransaction, ScheduleFrequency, ScheduleStatus, ScheduleManager};
pub use audit::{AuditEntry, AuditAction, AuditLog, AuditMetrics, SecurityAlert, AlertSeverity};

/// Contract errors
#[derive(Debug, PartialEq, Eq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Only authorized participants can perform this action
    NotAuthorized = 1,
    /// Vault ID does not exist
    VaultNotFound = 2,
    /// Transaction ID does not exist
    TransactionNotFound = 3,
    /// Not enough approvals yet to execute
    InsufficientApprovals = 4,
    /// Vault already exists for this ID
    VaultAlreadyExists = 5,
    /// Threshold cannot exceed number of signers
    ThresholdTooHigh = 6,
    /// Invalid signer list (must have at least 1 signer)
    InvalidSigners = 7,
    /// Invalid threshold (must be at least 1)
    InvalidThreshold = 8,
    /// Transaction is not pending
    TransactionNotPending = 9,
    /// Transaction already executed
    TransactionAlreadyExecuted = 10,
    /// Invalid spending policy configuration
    InvalidPolicy = 11,
    /// Spending limit exceeded
    PolicyViolation = 12,
    /// Transfer failed
    TransferFailed = 13,
    /// Guardian already exists
    GuardianAlreadyExists = 14,
    /// Not enough guardians for recovery
    InsufficientGuardians = 15,
    /// Invalid recovery state
    InvalidRecoveryState = 16,
    /// Time lock not expired
    TimeLockActive = 17,
    /// Invalid schedule configuration
    InvalidSchedule = 18,
    /// Scheduled transaction not ready
    ScheduleNotReady = 19,
    /// Insufficient vault balance
    InsufficientBalance = 20,
    /// Invalid amount
    InvalidAmount = 21,
    /// Duplicate transaction
    DuplicateTransaction = 22,
    /// Transaction already approved
    AlreadyApproved = 23,
    /// Transaction already revoked
    AlreadyRevoked = 24,
    /// Recovery already in progress
    RecoveryInProgress = 25,
    /// Recovery not found
    RecoveryNotFound = 26,
    /// Guardian threshold not met
    GuardianThresholdNotMet = 27,
    /// Timelock not found
    TimelockNotFound = 28,
    /// Schedule not found
    ScheduleNotFound = 29,
    /// Invalid frequency
    InvalidFrequency = 30,
    /// Audit log full
    AuditLogFull = 31,
    /// IPFS hash invalid
    InvalidIpfsHash = 32,
}

impl From<Error> for soroban_sdk::Error {
    fn from(e: Error) -> Self {
        soroban_sdk::Error::from_contract_error(e as u32)
    }
}

/// Main contract interface
#[contract]
pub trait MultiSigVaultTrait {
    /// Create a new multi-signature vault
    ///
    /// # Arguments
    /// * `signers` - List of signer addresses
    /// * `threshold` - Number of approvals required
    /// * `name` - Vault name
    /// * `description` - Vault description
    ///
    /// # Returns
    /// * `u32` - Vault ID
    fn create_vault(
        env: Env,
        signers: Vec<Address>,
        threshold: u32,
        name: String,
        description: String,
    ) -> u32;

    /// Get vault details by ID
    fn get_vault(env: Env, vault_id: u32) -> Vault;

    /// Get all vaults for a signer
    fn get_vaults_by_signer(env: Env, signer: Address) -> Vec<u32>;

    /// Deposit native tokens to vault
    fn deposit(env: Env, vault_id: u32, amount: i128);

    /// Withdraw native tokens from vault (requires approval)
    fn withdraw(env: Env, vault_id: u32, to: Address, amount: i128);

    /// Submit a new transaction to the vault
    ///
    /// # Arguments
    /// * `vault_id` - Target vault ID
    /// * `to` - Recipient address
    /// * `amount` - Amount to transfer
    /// * `data` - Optional transaction data
    ///
    /// # Returns
    /// * `u32` - Transaction ID
    fn submit_transaction(
        env: Env,
        vault_id: u32,
        to: Address,
        amount: i128,
        data: String,
    ) -> u32;

    /// Approve a pending transaction
    ///
    /// # Arguments
    /// * `vault_id` - Target vault ID
    /// * `tx_id` - Transaction ID
    fn approve_transaction(env: Env, vault_id: u32, tx_id: u32);

    /// Execute a transaction after threshold is met
    ///
    /// # Arguments
    /// * `vault_id` - Target vault ID
    /// * `tx_id` - Transaction ID
    fn execute_transaction(env: Env, vault_id: u32, tx_id: u32);

    /// Revoke an approval
    ///
    /// # Arguments
    /// * `vault_id` - Target vault ID
    /// * `tx_id` - Transaction ID
    fn revoke_approval(env: Env, vault_id: u32, tx_id: u32);

    /// Reject a transaction
    fn reject_transaction(env: Env, vault_id: u32, tx_id: u32);

    /// Cancel a transaction
    fn cancel_transaction(env: Env, vault_id: u32, tx_id: u32);

    /// Get transaction details
    fn get_transaction(env: Env, vault_id: u32, tx_id: u32) -> Transaction;

    /// Get all transactions for a vault
    fn get_transactions(env: Env, vault_id: u32) -> Vec<u32>;

    /// Get pending transactions for a vault
    fn get_pending_transactions(env: Env, vault_id: u32) -> Vec<u32>;

    /// Set spending policy for a signer
    fn set_spending_policy(
        env: Env,
        vault_id: u32,
        signer: Address,
        daily_limit: i128,
        weekly_limit: i128,
        monthly_limit: i128,
    );

    /// Get spending policy for a signer
    fn get_spending_policy(env: Env, vault_id: u32, signer: Address) -> SpendingPolicy;

    /// Get spending tracker for a signer
    fn get_spending_tracker(env: Env, vault_id: u32, signer: Address) -> SpendingTracker;

    /// Add a recovery guardian
    fn add_guardian(env: Env, vault_id: u32, guardian: Address);

    /// Remove a recovery guardian
    fn remove_guardian(env: Env, vault_id: u32, guardian: Address);

    /// Get all guardians for a vault
    fn get_guardians(env: Env, vault_id: u32) -> Vec<Address>;

    /// Initiate social recovery
    fn initiate_recovery(env: Env, vault_id: u32, new_signer: Address, reason: String);

    /// Approve recovery (by guardian)
    fn approve_recovery(env: Env, vault_id: u32);

    /// Complete recovery after threshold met
    fn complete_recovery(env: Env, vault_id: u32);

    /// Cancel recovery
    fn cancel_recovery(env: Env, vault_id: u32);

    /// Get recovery status
    fn get_recovery(env: Env, vault_id: u32) -> Option<RecoveryData>;

    /// Create a time-locked transaction
    fn create_timelock(
        env: Env,
        vault_id: u32,
        tx_id: u32,
        delay_seconds: u64,
        reason: String,
    ) -> TimeLock;

    /// Get time lock for a transaction
    fn get_timelock(env: Env, vault_id: u32, tx_id: u32) -> Option<TimeLock>;

    /// Cancel time lock
    fn cancel_timelock(env: Env, vault_id: u32, tx_id: u32);

    /// Process expired time locks (callable by anyone)
    fn process_timelocks(env: Env, vault_id: u32);

    /// Schedule a recurring transaction
    fn schedule_transaction(
        env: Env,
        vault_id: u32,
        to: Address,
        amount: i128,
        frequency: u32,
        start_time: u64,
        end_time: Option<u64>,
        max_executions: u32,
        data: String,
    ) -> u32;

    /// Cancel a scheduled transaction
    fn cancel_schedule(env: Env, vault_id: u32, schedule_id: u32);

    /// Pause a scheduled transaction
    fn pause_schedule(env: Env, vault_id: u32, schedule_id: u32);

    /// Resume a scheduled transaction
    fn resume_schedule(env: Env, vault_id: u32, schedule_id: u32);

    /// Get schedule details
    fn get_schedule(env: Env, vault_id: u32, schedule_id: u32) -> Option<ScheduledTransaction>;

    /// Process due schedules (callable by anyone)
    fn process_schedules(env: Env, vault_id: u32);

    /// Add audit entry
    fn add_audit_entry(
        env: Env,
        vault_id: u32,
        action: String,
        actor: Address,
        metadata: String,
        ipfs_hash: String,
    );

    /// Get audit log for a vault
    fn get_audit_log(env: Env, vault_id: u32) -> Vec<u32>;

    /// Get audit entry by ID
    fn get_audit_entry(env: Env, vault_id: u32, audit_id: u32) -> Option<AuditEntry>;

    /// Get audit metrics
    fn get_audit_metrics(env: Env, vault_id: u32) -> AuditMetrics;

    /// Get vault balance
    fn get_balance(env: Env, vault_id: u32) -> i128;

    /// Get vault statistics
    fn get_vault_stats(env: Env, vault_id: u32) -> VaultStats;
}

/// Vault statistics
#[derive(Clone, Debug)]
pub struct VaultStats {
    pub total_transactions: u32,
    pub executed_transactions: u32,
    pub pending_transactions: u32,
    pub total_volume: i128,
    pub active_signers: u32,
    pub guardians_count: u32,
    pub active_schedules: u32,
    pub active_timelocks: u32,
}

/// Contract implementation
#[contract]
pub struct MultiSigVaultContract;

#[contractimpl]
impl MultiSigVaultTrait for MultiSigVaultContract {
    fn create_vault(
        env: Env,
        signers: Vec<Address>,
        threshold: u32,
        name: String,
        description: String,
    ) -> u32 {
        let caller = env.invoker();
        let vault_id = VaultStorage::next_id(&env);
        
        let vault = match Vault::new(
            vault_id,
            signers,
            threshold,
            name,
            description,
            caller,
            env.ledger().timestamp(),
        ) {
            Ok(v) => v,
            Err(e) => panic!("{}", e as u32),
        };
        
        VaultStorage::save(&env, &vault);
        
        // Add audit entry
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            AuditAction::VaultCreated.as_str().to_string(),
            caller,
            format!("Vault created with {} signers, threshold {}", vault.signers.len(), threshold),
            String::from_str(&env, ""),
        );
        
        vault_id
    }
    
    fn get_vault(env: Env, vault_id: u32) -> Vault {
        match VaultStorage::load(&env, vault_id) {
            Some(vault) => vault,
            None => panic!("{}", Error::VaultNotFound as u32),
        }
    }
    
    fn get_vaults_by_signer(env: Env, signer: Address) -> Vec<u32> {
        VaultStorage::get_vaults_by_signer(&env, signer)
    }
    
    fn deposit(env: Env, vault_id: u32, amount: i128) {
        let caller = env.invoker();
        let mut vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        if amount <= 0 {
            panic!("{}", Error::InvalidAmount as u32);
        }
        
        // Transfer tokens from caller to contract
        caller.transfer(&env.current_contract_address(), &amount);
        
        vault.update_balance(amount);
        VaultStorage::save(&env, &vault);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "DEPOSIT".to_string(),
            caller,
            format!("Deposited {} stroops", amount),
            String::from_str(&env, ""),
        );
    }
    
    fn withdraw(env: Env, vault_id: u32, to: Address, amount: i128) {
        let caller = env.invoker();
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        if !vault.is_signer(&caller) {
            panic!("{}", Error::NotAuthorized as u32);
        }
        
        if amount <= 0 {
            panic!("{}", Error::InvalidAmount as u32);
        }
        
        if vault.balance < amount {
            panic!("{}", Error::InsufficientBalance as u32);
        }
        
        // This would be a transaction that needs approval
        // Withdraw is handled via submit_transaction instead
        panic!("Use submit_transaction for withdrawals");
    }
    
    fn submit_transaction(
        env: Env,
        vault_id: u32,
        to: Address,
        amount: i128,
        data: String,
    ) -> u32 {
        let caller = env.invoker();
        let mut vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        if !vault.is_signer(&caller) {
            panic!("{}", Error::NotAuthorized as u32);
        }
        
        if amount <= 0 {
            panic!("{}", Error::InvalidAmount as u32);
        }
        
        if vault.balance < amount {
            panic!("{}", Error::InsufficientBalance as u32);
        }
        
        // Check spending policy
        if let Err(e) = vault.check_spending_limit(&env, &caller, amount) {
            panic!("{}", e as u32);
        }
        
        let mut tx_manager = TransactionManager::load(&env, vault_id);
        let tx_id = tx_manager.get_next_id();
        
        let transaction = Transaction::new(
            tx_id,
            vault_id,
            to,
            amount,
            data,
            vault.threshold,
            caller,
            env.ledger().timestamp(),
        );
        
        tx_manager.add_transaction(&env, vault_id, transaction);
        tx_manager.save(&env, vault_id);
        
        vault.increment_transaction_count();
        VaultStorage::save(&env, &vault);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "TRANSACTION_SUBMITTED".to_string(),
            caller,
            format!("Submitted tx {} for {} stroops to {:?}", tx_id, amount, to),
            String::from_str(&env, ""),
        );
        
        tx_id
    }
    
    fn approve_transaction(env: Env, vault_id: u32, tx_id: u32) {
        let caller = env.invoker();
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        if !vault.is_signer(&caller) {
            panic!("{}", Error::NotAuthorized as u32);
        }
        
        let mut tx_manager = TransactionManager::load(&env, vault_id);
        let mut transaction = match tx_manager.get_transaction(&env, vault_id, tx_id) {
            Some(tx) => tx,
            None => panic!("{}", Error::TransactionNotFound as u32),
        };
        
        if let Err(e) = transaction.add_approval(caller.clone()) {
            panic!("{}", e as u32);
        }
        
        tx_manager.update_transaction(&env, vault_id, &transaction);
        tx_manager.save(&env, vault_id);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "TRANSACTION_APPROVED".to_string(),
            caller,
            format!("Approved tx {} ({}/{})", tx_id, transaction.approval_count(), transaction.threshold),
            String::from_str(&env, ""),
        );
    }
    
    fn revoke_approval(env: Env, vault_id: u32, tx_id: u32) {
        let caller = env.invoker();
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        if !vault.is_signer(&caller) {
            panic!("{}", Error::NotAuthorized as u32);
        }
        
        let mut tx_manager = TransactionManager::load(&env, vault_id);
        let mut transaction = match tx_manager.get_transaction(&env, vault_id, tx_id) {
            Some(tx) => tx,
            None => panic!("{}", Error::TransactionNotFound as u32),
        };
        
        if let Err(e) = transaction.revoke_approval(caller.clone()) {
            panic!("{}", e as u32);
        }
        
        tx_manager.update_transaction(&env, vault_id, &transaction);
        tx_manager.save(&env, vault_id);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "APPROVAL_REVOKED".to_string(),
            caller,
            format!("Revoked approval for tx {}", tx_id),
            String::from_str(&env, ""),
        );
    }
    
    fn execute_transaction(env: Env, vault_id: u32, tx_id: u32) {
        let caller = env.invoker();
        let mut vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        let mut tx_manager = TransactionManager::load(&env, vault_id);
        let mut transaction = match tx_manager.get_transaction(&env, vault_id, tx_id) {
            Some(tx) => tx,
            None => panic!("{}", Error::TransactionNotFound as u32),
        };
        
        if !transaction.is_ready_for_execution() {
            panic!("{}", Error::InsufficientApprovals as u32);
        }
        
        // Check timelock if exists
        let timelock_manager = timelock::TimelockManager::load(&env, vault_id);
        if let Some(timelock) = timelock_manager.get_timelock(&env, vault_id, tx_id) {
            if timelock.status == TimeLockStatus::Active {
                if !timelock.is_expired(env.ledger().timestamp()) {
                    panic!("{}", Error::TimeLockActive as u32);
                }
            }
        }
        
        // Transfer tokens
        env.current_contract_address().transfer(&transaction.to, &transaction.amount);
        
        transaction.mark_executed(env.ledger().timestamp());
        vault.update_balance(-transaction.amount);
        
        tx_manager.update_transaction(&env, vault_id, &transaction);
        tx_manager.save(&env, vault_id);
        VaultStorage::save(&env, &vault);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "TRANSACTION_EXECUTED".to_string(),
            caller,
            format!("Executed tx {} for {} stroops to {:?}", tx_id, transaction.amount, transaction.to),
            String::from_str(&env, ""),
        );
    }
    
    fn reject_transaction(env: Env, vault_id: u32, tx_id: u32) {
        let caller = env.invoker();
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        if !vault.is_signer(&caller) {
            panic!("{}", Error::NotAuthorized as u32);
        }
        
        let mut tx_manager = TransactionManager::load(&env, vault_id);
        let mut transaction = match tx_manager.get_transaction(&env, vault_id, tx_id) {
            Some(tx) => tx,
            None => panic!("{}", Error::TransactionNotFound as u32),
        };
        
        transaction.mark_rejected();
        tx_manager.update_transaction(&env, vault_id, &transaction);
        tx_manager.save(&env, vault_id);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "TRANSACTION_REJECTED".to_string(),
            caller,
            format!("Rejected tx {}", tx_id),
            String::from_str(&env, ""),
        );
    }
    
    fn cancel_transaction(env: Env, vault_id: u32, tx_id: u32) {
        let caller = env.invoker();
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        let mut tx_manager = TransactionManager::load(&env, vault_id);
        let mut transaction = match tx_manager.get_transaction(&env, vault_id, tx_id) {
            Some(tx) => tx,
            None => panic!("{}", Error::TransactionNotFound as u32),
        };
        
        if transaction.proposer != caller && !vault.is_signer(&caller) {
            panic!("{}", Error::NotAuthorized as u32);
        }
        
        transaction.mark_cancelled();
        tx_manager.update_transaction(&env, vault_id, &transaction);
        tx_manager.save(&env, vault_id);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "TRANSACTION_CANCELLED".to_string(),
            caller,
            format!("Cancelled tx {}", tx_id),
            String::from_str(&env, ""),
        );
    }
    
    fn get_transaction(env: Env, vault_id: u32, tx_id: u32) -> Transaction {
        let tx_manager = TransactionManager::load(&env, vault_id);
        match tx_manager.get_transaction(&env, vault_id, tx_id) {
            Some(tx) => tx,
            None => panic!("{}", Error::TransactionNotFound as u32),
        }
    }
    
    fn get_transactions(env: Env, vault_id: u32) -> Vec<u32> {
        let tx_manager = TransactionManager::load(&env, vault_id);
        tx_manager.transaction_ids
    }
    
    fn get_pending_transactions(env: Env, vault_id: u32) -> Vec<u32> {
        let tx_manager = TransactionManager::load(&env, vault_id);
        let mut pending = Vec::new(&env);
        
        for tx_id in tx_manager.transaction_ids.iter() {
            if let Some(tx) = tx_manager.get_transaction(&env, vault_id, *tx_id) {
                if tx.status == TransactionStatus::Pending || tx.status == TransactionStatus::Approved {
                    pending.push_back(*tx_id);
                }
            }
        }
        
        pending
    }
    
    fn set_spending_policy(
        env: Env,
        vault_id: u32,
        signer: Address,
        daily_limit: i128,
        weekly_limit: i128,
        monthly_limit: i128,
    ) {
        let caller = env.invoker();
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        if !vault.is_signer(&caller) && caller != vault.creator {
            panic!("{}", Error::NotAuthorized as u32);
        }
        
        let policy = SpendingPolicy::new(daily_limit, weekly_limit, monthly_limit);
        policy::PolicyStorage::save_spending_policy(&env, vault_id, signer.clone(), &policy);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "POLICY_SET".to_string(),
            caller,
            format!("Set policy for signer {:?}: daily={}, weekly={}, monthly={}", signer, daily_limit, weekly_limit, monthly_limit),
            String::from_str(&env, ""),
        );
    }
    
    fn get_spending_policy(env: Env, vault_id: u32, signer: Address) -> SpendingPolicy {
        match policy::PolicyStorage::load_spending_policy(&env, vault_id, signer) {
            Some(policy) => policy,
            None => SpendingPolicy::default(),
        }
    }
    
    fn get_spending_tracker(env: Env, vault_id: u32, signer: Address) -> SpendingTracker {
        match policy::PolicyStorage::load_spending_tracker(&env, vault_id, signer) {
            Some(tracker) => tracker,
            None => SpendingTracker::new(env.ledger().timestamp()),
        }
    }
    
    fn add_guardian(env: Env, vault_id: u32, guardian: Address) {
        let caller = env.invoker();
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        if !vault.is_signer(&caller) && caller != vault.creator {
            panic!("{}", Error::NotAuthorized as u32);
        }
        
        match GuardianManager::add_guardian(&env, vault_id, guardian.clone(), env.ledger().timestamp()) {
            Ok(_) => {}
            Err(e) => panic!("{}", e as u32),
        }
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "GUARDIAN_ADDED".to_string(),
            caller,
            format!("Added guardian {:?}", guardian),
            String::from_str(&env, ""),
        );
    }
    
    fn remove_guardian(env: Env, vault_id: u32, guardian: Address) {
        let caller = env.invoker();
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        if !vault.is_signer(&caller) && caller != vault.creator {
            panic!("{}", Error::NotAuthorized as u32);
        }
        
        match GuardianManager::remove_guardian(&env, vault_id, guardian.clone()) {
            Ok(_) => {}
            Err(e) => panic!("{}", e as u32),
        }
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "GUARDIAN_REMOVED".to_string(),
            caller,
            format!("Removed guardian {:?}", guardian),
            String::from_str(&env, ""),
        );
    }
    
    fn get_guardians(env: Env, vault_id: u32) -> Vec<Address> {
        GuardianManager::get_guardians(&env, vault_id)
    }
    
    fn initiate_recovery(env: Env, vault_id: u32, new_signer: Address, reason: String) {
        let caller = env.invoker();
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        let guardians = GuardianManager::get_guardians(&env, vault_id);
        let threshold = (guardians.len() as u32 * 2 / 3).max(1);
        
        let recovery = match RecoveryData::new(
            vault_id,
            new_signer,
            guardians,
            threshold,
            env.ledger().timestamp(),
            env.ledger().timestamp() + 604800, // 7 days expiry
            reason.clone(),
        ) {
            Ok(r) => r,
            Err(e) => panic!("{}", e as u32),
        };
        
        recovery::RecoveryStorage::save(&env, vault_id, &recovery);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "RECOVERY_INITIATED".to_string(),
            caller,
            format!("Initiated recovery to add signer {:?}", new_signer),
            String::from_str(&env, ""),
        );
    }
    
    fn approve_recovery(env: Env, vault_id: u32) {
        let caller = env.invoker();
        let mut recovery = match recovery::RecoveryStorage::load(&env, vault_id) {
            Some(r) => r,
            None => panic!("{}", Error::RecoveryNotFound as u32),
        };
        
        if let Err(e) = recovery.add_approval(caller.clone()) {
            panic!("{}", e as u32);
        }
        
        recovery::RecoveryStorage::save(&env, vault_id, &recovery);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "RECOVERY_APPROVED".to_string(),
            caller,
            format!("Approved recovery ({}/{})", recovery.approval_count(), recovery.guardian_threshold),
            String::from_str(&env, ""),
        );
    }
    
    fn complete_recovery(env: Env, vault_id: u32) {
        let caller = env.invoker();
        let mut recovery = match recovery::RecoveryStorage::load(&env, vault_id) {
            Some(r) => r,
            None => panic!("{}", Error::RecoveryNotFound as u32),
        };
        
        if recovery.is_expired(env.ledger().timestamp()) {
            panic!("{}", Error::InvalidRecoveryState as u32);
        }
        
        if let Err(e) = recovery.complete() {
            panic!("{}", e as u32);
        }
        
        // Add new signer to vault
        let mut vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        vault.signers.push_back(recovery.new_signer.clone());
        VaultStorage::save(&env, &vault);
        
        recovery::RecoveryStorage::save(&env, vault_id, &recovery);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "RECOVERY_COMPLETED".to_string(),
            caller,
            format!("Recovery completed. New signer: {:?}", recovery.new_signer),
            String::from_str(&env, ""),
        );
    }
    
    fn cancel_recovery(env: Env, vault_id: u32) {
        let caller = env.invoker();
        let mut recovery = match recovery::RecoveryStorage::load(&env, vault_id) {
            Some(r) => r,
            None => panic!("{}", Error::RecoveryNotFound as u32),
        };
        
        recovery.cancel();
        recovery::RecoveryStorage::save(&env, vault_id, &recovery);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "RECOVERY_CANCELLED".to_string(),
            caller,
            "Recovery cancelled".to_string(),
            String::from_str(&env, ""),
        );
    }
    
    fn get_recovery(env: Env, vault_id: u32) -> Option<RecoveryData> {
        recovery::RecoveryStorage::load(&env, vault_id)
    }
    
    fn create_timelock(
        env: Env,
        vault_id: u32,
        tx_id: u32,
        delay_seconds: u64,
        reason: String,
    ) -> TimeLock {
        let caller = env.invoker();
        
        let timelock = TimeLock::new(
            tx_id,
            vault_id,
            env.ledger().timestamp(),
            delay_seconds,
            reason,
            None,
        );
        
        let mut timelock_manager = timelock::TimelockManager::load(&env, vault_id);
        timelock_manager.add_timelock(&env, vault_id, &timelock);
        timelock_manager.save(&env, vault_id);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "TIMELOCK_CREATED".to_string(),
            caller,
            format!("Created timelock for tx {} with {}s delay", tx_id, delay_seconds),
            String::from_str(&env, ""),
        );
        
        timelock
    }
    
    fn get_timelock(env: Env, vault_id: u32, tx_id: u32) -> Option<TimeLock> {
        let timelock_manager = timelock::TimelockManager::load(&env, vault_id);
        timelock_manager.get_timelock(&env, vault_id, tx_id)
    }
    
    fn cancel_timelock(env: Env, vault_id: u32, tx_id: u32) {
        let caller = env.invoker();
        let mut timelock_manager = timelock::TimelockManager::load(&env, vault_id);
        
        match timelock_manager.cancel_timelock(&env, vault_id, tx_id) {
            Ok(_) => {}
            Err(e) => panic!("{}", e as u32),
        }
        
        timelock_manager.save(&env, vault_id);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "TIMELOCK_CANCELLED".to_string(),
            caller,
            format!("Cancelled timelock for tx {}", tx_id),
            String::from_str(&env, ""),
        );
    }
    
    fn process_timelocks(env: Env, vault_id: u32) {
        let mut timelock_manager = timelock::TimelockManager::load(&env, vault_id);
        timelock_manager.process_expired(&env, vault_id);
        timelock_manager.save(&env, vault_id);
    }
    
    fn schedule_transaction(
        env: Env,
        vault_id: u32,
        to: Address,
        amount: i128,
        frequency: u32,
        start_time: u64,
        end_time: Option<u64>,
        max_executions: u32,
        data: String,
    ) -> u32 {
        let caller = env.invoker();
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        if !vault.is_signer(&caller) {
            panic!("{}", Error::NotAuthorized as u32);
        }
        
        let freq = match frequency {
            0 => ScheduleFrequency::OneTime,
            1 => ScheduleFrequency::Daily,
            2 => ScheduleFrequency::Weekly,
            3 => ScheduleFrequency::Monthly,
            4 => ScheduleFrequency::Yearly,
            _ => ScheduleFrequency::Custom(frequency as u64),
        };
        
        let mut schedule_manager = scheduled::ScheduleManager::load(&env, vault_id);
        let schedule_id = schedule_manager.get_next_id();
        
        let schedule = match ScheduledTransaction::new(
            schedule_id,
            vault_id,
            to,
            amount,
            freq,
            start_time,
            end_time,
            max_executions,
            data,
            caller.clone(),
            env.ledger().timestamp(),
        ) {
            Ok(s) => s,
            Err(e) => panic!("{}", e as u32),
        };
        
        schedule_manager.add_schedule(&env, vault_id, &schedule);
        schedule_manager.save(&env, vault_id);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "SCHEDULE_CREATED".to_string(),
            caller,
            format!("Created schedule {} for {} stroops", schedule_id, amount),
            String::from_str(&env, ""),
        );
        
        schedule_id
    }
    
    fn cancel_schedule(env: Env, vault_id: u32, schedule_id: u32) {
        let caller = env.invoker();
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        if !vault.is_signer(&caller) {
            panic!("{}", Error::NotAuthorized as u32);
        }
        
        let mut schedule_manager = scheduled::ScheduleManager::load(&env, vault_id);
        match schedule_manager.cancel_schedule(&env, vault_id, schedule_id) {
            Ok(_) => {}
            Err(e) => panic!("{}", e as u32),
        }
        schedule_manager.save(&env, vault_id);
        
        audit::add_audit_entry_internal(
            &env,
            vault_id,
            "SCHEDULE_CANCELLED".to_string(),
            caller,
            format!("Cancelled schedule {}", schedule_id),
            String::from_str(&env, ""),
        );
    }
    
    fn pause_schedule(env: Env, vault_id: u32, schedule_id: u32) {
        let caller = env.invoker();
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        if !vault.is_signer(&caller) {
            panic!("{}", Error::NotAuthorized as u32);
        }
        
        let mut schedule_manager = scheduled::ScheduleManager::load(&env, vault_id);
        match schedule_manager.pause_schedule(&env, vault_id, schedule_id) {
            Ok(_) => {}
            Err(e) => panic!("{}", e as u32),
        }
        schedule_manager.save(&env, vault_id);
    }
    
    fn resume_schedule(env: Env, vault_id: u32, schedule_id: u32) {
        let caller = env.invoker();
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        if !vault.is_signer(&caller) {
            panic!("{}", Error::NotAuthorized as u32);
        }
        
        let mut schedule_manager = scheduled::ScheduleManager::load(&env, vault_id);
        match schedule_manager.resume_schedule(&env, vault_id, schedule_id) {
            Ok(_) => {}
            Err(e) => panic!("{}", e as u32),
        }
        schedule_manager.save(&env, vault_id);
    }
    
    fn get_schedule(env: Env, vault_id: u32, schedule_id: u32) -> Option<ScheduledTransaction> {
        let schedule_manager = scheduled::ScheduleManager::load(&env, vault_id);
        schedule_manager.get_schedule(&env, vault_id, schedule_id)
    }
    
    fn process_schedules(env: Env, vault_id: u32) {
        let mut schedule_manager = scheduled::ScheduleManager::load(&env, vault_id);
        schedule_manager.process_due(&env, vault_id);
        schedule_manager.save(&env, vault_id);
    }
    
    fn add_audit_entry(
        env: Env,
        vault_id: u32,
        action: String,
        actor: Address,
        metadata: String,
        ipfs_hash: String,
    ) {
        let caller = env.invoker();
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        if !vault.is_signer(&caller) && caller != vault.creator {
            panic!("{}", Error::NotAuthorized as u32);
        }
        
        audit::add_audit_entry_internal(&env, vault_id, action, actor, metadata, ipfs_hash);
    }
    
    fn get_audit_log(env: Env, vault_id: u32) -> Vec<u32> {
        let audit_log = audit::AuditLog::load(&env, vault_id);
        audit_log.audit_ids
    }
    
    fn get_audit_entry(env: Env, vault_id: u32, audit_id: u32) -> Option<AuditEntry> {
        audit::AuditLog::get_entry(&env, vault_id, audit_id)
    }
    
    fn get_audit_metrics(env: Env, vault_id: u32) -> AuditMetrics {
        let audit_log = audit::AuditLog::load(&env, vault_id);
        audit_log.calculate_metrics(&env, vault_id)
    }
    
    fn get_balance(env: Env, vault_id: u32) -> i128 {
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        vault.balance
    }
    
    fn get_vault_stats(env: Env, vault_id: u32) -> VaultStats {
        let vault = match VaultStorage::load(&env, vault_id) {
            Some(v) => v,
            None => panic!("{}", Error::VaultNotFound as u32),
        };
        
        let tx_manager = TransactionManager::load(&env, vault_id);
        let mut executed = 0;
        let mut pending = 0;
        let mut total_volume = 0;
        
        for tx_id in tx_manager.transaction_ids.iter() {
            if let Some(tx) = tx_manager.get_transaction(&env, vault_id, *tx_id) {
                match tx.status {
                    TransactionStatus::Executed => {
                        executed += 1;
                        total_volume += tx.amount;
                    }
                    TransactionStatus::Pending | TransactionStatus::Approved => pending += 1,
                    _ => {}
                }
            }
        }
        
        let schedule_manager = scheduled::ScheduleManager::load(&env, vault_id);
        let active_schedules = schedule_manager.schedules.len() as u32;
        
        let timelock_manager = timelock::TimelockManager::load(&env, vault_id);
        let active_timelocks = timelock_manager.active_locks.len() as u32;
        
        VaultStats {
            total_transactions: tx_manager.transaction_ids.len() as u32,
            executed_transactions: executed,
            pending_transactions: pending,
            total_volume,
            active_signers: vault.signers.len() as u32,
            guardians_count: GuardianManager::guardian_count(&env, vault_id),
            active_schedules,
            active_timelocks,
        }
    }
}