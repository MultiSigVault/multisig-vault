import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Vault, SpendingPolicy, SpendingTracker, TimeLockConfig, ScheduleConfig, RecoveryConfig, AuditLogEntry } from './entities/vault.entity';
import {
  CreateVaultDto,
  UpdateVaultDto,
  AddSignerDto,
  RemoveSignerDto,
  UpdateThresholdDto,
  SetSpendingPolicyDto,
  UpdateTimelockConfigDto,
  UpdateScheduleConfigDto,
  InitiateRecoveryDto,
} from './dto/create-vault.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class VaultsService {
  private readonly logger = new Logger(VaultsService.name);

  constructor(
    @InjectRepository(Vault)
    private vaultRepository: Repository<Vault>,
    private configService: ConfigService,
  ) {}

  async create(createVaultDto: CreateVaultDto, user: User): Promise<Vault> {
    this.logger.log(`Creating vault for user ${user.id}`);

    if (createVaultDto.signers.length < 2) {
      throw new BadRequestException('At least 2 signers required');
    }

    if (createVaultDto.threshold < 2 || createVaultDto.threshold > createVaultDto.signers.length) {
      throw new BadRequestException('Threshold must be between 2 and number of signers');
    }

    const lastVault = await this.vaultRepository.find({
      order: { vaultId: 'DESC' },
      take: 1,
    });

    const nextVaultId = lastVault.length > 0 ? lastVault[0].vaultId + 1 : 1;

    // Initialize spending trackers
    const spendingTrackers: Record<string, SpendingTracker> = {};
    for (const signer of createVaultDto.signers) {
      spendingTrackers[signer] = {
        dailySpent: 0,
        weeklySpent: 0,
        monthlySpent: 0,
        lastDailyReset: Date.now(),
        lastWeeklyReset: Date.now(),
        lastMonthlyReset: Date.now(),
        totalSpent: 0,
      };
    }

    const vault = this.vaultRepository.create({
      vaultId: nextVaultId,
      signers: createVaultDto.signers,
      threshold: createVaultDto.threshold,
      name: createVaultDto.name,
      description: createVaultDto.description,
      creatorAddress: user.walletAddress,
      createdBy: user,
      isActive: true,
      balance: 0,
      totalTransactions: 0,
      spendingPolicies: createVaultDto.spendingPolicies || [],
      spendingTrackers,
      timelockConfig: createVaultDto.timelockConfig || {
        enabled: true,
        defaultDelaySeconds: 86400,
        maxDelaySeconds: 2592000,
        minDelaySeconds: 3600,
        emergencyOverrideSigners: [],
        requireTwoFactor: false,
      },
      scheduleConfig: createVaultDto.scheduleConfig || {
        enabled: true,
        maxSchedulesPerVault: 100,
        maxAmountPerSchedule: 10000000000,
        requireApproval: true,
        defaultAutoExecute: false,
        allowedFrequencies: ['once', 'daily', 'weekly', 'monthly', 'yearly'],
      },
      recoveryConfig: createVaultDto.recoveryConfig || null,
      metadata: createVaultDto.metadata || {},
    });

    const saved = await this.vaultRepository.save(vault);
    this.logger.log(`Vault created with ID: ${saved.id}, vaultId: ${saved.vaultId}`);

    await this.addAuditLogEntry(saved.id, 'VAULT_CREATED', user.walletAddress, {
      vaultId: saved.vaultId,
      signers: saved.signers,
      threshold: saved.threshold,
    });

    return saved;
  }

  async findAll(user: User, page: number = 1, limit: number = 20): Promise<{ data: Vault[]; total: number }> {
    const [data, total] = await this.vaultRepository.findAndCount({
      where: [
        { creatorAddress: user.walletAddress },
        { signers: In([user.walletAddress]) },
      ],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOne(id: number, user: User): Promise<Vault> {
    const vault = await this.vaultRepository.findOne({
      where: { id },
      relations: ['transactions'],
    });

    if (!vault) {
      throw new NotFoundException(`Vault with ID ${id} not found`);
    }

    if (!this.hasAccess(vault, user)) {
      throw new ForbiddenException('You do not have access to this vault');
    }

    return vault;
  }

  async findByVaultId(vaultId: number): Promise<Vault> {
    const vault = await this.vaultRepository.findOne({ where: { vaultId } });
    if (!vault) {
      throw new NotFoundException(`Vault with vaultId ${vaultId} not found`);
    }
    return vault;
  }

  async findBySigner(address: string): Promise<Vault[]> {
    const vaults = await this.vaultRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
    return vaults.filter(vault => vault.signers.includes(address));
  }

  async update(id: number, updateDto: UpdateVaultDto, user: User): Promise<Vault> {
    const vault = await this.findOne(id, user);

    const isAuthorized = vault.creatorAddress === user.walletAddress || user.roles.includes('admin');
    if (!isAuthorized) {
      throw new ForbiddenException('Only vault creator or admin can update vault');
    }

    if (updateDto.name) vault.name = updateDto.name;
    if (updateDto.description) vault.description = updateDto.description;
    if (updateDto.metadata) vault.metadata = { ...vault.metadata, ...updateDto.metadata };
    if (updateDto.isActive !== undefined) vault.isActive = updateDto.isActive;

    const saved = await this.vaultRepository.save(vault);
    await this.addAuditLogEntry(vault.id, 'VAULT_UPDATED', user.walletAddress, updateDto);
    return saved;
  }

  async deactivate(id: number, user: User): Promise<Vault> {
    const vault = await this.findOne(id, user);

    const isAuthorized = vault.creatorAddress === user.walletAddress || user.roles.includes('admin');
    if (!isAuthorized) {
      throw new ForbiddenException('Only vault creator or admin can deactivate vault');
    }

    vault.isActive = false;
    vault.deactivatedAt = new Date();
    const saved = await this.vaultRepository.save(vault);
    await this.addAuditLogEntry(vault.id, 'VAULT_DEACTIVATED', user.walletAddress, {});
    return saved;
  }

  async addSigner(id: number, addSignerDto: AddSignerDto, user: User): Promise<Vault> {
    const vault = await this.findOne(id, user);

    const isAuthorized = vault.creatorAddress === user.walletAddress || vault.signers.includes(user.walletAddress);
    if (!isAuthorized) {
      throw new ForbiddenException('Only signers or creator can add signers');
    }

    if (vault.signers.includes(addSignerDto.newSigner)) {
      throw new BadRequestException('Signer already exists');
    }

    vault.signers.push(addSignerDto.newSigner);
    vault.spendingTrackers[addSignerDto.newSigner] = {
      dailySpent: 0,
      weeklySpent: 0,
      monthlySpent: 0,
      lastDailyReset: Date.now(),
      lastWeeklyReset: Date.now(),
      lastMonthlyReset: Date.now(),
      totalSpent: 0,
    };

    const saved = await this.vaultRepository.save(vault);
    await this.addAuditLogEntry(vault.id, 'SIGNER_ADDED', user.walletAddress, { newSigner: addSignerDto.newSigner });
    return saved;
  }

  async removeSigner(id: number, removeSignerDto: RemoveSignerDto, user: User): Promise<Vault> {
    const vault = await this.findOne(id, user);

    const isAuthorized = vault.creatorAddress === user.walletAddress || vault.signers.includes(user.walletAddress);
    if (!isAuthorized) {
      throw new ForbiddenException('Only signers or creator can remove signers');
    }

    const signerIndex = vault.signers.indexOf(removeSignerDto.signerToRemove);
    if (signerIndex === -1) {
      throw new BadRequestException('Signer not found');
    }

    vault.signers.splice(signerIndex, 1);

    if (vault.signers.length < 2) {
      throw new BadRequestException('Cannot remove signer: at least 2 signers required');
    }

    if (vault.threshold > vault.signers.length) {
      vault.threshold = vault.signers.length;
    }

    delete vault.spendingTrackers[removeSignerDto.signerToRemove];

    const saved = await this.vaultRepository.save(vault);
    await this.addAuditLogEntry(vault.id, 'SIGNER_REMOVED', user.walletAddress, { removedSigner: removeSignerDto.signerToRemove });
    return saved;
  }

  async updateThreshold(id: number, updateDto: UpdateThresholdDto, user: User): Promise<Vault> {
    const vault = await this.findOne(id, user);

    const isAuthorized = vault.creatorAddress === user.walletAddress || vault.signers.includes(user.walletAddress);
    if (!isAuthorized) {
      throw new ForbiddenException('Only signers or creator can update threshold');
    }

    if (updateDto.newThreshold < 2 || updateDto.newThreshold > vault.signers.length) {
      throw new BadRequestException('Threshold must be between 2 and number of signers');
    }

    vault.threshold = updateDto.newThreshold;
    const saved = await this.vaultRepository.save(vault);
    await this.addAuditLogEntry(vault.id, 'THRESHOLD_UPDATED', user.walletAddress, { newThreshold: updateDto.newThreshold });
    return saved;
  }

  async updateBalance(id: number, amountChange: number): Promise<Vault> {
    const vault = await this.vaultRepository.findOne({ where: { id } });
    if (!vault) {
      throw new NotFoundException(`Vault with ID ${id} not found`);
    }
    vault.balance += amountChange;
    return this.vaultRepository.save(vault);
  }

  async incrementTransactionCount(id: number): Promise<Vault> {
    const vault = await this.vaultRepository.findOne({ where: { id } });
    if (!vault) {
      throw new NotFoundException(`Vault with ID ${id} not found`);
    }
    vault.totalTransactions += 1;
    return this.vaultRepository.save(vault);
  }

  async setSpendingPolicy(id: number, policyDto: SetSpendingPolicyDto, user: User): Promise<Vault> {
    const vault = await this.findOne(id, user);

    const existingPolicies = vault.spendingPolicies || [];
    const policyIndex = existingPolicies.findIndex(p => p.signer === policyDto.signer);

    const newPolicy: SpendingPolicy = {
      signer: policyDto.signer,
      dailyLimit: policyDto.dailyLimit,
      weeklyLimit: policyDto.weeklyLimit,
      monthlyLimit: policyDto.monthlyLimit,
      perTransactionLimit: policyDto.perTransactionLimit || 0,
      enabled: policyDto.enabled !== false,
    };

    if (policyIndex >= 0) {
      existingPolicies[policyIndex] = newPolicy;
      vault.spendingPolicies = existingPolicies;
    } else {
      vault.spendingPolicies = [...existingPolicies, newPolicy];
    }

    const saved = await this.vaultRepository.save(vault);
    await this.addAuditLogEntry(vault.id, 'POLICY_SET', user.walletAddress, policyDto);
    return saved;
  }

  async checkSpendingPolicy(vaultId: number, signer: string, amount: number): Promise<{
    allowed: boolean;
    reason?: string;
    dailyRemaining?: number;
    weeklyRemaining?: number;
    monthlyRemaining?: number;
  }> {
    const vault = await this.findByVaultId(vaultId);
    const policy = vault.spendingPolicies?.find(p => p.signer === signer);

    if (!policy || !policy.enabled) {
      return { allowed: true };
    }

    const tracker = vault.spendingTrackers?.[signer];
    if (!tracker) {
      return { allowed: true };
    }

    const now = Date.now();
    const dayMs = 86400000;
    const weekMs = 604800000;
    const monthMs = 2592000000;

    let dailySpent = tracker.dailySpent;
    let weeklySpent = tracker.weeklySpent;
    let monthlySpent = tracker.monthlySpent;

    if (now - tracker.lastDailyReset >= dayMs) dailySpent = 0;
    if (now - tracker.lastWeeklyReset >= weekMs) weeklySpent = 0;
    if (now - tracker.lastMonthlyReset >= monthMs) monthlySpent = 0;

    const dailyRemaining = policy.dailyLimit - dailySpent;
    const weeklyRemaining = policy.weeklyLimit - weeklySpent;
    const monthlyRemaining = policy.monthlyLimit - monthlySpent;

    if (policy.dailyLimit > 0 && amount > dailyRemaining) {
      return { allowed: false, reason: 'Daily limit exceeded', dailyRemaining, weeklyRemaining, monthlyRemaining };
    }

    if (policy.weeklyLimit > 0 && amount > weeklyRemaining) {
      return { allowed: false, reason: 'Weekly limit exceeded', dailyRemaining, weeklyRemaining, monthlyRemaining };
    }

    if (policy.monthlyLimit > 0 && amount > monthlyRemaining) {
      return { allowed: false, reason: 'Monthly limit exceeded', dailyRemaining, weeklyRemaining, monthlyRemaining };
    }

    if (policy.perTransactionLimit > 0 && amount > policy.perTransactionLimit) {
      return { allowed: false, reason: 'Per-transaction limit exceeded', dailyRemaining, weeklyRemaining, monthlyRemaining };
    }

    return { allowed: true, dailyRemaining, weeklyRemaining, monthlyRemaining };
  }

  async updateSpendingTracker(vaultId: number, signer: string, amount: number): Promise<void> {
    const vault = await this.findByVaultId(vaultId);
    const tracker = vault.spendingTrackers?.[signer];

    if (tracker) {
      const now = Date.now();
      const dayMs = 86400000;
      const weekMs = 604800000;
      const monthMs = 2592000000;

      if (now - tracker.lastDailyReset >= dayMs) tracker.dailySpent = 0;
      if (now - tracker.lastWeeklyReset >= weekMs) tracker.weeklySpent = 0;
      if (now - tracker.lastMonthlyReset >= monthMs) tracker.monthlySpent = 0;

      tracker.dailySpent += amount;
      tracker.weeklySpent += amount;
      tracker.monthlySpent += amount;
      tracker.totalSpent += amount;

      if (now - tracker.lastDailyReset >= dayMs) tracker.lastDailyReset = now;
      if (now - tracker.lastWeeklyReset >= weekMs) tracker.lastWeeklyReset = now;
      if (now - tracker.lastMonthlyReset >= monthMs) tracker.lastMonthlyReset = now;

      vault.spendingTrackers[signer] = tracker;
      await this.vaultRepository.save(vault);
    }
  }

  async getVaultBalance(vaultId: number): Promise<number> {
    const vault = await this.findByVaultId(vaultId);
    return vault.balance;
  }

  async getStats(user: User): Promise<any> {
    const totalVaults = await this.vaultRepository.count();
    const activeVaults = await this.vaultRepository.count({ where: { isActive: true } });
    const userVaults = await this.findAll(user);
    const totalBalanceResult = await this.vaultRepository
      .createQueryBuilder('vault')
      .select('SUM(vault.balance)', 'total')
      .getRawOne();

    return {
      totalVaults,
      activeVaults,
      totalBalance: parseInt(totalBalanceResult?.total || '0'),
      userVaults: userVaults.total,
    };
  }

  private hasAccess(vault: Vault, user: User): boolean {
    return (
      vault.creatorAddress === user.walletAddress ||
      vault.signers.includes(user.walletAddress) ||
      user.roles.includes('admin')
    );
  }

  private async addAuditLogEntry(vaultId: number, action: string, actor: string, details: Record<string, any>): Promise<void> {
    const vault = await this.vaultRepository.findOne({ where: { id: vaultId } });
    if (vault) {
      const entry: AuditLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        action,
        actor,
        details,
        timestamp: Date.now(),
      };
      vault.auditLogs = [...(vault.auditLogs || []), entry];
      await this.vaultRepository.save(vault);
    }
  }

  async getAuditLog(vaultId: number, user: User, limit: number = 50): Promise<AuditLogEntry[]> {
    const vault = await this.findOne(vaultId, user);
    return (vault.auditLogs || []).slice(-limit).reverse();
  }
}