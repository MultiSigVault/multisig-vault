import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { VaultsService } from './vaults.service';
import { VaultsController } from './vaults.controller';
import { Vault } from './entities/vault.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vault]), ConfigModule],
  controllers: [VaultsController],
  providers: [VaultsService],
  exports: [VaultsService],
})
export class VaultsModule {}