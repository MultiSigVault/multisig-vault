import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Vault } from '../../vaults/entities/vault.entity';

export type TransactionStatus = 'pending' | 'approved' | 'executed' | 'rejected' | 'cancelled' | 'failed' | 'timelocked' | 'scheduled';

@Entity('transactions')
@Index(['vaultId', 'status'])
@Index(['vaultId', 'createdAt'])
@Index(['transactionId', 'vaultId'], { unique: true })
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  transactionId: number;

  @Column()
  @Index()
  vaultId: number;

  @Column()
  fromAddress: string;

  @Column()
  toAddress: string;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ default: 'native' })
  tokenAddress: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: TransactionStatus;

  @Column('simple-array', { nullable: true })
  approvals: string[];

  @Column({ default: 0 })
  requiredApprovals: number;

  @Column('simple-array', { nullable: true })
  revocations: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'bigint', nullable: true })
  timelockId: number;

  @Column({ type: 'bigint', nullable: true })
  scheduleId: number;

  @Column({ type: 'bigint', nullable: true })
  releaseTime: number;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'bigint', nullable: true })
  executedAt: number;

  @Column({ type: 'bigint', nullable: true })
  approvedAt: number;

  @Column({ type: 'varchar', length: 66, nullable: true })
  stellarTxHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Vault, (vault) => vault.transactions)
  @JoinColumn({ name: 'vaultId' })
  vault: Vault;
}