import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
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
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('transactions')
@Controller('vaults/:vaultId/transactions')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new transaction to a vault' })
  @ApiResponse({ status: 201, description: 'Transaction submitted successfully' })
  async submit(
    @Param('vaultId', ParseIntPipe) vaultId: number,
    @Body() submitDto: SubmitTransactionDto,
    @Request() req,
  ) {
    const fromAddress = req.user.walletAddress;
    return this.transactionsService.submitTransaction(submitDto, fromAddress);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Submit multiple transactions in batch' })
  async batchSubmit(
    @Param('vaultId', ParseIntPipe) vaultId: number,
    @Body() batchDto: BatchSubmitDto,
    @Request() req,
  ) {
    const fromAddress = req.user.walletAddress;
    return this.transactionsService.batchSubmit(batchDto, fromAddress);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions for a vault' })
  async findAll(
    @Param('vaultId', ParseIntPipe) vaultId: number,
    @Query() query: TransactionQueryDto,
    @Request() req,
  ) {
    return this.transactionsService.findAll(vaultId, query, req.user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get transaction statistics for a vault' })
  async getStats(
    @Param('vaultId', ParseIntPipe) vaultId: number,
    @Request() req,
  ) {
    return this.transactionsService.getTransactionStats(vaultId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending transactions for a vault' })
  async getPending(
    @Param('vaultId', ParseIntPipe) vaultId: number,
    @Request() req,
  ) {
    return this.transactionsService.getPendingTransactions(vaultId, req.user);
  }

  @Get('signer/:signerAddress')
  @ApiOperation({ summary: 'Get transactions by signer' })
  async getBySigner(
    @Param('vaultId', ParseIntPipe) vaultId: number,
    @Param('signerAddress') signerAddress: string,
    @Request() req,
  ) {
    return this.transactionsService.getTransactionsBySigner(vaultId, signerAddress, req.user);
  }

  @Get(':transactionId')
  @ApiOperation({ summary: 'Get transaction by transactionId' })
  @ApiParam({ name: 'transactionId', description: 'Sequential transaction ID within the vault' })
  async findByTransactionId(
    @Param('vaultId', ParseIntPipe) vaultId: number,
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @Request() req,
  ) {
    return this.transactionsService.findByTransactionId(transactionId, vaultId);
  }

  @Post(':transactionId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending transaction' })
  async approve(
    @Param('vaultId', ParseIntPipe) vaultId: number,
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @Request() req,
  ) {
    const signerAddress = req.user.walletAddress;
    return this.transactionsService.approveTransaction(
      { transactionId },
      vaultId,
      signerAddress,
    );
  }

  @Post(':transactionId/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an approval' })
  async revoke(
    @Param('vaultId', ParseIntPipe) vaultId: number,
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @Request() req,
  ) {
    const signerAddress = req.user.walletAddress;
    return this.transactionsService.revokeApproval(
      { transactionId },
      vaultId,
      signerAddress,
    );
  }

  @Post(':transactionId/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute an approved transaction' })
  async execute(
    @Param('vaultId', ParseIntPipe) vaultId: number,
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @Body() executeDto: ExecuteTransactionDto,
    @Request() req,
  ) {
    const executorAddress = req.user.walletAddress;
    return this.transactionsService.executeTransaction(
      { ...executeDto, transactionId },
      vaultId,
      executorAddress,
    );
  }

  @Post(':transactionId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending transaction' })
  async reject(
    @Param('vaultId', ParseIntPipe) vaultId: number,
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @Body() rejectDto: RejectTransactionDto,
    @Request() req,
  ) {
    const signerAddress = req.user.walletAddress;
    return this.transactionsService.rejectTransaction(
      { ...rejectDto, transactionId },
      vaultId,
      signerAddress,
    );
  }

  @Post(':transactionId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending or approved transaction' })
  async cancel(
    @Param('vaultId', ParseIntPipe) vaultId: number,
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @Body() cancelDto: CancelTransactionDto,
    @Request() req,
  ) {
    const signerAddress = req.user.walletAddress;
    return this.transactionsService.cancelTransaction(
      { ...cancelDto, transactionId },
      vaultId,
      signerAddress,
    );
  }
}