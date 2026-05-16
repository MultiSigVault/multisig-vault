import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

export interface SpendingPolicy {
  signer: string;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  perTransactionLimit: number;
  enabled: boolean;
  name?: string;
}

export interface SpendingTracker {
  dailySpent: number;
  weeklySpent: number;
  monthlySpent: number;
  lastDailyReset: number;
  lastWeeklyReset: number;
  lastMonthlyReset: number;
  totalSpent: number;
}

export interface TimeLockConfig {
  enabled: boolean;
  defaultDelaySeconds: number;
  maxDelaySeconds: number;
  minDelaySeconds: number;
  emergencyOverrideSigners: string[];
  requireTwoFactor: boolean;
}

export interface ScheduleConfig {
  enabled: boolean;
  maxSchedulesPerVault: number;
  maxAmountPerSchedule: number;
  requireApproval: boolean;
  defaultAutoExecute: boolean;
  allowedFrequencies: string[];
}

export interface RecoveryConfig {
  guardians: string[];
  threshold: number;
  recoveryDelaySeconds: number;
  isActive: boolean;
  initiatedBy?: string;
  initiatedAt?: number;
  newSigner?: string;
  approvals: string[];
  expiresAt?: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  details: Record<string, any>;
  timestamp: number;
  ipfsHash?: string;
}

@Entity('vaults')
@Index(['creatorAddress'])
@Index(['isActive'])
@Index(['vaultId'])
export class Vault {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  vaultId: number;

  @Column('simple-array')
  signers: string[];

  @Column()
  threshold: number;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column()
  creatorAddress: string;

  @ManyToOne(() => User)
  createdBy: User;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'bigint', default: 0 })
  balance: number;

  @Column({ default: 0 })
  totalTransactions: number;

  @Column({ type: 'jsonb', nullable: true })
  spendingPolicies: SpendingPolicy[];

  @Column({ type: 'jsonb', nullable: true })
  spendingTrackers: Record<string, SpendingTracker>;

  @Column({ type: 'jsonb', nullable: true })
  timelockConfig: TimeLockConfig;

  @Column({ type: 'jsonb', nullable: true })
  scheduleConfig: ScheduleConfig;

  @Column({ type: 'jsonb', nullable: true })
  recoveryConfig: RecoveryConfig;

  @Column({ type: 'jsonb', nullable: true })
  auditLogs: AuditLogEntry[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  deactivatedAt: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.vault)
  transactions: Transaction[];
}