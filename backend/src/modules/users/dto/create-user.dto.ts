import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserRole } from '../entities/user.entity';

export class UserPreferencesDto {
  @ApiPropertyOptional({ enum: ['light', 'dark', 'system'], default: 'system' })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  notifications?: {
    email?: boolean;
    push?: boolean;
    onTransactionSubmitted?: boolean;
    onTransactionApproved?: boolean;
    onTransactionExecuted?: boolean;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;
}

export class CreateUserDto {
  @ApiProperty({ description: 'Stellar wallet address', example: 'GABCD...' })
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid Stellar address format. Must start with G and be 56 characters.',
  })
  walletAddress: string;

  @ApiPropertyOptional({ description: 'User email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Display name must be at least 2 characters' })
  @MaxLength(50, { message: 'Display name cannot exceed 50 characters' })
  displayName?: string;

  @ApiPropertyOptional({ description: 'Full name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'User password' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase, one lowercase, and one number',
  })
  password?: string;

  @ApiPropertyOptional({ enum: UserRole, description: 'User role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'User preferences' })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserPreferencesDto)
  preferences?: UserPreferencesDto;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Full name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'User preferences' })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserPreferencesDto)
  preferences?: UserPreferencesDto;

  @ApiPropertyOptional({ description: 'Email verified status' })
  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;
}

export class LoginDto {
  @ApiProperty({ description: 'Stellar wallet address' })
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/)
  walletAddress: string;

  @ApiProperty({ description: 'Signed message from wallet' })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ description: 'Original message that was signed' })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}