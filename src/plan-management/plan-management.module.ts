import { Module } from '@nestjs/common';
import { PlanManagementService } from './plan-management.service';
import { PlanManagementController } from './plan-management.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanManagement } from './entities/plan-management.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlanManagement])],
  controllers: [PlanManagementController],
  providers: [PlanManagementService],
})
export class PlanManagementModule {}
