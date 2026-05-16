import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, LoginDto, RefreshTokenDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { AuthGuard, Public } from '../../common/guards/auth.guard';
import { RolesGuard, Roles, Role } from '../../common/guards/roles.guard';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: User })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ): Promise<{ data: User[]; total: number }> {
    return this.usersService.findAll(+page, +limit, search);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: User })
  async getProfile(@Request() req): Promise<User> {
    return this.usersService.findOne(req.user.sub);
  }

  @Get('stats')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user statistics (admin only)' })
  async getStats(): Promise<any> {
    return this.usersService.getStats();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User found', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Get('wallet/:address')
  @Public()
  @ApiOperation({ summary: 'Get user by wallet address' })
  @ApiParam({ name: 'address', description: 'Stellar wallet address' })
  @ApiResponse({ status: 200, description: 'User found', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findByWallet(@Param('address') address: string): Promise<User | null> {
    return this.usersService.findByWalletAddress(address);
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated', type: User })
  async updateProfile(@Request() req, @Body() updateData: UpdateUserDto): Promise<User> {
    return this.usersService.update(req.user.sub, updateData);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user (admin only)' })
  @ApiResponse({ status: 200, description: 'User updated', type: User })
  async update(@Param('id') id: string, @Body() updateData: UpdateUserDto): Promise<User> {
    return this.usersService.update(id, updateData);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (admin only)' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }

  @Post('auth/login')
  @Public()
  @ApiOperation({ summary: 'Authenticate user with wallet signature' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  async login(@Body() loginDto: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    return this.usersService.authenticate(loginDto);
  }

  @Post('auth/nonce')
  @Public()
  @ApiOperation({ summary: 'Generate authentication nonce' })
  @ApiBody({ schema: { properties: { walletAddress: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Nonce generated' })
  async generateNonce(@Body('walletAddress') walletAddress: string): Promise<{ message: string }> {
    const message = await this.usersService.generateNonce(walletAddress);
    return { message };
  }

  @Post('auth/refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<{ accessToken: string }> {
    return this.usersService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post(':id/roles/:role')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add role to user (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'role', enum: Role })
  async addRole(@Param('id') id: string, @Param('role') role: Role): Promise<User> {
    return this.usersService.addRole(id, role as any);
  }

  @Delete(':id/roles/:role')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove role from user (admin only)' })
  async removeRole(@Param('id') id: string, @Param('role') role: Role): Promise<User> {
    return this.usersService.removeRole(id, role as any);
  }

  @Get(':id/vault-access')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user vault access' })
  async getVaultAccess(@Param('id') id: string): Promise<any> {
    const user = await this.usersService.findOne(id);
    return user.vaultAccess;
  }
}