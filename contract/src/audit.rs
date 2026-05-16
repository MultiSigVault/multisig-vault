//! # Audit Log Module
//!
//! Implements immutable audit logging with IPFS integration.
//! Tracks all vault actions for compliance and transparency.
//! Supports: action logging, IPFS hashing, security alerts, metrics.

use soroban_sdk::{Address, Env, Vec, String, Map};
use soroban_sdk::storage::StorageKey;

use crate::Error;

/// Audit action type - comprehensive list of all vault actions
#[derive(Clone, Debug, PartialEq)]
pub enum AuditAction {
    // Vault management
    VaultCreated,
    VaultUpdated,
    VaultDeactivated,
    VaultActivated,
    
    // Transaction management
    TransactionSubmitted,
    TransactionApproved,
    TransactionRevoked,
    TransactionExecuted,
    TransactionFailed,
    TransactionRejected,
    TransactionCancelled,
    
    // Policy management
    PolicySet,
    PolicyUpdated,
    PolicyRemoved,
    PolicyViolationDetected,
    
    // Guardian management
    GuardianAdded,
    GuardianRemoved,
    GuardianInvited,
    
    // Recovery
    RecoveryInitiated,
    RecoveryApproved,
    RecoveryCompleted,
    RecoveryCancelled,
    RecoveryExpired,
    
    // Time lock
    TimeLockCreated,
    TimeLockExpired,
    TimeLockExecuted,
    TimeLockCancelled,
    TimeLockEmergencyOverridden,
    
    // Scheduled payments
    ScheduleCreated,
    ScheduleExecuted,
    ScheduleFailed,
    ScheduleCancelled,
    SchedulePaused,
    ScheduleResumed,
    ScheduleCompleted,
    
    // Signer management
    SignerAdded,
    SignerRemoved,
    ThresholdChanged,
    
    // Security
    SuspiciousActivity,
    SecurityAlert,
    UnauthorizedAccessAttempt,
    
    // Deposits/Withdrawals
    Deposit,
    Withdrawal,
    
    // Configuration
    ConfigChange,
    ContractUpgrade,
    
    // Unknown/Other
    Unknown,
}

impl AuditAction {
    /// Convert action to string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            AuditAction::VaultCreated => "VAULT_CREATED",
            AuditAction::VaultUpdated => "VAULT_UPDATED",
            AuditAction::VaultDeactivated => "VAULT_DEACTIVATED",
            AuditAction::VaultActivated => "VAULT_ACTIVATED",
            AuditAction::TransactionSubmitted => "TRANSACTION_SUBMITTED",
            AuditAction::TransactionApproved => "TRANSACTION_APPROVED",
            AuditAction::TransactionRevoked => "TRANSACTION_REVOKED",
            AuditAction::TransactionExecuted => "TRANSACTION_EXECUTED",
            AuditAction::TransactionFailed => "TRANSACTION_FAILED",
            AuditAction::TransactionRejected => "TRANSACTION_REJECTED",
            AuditAction::TransactionCancelled => "TRANSACTION_CANCELLED",
            AuditAction::PolicySet => "POLICY_SET",
            AuditAction::PolicyUpdated => "POLICY_UPDATED",
            AuditAction::PolicyRemoved => "POLICY_REMOVED",
            AuditAction::PolicyViolationDetected => "POLICY_VIOLATION_DETECTED",
            AuditAction::GuardianAdded => "GUARDIAN_ADDED",
            AuditAction::GuardianRemoved => "GUARDIAN_REMOVED",
            AuditAction::GuardianInvited => "GUARDIAN_INVITED",
            AuditAction::RecoveryInitiated => "RECOVERY_INITIATED",
            AuditAction::RecoveryApproved => "RECOVERY_APPROVED",
            AuditAction::RecoveryCompleted => "RECOVERY_COMPLETED",
            AuditAction::RecoveryCancelled => "RECOVERY_CANCELLED",
            AuditAction::RecoveryExpired => "RECOVERY_EXPIRED",
            AuditAction::TimeLockCreated => "TIMELOCK_CREATED",
            AuditAction::TimeLockExpired => "TIMELOCK_EXPIRED",
            AuditAction::TimeLockExecuted => "TIMELOCK_EXECUTED",
            AuditAction::TimeLockCancelled => "TIMELOCK_CANCELLED",
            AuditAction::TimeLockEmergencyOverridden => "TIMELOCK_EMERGENCY_OVERRIDDEN",
            AuditAction::ScheduleCreated => "SCHEDULE_CREATED",
            AuditAction::ScheduleExecuted => "SCHEDULE_EXECUTED",
            AuditAction::ScheduleFailed => "SCHEDULE_FAILED",
            AuditAction::ScheduleCancelled => "SCHEDULE_CANCELLED",
            AuditAction::SchedulePaused => "SCHEDULE_PAUSED",
            AuditAction::ScheduleResumed => "SCHEDULE_RESUMED",
            AuditAction::ScheduleCompleted => "SCHEDULE_COMPLETED",
            AuditAction::SignerAdded => "SIGNER_ADDED",
            AuditAction::SignerRemoved => "SIGNER_REMOVED",
            AuditAction::ThresholdChanged => "THRESHOLD_CHANGED",
            AuditAction::SuspiciousActivity => "SUSPICIOUS_ACTIVITY",
            AuditAction::SecurityAlert => "SECURITY_ALERT",
            AuditAction::UnauthorizedAccessAttempt => "UNAUTHORIZED_ACCESS_ATTEMPT",
            AuditAction::Deposit => "DEPOSIT",
            AuditAction::Withdrawal => "WITHDRAWAL",
            AuditAction::ConfigChange => "CONFIG_CHANGE",
            AuditAction::ContractUpgrade => "CONTRACT_UPGRADE",
            AuditAction::Unknown => "UNKNOWN",
        }
    }
}

/// Audit log entry
#[derive(Clone, Debug)]
pub struct AuditEntry {
    pub audit_id: u32,
    pub vault_id: u32,
    pub action: String,
    pub actor: Address,
    pub target: Option<Address>,
    pub metadata: String,
    pub ipfs_hash: String,
    pub ledger_sequence: u32,
    pub timestamp: u64,
    pub signature: Option<String>,
    pub block_hash: Option<String>,
}

impl AuditEntry {
    pub fn new(
        audit_id: u32,
        vault_id: u32,
        action: AuditAction,
        actor: Address,
        target: Option<Address>,
        metadata: String,
        ipfs_hash: String,
        ledger_sequence: u32,
        timestamp: u64,
    ) -> Self {
        Self {
            audit_id,
            vault_id,
            action: action.as_str().to_string(),
            actor,
            target,
            metadata,
            ipfs_hash,
            ledger_sequence,
            timestamp,
            signature: None,
            block_hash: None,
        }
    }
    
    pub fn sign(&mut self, signature: String) {
        self.signature = Some(signature);
    }
    
    pub fn to_json(&self) -> String {
        let mut json = String::new();
        json.push_str("{");
        json.push_str(&format!("\"audit_id\":{},", self.audit_id));
        json.push_str(&format!("\"vault_id\":{},", self.vault_id));
        json.push_str(&format!("\"action\":\"{}\",", self.action));
        json.push_str(&format!("\"actor\":\"{:?}\",", self.actor));
        if let Some(target) = &self.target {
            json.push_str(&format!("\"target\":\"{:?}\",", target));
        }
        json.push_str(&format!("\"metadata\":{},", self.metadata));
        json.push_str(&format!("\"ipfs_hash\":\"{}\",", self.ipfs_hash));
        json.push_str(&format!("\"ledger_sequence\":{},", self.ledger_sequence));
        json.push_str(&format!("\"timestamp\":{}", self.timestamp));
        json.push_str("}");
        json
    }
}

/// Audit log manager
pub struct AuditLog {
    pub audit_ids: Vec<u32>,
    pub next_audit_id: u32,
    pub max_entries: u32,
}

impl AuditLog {
    pub fn new(env: &Env, max_entries: u32) -> Self {
        Self {
            audit_ids: Vec::new(env),
            next_audit_id: 1,
            max_entries,
        }
    }
    
    pub fn load(env: &Env, vault_id: u32) -> Self {
        let key = format!("audit_log_{}", vault_id);
        env.storage().get(&key).unwrap_or_else(|| Self::new(env, 1000))
    }
    
    pub fn save(&self, env: &Env, vault_id: u32) {
        let key = format!("audit_log_{}", vault_id);
        env.storage().set(&key, self);
    }
    
    pub fn add_entry(&mut self, env: &Env, vault_id: u32, entry: AuditEntry) -> Result<(), Error> {
        if self.audit_ids.len() as u32 >= self.max_entries {
            let oldest = self.audit_ids.get(0);
            if let Some(oldest_id) = oldest {
                let key = AuditKey(vault_id, *oldest_id);
                env.storage().remove(&key);
                self.audit_ids.remove(0);
            }
        }
        
        self.audit_ids.push_back(entry.audit_id);
        let key = AuditKey(vault_id, entry.audit_id);
        env.storage().set(&key, &entry);
        self.next_audit_id += 1;
        self.save(env, vault_id);
        Ok(())
    }
    
    pub fn get_entry(env: &Env, vault_id: u32, audit_id: u32) -> Option<AuditEntry> {
        let key = AuditKey(vault_id, audit_id);
        env.storage().get(&key)
    }
    
    pub fn get_all_entries(&self, env: &Env, vault_id: u32) -> Vec<AuditEntry> {
        let mut entries = Vec::new(&soroban_sdk::Env::default());
        for id in self.audit_ids.iter() {
            if let Some(entry) = Self::get_entry(env, vault_id, *id) {
                entries.push_back(entry);
            }
        }
        entries
    }
    
    pub fn calculate_metrics(&self, env: &Env, vault_id: u32) -> AuditMetrics {
        let entries = self.get_all_entries(env, vault_id);
        let mut action_counts = Map::new(&soroban_sdk::Env::default());
        let mut unique_actors = Vec::new(&soroban_sdk::Env::default());
        let mut last_timestamp = 0;
        
        for entry in entries.iter() {
            let count: u32 = action_counts.get(entry.action.clone()).unwrap_or(0);
            action_counts.set(entry.action.clone(), count + 1);
            
            if !unique_actors.contains(&entry.actor) {
                unique_actors.push_back(entry.actor.clone());
            }
            
            if entry.timestamp > last_timestamp {
                last_timestamp = entry.timestamp;
            }
        }
        
        let most_common = action_counts
            .iter()
            .max_by_key(|(_, count)| *count)
            .map(|(action, _)| action.clone())
            .unwrap_or_else(|| String::from_str(&"NONE"));
        
        AuditMetrics {
            total_entries: entries.len() as u32,
            unique_actors: unique_actors.len() as u32,
            most_common_action: most_common,
            actions_by_type: action_counts,
            last_audit_timestamp: last_timestamp,
        }
    }
}

pub struct AuditKey(pub u32, pub u32);

impl StorageKey for AuditKey {
    fn to_raw(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.push(b'a');
        bytes
    }
}

#[derive(Clone, Debug)]
pub struct AuditMetrics {
    pub total_entries: u32,
    pub unique_actors: u32,
    pub most_common_action: String,
    pub actions_by_type: Map<String, u32>,
    pub last_audit_timestamp: u64,
}

#[derive(Clone, Debug, PartialEq)]
pub enum AlertSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Clone, Debug)]
pub struct SecurityAlert {
    pub alert_id: u32,
    pub vault_id: u32,
    pub severity: AlertSeverity,
    pub message: String,
    pub detected_at: u64,
    pub resolved: bool,
    pub resolution_note: Option<String>,
}

pub fn add_audit_entry_internal(
    env: &Env,
    vault_id: u32,
    action: String,
    actor: Address,
    metadata: String,
    ipfs_hash: String,
) {
    let mut audit_log = AuditLog::load(env, vault_id);
    let entry = AuditEntry {
        audit_id: audit_log.next_audit_id,
        vault_id,
        action,
        actor,
        target: None,
        metadata,
        ipfs_hash,
        ledger_sequence: env.ledger().sequence(),
        timestamp: env.ledger().timestamp(),
        signature: None,
        block_hash: None,
    };
    let _ = audit_log.add_entry(env, vault_id, entry);
}