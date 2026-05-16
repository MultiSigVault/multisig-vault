import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  MaxLength,
  IsIn,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PolicyOverrideDto {
  @ApiPropertyOptional({ description: 'Override daily limit check', default: false })
  @IsOptional()
  @IsBoolean()
  overrideDailyLimit?: boolean;

  @ApiPropertyOptional({ description: 'Override weekly limit check', default: false })
  @IsOptional()
  @IsBoolean()
  overrideWeeklyLimit?: boolean;

  @ApiPropertyOptional({ description: 'Override monthly limit check', default: false })
  @IsOptional()
  @IsBoolean()
  overrideMonthlyLimit?: boolean;

  @ApiPropertyOptional({ description: 'Reason for override' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  overrideReason?: string;
}

export class TimelockConfigDto {
  @ApiProperty({ description: 'Delay in seconds before execution', example: 86400, minimum: 60 })
  @IsNumber()
  @Min(60)
  delaySeconds: number;

  @ApiPropertyOptional({ description: 'Reason for timelock' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ScheduleConfigDto {
  @ApiProperty({ description: 'Schedule type', enum: ['once', 'daily', 'weekly', 'monthly', 'yearly'] })
  @IsIn(['once', 'daily', 'weekly', 'monthly', 'yearly'])
  frequency: string;

  @ApiProperty({ description: 'Start timestamp (Unix seconds)', example: 1700000000 })
  @IsNumber()
  @Min(0)
  startTime: number;

  @ApiPropertyOptional({ description: 'End timestamp (Unix seconds)' })
  @IsOptional()
  @IsNumber()
  endTime?: number;

  @ApiPropertyOptional({ description: 'Number of executions', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxExecutions?: number;

  @ApiPropertyOptional({ description: 'Execute regardless of approval', default: false })
  @IsOptional()
  @IsBoolean()
  autoExecute?: boolean;
}

export class SubmitTransactionDto {
  @ApiProperty({ example: 1, description: 'Vault ID' })
  @IsNumber()
  @Min(1)
  vaultId: number;

  @ApiProperty({ example: 'GABC123...', description: 'Recipient Stellar address' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/, { message: 'Invalid Stellar address format' })
  toAddress: string;

  @ApiProperty({ example: 10000000, description: 'Amount in stroops (1 XLM = 10,000,000 stroops)' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'native', description: 'Token address (native = XLM, or custom contract address)' })
  @IsString()
  @IsNotEmpty()
  tokenAddress: string;

  @ApiPropertyOptional({ description: 'Transaction description', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Custom metadata for contract calls' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Override spending policy checks' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PolicyOverrideDto)
  policyOverride?: PolicyOverrideDto;

  @ApiPropertyOptional({ description: 'Time lock configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimelockConfigDto)
  timelock?: TimelockConfigDto;

  @ApiPropertyOptional({ description: 'Schedule configuration for recurring payments' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleConfigDto)
  schedule?: ScheduleConfigDto;
}

export class ApproveTransactionDto {
  @ApiProperty({ example: 1, description: 'Transaction ID' })
  @IsNumber()
  @Min(1)
  transactionId: number;
}

export class RevokeApprovalDto {
  @ApiProperty({ example: 1, description: 'Transaction ID' })
  @IsNumber()
  @Min(1)
  transactionId: number;
}

export class ExecuteTransactionDto {
  @ApiProperty({ example: 1, description: 'Transaction ID' })
  @IsNumber()
  @Min(1)
  transactionId: number;

  @ApiPropertyOptional({ description: 'Force execute even if timelock not expired (admin only)', default: false })
  @IsOptional()
  @IsBoolean()
  forceExecute?: boolean;
}

export class RejectTransactionDto {
  @ApiProperty({ example: 1, description: 'Transaction ID' })
  @IsNumber()
  @Min(1)
  transactionId: number;

  @ApiPropertyOptional({ description: 'Rejection reason' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CancelTransactionDto {
  @ApiProperty({ example: 1, description: 'Transaction ID' })
  @IsNumber()
  @Min(1)
  transactionId: number;

  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class BatchSubmitDto {
  @ApiProperty({ description: 'Array of transactions to submit', type: [SubmitTransactionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitTransactionDto)
  transactions: SubmitTransactionDto[];
}

export class TransactionQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ['pending', 'approved', 'executed', 'rejected', 'cancelled', 'failed', 'timelocked', 'scheduled'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'executed', 'rejected', 'cancelled', 'failed', 'timelocked', 'scheduled'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by signer address' })
  @IsOptional()
  @IsString()
  signer?: string;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt', 'executedAt', 'amount'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: string = 'DESC';
}