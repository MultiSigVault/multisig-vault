import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsObject,
  IsBoolean,
  ArrayMinSize,
  ArrayMaxSize,
  Matches,
  ValidateNested,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SpendingPolicyDto {
  @ApiProperty({ example: 'GABC123...', description: 'Signer address' })
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/)
  signer: string;

  @ApiProperty({ example: 1000000000, description: 'Daily spending limit in stroops' })
  @IsNumber()
  @Min(0)
  dailyLimit: number;

  @ApiProperty({ example: 5000000000, description: 'Weekly spending limit in stroops' })
  @IsNumber()
  @Min(0)
  weeklyLimit: number;

  @ApiProperty({ example: 20000000000, description: 'Monthly spending limit in stroops' })
  @IsNumber()
  @Min(0)
  monthlyLimit: number;

  @ApiPropertyOptional({ example: 50000000, description: 'Per-transaction limit in stroops' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  perTransactionLimit?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Policy name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;
}

export class TimelockConfigDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 86400, description: 'Default delay in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(60)
  defaultDelaySeconds?: number;

  @ApiPropertyOptional({ example: 2592000, description: 'Maximum delay in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(60)
  maxDelaySeconds?: number;

  @ApiPropertyOptional({ example: 3600, description: 'Minimum delay in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(60)
  minDelaySeconds?: number;

  @ApiPropertyOptional({ example: ['GABC123...'], description: 'Emergency override signers' })
  @IsOptional()
  @IsArray()
  @Matches(/^G[A-Z0-9]{55}$/, { each: true })
  emergencyOverrideSigners?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requireTwoFactor?: boolean;
}

export class ScheduleConfigDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 100, description: 'Maximum scheduled transactions per vault' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSchedulesPerVault?: number;

  @ApiPropertyOptional({ example: 10000000000, description: 'Maximum amount per schedule in stroops' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmountPerSchedule?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  defaultAutoExecute?: boolean;

  @ApiPropertyOptional({ example: ['once', 'daily', 'weekly', 'monthly', 'yearly'] })
  @IsOptional()
  @IsArray()
  @IsIn(['once', 'daily', 'weekly', 'monthly', 'yearly'], { each: true })
  allowedFrequencies?: string[];
}

export class RecoveryConfigDto {
  @ApiProperty({ example: ['GABC123...', 'GDEF456...'], description: 'Guardian addresses' })
  @IsArray()
  @ArrayMinSize(1)
  @Matches(/^G[A-Z0-9]{55}$/, { each: true })
  guardians: string[];

  @ApiProperty({ example: 2, description: 'Number of guardian approvals required' })
  @IsNumber()
  @Min(1)
  threshold: number;

  @ApiPropertyOptional({ example: 604800, description: 'Recovery delay in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(60)
  recoveryDelaySeconds?: number;
}

export class CreateVaultDto {
  @ApiProperty({ example: ['GABC123...', 'GDEF456...', 'GHIJ789...'], description: 'List of signer addresses' })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @Matches(/^G[A-Z0-9]{55}$/, { each: true })
  signers: string[];

  @ApiProperty({ example: 2, description: 'Number of approvals required (2 or more)' })
  @IsNumber()
  @Min(2)
  threshold: number;

  @ApiProperty({ example: 'Team Treasury', description: 'Vault name', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Main team operational funds', description: 'Vault description', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ description: 'Spending policies per signer', type: [SpendingPolicyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpendingPolicyDto)
  spendingPolicies?: SpendingPolicyDto[];

  @ApiPropertyOptional({ description: 'Time lock configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimelockConfigDto)
  timelockConfig?: TimelockConfigDto;

  @ApiPropertyOptional({ description: 'Schedule configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleConfigDto)
  scheduleConfig?: ScheduleConfigDto;

  @ApiPropertyOptional({ description: 'Recovery configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecoveryConfigDto)
  recoveryConfig?: RecoveryConfigDto;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateVaultDto {
  @ApiPropertyOptional({ description: 'Vault name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Vault description', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Vault active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddSignerDto {
  @ApiProperty({ example: 'GABC123...', description: 'New signer address' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/)
  newSigner: string;
}

export class RemoveSignerDto {
  @ApiProperty({ example: 'GABC123...', description: 'Signer address to remove' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/)
  signerToRemove: string;
}

export class UpdateThresholdDto {
  @ApiProperty({ example: 3, description: 'New threshold value', minimum: 2 })
  @IsNumber()
  @Min(2)
  newThreshold: number;
}

export class SetSpendingPolicyDto {
  @ApiProperty({ example: 'GABC123...', description: 'Signer address' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/)
  signer: string;

  @ApiProperty({ example: 1000000000, description: 'Daily limit in stroops' })
  @IsNumber()
  @Min(0)
  dailyLimit: number;

  @ApiProperty({ example: 5000000000, description: 'Weekly limit in stroops' })
  @IsNumber()
  @Min(0)
  weeklyLimit: number;

  @ApiProperty({ example: 20000000000, description: 'Monthly limit in stroops' })
  @IsNumber()
  @Min(0)
  monthlyLimit: number;

  @ApiPropertyOptional({ example: 50000000, description: 'Per-transaction limit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  perTransactionLimit?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateTimelockConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 86400 })
  @IsOptional()
  @IsNumber()
  @Min(60)
  defaultDelaySeconds?: number;

  @ApiPropertyOptional({ example: 2592000 })
  @IsOptional()
  @IsNumber()
  @Min(60)
  maxDelaySeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  emergencyOverrideSigners?: string[];
}

export class UpdateScheduleConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSchedulesPerVault?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;
}

export class InitiateRecoveryDto {
  @ApiProperty({ example: 'GNEW123...', description: 'New signer address for recovery' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/)
  newSigner: string;

  @ApiPropertyOptional({ example: ['GABC123...', 'GDEF456...'], description: 'Guardian addresses' })
  @IsOptional()
  @IsArray()
  @Matches(/^G[A-Z0-9]{55}$/, { each: true })
  guardians?: string[];

  @ApiPropertyOptional({ example: 2, description: 'Number of guardian approvals required' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  threshold?: number;

  @ApiPropertyOptional({ example: 604800, description: 'Recovery delay in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(60)
  recoveryDelaySeconds?: number;

  @ApiPropertyOptional({ description: 'Recovery reason' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ApproveRecoveryDto {
  @ApiProperty({ example: 'GABC123...', description: 'Guardian address approving recovery' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/)
  guardianAddress: string;
}