import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { typeOrmConfig } from './config/typeorm.config';
import { AuthModule } from './users/auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { GigsModule } from './gigs/gigs.module';
import { MailModule } from './email/mail.module';
import { CommonModule } from './common/common.module';
import { PhoneModule } from './phone-number/phone-number.module';
import { CustomerModule } from './customer/customer.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SellerModule } from './seller/seller.module';
import { StrikeModule } from './strike/strike.module';
import { NotificationModule } from './notification/notification.module';
import { SupportModule } from './support/support.module';
import { ChatModule } from './chat/chat.module';
import { AddressesModule } from './addresses/addresses.module';
import { RecentActivityModule } from './recent-activity/recent-activity.module';
import { PlanManagementModule } from './plan-management/plan-management.module';
import { MessageSafetyModule } from './message-safety/message-safety.module';
import { AuditLogModule } from './audit-log/audit-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: typeOrmConfig,
    }),
    AuthModule,
    CategoriesModule,
    GigsModule,
    MailModule,
    CommonModule,
    PhoneModule,
    CustomerModule,
    BookingsModule,
    ReviewsModule,
    SellerModule,
    StrikeModule,
    SupportModule,
    NotificationModule,
    ChatModule,
    AddressesModule,
    RecentActivityModule,
    PlanManagementModule,
    MessageSafetyModule,
    AuditLogModule,
  ],
})
export class AppModule {}
