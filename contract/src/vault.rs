//! # Vault Management Module
//!
//! Handles vault creation, storage, and basic management operations.
//! Includes signer management, balance tracking, and vault lifecycle.

use soroban_sdk::{Address, Env, String, Vec};
use soroban_sdk::storage::StorageKey;

use crate::{Error, SpendingPolicy, SpendingTracker, PolicyStorage};

/// Vault storage key
#[derive(Clone)]
pub struct VaultKey(pub u32);

impl StorageKey for VaultKey {
    fn to_raw(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.push(b'v');
        bytes.push((self.0 >> 24) as u8);
        bytes.push((self.0 >> 16) as u8);
        bytes.push((self.0 >> 8) as u8);
        bytes.push(self.0 as u8);
        bytes
    }
}

/// Vault counter key
pub struct VaultCounterKey;

impl StorageKey for VaultCounterKey {
    fn to_raw(&self) -> Vec<u8> {
        vec![b'c'].into()
    }
}

/// Signer vault index key
pub struct SignerVaultsKey(pub Address);

impl StorageKey for SignerVaultsKey {
    fn to_raw(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.push(b's');
        // In production, serialize address properly
        bytes
    }
}

/// Main vault structure
#[derive(Clone, Debug)]
pub struct Vault {
    /// Unique vault identifier
    pub id: u32,
    /// List of authorized signers
    pub signers: Vec<Address>,
    /// Number of approvals required for execution
    pub threshold: u32,
    /// Vault name
    pub name: String,
    /// Vault description
    pub description: String,
    /// Creator address
    pub creator: Address,
    /// Creation timestamp
    pub created_at: u64,
    /// Current vault balance in stroops
    pub balance: i128,
    /// Total transactions executed
    pub total_transactions: u32,
    /// Whether vault is active
    pub is_active: bool,
    /// Total value locked in vault
    pub tvl: i128,
    /// Vault version for upgrades
    pub version: u32,
}

impl Vault {
    /// Create a new vault instance with validation
    pub fn new(
        id: u32,
        signers: Vec<Address>,
        threshold: u32,
        name: String,
        description: String,
        creator: Address,
        created_at: u64,
    ) -> Result<Self, Error> {
        // Validation checks
        if signers.is_empty() {
            return Err(Error::InvalidSigners);
        }
        
        if threshold == 0 {
            return Err(Error::InvalidThreshold);
        }
        
        if threshold > signers.len() as u32 {
            return Err(Error::ThresholdTooHigh);
        }
        
        // Check for duplicate signers
        let mut unique_signers = Vec::new(&soroban_sdk::Env::default());
        for signer in signers.iter() {
            if !unique_signers.contains(signer) {
                unique_signers.push_back(signer.clone());
            } else {
                return Err(Error::InvalidSigners);
            }
        }
        
        Ok(Self {
            id,
            signers: unique_signers,
            threshold,
            name,
            description,
            creator,
            created_at,
            balance: 0,
            total_transactions: 0,
            is_active: true,
            tvl: 0,
            version: 1,
        })
    }
    
    /// Check if an address is a signer
    pub fn is_signer(&self, address: &Address) -> bool {
        self.signers.iter().any(|s| s == address)
    }
    
    /// Get the number of signers
    pub fn signer_count(&self) -> u32 {
        self.signers.len() as u32
    }
    
    /// Update vault balance (positive for deposit, negative for withdraw)
    pub fn update_balance(&mut self, amount: i128) {
        self.balance += amount;
        if self.balance < 0 {
            self.balance = 0;
        }
    }
    
    /// Update TVL (Total Value Locked)
    pub fn update_tvl(&mut self, amount: i128) {
        self.tvl += amount;
        if self.tvl < 0 {
            self.tvl = 0;
        }
    }
    
    /// Increment transaction counter
    pub fn increment_transaction_count(&mut self) {
        self.total_transactions += 1;
    }
    
    /// Deactivate vault
    pub fn deactivate(&mut self) {
        self.is_active = false;
    }
    
    /// Activate vault
    pub fn activate(&mut self) {
        self.is_active = true;
    }
    
    /// Add a new signer
    pub fn add_signer(&mut self, new_signer: Address) -> Result<(), Error> {
        if self.signers.contains(&new_signer) {
            return Err(Error::GuardianAlreadyExists);
        }
        self.signers.push_back(new_signer);
        Ok(())
    }
    
    /// Remove a signer
    pub fn remove_signer(&mut self, signer_to_remove: Address) -> Result<(), Error> {
        let index = self.signers.iter().position(|s| s == signer_to_remove);
        match index {
            Some(idx) => {
                self.signers.remove(idx);
                if self.threshold > self.signers.len() as u32 {
                    self.threshold = self.signers.len() as u32;
                }
                Ok(())
            }
            None => Err(Error::NotAuthorized),
        }
    }
    
    /// Update approval threshold
    pub fn update_threshold(&mut self, new_threshold: u32) -> Result<(), Error> {
        if new_threshold < 1 || new_threshold > self.signers.len() as u32 {
            return Err(Error::InvalidThreshold);
        }
        self.threshold = new_threshold;
        Ok(())
    }
    
    /// Check spending limits before transaction
    pub fn check_spending_limit(
        &self,
        env: &Env,
        signer: &Address,
        amount: i128,
    ) -> Result<(), Error> {
        let policy = PolicyStorage::load_spending_policy(env, self.id, signer.clone())
            .unwrap_or_else(|| SpendingPolicy::default());
        
        if !policy.is_enabled {
            return Ok(());
        }
        
        let mut tracker = PolicyStorage::load_spending_tracker(env, self.id, signer.clone())
            .unwrap_or_else(|| SpendingTracker::new(env.ledger().timestamp()));
        
        let now = env.ledger().timestamp();
        
        if !tracker.check_limits(&policy, amount, now) {
            return Err(Error::PolicyViolation);
        }
        
        // Update is done after transaction execution
        Ok(())
    }
    
    /// Update spending tracker after transaction
    pub fn update_spending_tracker(
        &self,
        env: &Env,
        signer: &Address,
        amount: i128,
    ) {
        let mut tracker = PolicyStorage::load_spending_tracker(env, self.id, signer.clone())
            .unwrap_or_else(|| SpendingTracker::new(env.ledger().timestamp()));
        
        let now = env.ledger().timestamp();
        tracker.update_spending(amount, now);
        
        PolicyStorage::save_spending_tracker(env, self.id, signer.clone(), &tracker);
    }
    
    /// Get current spending status for a signer
    pub fn get_spending_status(&self, env: &Env, signer: &Address) -> (i128, i128, i128) {
        let policy = PolicyStorage::load_spending_policy(env, self.id, signer.clone())
            .unwrap_or_else(|| SpendingPolicy::default());
        let tracker = PolicyStorage::load_spending_tracker(env, self.id, signer.clone())
            .unwrap_or_else(|| SpendingTracker::new(env.ledger().timestamp()));
        
        let now = env.ledger().timestamp();
        let mut daily = tracker.daily_spent;
        let mut weekly = tracker.weekly_spent;
        let mut monthly = tracker.monthly_spent;
        
        const DAY_SECONDS: u64 = 86400;
        const WEEK_SECONDS: u64 = 604800;
        const MONTH_SECONDS: u64 = 2592000;
        
        if now - tracker.last_daily_reset >= DAY_SECONDS {
            daily = 0;
        }
        if now - tracker.last_weekly_reset >= WEEK_SECONDS {
            weekly = 0;
        }
        if now - tracker.last_monthly_reset >= MONTH_SECONDS {
            monthly = 0;
        }
        
        let daily_remaining = if policy.daily_limit > 0 {
            policy.daily_limit - daily
        } else {
            i128::MAX
        };
        let weekly_remaining = if policy.weekly_limit > 0 {
            policy.weekly_limit - weekly
        } else {
            i128::MAX
        };
        let monthly_remaining = if policy.monthly_limit > 0 {
            policy.monthly_limit - monthly
        } else {
            i128::MAX
        };
        
        (daily_remaining, weekly_remaining, monthly_remaining)
    }
}

/// Vault storage management
pub struct VaultStorage;

impl VaultStorage {
    /// Save vault to storage
    pub fn save(env: &Env, vault: &Vault) {
        let key = VaultKey(vault.id);
        env.storage().set(&key, vault);
        
        // Index by signer for quick lookup
        for signer in vault.signers.iter() {
            let signer_key = SignerVaultsKey(signer.clone());
            let mut vaults: Vec<u32> = env.storage().get(&signer_key).unwrap_or_else(|| Vec::new(env));
            if !vaults.contains(&vault.id) {
                vaults.push_back(vault.id);
                env.storage().set(&signer_key, &vaults);
            }
        }
    }
    
    /// Load vault from storage
    pub fn load(env: &Env, vault_id: u32) -> Option<Vault> {
        let key = VaultKey(vault_id);
        env.storage().get(&key)
    }
    
    /// Get next vault ID
    pub fn next_id(env: &Env) -> u32 {
        let counter: u32 = env.storage().get(&VaultCounterKey).unwrap_or(0);
        let next = counter + 1;
        env.storage().set(&VaultCounterKey, &next);
        next
    }
    
    /// Get all vaults for a signer
    pub fn get_vaults_by_signer(env: &Env, signer: Address) -> Vec<u32> {
        let key = SignerVaultsKey(signer);
        env.storage().get(&key).unwrap_or_else(|| Vec::new(env))
    }
    
    /// Check if vault exists
    pub fn exists(env: &Env, vault_id: u32) -> bool {
        let key = VaultKey(vault_id);
        env.storage().has(&key)
    }
    
    /// Delete vault (deactivate instead)
    pub fn deactivate_vault(env: &Env, vault_id: u32) -> Result<(), Error> {
        let mut vault = match Self::load(env, vault_id) {
            Some(v) => v,
            None => return Err(Error::VaultNotFound),
        };
        vault.deactivate();
        Self::save(env, &vault);
        Ok(())
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
    fn test_create_vault_success() {
        let env = create_test_env();
        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let signer3 = Address::generate(&env);
        let mut signers = Vec::new(&env);
        signers.push_back(signer1);
        signers.push_back(signer2);
        signers.push_back(signer3);
        
        let name = String::from_str(&env, "Test Vault");
        let description = String::from_str(&env, "Test Description");
        let creator = Address::generate(&env);
        
        let vault = Vault::new(1, signers, 2, name, description, creator, 1000).unwrap();
        
        assert_eq!(vault.id, 1);
        assert_eq!(vault.threshold, 2);
        assert_eq!(vault.signers.len(), 3);
        assert_eq!(vault.balance, 0);
        assert!(vault.is_active);
    }
    
    #[test]
    fn test_create_vault_invalid_threshold() {
        let env = create_test_env();
        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let mut signers = Vec::new(&env);
        signers.push_back(signer1);
        signers.push_back(signer2);
        
        let name = String::from_str(&env, "Test Vault");
        let description = String::from_str(&env, "Test Description");
        let creator = Address::generate(&env);
        
        let result = Vault::new(1, signers, 3, name, description, creator, 1000);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_is_signer() {
        let env = create_test_env();
        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let mut signers = Vec::new(&env);
        signers.push_back(signer1.clone());
        signers.push_back(signer2.clone());
        
        let name = String::from_str(&env, "Test Vault");
        let description = String::from_str(&env, "Test Description");
        let creator = Address::generate(&env);
        
        let vault = Vault::new(1, signers, 2, name, description, creator, 1000).unwrap();
        
        assert!(vault.is_signer(&signer1));
        assert!(vault.is_signer(&signer2));
        assert!(!vault.is_signer(&Address::generate(&env)));
    }
    
    #[test]
    fn test_update_balance() {
        let env = create_test_env();
        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let mut signers = Vec::new(&env);
        signers.push_back(signer1);
        signers.push_back(signer2);
        
        let name = String::from_str(&env, "Test Vault");
        let description = String::from_str(&env, "Test Description");
        let creator = Address::generate(&env);
        
        let mut vault = Vault::new(1, signers, 2, name, description, creator, 1000).unwrap();
        
        vault.update_balance(1000);
        assert_eq!(vault.balance, 1000);
        
        vault.update_balance(-500);
        assert_eq!(vault.balance, 500);
    }
    
    #[test]
    fn test_add_remove_signer() {
        let env = create_test_env();
        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let mut signers = Vec::new(&env);
        signers.push_back(signer1.clone());
        signers.push_back(signer2.clone());
        
        let name = String::from_str(&env, "Test Vault");
        let description = String::from_str(&env, "Test Description");
        let creator = Address::generate(&env);
        
        let mut vault = Vault::new(1, signers, 2, name, description, creator, 1000).unwrap();
        
        let new_signer = Address::generate(&env);
        vault.add_signer(new_signer.clone()).unwrap();
        assert_eq!(vault.signers.len(), 3);
        
        vault.remove_signer(new_signer).unwrap();
        assert_eq!(vault.signers.len(), 2);
    }
    
    #[test]
    fn test_update_threshold() {
        let env = create_test_env();
        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let signer3 = Address::generate(&env);
        let mut signers = Vec::new(&env);
        signers.push_back(signer1);
        signers.push_back(signer2);
        signers.push_back(signer3);
        
        let name = String::from_str(&env, "Test Vault");
        let description = String::from_str(&env, "Test Description");
        let creator = Address::generate(&env);
        
        let mut vault = Vault::new(1, signers, 2, name, description, creator, 1000).unwrap();
        
        vault.update_threshold(3).unwrap();
        assert_eq!(vault.threshold, 3);
        
        let result = vault.update_threshold(4);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_vault_storage_save_load() {
        let env = create_test_env();
        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let mut signers = Vec::new(&env);
        signers.push_back(signer1);
        signers.push_back(signer2);
        
        let name = String::from_str(&env, "Test Vault");
        let description = String::from_str(&env, "Test Description");
        let creator = Address::generate(&env);
        
        let vault = Vault::new(1, signers, 2, name, description, creator, 1000).unwrap();
        
        VaultStorage::save(&env, &vault);
        
        let loaded = VaultStorage::load(&env, 1).unwrap();
        assert_eq!(loaded.id, vault.id);
        assert_eq!(loaded.threshold, vault.threshold);
    }
    
    #[test]
    fn test_next_vault_id() {
        let env = create_test_env();
        
        let id1 = VaultStorage::next_id(&env);
        let id2 = VaultStorage::next_id(&env);
        let id3 = VaultStorage::next_id(&env);
        
        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_eq!(id3, 3);
    }
}