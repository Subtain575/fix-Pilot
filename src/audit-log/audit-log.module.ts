import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { AuditLog } from './entities/audit-log.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../users/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), AuthModule],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
