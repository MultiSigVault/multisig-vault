//! # Scheduled Payments Module
//!
//! Implements recurring and scheduled future payments.
//! Supports payroll, subscriptions, and one-time future transfers.
//! Features: daily, weekly, monthly, yearly, custom intervals.

use soroban_sdk::{Address, Env, Vec, String};
use soroban_sdk::storage::StorageKey;

use crate::Error;

/// Schedule frequency type
#[derive(Clone, Debug, PartialEq)]
pub enum ScheduleFrequency {
    /// One-time scheduled payment
    OneTime,
    /// Daily recurring (every 24 hours)
    Daily,
    /// Weekly recurring (every 7 days)
    Weekly,
    /// Monthly recurring (30 days)
    Monthly,
    /// Quarterly recurring (90 days)
    Quarterly,
    /// Yearly recurring (365 days)
    Yearly,
    /// Custom interval in seconds
    Custom(u64),
}

impl ScheduleFrequency {
    /// Convert frequency to seconds
    pub fn to_seconds(&self) -> u64 {
        match self {
            ScheduleFrequency::OneTime => 0,
            ScheduleFrequency::Daily => 86400,
            ScheduleFrequency::Weekly => 604800,
            ScheduleFrequency::Monthly => 2592000,
            ScheduleFrequency::Quarterly => 7776000,
            ScheduleFrequency::Yearly => 31536000,
            ScheduleFrequency::Custom(seconds) => *seconds,
        }
    }
    
    /// Get human-readable name
    pub fn as_str(&self) -> &'static str {
        match self {
            ScheduleFrequency::OneTime => "One-time",
            ScheduleFrequency::Daily => "Daily",
            ScheduleFrequency::Weekly => "Weekly",
            ScheduleFrequency::Monthly => "Monthly",
            ScheduleFrequency::Quarterly => "Quarterly",
            ScheduleFrequency::Yearly => "Yearly",
            ScheduleFrequency::Custom(_) => "Custom",
        }
    }
    
    /// Create from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "once" => Some(ScheduleFrequency::OneTime),
            "daily" => Some(ScheduleFrequency::Daily),
            "weekly" => Some(ScheduleFrequency::Weekly),
            "monthly" => Some(ScheduleFrequency::Monthly),
            "quarterly" => Some(ScheduleFrequency::Quarterly),
            "yearly" => Some(ScheduleFrequency::Yearly),
            _ => None,
        }
    }
}

/// Scheduled transaction status
#[derive(Clone, Debug, PartialEq)]
pub enum ScheduleStatus {
    /// Pending execution
    Pending,
    /// Executed successfully
    Executed,
    /// Failed to execute
    Failed,
    /// Cancelled by admin
    Cancelled,
    /// Paused temporarily
    Paused,
    /// Completed (max executions reached or end time passed)
    Completed,
}

/// Scheduled transaction record
#[derive(Clone, Debug)]
pub struct ScheduledTransaction {
    /// Unique schedule ID
    pub schedule_id: u32,
    /// Vault ID
    pub vault_id: u32,
    /// Recipient address
    pub to: Address,
    /// Amount in stroops
    pub amount: i128,
    /// Token address (native = XLM)
    pub token_address: String,
    /// Execution frequency
    pub frequency: ScheduleFrequency,
    /// First execution time
    pub start_time: u64,
    /// Last execution time (for recurring)
    pub last_execution: u64,
    /// End time (optional, for recurring)
    pub end_time: Option<u64>,
    /// Total times executed
    pub execution_count: u32,
    /// Maximum executions (0 = unlimited)
    pub max_executions: u32,
    /// Current status
    pub status: ScheduleStatus,
    /// Optional memo/data
    pub data: String,
    /// Creator address
    pub created_by: Address,
    /// Creation timestamp
    pub created_at: u64,
    /// Whether to auto-execute when approved (for multi-sig)
    pub auto_execute: bool,
    /// Failure count (for retry logic)
    pub failure_count: u32,
    /// Last failure reason
    pub last_failure_reason: Option<String>,
}

impl ScheduledTransaction {
    /// Create a new scheduled transaction
    pub fn new(
        schedule_id: u32,
        vault_id: u32,
        to: Address,
        amount: i128,
        token_address: String,
        frequency: ScheduleFrequency,
        start_time: u64,
        end_time: Option<u64>,
        max_executions: u32,
        data: String,
        created_by: Address,
        created_at: u64,
        auto_execute: bool,
    ) -> Result<Self, Error> {
        // Validation
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        
        if start_time < created_at {
            return Err(Error::InvalidSchedule);
        }
        
        if let Some(end) = end_time {
            if end <= start_time {
                return Err(Error::InvalidSchedule);
            }
        }
        
        Ok(Self {
            schedule_id,
            vault_id,
            to,
            amount,
            token_address,
            frequency,
            start_time,
            last_execution: 0,
            end_time,
            execution_count: 0,
            max_executions,
            status: ScheduleStatus::Pending,
            data,
            created_by,
            created_at,
            auto_execute,
            failure_count: 0,
            last_failure_reason: None,
        })
    }
    
    /// Check if schedule is ready for execution
    pub fn is_ready(&self, current_time: u64) -> bool {
        if self.status != ScheduleStatus::Pending {
            return false;
        }
        
        // Check end time
        if let Some(end) = self.end_time {
            if current_time > end {
                return false;
            }
        }
        
        // Check max executions
        if self.max_executions > 0 && self.execution_count >= self.max_executions {
            return false;
        }
        
        match self.frequency {
            ScheduleFrequency::OneTime => {
                current_time >= self.start_time && self.execution_count == 0
            }
            _ => {
                let next_execution = if self.execution_count == 0 {
                    self.start_time
                } else {
                    self.last_execution + self.frequency.to_seconds()
                };
                current_time >= next_execution
            }
        }
    }
    
    /// Get next execution time
    pub fn next_execution_time(&self) -> Option<u64> {
        if self.status != ScheduleStatus::Pending {
            return None;
        }
        
        if self.max_executions > 0 && self.execution_count >= self.max_executions {
            return None;
        }
        
        match self.frequency {
            ScheduleFrequency::OneTime => {
                if self.execution_count == 0 && self.start_time > self.last_execution {
                    Some(self.start_time)
                } else {
                    None
                }
            }
            _ => {
                let next = if self.execution_count == 0 {
                    self.start_time
                } else {
                    self.last_execution + self.frequency.to_seconds()
                };
                
                if let Some(end) = self.end_time {
                    if next > end {
                        return None;
                    }
                }
                
                Some(next)
            }
        }
    }
    
    /// Mark schedule as executed
    pub fn mark_executed(&mut self, current_time: u64) {
        self.last_execution = current_time;
        self.execution_count += 1;
        self.failure_count = 0;
        self.last_failure_reason = None;
        
        // Check if schedule is complete
        if let ScheduleFrequency::OneTime = self.frequency {
            self.status = ScheduleStatus::Completed;
        } else if self.max_executions > 0 && self.execution_count >= self.max_executions {
            self.status = ScheduleStatus::Completed;
        } else if let Some(end) = self.end_time {
            if current_time >= end {
                self.status = ScheduleStatus::Completed;
            }
        }
    }
    
    /// Mark schedule as failed
    pub fn mark_failed(&mut self, reason: String) {
        self.status = ScheduleStatus::Failed;
        self.failure_count += 1;
        self.last_failure_reason = Some(reason);
    }
    
    /// Cancel schedule
    pub fn cancel(&mut self) {
        self.status = ScheduleStatus::Cancelled;
    }
    
    /// Pause schedule
    pub fn pause(&mut self) {
        if self.status == ScheduleStatus::Pending {
            self.status = ScheduleStatus::Paused;
        }
    }
    
    /// Resume schedule
    pub fn resume(&mut self) {
        if self.status == ScheduleStatus::Paused {
            self.status = ScheduleStatus::Pending;
        }
    }
    
    /// Get execution count as percentage of max
    pub fn completion_percentage(&self) -> u32 {
        if self.max_executions == 0 {
            return 0;
        }
        (self.execution_count * 100 / self.max_executions) as u32
    }
}

/// Schedule storage key
pub struct ScheduleKey(pub u32, pub u32);

impl StorageKey for ScheduleKey {
    fn to_raw(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.push(b's');
        bytes
    }
}

/// Schedule manager for vault
#[derive(Clone, Debug)]
pub struct ScheduleManager {
    pub schedules: Vec<ScheduledTransaction>,
    pub next_schedule_id: u32,
    pub config: VaultScheduleConfig,
}

impl ScheduleManager {
    pub fn new(env: &Env) -> Self {
        Self {
            schedules: Vec::new(env),
            next_schedule_id: 1,
            config: VaultScheduleConfig::default(),
        }
    }
    
    pub fn load(env: &Env, vault_id: u32) -> Self {
        let key = format!("schedule_manager_{}", vault_id);
        env.storage().get(&key).unwrap_or_else(|| Self::new(env))
    }
    
    pub fn save(&self, env: &Env, vault_id: u32) {
        let key = format!("schedule_manager_{}", vault_id);
        env.storage().set(&key, self);
    }
    
    pub fn add_schedule(&mut self, env: &Env, vault_id: u32, schedule: &ScheduledTransaction) -> Result<(), Error> {
        if self.schedules.len() as u32 >= self.config.max_schedules_per_vault {
            return Err(Error::InvalidSchedule);
        }
        self.schedules.push_back(schedule.clone());
        self.next_schedule_id += 1;
        self.save(env, vault_id);
        Ok(())
    }
    
    pub fn get_schedule(&self, env: &Env, vault_id: u32, schedule_id: u32) -> Option<ScheduledTransaction> {
        self.schedules.iter()
            .find(|s| s.schedule_id == schedule_id)
            .cloned()
    }
    
    pub fn cancel_schedule(&mut self, env: &Env, vault_id: u32, schedule_id: u32) -> Result<(), Error> {
        if let Some(index) = self.schedules.iter().position(|s| s.schedule_id == schedule_id) {
            self.schedules.remove(index);
            self.save(env, vault_id);
            Ok(())
        } else {
            Err(Error::ScheduleNotFound)
        }
    }
    
    pub fn pause_schedule(&mut self, env: &Env, vault_id: u32, schedule_id: u32) -> Result<(), Error> {
        if let Some(schedule) = self.schedules.iter_mut().find(|s| s.schedule_id == schedule_id) {
            schedule.pause();
            self.save(env, vault_id);
            Ok(())
        } else {
            Err(Error::ScheduleNotFound)
        }
    }
    
    pub fn resume_schedule(&mut self, env: &Env, vault_id: u32, schedule_id: u32) -> Result<(), Error> {
        if let Some(schedule) = self.schedules.iter_mut().find(|s| s.schedule_id == schedule_id) {
            schedule.resume();
            self.save(env, vault_id);
            Ok(())
        } else {
            Err(Error::ScheduleNotFound)
        }
    }
    
    pub fn process_due(&mut self, env: &Env, vault_id: u32) {
        let now = env.ledger().timestamp();
        let mut to_execute = Vec::new(&soroban_sdk::Env::default());
        
        for (i, schedule) in self.schedules.iter().enumerate() {
            if schedule.is_ready(now) {
                to_execute.push_back(i);
            }
        }
        
        // Note: Actual execution would be handled by the vault
        for index in to_execute.iter() {
            // Mark as executed for now
            if let Some(schedule) = self.schedules.get_mut(*index) {
                schedule.mark_executed(now);
            }
        }
        
        self.save(env, vault_id);
    }
    
    pub fn get_pending_schedules(&self) -> Vec<ScheduledTransaction> {
        self.schedules.iter()
            .filter(|s| s.status == ScheduleStatus::Pending)
            .cloned()
            .collect()
    }
    
    pub fn get_active_schedules(&self) -> Vec<ScheduledTransaction> {
        self.schedules.iter()
            .filter(|s| matches!(s.status, ScheduleStatus::Pending | ScheduleStatus::Paused))
            .cloned()
            .collect()
    }
}

/// Vault schedule configuration
#[derive(Clone, Debug)]
pub struct VaultScheduleConfig {
    pub enabled: bool,
    pub max_schedules_per_vault: u32,
    pub max_amount_per_schedule: i128,
    pub require_approval: bool,
    pub default_auto_execute: bool,
    pub max_retry_on_failure: u32,
    pub allowed_frequencies: Vec<ScheduleFrequency>,
}

impl Default for VaultScheduleConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_schedules_per_vault: 100,
            max_amount_per_schedule: i128::MAX,
            require_approval: true,
            default_auto_execute: false,
            max_retry_on_failure: 3,
            allowed_frequencies: Vec::new(&soroban_sdk::Env::default()),
        }
    }
}

/// Schedule execution event
#[derive(Clone, Debug)]
pub struct ScheduleEvent {
    pub vault_id: u32,
    pub schedule_id: u32,
    pub event_type: ScheduleEventType,
    pub timestamp: u64,
}

#[derive(Clone, Debug)]
pub enum ScheduleEventType {
    Created { to: Address, amount: i128, frequency: String },
    Executed { execution_count: u32 },
    Failed { reason: String },
    Cancelled { by: Address },
    Paused { by: Address },
    Resumed { by: Address },
    Completed { total_executions: u32 },
}