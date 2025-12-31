import { Module } from '@nestjs/common';
import { StrikeService } from './strike.service';
import { StrikeController } from './strike.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Strike } from './entities/strike.entity';
import { Seller } from 'src/seller/entities/seller.entity';
import { User } from 'src/users/auth/entity/users.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { AuditLogModule } from 'src/audit-log/audit-log.module';

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
