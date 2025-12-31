import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageSafetyController } from './message-safety.controller';
import { MessageSafetyService } from './message-safety.service';
import { messageSafety } from './entities/message-safety.entity';
import { User } from '../users/auth/entity/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([messageSafety, User])],
  controllers: [MessageSafetyController],
  providers: [MessageSafetyService],
  exports: [MessageSafetyService],
})
export class MessageSafetyModule {}
