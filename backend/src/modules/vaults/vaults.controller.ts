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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VaultsService } from './vaults.service';
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
  ApproveRecoveryDto,
} from './dto/create-vault.dto';
import { Vault } from './entities/vault.entity';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard, Roles, Role } from '../../common/guards/roles.guard';

@ApiTags('vaults')
@Controller('vaults')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class VaultsController {
  constructor(private readonly vaultsService: VaultsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new vault' })
  @ApiResponse({ status: 201, description: 'Vault created successfully', type: Vault })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async create(@Body() createVaultDto: CreateVaultDto, @Request() req): Promise<Vault> {
    return this.vaultsService.create(createVaultDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vaults for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'List of vaults' })
  async findAll(
    @Request() req,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20,
  ): Promise<{ data: Vault[]; total: number }> {
    return this.vaultsService.findAll(req.user, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get vault statistics for current user' })
  async getStats(@Request() req): Promise<any> {
    return this.vaultsService.getStats(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vault by ID' })
  @ApiParam({ name: 'id', description: 'Vault database ID' })
  @ApiResponse({ status: 200, description: 'Vault found', type: Vault })
  @ApiResponse({ status: 404, description: 'Vault not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req): Promise<Vault> {
    return this.vaultsService.findOne(id, req.user);
  }

  @Get('vaultid/:vaultId')
  @ApiOperation({ summary: 'Get vault by vaultId' })
  @ApiParam({ name: 'vaultId', description: 'Sequential vault ID' })
  async findByVaultId(@Param('vaultId', ParseIntPipe) vaultId: number): Promise<Vault> {
    return this.vaultsService.findByVaultId(vaultId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vault settings' })
  @ApiResponse({ status: 200, description: 'Vault updated', type: Vault })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdateVaultDto,
    @Request() req,
  ): Promise<Vault> {
    return this.vaultsService.update(id, updateData, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate vault' })
  @ApiResponse({ status: 200, description: 'Vault deactivated', type: Vault })
  async deactivate(@Param('id', ParseIntPipe) id: number, @Request() req): Promise<Vault> {
    return this.vaultsService.deactivate(id, req.user);
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Get vault balance' })
  async getBalance(@Param('id', ParseIntPipe) id: number, @Request() req): Promise<{ balance: number }> {
    const vault = await this.vaultsService.findOne(id, req.user);
    const balance = await this.vaultsService.getVaultBalance(vault.vaultId);
    return { balance };
  }

  @Post(':id/signers')
  @ApiOperation({ summary: 'Add a signer to vault' })
  async addSigner(
    @Param('id', ParseIntPipe) id: number,
    @Body() addSignerDto: AddSignerDto,
    @Request() req,
  ): Promise<Vault> {
    return this.vaultsService.addSigner(id, addSignerDto, req.user);
  }

  @Delete(':id/signers/:signerAddress')
  @ApiOperation({ summary: 'Remove a signer from vault' })
  async removeSigner(
    @Param('id', ParseIntPipe) id: number,
    @Param('signerAddress') signerAddress: string,
    @Request() req,
  ): Promise<Vault> {
    return this.vaultsService.removeSigner(id, { signerToRemove: signerAddress }, req.user);
  }

  @Patch(':id/threshold')
  @ApiOperation({ summary: 'Update approval threshold' })
  async updateThreshold(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateThresholdDto,
    @Request() req,
  ): Promise<Vault> {
    return this.vaultsService.updateThreshold(id, updateDto, req.user);
  }

  @Post(':id/policies')
  @ApiOperation({ summary: 'Set spending policy for a signer' })
  async setSpendingPolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body() policyDto: SetSpendingPolicyDto,
    @Request() req,
  ): Promise<Vault> {
    return this.vaultsService.setSpendingPolicy(id, policyDto, req.user);
  }

  @Get(':id/policies/:signer')
  @ApiOperation({ summary: 'Get spending policy for a signer' })
  async getSpendingPolicy(
    @Param('id', ParseIntPipe) id: number,
    @Param('signer') signer: string,
    @Request() req,
  ): Promise<any> {
    const vault = await this.vaultsService.findOne(id, req.user);
    const policy = vault.spendingPolicies?.find(p => p.signer === signer);
    return policy || null;
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'Get vault audit log' })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 50 })
  async getAuditLog(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', ParseIntPipe) limit = 50,
    @Request() req,
  ): Promise<any> {
    return this.vaultsService.getAuditLog(id, req.user, limit);
  }
}