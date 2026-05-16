//! # Time Lock Module
//!
//! Implements time-locked withdrawals for large transfers.
//! Adds a mandatory waiting period before funds can be released.
//! Supports tiered delays based on amount thresholds.

use soroban_sdk::{Address, Env, Vec};
use soroban_sdk::storage::StorageKey;

use crate::Error;

/// Time lock status
#[derive(Clone, Debug, PartialEq)]
pub enum TimeLockStatus {
    /// Time lock is active (waiting period)
    Active,
    /// Time lock has expired (ready for execution)
    Expired,
    /// Time lock was cancelled
    Cancelled,
    /// Time lock has been executed
    Executed,
}

/// Time lock configuration
#[derive(Clone, Debug)]
pub struct TimeLock {
    /// Transaction ID this time lock applies to
    pub transaction_id: u32,
    /// Vault ID
    pub vault_id: u32,
    /// Time when the lock was created
    pub created_at: u64,
    /// Time when the lock expires (release_time)
    pub release_time: u64,
    /// Current status
    pub status: TimeLockStatus,
    /// Reason for time lock (e.g., "Large transfer requires 24h delay")
    pub reason: String,
    /// Minimum approval threshold override (if any)
    pub custom_threshold: Option<u32>,
    /// Emergency override signers who can bypass timelock
    pub emergency_override_signers: Vec<Address>,
    /// Whether this timelock has been emergency overridden
    pub emergency_overridden: bool,
}

impl TimeLock {
    /// Create a new time lock
    pub fn new(
        transaction_id: u32,
        vault_id: u32,
        created_at: u64,
        delay_seconds: u64,
        reason: String,
        custom_threshold: Option<u32>,
    ) -> Self {
        Self {
            transaction_id,
            vault_id,
            created_at,
            release_time: created_at + delay_seconds,
            status: TimeLockStatus::Active,
            reason,
            custom_threshold,
            emergency_override_signers: Vec::new(&soroban_sdk::Env::default()),
            emergency_overridden: false,
        }
    }
    
    /// Create with emergency override signers
    pub fn new_with_emergency(
        transaction_id: u32,
        vault_id: u32,
        created_at: u64,
        delay_seconds: u64,
        reason: String,
        custom_threshold: Option<u32>,
        emergency_signers: Vec<Address>,
    ) -> Self {
        Self {
            transaction_id,
            vault_id,
            created_at,
            release_time: created_at + delay_seconds,
            status: TimeLockStatus::Active,
            reason,
            custom_threshold,
            emergency_override_signers: emergency_signers,
            emergency_overridden: false,
        }
    }
    
    /// Check if time lock is expired
    pub fn is_expired(&self, current_time: u64) -> bool {
        current_time >= self.release_time
    }
    
    /// Update status based on current time
    pub fn update_status(&mut self, current_time: u64) {
        if self.status == TimeLockStatus::Active && self.is_expired(current_time) {
            self.status = TimeLockStatus::Expired;
        }
    }
    
    /// Cancel the time lock
    pub fn cancel(&mut self) -> Result<(), Error> {
        if self.status == TimeLockStatus::Executed {
            return Err(Error::TransactionAlreadyExecuted);
        }
        
        self.status = TimeLockStatus::Cancelled;
        Ok(())
    }
    
    /// Mark as executed
    pub fn execute(&mut self) -> Result<(), Error> {
        if self.status != TimeLockStatus::Expired {
            return Err(Error::TimeLockActive);
        }
        
        self.status = TimeLockStatus::Executed;
        Ok(())
    }
    
    /// Emergency override (bypass timelock)
    pub fn emergency_override(&mut self, signer: Address) -> Result<(), Error> {
        if !self.emergency_override_signers.contains(&signer) {
            return Err(Error::NotAuthorized);
        }
        
        self.emergency_overridden = true;
        self.status = TimeLockStatus::Expired;
        Ok(())
    }
    
    /// Get remaining time in seconds
    pub fn remaining_time(&self, current_time: u64) -> u64 {
        if current_time >= self.release_time {
            return 0;
        }
        self.release_time - current_time
    }
    
    /// Get remaining time in human-readable format
    pub fn remaining_time_human(&self, current_time: u64) -> String {
        let remaining = self.remaining_time(current_time);
        let days = remaining / 86400;
        let hours = (remaining % 86400) / 3600;
        let minutes = (remaining % 3600) / 60;
        
        if days > 0 {
            String::from_str(&format!("{}d {}h", days, hours))
        } else if hours > 0 {
            String::from_str(&format!("{}h {}m", hours, minutes))
        } else {
            String::from_str(&format!("{}m", minutes))
        }
    }
}

/// Time lock policy for different amount thresholds
#[derive(Clone, Debug)]
pub struct TimeLockPolicy {
    /// Amount threshold that triggers time lock (in stroops)
    pub threshold_amount: i128,
    /// Delay in seconds for amounts above threshold
    pub delay_seconds: u64,
    /// Whether time lock is required for this threshold
    pub is_required: bool,
}

impl Default for TimeLockPolicy {
    fn default() -> Self {
        Self {
            threshold_amount: 0,
            delay_seconds: 86400, // 24 hours
            is_required: true,
        }
    }
}

impl TimeLockPolicy {
    /// Create new policy
    pub fn new(threshold_amount: i128, delay_seconds: u64, is_required: bool) -> Self {
        Self {
            threshold_amount,
            delay_seconds,
            is_required,
        }
    }
}

/// Vault-wide time lock settings
#[derive(Clone, Debug)]
pub struct VaultTimeLockConfig {
    /// Whether time locks are enabled for this vault
    pub enabled: bool,
    /// Default delay for all transactions (if no specific policy applies)
    pub default_delay_seconds: u64,
    /// Tiered policies for different amounts
    pub policies: Vec<TimeLockPolicy>,
    /// Maximum delay allowed (security constraint)
    pub max_delay_seconds: u64,
    /// Minimum delay allowed
    pub min_delay_seconds: u64,
    /// Addresses exempt from time locks (e.g., admin, trusted)
    pub exempt_addresses: Vec<Address>,
    /// Whether to require 2FA for timelock override
    pub require_2fa_for_override: bool,
    /// Maximum number of active timelocks per vault
    pub max_active_timelocks: u32,
}

impl Default for VaultTimeLockConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            default_delay_seconds: 3600, // 1 hour
            policies: Vec::new(&soroban_sdk::Env::default()),
            max_delay_seconds: 604800, // 7 days
            min_delay_seconds: 60,      // 1 minute minimum
            exempt_addresses: Vec::new(&soroban_sdk::Env::default()),
            require_2fa_for_override: false,
            max_active_timelocks: 50,
        }
    }
}

impl VaultTimeLockConfig {
    /// Get delay for a specific amount
    pub fn get_delay_for_amount(&self, amount: i128) -> u64 {
        if !self.enabled {
            return 0;
        }
        
        // Find applicable policy (highest threshold that is <= amount)
        let mut applicable_delay = self.default_delay_seconds;
        
        for policy in self.policies.iter() {
            if amount >= policy.threshold_amount && policy.delay_seconds > applicable_delay {
                applicable_delay = policy.delay_seconds;
            }
        }
        
        // Clamp to min/max
        if applicable_delay < self.min_delay_seconds {
            applicable_delay = self.min_delay_seconds;
        }
        if applicable_delay > self.max_delay_seconds {
            applicable_delay = self.max_delay_seconds;
        }
        
        applicable_delay
    }
    
    /// Check if address is exempt from time locks
    pub fn is_exempt(&self, address: &Address) -> bool {
        self.exempt_addresses.contains(address)
    }
    
    /// Add a tiered policy
    pub fn add_policy(&mut self, policy: TimeLockPolicy) {
        self.policies.push_back(policy);
        // Sort by threshold ascending
        self.policies.sort_by(|a, b| a.threshold_amount.cmp(&b.threshold_amount));
    }
}

/// Time lock queue for managing multiple locks
#[derive(Clone, Debug)]
pub struct TimeLockQueue {
    /// List of active time lock IDs
    pub active_locks: Vec<u32>,
    /// List of expired locks ready for execution
    pub expired_locks: Vec<u32>,
    /// Maximum number of concurrent time locks
    pub max_concurrent_locks: u32,
}

impl TimeLockQueue {
    /// Create a new time lock queue
    pub fn new(env: &Env) -> Self {
        Self {
            active_locks: Vec::new(env),
            expired_locks: Vec::new(env),
            max_concurrent_locks: 50,
        }
    }
    
    /// Add a lock to the queue
    pub fn add_lock(&mut self, lock_id: u32) -> Result<(), Error> {
        if self.active_locks.len() as u32 >= self.max_concurrent_locks {
            return Err(Error::TimeLockActive);
        }
        
        self.active_locks.push_back(lock_id);
        Ok(())
    }
    
    /// Move lock from active to expired
    pub fn mark_expired(&mut self, lock_id: u32) {
        if let Some(index) = self.active_locks.iter().position(|&id| id == lock_id) {
            self.active_locks.remove(index);
            self.expired_locks.push_back(lock_id);
        }
    }
    
    /// Remove lock after execution
    pub fn remove_lock(&mut self, lock_id: u32) {
        if let Some(index) = self.expired_locks.iter().position(|&id| id == lock_id) {
            self.expired_locks.remove(index);
        }
    }
    
    /// Get all expired locks
    pub fn get_expired_locks(&self) -> Vec<u32> {
        self.expired_locks.clone()
    }
    
    /// Check queue size
    pub fn size(&self) -> u32 {
        self.active_locks.len() as u32
    }
}

/// Time lock storage key
pub struct TimeLockKey(pub u32, pub u32); // (vault_id, transaction_id)

impl StorageKey for TimeLockKey {
    fn to_raw(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.push(b'l');
        bytes
    }
}

/// Time lock manager
pub struct TimelockManager {
    pub active_locks: Vec<TimeLock>,
    pub config: VaultTimeLockConfig,
}

impl TimelockManager {
    pub fn new(env: &Env) -> Self {
        Self {
            active_locks: Vec::new(env),
            config: VaultTimeLockConfig::default(),
        }
    }
    
    pub fn load(env: &Env, vault_id: u32) -> Self {
        let key = format!("timelock_manager_{}", vault_id);
        env.storage().get(&key).unwrap_or_else(|| Self::new(env))
    }
    
    pub fn save(&self, env: &Env, vault_id: u32) {
        let key = format!("timelock_manager_{}", vault_id);
        env.storage().set(&key, self);
    }
    
    pub fn add_timelock(&mut self, env: &Env, vault_id: u32, timelock: &TimeLock) {
        self.active_locks.push_back(timelock.clone());
        self.save(env, vault_id);
    }
    
    pub fn get_timelock(&self, env: &Env, vault_id: u32, tx_id: u32) -> Option<TimeLock> {
        self.active_locks.iter()
            .find(|l| l.transaction_id == tx_id)
            .cloned()
    }
    
    pub fn cancel_timelock(&mut self, env: &Env, vault_id: u32, tx_id: u32) -> Result<(), Error> {
        if let Some(index) = self.active_locks.iter().position(|l| l.transaction_id == tx_id) {
            self.active_locks.remove(index);
            self.save(env, vault_id);
            Ok(())
        } else {
            Err(Error::TimelockNotFound)
        }
    }
    
    pub fn process_expired(&mut self, env: &Env, vault_id: u32) {
        let now = env.ledger().timestamp();
        let mut to_remove = Vec::new(&soroban_sdk::Env::default());
        
        for (i, lock) in self.active_locks.iter().enumerate() {
            if lock.is_expired(now) {
                to_remove.push_back(i);
            }
        }
        
        for index in to_remove.iter().rev() {
            self.active_locks.remove(*index);
        }
        
        self.save(env, vault_id);
    }
}

/// Time lock event
#[derive(Clone, Debug)]
pub struct TimeLockEvent {
    pub vault_id: u32,
    pub transaction_id: u32,
    pub event_type: TimeLockEventType,
    pub timestamp: u64,
}

#[derive(Clone, Debug)]
pub enum TimeLockEventType {
    Created { release_time: u64, delay_seconds: u64 },
    Expired,
    Executed,
    Cancelled { reason: String },
    PolicyUpdated,
    EmergencyOverridden { by: Address },
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;
    
    #[test]
    fn test_timelock_creation() {
        let env = Env::default();
        let timelock = TimeLock::new(1, 1, 1000, 3600, String::from_str(&"Test"), None);
        
        assert_eq!(timelock.transaction_id, 1);
        assert_eq!(timelock.status, TimeLockStatus::Active);
        assert_eq!(timelock.release_time, 4600);
    }
    
    #[test]
    fn test_timelock_expiry() {
        let env = Env::default();
        let mut timelock = TimeLock::new(1, 1, 1000, 3600, String::from_str(&"Test"), None);
        
        assert!(!timelock.is_expired(3000));
        assert!(timelock.is_expired(5000));
        
        timelock.update_status(5000);
        assert_eq!(timelock.status, TimeLockStatus::Expired);
    }
    
    #[test]
    fn test_timelock_config_get_delay() {
        let config = VaultTimeLockConfig::default();
        let delay = config.get_delay_for_amount(1000);
        assert_eq!(delay, 3600);
    }
}