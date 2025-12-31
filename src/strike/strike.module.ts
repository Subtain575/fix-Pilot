import { Module } from '@nestjs/common';
import { StrikeService } from './strike.service';
import { StrikeController } from './strike.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Strike } from './entities/strike.entity';
import { Seller } from '../seller/entities/seller.entity';
import { User } from '../users/auth/entity/users.entity';
import { NotificationModule } from '../notification/notification.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Strike, Seller, User]),
    AuditLogModule,
    NotificationModule,
  ],
  controllers: [StrikeController],
  providers: [StrikeService],
})
export class StrikeModule {}
