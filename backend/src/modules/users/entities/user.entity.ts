import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as argon2 from 'argon2';

export enum UserRole {
  ADMIN = 'admin',
  SIGNER = 'signer',
  VIEWER = 'viewer',
  GUARDIAN = 'guardian',
  MAINTAINER = 'maintainer',
  CONTRIBUTOR = 'contributor',
}

export type UserPreferences = {
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    email?: boolean;
    push?: boolean;
    onTransactionSubmitted?: boolean;
    onTransactionApproved?: boolean;
    onTransactionExecuted?: boolean;
    onVaultUpdate?: boolean;
    onPolicyViolation?: boolean;
    onRecoveryInitiated?: boolean;
  };
  defaultVaultId?: number;
  language?: string;
  timezone?: string;
};

export type StellarAccount = {
  publicKey: string;
  signerType?: 'freighter' | 'albedo' | 'ledger' | 'private_key' | 'wallet_connect';
  lastUsed?: number;
  isActive?: boolean;
  name?: string;
};

export type VaultAccess = {
  role: UserRole;
  addedAt: number;
  addedBy: string;
  permissions: string[];
};

@Entity('users')
@Index(['walletAddress'])
@Index(['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  walletAddress: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ nullable: true })
  @Exclude()
  passwordHash: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.VIEWER,
  })
  role: UserRole;

  @Column({ type: 'jsonb', default: [] })
  roles: UserRole[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ type: 'jsonb', default: {} })
  preferences: UserPreferences;

  @Column({ type: 'jsonb', nullable: true })
  stellarAccounts: StellarAccount[];

  @Column({ type: 'jsonb', default: {} })
  vaultAccess: Record<string, VaultAccess>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'bigint', nullable: true })
  lastActiveAt: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.passwordHash) {
      this.passwordHash = await argon2.hash(this.passwordHash);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    if (!this.passwordHash) return false;
    return argon2.verify(this.passwordHash, password);
  }

  toJSON() {
    const { passwordHash, ...user } = this;
    return user;
  }

  hasRole(role: UserRole): boolean {
    return this.roles.includes(role) || this.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    return roles.some(role => this.hasRole(role));
  }
}