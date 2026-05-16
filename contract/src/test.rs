//! # Test Module
//!
//! Comprehensive integration tests for all contract modules.

#![cfg(test)]

use soroban_sdk::{Env, Address, String, Vec};
use soroban_sdk::testutils::{Address as AddressTestUtils, Ledger};

use crate::{
    MultiSigVaultClient, MultiSigVaultContract, Error,
    TransactionStatus, ScheduleFrequency, AuditAction,
};

fn create_test_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env
}

fn create_test_signers(env: &Env, count: u32) -> Vec<Address> {
    let mut signers = Vec::new(env);
    for _ in 0..count {
        signers.push_back(Address::generate(env));
    }
    signers
}

#[test]
fn test_full_vault_lifecycle() {
    let env = create_test_env();
    let contract_id = Address::generate(&env);
    let client = MultiSigVaultClient::new(&env, &contract_id);
    
    let signers = create_test_signers(&env, 3);
    let threshold = 2;
    let name = String::from_str(&env, "Test Vault");
    let description = String::from_str(&env, "Test Description");
    
    let vault_id = client.create_vault(&signers, &threshold, &name, &description);
    assert_eq!(vault_id, 1);
    
    let vault = client.get_vault(&vault_id);
    assert_eq!(vault.signers.len(), 3);
    assert!(vault.is_active);
    
    let to = Address::generate(&env);
    let tx_id = client.submit_transaction(&vault_id, &to, &1000, &String::from_str(&env, "test"));
    assert_eq!(tx_id, 1);
    
    client.approve_transaction(&vault_id, &tx_id);
    client.approve_transaction(&vault_id, &tx_id);
    
    let tx = client.get_transaction(&vault_id, &tx_id);
    assert_eq!(tx.status, TransactionStatus::Approved);
    
    client.execute_transaction(&vault_id, &tx_id);
    let tx = client.get_transaction(&vault_id, &tx_id);
    assert_eq!(tx.status, TransactionStatus::Executed);
}

#[test]
fn test_spending_policy() {
    let env = create_test_env();
    let contract_id = Address::generate(&env);
    let client = MultiSigVaultClient::new(&env, &contract_id);
    
    let signers = create_test_signers(&env, 2);
    let threshold = 2;
    let name = String::from_str(&env, "Test Vault");
    let description = String::from_str(&env, "Test Description");
    
    let vault_id = client.create_vault(&signers, &threshold, &name, &description);
    let signer = signers.get(0).unwrap();
    
    client.set_spending_policy(&vault_id, &signer, &1000, &5000, &20000);
    let policy = client.get_spending_policy(&vault_id, &signer);
    assert_eq!(policy.daily_limit, 1000);
}

#[test]
fn test_recovery_flow() {
    let env = create_test_env();
    let contract_id = Address::generate(&env);
    let client = MultiSigVaultClient::new(&env, &contract_id);
    
    let signers = create_test_signers(&env, 2);
    let threshold = 2;
    let name = String::from_str(&env, "Test Vault");
    let description = String::from_str(&env, "Test Description");
    
    let vault_id = client.create_vault(&signers, &threshold, &name, &description);
    let guardian = Address::generate(&env);
    client.add_guardian(&vault_id, &guardian);
    
    let new_signer = Address::generate(&env);
    client.initiate_recovery(&vault_id, &new_signer, &String::from_str(&env, "Lost key"));
    
    let recovery = client.get_recovery(&vault_id).unwrap();
    assert_eq!(recovery.status, crate::RecoveryStatus::Pending);
}

#[test]
fn test_timelock() {
    let env = create_test_env();
    let contract_id = Address::generate(&env);
    let client = MultiSigVaultClient::new(&env, &contract_id);
    
    let signers = create_test_signers(&env, 1);
    let threshold = 1;
    let name = String::from_str(&env, "Test Vault");
    let description = String::from_str(&env, "Test Description");
    
    let vault_id = client.create_vault(&signers, &threshold, &name, &description);
    let to = Address::generate(&env);
    let tx_id = client.submit_transaction(&vault_id, &to, &1000000, &String::from_str(&env, "Large"));
    
    let timelock = client.create_timelock(&vault_id, &tx_id, &3600, &String::from_str(&env, "24h delay"));
    assert_eq!(timelock.transaction_id, tx_id);
}

#[test]
fn test_schedule() {
    let env = create_test_env();
    let contract_id = Address::generate(&env);
    let client = MultiSigVaultClient::new(&env, &contract_id);
    
    let signers = create_test_signers(&env, 1);
    let threshold = 1;
    let name = String::from_str(&env, "Test Vault");
    let description = String::from_str(&env, "Test Description");
    
    let vault_id = client.create_vault(&signers, &threshold, &name, &description);
    let to = Address::generate(&env);
    
    let schedule_id = client.schedule_transaction(
        &vault_id, &to, &500, &1, &env.ledger().timestamp() + 3600,
        &Some(env.ledger().timestamp() + 86400), &10, &String::from_str(&env, "Daily payroll")
    );
    assert_eq!(schedule_id, 1);
}

#[test]
fn test_audit_log() {
    let env = create_test_env();
    let contract_id = Address::generate(&env);
    let client = MultiSigVaultClient::new(&env, &contract_id);
    
    let signers = create_test_signers(&env, 1);
    let threshold = 1;
    let name = String::from_str(&env, "Test Vault");
    let description = String::from_str(&env, "Test Description");
    
    let vault_id = client.create_vault(&signers, &threshold, &name, &description);
    let actor = signers.get(0).unwrap();
    
    client.add_audit_entry(
        &vault_id,
        &String::from_str(&env, "TEST_ACTION"),
        &actor,
        &String::from_str(&env, "{\"test\": true}"),
        &String::from_str(&env, "QmTest")
    );
    
    let audit_log = client.get_audit_log(&vault_id);
    assert_eq!(audit_log.len(), 1);
}

#[test]
fn test_contract_errors() {
    let env = create_test_env();
    let contract_id = Address::generate(&env);
    let client = MultiSigVaultClient::new(&env, &contract_id);
    
    let result = std::panic::catch_unwind(|| {
        client.get_vault(&999);
    });
    assert!(result.is_err());
}