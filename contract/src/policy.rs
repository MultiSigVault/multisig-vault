//! # Spending Policy Module
//!
//! Manages spending limits and policies for individual signers.
//! Supports daily, weekly, and monthly spending caps with automatic resets.

use soroban_sdk::{Address, Env, String};
use soroban_sdk::storage::StorageKey;

use crate::Error;

/// Spending policy for a signer
#[derive(Clone, Debug)]
pub struct SpendingPolicy {
    /// Daily spending limit (in stroops)
    pub daily_limit: i128,
    /// Weekly spending limit (in stroops)
    pub weekly_limit: i128,
    /// Monthly spending limit (in stroops)
    pub monthly_limit: i128,
    /// Per-transaction maximum limit
    pub per_tx_limit: i128,
    /// Whether policy is enabled
    pub is_enabled: bool,
    /// Policy name/description
    pub name: String,
    /// Custom reset intervals (override defaults)
    pub custom_reset_intervals: Option<(u64, u64, u64)>, // (daily_seconds, weekly_seconds, monthly_seconds)
    /// Allowance rollover (unused limit carries over)
    pub allow_rollover: bool,
    /// Maximum rollover amount
    pub max_rollover: i128,
}

impl Default for SpendingPolicy {
    fn default() -> Self {
        Self {
            daily_limit: 0,
            weekly_limit: 0,
            monthly_limit: 0,
            per_tx_limit: 0,
            is_enabled: false,
            name: String::from_str(&"Default Policy"),
            custom_reset_intervals: None,
            allow_rollover: false,
            max_rollover: 0,
        }
    }
}

impl SpendingPolicy {
    /// Create a new spending policy
    pub fn new(daily_limit: i128, weekly_limit: i128, monthly_limit: i128) -> Self {
        Self {
            daily_limit,
            weekly_limit,
            monthly_limit,
            per_tx_limit: 0,
            is_enabled: true,
            name: String::from_str(&"Spending Policy"),
            custom_reset_intervals: None,
            allow_rollover: false,
            max_rollover: 0,
        }
    }
    
    /// Create a comprehensive policy with all options
    pub fn new_comprehensive(
        daily_limit: i128,
        weekly_limit: i128,
        monthly_limit: i128,
        per_tx_limit: i128,
        name: String,
        custom_intervals: Option<(u64, u64, u64)>,
        allow_rollover: bool,
        max_rollover: i128,
    ) -> Self {
        Self {
            daily_limit,
            weekly_limit,
            monthly_limit,
            per_tx_limit,
            is_enabled: true,
            name,
            custom_reset_intervals: custom_intervals,
            allow_rollover,
            max_rollover,
        }
    }
    
    /// Disable the policy
    pub fn disable(&mut self) {
        self.is_enabled = false;
    }
    
    /// Enable the policy
    pub fn enable(&mut self) {
        self.is_enabled = true;
    }
    
    /// Update all limits at once
    pub fn update_limits(
        &mut self,
        daily_limit: i128,
        weekly_limit: i128,
        monthly_limit: i128,
        per_tx_limit: i128,
    ) {
        self.daily_limit = daily_limit;
        self.weekly_limit = weekly_limit;
        self.monthly_limit = monthly_limit;
        self.per_tx_limit = per_tx_limit;
    }
    
    /// Update individual limit
    pub fn update_daily_limit(&mut self, limit: i128) {
        self.daily_limit = limit;
    }
    
    pub fn update_weekly_limit(&mut self, limit: i128) {
        self.weekly_limit = limit;
    }
    
    pub fn update_monthly_limit(&mut self, limit: i128) {
        self.monthly_limit = limit;
    }
    
    /// Get reset intervals (custom or default)
    pub fn get_reset_intervals(&self) -> (u64, u64, u64) {
        match self.custom_reset_intervals {
            Some(intervals) => intervals,
            None => (86400, 604800, 2592000), // 1 day, 1 week, 30 days
        }
    }
}

/// Spending tracker for a signer (tracks actual spending)
#[derive(Clone, Debug)]
pub struct SpendingTracker {
    /// Daily spending total
    pub daily_spent: i128,
    /// Weekly spending total
    pub weekly_spent: i128,
    /// Monthly spending total
    pub monthly_spent: i128,
    /// Last reset timestamp for daily
    pub last_daily_reset: u64,
    /// Last reset timestamp for weekly
    pub last_weekly_reset: u64,
    /// Last reset timestamp for monthly
    pub last_monthly_reset: u64,
    /// Total all-time spending
    pub total_spent: i128,
    /// Rollover amounts (unused limits from previous periods)
    pub daily_rollover: i128,
    pub weekly_rollover: i128,
    pub monthly_rollover: i128,
    /// Number of transactions made
    pub transaction_count: u32,
    /// Average transaction amount
    pub avg_transaction_amount: i128,
}

impl SpendingTracker {
    /// Create a new spending tracker
    pub fn new(current_time: u64) -> Self {
        Self {
            daily_spent: 0,
            weekly_spent: 0,
            monthly_spent: 0,
            last_daily_reset: current_time,
            last_weekly_reset: current_time,
            last_monthly_reset: current_time,
            total_spent: 0,
            daily_rollover: 0,
            weekly_rollover: 0,
            monthly_rollover: 0,
            transaction_count: 0,
            avg_transaction_amount: 0,
        }
    }
    
    /// Reset daily counter if needed, with rollover support
    pub fn reset_daily_if_needed(&mut self, current_time: u64, allow_rollover: bool, max_rollover: i128) {
        const DEFAULT_DAY_SECONDS: u64 = 86400;
        if current_time - self.last_daily_reset >= DEFAULT_DAY_SECONDS {
            if allow_rollover {
                let unused = self.daily_limit_for_period(DEFAULT_DAY_SECONDS) - self.daily_spent;
                if unused > 0 {
                    self.daily_rollover = (self.daily_rollover + unused).min(max_rollover);
                }
            }
            self.daily_spent = 0;
            self.last_daily_reset = current_time;
        }
    }
    
    /// Reset weekly counter if needed
    pub fn reset_weekly_if_needed(&mut self, current_time: u64, allow_rollover: bool, max_rollover: i128) {
        const DEFAULT_WEEK_SECONDS: u64 = 604800;
        if current_time - self.last_weekly_reset >= DEFAULT_WEEK_SECONDS {
            if allow_rollover {
                let unused = self.weekly_limit_for_period(DEFAULT_WEEK_SECONDS) - self.weekly_spent;
                if unused > 0 {
                    self.weekly_rollover = (self.weekly_rollover + unused).min(max_rollover);
                }
            }
            self.weekly_spent = 0;
            self.last_weekly_reset = current_time;
        }
    }
    
    /// Reset monthly counter if needed
    pub fn reset_monthly_if_needed(&mut self, current_time: u64, allow_rollover: bool, max_rollover: i128) {
        const DEFAULT_MONTH_SECONDS: u64 = 2592000;
        if current_time - self.last_monthly_reset >= DEFAULT_MONTH_SECONDS {
            if allow_rollover {
                let unused = self.monthly_limit_for_period(DEFAULT_MONTH_SECONDS) - self.monthly_spent;
                if unused > 0 {
                    self.monthly_rollover = (self.monthly_rollover + unused).min(max_rollover);
                }
            }
            self.monthly_spent = 0;
            self.last_monthly_reset = current_time;
        }
    }
    
    /// Helper to get limit for a period (placeholder - actual limit comes from policy)
    fn daily_limit_for_period(&self, _seconds: u64) -> i128 {
        // This would be replaced with actual policy limit
        i128::MAX
    }
    
    fn weekly_limit_for_period(&self, _seconds: u64) -> i128 {
        i128::MAX
    }
    
    fn monthly_limit_for_period(&self, _seconds: u64) -> i128 {
        i128::MAX
    }
    
    /// Reset all counters with rollover support
    pub fn reset_all_if_needed(&mut self, current_time: u64, policy: &SpendingPolicy) {
        let (daily_sec, weekly_sec, monthly_sec) = policy.get_reset_intervals();
        
        if current_time - self.last_daily_reset >= daily_sec {
            if policy.allow_rollover {
                let unused = policy.daily_limit - self.daily_spent;
                if unused > 0 {
                    self.daily_rollover = (self.daily_rollover + unused).min(policy.max_rollover);
                }
            }
            self.daily_spent = 0;
            self.last_daily_reset = current_time;
        }
        
        if current_time - self.last_weekly_reset >= weekly_sec {
            if policy.allow_rollover {
                let unused = policy.weekly_limit - self.weekly_spent;
                if unused > 0 {
                    self.weekly_rollover = (self.weekly_rollover + unused).min(policy.max_rollover);
                }
            }
            self.weekly_spent = 0;
            self.last_weekly_reset = current_time;
        }
        
        if current_time - self.last_monthly_reset >= monthly_sec {
            if policy.allow_rollover {
                let unused = policy.monthly_limit - self.monthly_spent;
                if unused > 0 {
                    self.monthly_rollover = (self.monthly_rollover + unused).min(policy.max_rollover);
                }
            }
            self.monthly_spent = 0;
            self.last_monthly_reset = current_time;
        }
    }
    
    /// Check if spending is within limits
    pub fn check_limits(
        &mut self,
        policy: &SpendingPolicy,
        amount: i128,
        current_time: u64,
    ) -> bool {
        if !policy.is_enabled {
            return true;
        }
        
        // Check per-transaction limit first
        if policy.per_tx_limit > 0 && amount > policy.per_tx_limit {
            return false;
        }
        
        // Reset counters as needed
        self.reset_all_if_needed(current_time, policy);
        
        // Calculate available limits including rollover
        let daily_available = policy.daily_limit + self.daily_rollover;
        let weekly_available = policy.weekly_limit + self.weekly_rollover;
        let monthly_available = policy.monthly_limit + self.monthly_rollover;
        
        // Check each limit
        if policy.daily_limit > 0 && self.daily_spent + amount > daily_available {
            return false;
        }
        
        if policy.weekly_limit > 0 && self.weekly_spent + amount > weekly_available {
            return false;
        }
        
        if policy.monthly_limit > 0 && self.monthly_spent + amount > monthly_available {
            return false;
        }
        
        true
    }
    
    /// Update spending after a transaction
    pub fn update_spending(&mut self, amount: i128, current_time: u64) {
        // Update averages
        let new_total = self.total_spent + amount;
        self.transaction_count += 1;
        self.avg_transaction_amount = new_total / (self.transaction_count as i128);
        
        self.total_spent = new_total;
        self.daily_spent += amount;
        self.weekly_spent += amount;
        self.monthly_spent += amount;
    }
    
    /// Get remaining limits (including rollover)
    pub fn get_remaining_limits(&self, policy: &SpendingPolicy) -> (i128, i128, i128) {
        let daily_available = policy.daily_limit + self.daily_rollover;
        let weekly_available = policy.weekly_limit + self.weekly_rollover;
        let monthly_available = policy.monthly_limit + self.monthly_rollover;
        
        let daily_remaining = if policy.daily_limit > 0 {
            daily_available - self.daily_spent
        } else {
            i128::MAX
        };
        
        let weekly_remaining = if policy.weekly_limit > 0 {
            weekly_available - self.weekly_spent
        } else {
            i128::MAX
        };
        
        let monthly_remaining = if policy.monthly_limit > 0 {
            monthly_available - self.monthly_spent
        } else {
            i128::MAX
        };
        
        (daily_remaining, weekly_remaining, monthly_remaining)
    }
    
    /// Get usage percentages
    pub fn get_usage_percentages(&self, policy: &SpendingPolicy) -> (u32, u32, u32) {
        let daily_pct = if policy.daily_limit > 0 {
            ((self.daily_spent * 100) / policy.daily_limit) as u32
        } else {
            0
        };
        
        let weekly_pct = if policy.weekly_limit > 0 {
            ((self.weekly_spent * 100) / policy.weekly_limit) as u32
        } else {
            0
        };
        
        let monthly_pct = if policy.monthly_limit > 0 {
            ((self.monthly_spent * 100) / policy.monthly_limit) as u32
        } else {
            0
        };
        
        (daily_pct, weekly_pct, monthly_pct)
    }
}

/// Policy storage key
pub struct PolicyKey(pub u32, pub Address);

impl StorageKey for PolicyKey {
    fn to_raw(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.push(b'p');
        bytes
    }
}

/// Policy storage management
pub struct PolicyStorage;

impl PolicyStorage {
    /// Save spending policy for a signer
    pub fn save_spending_policy(env: &Env, vault_id: u32, signer: Address, policy: &SpendingPolicy) {
        let key = format!("policy_{}_{}", vault_id, signer);
        env.storage().set(&key, policy);
    }
    
    /// Load spending policy for a signer
    pub fn load_spending_policy(env: &Env, vault_id: u32, signer: Address) -> Option<SpendingPolicy> {
        let key = format!("policy_{}_{}", vault_id, signer);
        env.storage().get(&key)
    }
    
    /// Save spending tracker for a signer
    pub fn save_spending_tracker(env: &Env, vault_id: u32, signer: Address, tracker: &SpendingTracker) {
        let key = format!("tracker_{}_{}", vault_id, signer);
        env.storage().set(&key, tracker);
    }
    
    /// Load spending tracker for a signer
    pub fn load_spending_tracker(env: &Env, vault_id: u32, signer: Address) -> Option<SpendingTracker> {
        let key = format!("tracker_{}_{}", vault_id, signer);
        env.storage().get(&key)
    }
    
    /// Delete spending policy
    pub fn delete_spending_policy(env: &Env, vault_id: u32, signer: Address) {
        let key = format!("policy_{}_{}", vault_id, signer);
        env.storage().remove(&key);
    }
}

/// Global policy settings for a vault
#[derive(Clone, Debug)]
pub struct VaultGlobalPolicy {
    /// Max daily limit across all signers
    pub max_daily_limit_per_signer: i128,
    /// Max weekly limit across all signers
    pub max_weekly_limit_per_signer: i128,
    /// Max monthly limit across all signers
    pub max_monthly_limit_per_signer: i128,
    /// Whether policies are required for all signers
    pub require_policies: bool,
    /// Default policy for new signers
    pub default_policy: SpendingPolicy,
    /// Global daily spending cap for entire vault
    pub global_daily_cap: i128,
    /// Global weekly spending cap for entire vault
    pub global_weekly_cap: i128,
    /// Global monthly spending cap for entire vault
    pub global_monthly_cap: i128,
}

impl Default for VaultGlobalPolicy {
    fn default() -> Self {
        Self {
            max_daily_limit_per_signer: i128::MAX,
            max_weekly_limit_per_signer: i128::MAX,
            max_monthly_limit_per_signer: i128::MAX,
            require_policies: false,
            default_policy: SpendingPolicy::default(),
            global_daily_cap: i128::MAX,
            global_weekly_cap: i128::MAX,
            global_monthly_cap: i128::MAX,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;
    
    #[test]
    fn test_spending_policy_default() {
        let policy = SpendingPolicy::default();
        assert_eq!(policy.daily_limit, 0);
        assert_eq!(policy.weekly_limit, 0);
        assert_eq!(policy.monthly_limit, 0);
        assert!(!policy.is_enabled);
    }
    
    #[test]
    fn test_spending_policy_new() {
        let policy = SpendingPolicy::new(1000, 5000, 20000);
        assert_eq!(policy.daily_limit, 1000);
        assert_eq!(policy.weekly_limit, 5000);
        assert_eq!(policy.monthly_limit, 20000);
        assert!(policy.is_enabled);
    }
    
    #[test]
    fn test_spending_tracker_new() {
        let tracker = SpendingTracker::new(1000);
        assert_eq!(tracker.daily_spent, 0);
        assert_eq!(tracker.weekly_spent, 0);
        assert_eq!(tracker.monthly_spent, 0);
        assert_eq!(tracker.total_spent, 0);
        assert_eq!(tracker.transaction_count, 0);
    }
    
    #[test]
    fn test_update_spending() {
        let mut tracker = SpendingTracker::new(1000);
        tracker.update_spending(500, 2000);
        assert_eq!(tracker.daily_spent, 500);
        assert_eq!(tracker.weekly_spent, 500);
        assert_eq!(tracker.monthly_spent, 500);
        assert_eq!(tracker.total_spent, 500);
        assert_eq!(tracker.transaction_count, 1);
    }
    
    #[test]
    fn test_check_limits_within_bounds() {
        let mut policy = SpendingPolicy::new(1000, 5000, 20000);
        let mut tracker = SpendingTracker::new(1000);
        
        assert!(tracker.check_limits(&policy, 500, 2000));
        tracker.update_spending(500, 2000);
        assert!(tracker.check_limits(&policy, 500, 3000));
    }
    
    #[test]
    fn test_check_limits_exceeded() {
        let mut policy = SpendingPolicy::new(1000, 5000, 20000);
        let mut tracker = SpendingTracker::new(1000);
        
        tracker.update_spending(800, 2000);
        assert!(!tracker.check_limits(&policy, 300, 3000));
    }
    
    #[test]
    fn test_per_tx_limit() {
        let mut policy = SpendingPolicy::new(10000, 50000, 200000);
        policy.per_tx_limit = 1000;
        let mut tracker = SpendingTracker::new(1000);
        
        assert!(tracker.check_limits(&policy, 500, 2000));
        assert!(!tracker.check_limits(&policy, 1500, 3000));
    }
}