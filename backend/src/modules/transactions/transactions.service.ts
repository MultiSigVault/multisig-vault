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
import { Repository, Between, FindOptionsWhere, In } from 'typeorm';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import {
  SubmitTransactionDto,
  ApproveTransactionDto,
  RevokeApprovalDto,
  ExecuteTransactionDto,
  RejectTransactionDto,
  CancelTransactionDto,
  BatchSubmitDto,
  TransactionQueryDto,
} from './dto/submit-transaction.dto';
import { VaultsService } from '../vaults/vaults.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @Inject(forwardRef(() => VaultsService))
    private vaultsService: VaultsService,
    private usersService: UsersService,
  ) {}

  async submitTransaction(submitDto: SubmitTransactionDto, fromAddress: string): Promise<Transaction> {
    this.logger.log(`Submitting transaction for vault ${submitDto.vaultId} from ${fromAddress}`);

    const vault = await this.vaultsService.findByVaultId(submitDto.vaultId);
    if (!vault) {
      throw new NotFoundException(`Vault ${submitDto.vaultId} not found`);
    }

    if (!vault.isActive) {
      throw new BadRequestException(`Vault ${submitDto.vaultId} is not active`);
    }

    const isSigner = vault.signers.includes(fromAddress);
    if (!isSigner) {
      throw new ForbiddenException('Only vault signers can submit transactions');
    }

    // Check spending policy
    if (!submitDto.policyOverride?.overrideDailyLimit &&
        !submitDto.policyOverride?.overrideWeeklyLimit &&
        !submitDto.policyOverride?.overrideMonthlyLimit) {
      const policyCheck = await this.vaultsService.checkSpendingPolicy(
        vault.vaultId,
        fromAddress,
        submitDto.amount,
      );
      if (!policyCheck.allowed) {
        throw new BadRequestException(`Spending policy violation: ${policyCheck.reason}`);
      }
    }

    // Get next transaction ID
    const lastTx = await this.transactionRepository.find({
      where: { vaultId: vault.id },
      order: { transactionId: 'DESC' },
      take: 1,
    });

    const nextTxId = lastTx.length > 0 ? lastTx[0].transactionId + 1 : 1;

    let releaseTime: number | null = null;
    let timelockId: number | null = null;
    let scheduleId: number | null = null;
    let status: TransactionStatus = 'pending';

    // Handle time lock
    if (submitDto.timelock) {
      releaseTime = Date.now() + (submitDto.timelock.delaySeconds * 1000);
      timelockId = nextTxId;
      status = 'timelocked';
    }

    // Handle schedule
    if (submitDto.schedule) {
      scheduleId = nextTxId;
      status = 'scheduled';
    }

    const transaction = this.transactionRepository.create({
      transactionId: nextTxId,
      vaultId: vault.id,
      fromAddress,
      toAddress: submitDto.toAddress,
      amount: submitDto.amount,
      tokenAddress: submitDto.tokenAddress,
      status,
      approvals: [],
      requiredApprovals: vault.threshold,
      description: submitDto.description,
      metadata: submitDto.metadata,
      timelockId,
      scheduleId,
      releaseTime,
    });

    const saved = await this.transactionRepository.save(transaction);
    this.logger.log(`Transaction submitted with ID: ${saved.transactionId}`);

    // Update vault balance for deposit? No, balance is on-chain
    return saved;
  }

  async batchSubmit(batchDto: BatchSubmitDto, fromAddress: string): Promise<Transaction[]> {
    const results: Transaction[] = [];
    for (const dto of batchDto.transactions) {
      const tx = await this.submitTransaction(dto, fromAddress);
      results.push(tx);
    }
    return results;
  }

  async findAll(vaultId: number, query: TransactionQueryDto, user?: any): Promise<{ data: Transaction[]; total: number; page: number; limit: number; totalPages: number }> {
    const vault = await this.vaultsService.findOne(vaultId, user);
    if (!vault) {
      throw new NotFoundException(`Vault ${vaultId} not found`);
    }

    const where: FindOptionsWhere<Transaction> = { vaultId: vault.id };

    if (query.status) {
      where.status = query.status as TransactionStatus;
    }

    if (query.signer) {
      where.approvals = In([query.signer]);
    }

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const [data, total] = await this.transactionRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { [query.sortBy || 'createdAt']: (query.sortOrder || 'DESC').toUpperCase() as any },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, vaultId: number, user?: any): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, vaultId },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} not found in vault ${vaultId}`);
    }
    return transaction;
  }

  async findByTransactionId(transactionId: number, vaultId: number): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { transactionId, vaultId },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${transactionId} not found in vault ${vaultId}`);
    }
    return transaction;
  }

  async approveTransaction(approveDto: ApproveTransactionDto, vaultId: number, signerAddress: string): Promise<Transaction> {
    const vault = await this.vaultsService.findByVaultId(vaultId);
    const transaction = await this.findByTransactionId(approveDto.transactionId, vault.id);

    const isSigner = vault.signers.includes(signerAddress);
    if (!isSigner) {
      throw new ForbiddenException('Only vault signers can approve transactions');
    }

    if (transaction.status === 'executed') {
      throw new BadRequestException('Transaction already executed');
    }

    if (transaction.status === 'rejected' || transaction.status === 'cancelled') {
      throw new BadRequestException(`Transaction is ${transaction.status}, cannot approve`);
    }

    const approvals = transaction.approvals || [];
    if (approvals.includes(signerAddress)) {
      throw new BadRequestException('Already approved by this signer');
    }

    const revocations = transaction.revocations || [];
    if (revocations.includes(signerAddress)) {
      throw new BadRequestException('Cannot approve after revoking');
    }

    approvals.push(signerAddress);
    transaction.approvals = approvals;

    if (approvals.length >= transaction.requiredApprovals) {
      transaction.status = 'approved';
      transaction.approvedAt = Date.now();
    }

    await this.transactionRepository.save(transaction);
    this.logger.log(`Transaction ${transaction.transactionId} approved by ${signerAddress}`);

    return transaction;
  }

  async revokeApproval(revokeDto: RevokeApprovalDto, vaultId: number, signerAddress: string): Promise<Transaction> {
    const vault = await this.vaultsService.findByVaultId(vaultId);
    const transaction = await this.findByTransactionId(revokeDto.transactionId, vault.id);

    const isSigner = vault.signers.includes(signerAddress);
    if (!isSigner) {
      throw new ForbiddenException('Only vault signers can revoke approvals');
    }

    if (transaction.status !== 'pending' && transaction.status !== 'approved') {
      throw new BadRequestException(`Transaction is ${transaction.status}, cannot revoke approval`);
    }

    const approvals = transaction.approvals || [];
    const approvalIndex = approvals.indexOf(signerAddress);
    if (approvalIndex === -1) {
      throw new BadRequestException('No approval found from this signer');
    }

    approvals.splice(approvalIndex, 1);
    transaction.approvals = approvals;

    const revocations = transaction.revocations || [];
    if (!revocations.includes(signerAddress)) {
      revocations.push(signerAddress);
      transaction.revocations = revocations;
    }

    if (transaction.status === 'approved' && approvals.length < transaction.requiredApprovals) {
      transaction.status = 'pending';
    }

    await this.transactionRepository.save(transaction);
    return transaction;
  }

  async executeTransaction(executeDto: ExecuteTransactionDto, vaultId: number, executorAddress?: string): Promise<Transaction> {
    const vault = await this.vaultsService.findByVaultId(vaultId);
    const transaction = await this.findByTransactionId(executeDto.transactionId, vault.id);

    if (transaction.status === 'executed') {
      throw new BadRequestException('Transaction already executed');
    }

    if (transaction.status === 'failed') {
      throw new BadRequestException('Transaction previously failed');
    }

    if (transaction.status === 'rejected' || transaction.status === 'cancelled') {
      throw new BadRequestException(`Transaction is ${transaction.status}, cannot execute`);
    }

    // Check timelock
    if (transaction.timelockId && transaction.releaseTime) {
      if (Date.now() < transaction.releaseTime) {
        if (!executeDto.forceExecute) {
          const remainingHours = Math.ceil((transaction.releaseTime - Date.now()) / (1000 * 60 * 60));
          throw new BadRequestException(`Time lock active. Release in ${remainingHours} hours.`);
        } else {
          // Check if executor has override permission
          const isAdmin = executorAddress === vault.creatorAddress;
          if (!isAdmin) {
            throw new ForbiddenException('Not authorized for emergency override');
          }
        }
      }
    }

    // Check if enough approvals
    const approvalsCount = transaction.approvals?.length || 0;
    if (approvalsCount < transaction.requiredApprovals && transaction.status !== 'approved') {
      throw new BadRequestException(`Insufficient approvals. Required: ${transaction.requiredApprovals}, Current: ${approvalsCount}`);
    }

    // Execute transaction
    try {
      // Here you would call the actual Stellar transaction
      // const stellarTx = await this.stellarService.sendPayment(...)

      transaction.status = 'executed';
      transaction.executedAt = Date.now();
      transaction.stellarTxHash = `0x${Math.random().toString(36).substring(2, 42)}`;

      await this.transactionRepository.save(transaction);

      // Update spending tracker
      await this.vaultsService.updateSpendingTracker(vault.id, transaction.fromAddress, transaction.amount);
      await this.vaultsService.incrementTransactionCount(vault.id);

      this.logger.log(`Transaction ${transaction.transactionId} executed`);
      return transaction;
    } catch (error) {
      transaction.status = 'failed';
      transaction.failureReason = error.message;
      await this.transactionRepository.save(transaction);
      throw new BadRequestException(`Execution failed: ${error.message}`);
    }
  }

  async rejectTransaction(rejectDto: RejectTransactionDto, vaultId: number, signerAddress: string): Promise<Transaction> {
    const vault = await this.vaultsService.findByVaultId(vaultId);
    const transaction = await this.findByTransactionId(rejectDto.transactionId, vault.id);

    const isSigner = vault.signers.includes(signerAddress);
    if (!isSigner) {
      throw new ForbiddenException('Only vault signers can reject transactions');
    }

    if (transaction.status !== 'pending') {
      throw new BadRequestException(`Transaction is ${transaction.status}, cannot reject`);
    }

    transaction.status = 'rejected';
    transaction.failureReason = rejectDto.reason || 'Rejected by signer';
    await this.transactionRepository.save(transaction);
    return transaction;
  }

  async cancelTransaction(cancelDto: CancelTransactionDto, vaultId: number, signerAddress: string): Promise<Transaction> {
    const vault = await this.vaultsService.findByVaultId(vaultId);
    const transaction = await this.findByTransactionId(cancelDto.transactionId, vault.id);

    const isSigner = vault.signers.includes(signerAddress);
    const isProposer = transaction.fromAddress === signerAddress;

    if (!isSigner && !isProposer) {
      throw new ForbiddenException('Only the proposer or a signer can cancel this transaction');
    }

    if (transaction.status !== 'pending' && transaction.status !== 'approved') {
      throw new BadRequestException(`Transaction is ${transaction.status}, cannot cancel`);
    }

    transaction.status = 'cancelled';
    transaction.failureReason = cancelDto.reason || 'Cancelled';
    await this.transactionRepository.save(transaction);
    return transaction;
  }

  async getTransactionStats(vaultId: number): Promise<any> {
    const vault = await this.vaultsService.findByVaultId(vaultId);
    const transactions = await this.transactionRepository.find({ where: { vaultId: vault.id } });

    const stats = {
      pending: transactions.filter(t => t.status === 'pending').length,
      approved: transactions.filter(t => t.status === 'approved').length,
      executed: transactions.filter(t => t.status === 'executed').length,
      rejected: transactions.filter(t => t.status === 'rejected').length,
      cancelled: transactions.filter(t => t.status === 'cancelled').length,
      failed: transactions.filter(t => t.status === 'failed').length,
      timelocked: transactions.filter(t => t.status === 'timelocked').length,
      scheduled: transactions.filter(t => t.status === 'scheduled').length,
      totalVolume: transactions
        .filter(t => t.status === 'executed')
        .reduce((sum, t) => sum + t.amount, 0),
      totalTransactions: transactions.length,
    };

    // Calculate average approval time
    const approvedTxs = transactions.filter(t => t.approvedAt && t.createdAt);
    if (approvedTxs.length > 0) {
      const totalTime = approvedTxs.reduce((sum, t) => {
        const created = new Date(t.createdAt).getTime();
        const approved = t.approvedAt || created;
        return sum + (approved - created);
      }, 0);
      stats['avgApprovalTimeMs'] = totalTime / approvedTxs.length;
    }

    return stats;
  }

  async getPendingTransactions(vaultId: number, user?: any): Promise<Transaction[]> {
    const vault = await this.vaultsService.findOne(vaultId, user);
    return this.transactionRepository.find({
      where: { vaultId: vault.id, status: 'pending' },
      order: { createdAt: 'ASC' },
    });
  }

  async getTransactionsBySigner(vaultId: number, signerAddress: string, user?: any): Promise<Transaction[]> {
    const vault = await this.vaultsService.findOne(vaultId, user);
    const transactions = await this.transactionRepository.find({
      where: { vaultId: vault.id },
      order: { createdAt: 'DESC' },
    });
    return transactions.filter(t => t.approvals?.includes(signerAddress) || t.fromAddress === signerAddress);
  }
}