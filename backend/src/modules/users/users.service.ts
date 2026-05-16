import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserRole, StellarAccount } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, LoginDto } from './dto/create-user.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Creating user with wallet: ${createUserDto.walletAddress}`);

    const existingUser = await this.userRepository.findOne({
      where: { walletAddress: createUserDto.walletAddress },
    });

    if (existingUser) {
      throw new ConflictException('User with this wallet address already exists');
    }

    if (createUserDto.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: createUserDto.email },
      });
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    const user = this.userRepository.create({
      ...createUserDto,
      roles: [createUserDto.role || UserRole.VIEWER],
      stellarAccounts: [
        {
          publicKey: createUserDto.walletAddress,
          signerType: 'freighter',
          isActive: true,
          lastUsed: Date.now(),
        },
      ],
    });

    const saved = await this.userRepository.save(user);
    this.logger.log(`User created with ID: ${saved.id}`);
    return saved;
  }

  async findAll(page: number = 1, limit: number = 20, search?: string): Promise<{ data: User[]; total: number }> {
    const where: any = {};
    if (search) {
      where.walletAddress = Like(`%${search}%`);
    }

    const [data, total] = await this.userRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { walletAddress } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, updateData: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    if (updateData.email && updateData.email !== user.email) {
      const existing = await this.findByEmail(updateData.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    Object.assign(user, updateData);
    const saved = await this.userRepository.save(user);
    this.logger.log(`User ${id} updated`);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
    this.logger.log(`User ${id} removed`);
  }

  async authenticate(loginDto: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    this.logger.log(`Authenticating user: ${loginDto.walletAddress}`);

    const isValid = await this.verifyWalletSignature(
      loginDto.walletAddress,
      loginDto.signature,
      loginDto.message,
    );

    if (!isValid) {
      this.logger.warn(`Invalid signature for wallet: ${loginDto.walletAddress}`);
      throw new UnauthorizedException('Invalid wallet signature');
    }

    let user = await this.findByWalletAddress(loginDto.walletAddress);
    
    if (!user) {
      user = await this.create({
        walletAddress: loginDto.walletAddress,
      });
    }

    user.lastLoginAt = new Date();
    user.lastActiveAt = Date.now();
    await this.userRepository.save(user);

    const tokens = await this.generateAuthToken(user);
    return { ...tokens, user };
  }

  async generateAuthToken(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      walletAddress: user.walletAddress,
      roles: user.roles,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      },
    );

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.findOne(payload.sub);
      const accessToken = this.jwtService.sign(
        {
          sub: user.id,
          walletAddress: user.walletAddress,
          roles: user.roles,
          email: user.email,
        },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
        },
      );

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async verifyWalletSignature(walletAddress: string, signature: string, message: string): Promise<boolean> {
    try {
      // In production, use @stellar/stellar-sdk to verify
      // const { Keypair } = require('@stellar/stellar-sdk');
      // const keypair = Keypair.fromPublicKey(walletAddress);
      // return keypair.verify(message, signature);
      
      // For development, accept any signature
      this.logger.debug(`Verifying signature for ${walletAddress}`);
      return true;
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return false;
    }
  }

  async generateNonce(walletAddress: string): Promise<string> {
    const nonce = randomBytes(32).toString('hex');
    const message = `Sign this message to authenticate with MultiSig Vault\n\nNonce: ${nonce}\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
    return message;
  }

  async addStellarAccount(userId: string, account: StellarAccount): Promise<User> {
    const user = await this.findOne(userId);
    
    const existing = user.stellarAccounts?.find(a => a.publicKey === account.publicKey);
    if (existing) {
      throw new ConflictException('Stellar account already linked');
    }

    user.stellarAccounts = [...(user.stellarAccounts || []), account];
    return this.userRepository.save(user);
  }

  async removeStellarAccount(userId: string, publicKey: string): Promise<User> {
    const user = await this.findOne(userId);
    user.stellarAccounts = (user.stellarAccounts || []).filter(a => a.publicKey !== publicKey);
    return this.userRepository.save(user);
  }

  async addRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.findOne(userId);
    if (!user.roles.includes(role)) {
      user.roles.push(role);
      await this.userRepository.save(user);
      this.logger.log(`Role ${role} added to user ${userId}`);
    }
    return user;
  }

  async removeRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.findOne(userId);
    user.roles = user.roles.filter((r) => r !== role);
    await this.userRepository.save(user);
    this.logger.log(`Role ${role} removed from user ${userId}`);
    return user;
  }

  async getVaultAccess(userId: string, vaultId: number): Promise<UserRole | null> {
    const user = await this.findOne(userId);
    const access = user.vaultAccess?.[vaultId.toString()];
    return access?.role || null;
  }

  async grantVaultAccess(userId: string, vaultId: number, role: UserRole, grantedBy: string): Promise<User> {
    const user = await this.findOne(userId);
    user.vaultAccess = {
      ...user.vaultAccess,
      [vaultId]: {
        role,
        addedAt: Date.now(),
        addedBy: grantedBy,
        permissions: this.getPermissionsForRole(role),
      },
    };
    return this.userRepository.save(user);
  }

  private getPermissionsForRole(role: UserRole): string[] {
    const permissions = {
      [UserRole.VIEWER]: ['view_transactions', 'view_vault'],
      [UserRole.SIGNER]: ['view_transactions', 'view_vault', 'approve_transactions', 'submit_transactions'],
      [UserRole.MAINTAINER]: ['view_transactions', 'view_vault', 'approve_transactions', 'submit_transactions', 'manage_policies'],
      [UserRole.GUARDIAN]: ['view_transactions', 'view_vault', 'approve_recovery'],
      [UserRole.ADMIN]: ['*'],
      [UserRole.CONTRIBUTOR]: ['view_transactions', 'view_vault'],
    };
    return permissions[role] || permissions[UserRole.VIEWER];
  }

  async getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByRole: Record<string, number>;
  }> {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { isActive: true } });
    
    const usersByRole: Record<string, number> = {};
    const roleCounts = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    for (const rc of roleCounts) {
      usersByRole[rc.role] = parseInt(rc.count);
    }

    return { totalUsers, activeUsers, usersByRole };
  }
}