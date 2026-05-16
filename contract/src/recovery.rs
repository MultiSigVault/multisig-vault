//! # Social Recovery Module
//!
//! Implements guardian-based social recovery for vault signers.
//! Allows vault owners to recover access if keys are lost.
//! Features: guardian management, recovery initiation, approval tracking, time-delayed completion.

use soroban_sdk::{Address, Env, Vec, String};
use soroban_sdk::storage::StorageKey;

use crate::Error;

/// Recovery status enum
#[derive(Clone, Debug, PartialEq)]
pub enum RecoveryStatus {
    /// No recovery in progress
    Inactive,
    /// Recovery initiated, awaiting guardian approvals
    Pending,
    /// Recovery approved, ready to complete after delay
    Approved,
    /// Recovery completed successfully
    Completed,
    /// Recovery cancelled by creator or guardian
    Cancelled,
    /// Recovery expired (timeout reached)
    Expired,
}

/// Recovery data for a vault
#[derive(Clone, Debug)]
pub struct RecoveryData {
    /// Current recovery status
    pub status: RecoveryStatus,
    /// Vault ID being recovered
    pub vault_id: u32,
    /// New signer address to add
    pub new_signer: Address,
    /// List of guardians for this vault
    pub guardians: Vec<Address>,
    /// Guardians who have approved
    pub approvals: Vec<Address>,
    /// Number of guardian approvals required
    pub guardian_threshold: u32,
    /// Time when recovery was initiated
    pub initiated_at: u64,
    /// Time when recovery expires (if not completed)
    pub expires_at: u64,
    /// Time when recovery becomes eligible for completion (after delay)
    pub available_at: u64,
    /// Optional recovery reason
    pub reason: String,
    /// Address that initiated recovery
    pub initiated_by: Address,
    /// Whether this is an emergency recovery (bypasses delay)
    pub is_emergency: bool,
}

impl RecoveryData {
    /// Create new recovery data
    pub fn new(
        vault_id: u32,
        new_signer: Address,
        guardians: Vec<Address>,
        guardian_threshold: u32,
        initiated_at: u64,
        expires_at: u64,
        delay_seconds: u64,
        reason: String,
        initiated_by: Address,
        is_emergency: bool,
    ) -> Result<Self, Error> {
        if guardians.is_empty() {
            return Err(Error::InsufficientGuardians);
        }
        
        if guardian_threshold == 0 || guardian_threshold > guardians.len() as u32 {
            return Err(Error::InsufficientGuardians);
        }
        
        let available_at = if is_emergency {
            initiated_at // No delay for emergency recovery
        } else {
            initiated_at + delay_seconds
        };
        
        Ok(Self {
            status: RecoveryStatus::Pending,
            vault_id,
            new_signer,
            guardians,
            approvals: Vec::new(&soroban_sdk::Env::default()),
            guardian_threshold,
            initiated_at,
            expires_at,
            available_at,
            reason,
            initiated_by,
            is_emergency,
        })
    }
    
    /// Add a guardian approval
    pub fn add_approval(&mut self, guardian: Address) -> Result<(), Error> {
        if self.status != RecoveryStatus::Pending {
            return Err(Error::InvalidRecoveryState);
        }
        
        // Check if guardian is authorized
        if !self.guardians.contains(&guardian) {
            return Err(Error::NotAuthorized);
        }
        
        // Check if already approved
        if self.approvals.contains(&guardian) {
            return Ok(());
        }
        
        self.approvals.push_back(guardian);
        
        // Check if threshold met
        if self.approvals.len() as u32 >= self.guardian_threshold {
            self.status = RecoveryStatus::Approved;
        }
        
        Ok(())
    }
    
    /// Remove an approval (if guardian changes mind)
    pub fn remove_approval(&mut self, guardian: Address) -> Result<(), Error> {
        if self.status != RecoveryStatus::Pending {
            return Err(Error::InvalidRecoveryState);
        }
        
        let index = self.approvals.iter().position(|g| g == &guardian);
        if let Some(idx) = index {
            self.approvals.remove(idx);
            if self.status == RecoveryStatus::Approved && self.approvals.len() as u32 < self.guardian_threshold {
                self.status = RecoveryStatus::Pending;
            }
            Ok(())
        } else {
            Err(Error::NotAuthorized)
        }
    }
    
    /// Check if recovery is expired
    pub fn is_expired(&self, current_time: u64) -> bool {
        current_time > self.expires_at
    }
    
    /// Check if recovery is ready for completion (delay passed)
    pub fn is_ready_for_completion(&self, current_time: u64) -> bool {
        self.status == RecoveryStatus::Approved && current_time >= self.available_at
    }
    
    /// Cancel recovery
    pub fn cancel(&mut self) {
        self.status = RecoveryStatus::Cancelled;
    }
    
    /// Mark as expired
    pub fn mark_expired(&mut self) {
        self.status = RecoveryStatus::Expired;
    }
    
    /// Complete recovery
    pub fn complete(&mut self) -> Result<(), Error> {
        if self.status != RecoveryStatus::Approved {
            return Err(Error::InvalidRecoveryState);
        }
        
        self.status = RecoveryStatus::Completed;
        Ok(())
    }
    
    /// Get number of approvals
    pub fn approval_count(&self) -> u32 {
        self.approvals.len() as u32
    }
    
    /// Check if guardian already approved
    pub fn has_approved(&self, guardian: &Address) -> bool {
        self.approvals.contains(guardian)
    }
    
    /// Get remaining time until available (in seconds)
    pub fn remaining_time(&self, current_time: u64) -> u64 {
        if current_time >= self.available_at {
            0
        } else {
            self.available_at - current_time
        }
    }
    
    /// Get approval percentage (0-100)
    pub fn approval_percentage(&self) -> u32 {
        if self.guardian_threshold == 0 {
            return 0;
        }
        (self.approval_count() * 100) / self.guardian_threshold
    }
}

/// Guardian invitation structure
#[derive(Clone, Debug)]
pub struct GuardianInvitation {
    /// Invited guardian address
    pub guardian: Address,
    /// Vault ID
    pub vault_id: u32,
    /// Invited by
    pub invited_by: Address,
    /// Invitation timestamp
    pub invited_at: u64,
    /// Expiration timestamp
    pub expires_at: u64,
    /// Whether invitation has been accepted
    pub accepted: bool,
}

impl GuardianInvitation {
    /// Create new guardian invitation
    pub fn new(
        guardian: Address,
        vault_id: u32,
        invited_by: Address,
        invited_at: u64,
        expires_at: u64,
    ) -> Self {
        Self {
            guardian,
            vault_id,
            invited_by,
            invited_at,
            expires_at,
            accepted: false,
        }
    }
    
    /// Accept invitation
    pub fn accept(&mut self) -> Result<(), Error> {
        if self.accepted {
            return Err(Error::GuardianAlreadyExists);
        }
        
        if self.is_expired(self.invited_at) {
            return Err(Error::InvalidRecoveryState);
        }
        
        self.accepted = true;
        Ok(())
    }
    
    /// Check if invitation is expired
    pub fn is_expired(&self, current_time: u64) -> bool {
        current_time > self.expires_at
    }
}

/// Recovery storage key
pub struct RecoveryKey(pub u32);

impl StorageKey for RecoveryKey {
    fn to_raw(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.push(b'r');
        bytes.push((self.0 >> 24) as u8);
        bytes.push((self.0 >> 16) as u8);
        bytes.push((self.0 >> 8) as u8);
        bytes.push(self.0 as u8);
        bytes
    }
}

/// Guardian list key
pub struct GuardianListKey(pub u32);

impl StorageKey for GuardianListKey {
    fn to_raw(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.push(b'g');
        bytes.push((self.0 >> 24) as u8);
        bytes.push((self.0 >> 16) as u8);
        bytes.push((self.0 >> 8) as u8);
        bytes.push(self.0 as u8);
        bytes
    }
}

/// Recovery storage management
pub struct RecoveryStorage;

impl RecoveryStorage {
    /// Save recovery data
    pub fn save(env: &Env, vault_id: u32, recovery: &RecoveryData) {
        let key = RecoveryKey(vault_id);
        env.storage().set(&key, recovery);
    }
    
    /// Load recovery data
    pub fn load(env: &Env, vault_id: u32) -> Option<RecoveryData> {
        let key = RecoveryKey(vault_id);
        env.storage().get(&key)
    }
    
    /// Delete recovery data
    pub fn delete(env: &Env, vault_id: u32) {
        let key = RecoveryKey(vault_id);
        env.storage().remove(&key);
    }
    
    /// Check if recovery is active
    pub fn is_active(env: &Env, vault_id: u32) -> bool {
        if let Some(recovery) = Self::load(env, vault_id) {
            matches!(recovery.status, RecoveryStatus::Pending | RecoveryStatus::Approved)
        } else {
            false
        }
    }
}

/// Guardian management functions
pub struct GuardianManager;

impl GuardianManager {
    /// Add guardian to vault
    pub fn add_guardian(
        env: &Env,
        vault_id: u32,
        guardian: Address,
        current_time: u64,
    ) -> Result<(), Error> {
        let key = GuardianListKey(vault_id);
        let mut guardians: Vec<Address> = env.storage().get(&key).unwrap_or_else(|| Vec::new(env));
        
        if guardians.contains(&guardian) {
            return Err(Error::GuardianAlreadyExists);
        }
        
        guardians.push_back(guardian);
        env.storage().set(&key, &guardians);
        
        Ok(())
    }
    
    /// Remove guardian from vault
    pub fn remove_guardian(
        env: &Env,
        vault_id: u32,
        guardian: Address,
    ) -> Result<(), Error> {
        let key = GuardianListKey(vault_id);
        let mut guardians: Vec<Address> = env.storage().get(&key).unwrap_or_else(|| Vec::new(env));
        
        let index = guardians.iter().position(|g| g == &guardian);
        match index {
            Some(idx) => {
                guardians.remove(idx);
                env.storage().set(&key, &guardians);
                Ok(())
            }
            None => Err(Error::NotAuthorized),
        }
    }
    
    /// Get guardians for vault
    pub fn get_guardians(env: &Env, vault_id: u32) -> Vec<Address> {
        let key = GuardianListKey(vault_id);
        env.storage().get(&key).unwrap_or_else(|| Vec::new(env))
    }
    
    /// Get guardian count
    pub fn guardian_count(env: &Env, vault_id: u32) -> u32 {
        Self::get_guardians(env, vault_id).len() as u32
    }
    
    /// Check if address is a guardian
    pub fn is_guardian(env: &Env, vault_id: u32, address: &Address) -> bool {
        let guardians = Self::get_guardians(env, vault_id);
        guardians.contains(address)
    }
}

/// Recovery configuration for a vault
#[derive(Clone, Debug)]
pub struct RecoveryConfig {
    /// Minimum number of guardians required
    pub min_guardians: u32,
    /// Guardian approval threshold (default: 60% of guardians)
    pub approval_threshold_percent: u32,
    /// Recovery expiry duration in seconds (default: 7 days)
    pub expiry_duration: u64,
    /// Cooldown period after failed recovery (default: 1 day)
    pub cooldown_period: u64,
    /// Delay before recovery completes (default: 48 hours)
    pub completion_delay_seconds: u64,
    /// Whether to require 2FA for recovery
    pub require_2fa: bool,
    /// Emergency recovery bypass delay (requires 75% approval)
    pub emergency_threshold_percent: u32,
}

impl Default for RecoveryConfig {
    fn default() -> Self {
        Self {
            min_guardians: 3,
            approval_threshold_percent: 60,
            expiry_duration: 604800, // 7 days
            cooldown_period: 86400,   // 1 day
            completion_delay_seconds: 172800, // 48 hours
            require_2fa: false,
            emergency_threshold_percent: 75,
        }
    }
}

impl RecoveryConfig {
    /// Calculate required approvals based on guardian count
    pub fn required_approvals(&self, guardian_count: u32) -> u32 {
        ((guardian_count * self.approval_threshold_percent + 99) / 100).max(1)
    }
    
    /// Calculate emergency required approvals
    pub fn emergency_required_approvals(&self, guardian_count: u32) -> u32 {
        ((guardian_count * self.emergency_threshold_percent + 99) / 100).max(1)
    }
}

/// Recovery event for tracking
#[derive(Clone, Debug)]
pub struct RecoveryEvent {
    pub vault_id: u32,
    pub event_type: RecoveryEventType,
    pub actor: Address,
    pub timestamp: u64,
}

#[derive(Clone, Debug)]
pub enum RecoveryEventType {
    Initiated { new_signer: Address, reason: String, is_emergency: bool },
    Approved { guardian: Address, approvals: u32, threshold: u32 },
    ApprovalRevoked { guardian: Address, approvals: u32 },
    Completed { new_signer: Address },
    Cancelled { reason: String, by: Address },
    Expired,
    GuardianAdded { guardian: Address, by: Address },
    GuardianRemoved { guardian: Address, by: Address },
    InvitationSent { guardian: Address, expires_at: u64 },
    InvitationAccepted { guardian: Address },
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;
    
    fn create_test_env() -> Env {
        let env = Env::default();
        env.mock_all_auths();
        env
    }
    
    #[test]
    fn test_recovery_data_creation() {
        let env = create_test_env();
        let new_signer = Address::generate(&env);
        let guardian1 = Address::generate(&env);
        let guardian2 = Address::generate(&env);
        let guardian3 = Address::generate(&env);
        let mut guardians = Vec::new(&env);
        guardians.push_back(guardian1);
        guardians.push_back(guardian2);
        guardians.push_back(guardian3);
        let initiated_by = Address::generate(&env);
        
        let recovery = RecoveryData::new(
            1,
            new_signer,
            guardians,
            2,
            1000,
            10000,
            3600,
            String::from_str(&env, "Lost key"),
            initiated_by,
            false,
        ).unwrap();
        
        assert_eq!(recovery.status, RecoveryStatus::Pending);
        assert_eq!(recovery.guardian_threshold, 2);
        assert_eq!(recovery.approval_count(), 0);
    }
    
    #[test]
    fn test_add_approval() {
        let env = create_test_env();
        let new_signer = Address::generate(&env);
        let guardian1 = Address::generate(&env);
        let guardian2 = Address::generate(&env);
        let mut guardians = Vec::new(&env);
        guardians.push_back(guardian1.clone());
        guardians.push_back(guardian2.clone());
        let initiated_by = Address::generate(&env);
        
        let mut recovery = RecoveryData::new(
            1,
            new_signer,
            guardians,
            2,
            1000,
            10000,
            3600,
            String::from_str(&env, "Test"),
            initiated_by,
            false,
        ).unwrap();
        
        recovery.add_approval(guardian1).unwrap();
        assert_eq!(recovery.approval_count(), 1);
        assert_eq!(recovery.status, RecoveryStatus::Pending);
        
        recovery.add_approval(guardian2).unwrap();
        assert_eq!(recovery.approval_count(), 2);
        assert_eq!(recovery.status, RecoveryStatus::Approved);
    }
    
    #[test]
    fn test_guardian_manager() {
        let env = create_test_env();
        let guardian = Address::generate(&env);
        
        GuardianManager::add_guardian(&env, 1, guardian.clone(), 1000).unwrap();
        let guardians = GuardianManager::get_guardians(&env, 1);
        assert_eq!(guardians.len(), 1);
        
        GuardianManager::remove_guardian(&env, 1, guardian).unwrap();
        let guardians = GuardianManager::get_guardians(&env, 1);
        assert_eq!(guardians.len(), 0);
    }
    
    #[test]
    fn test_recovery_config() {
        let config = RecoveryConfig::default();
        assert_eq!(config.min_guardians, 3);
        assert_eq!(config.approval_threshold_percent, 60);
        assert_eq!(config.expiry_duration, 604800);
        
        let required = config.required_approvals(5);
        assert_eq!(required, 3); // 60% of 5 = 3
    }
}