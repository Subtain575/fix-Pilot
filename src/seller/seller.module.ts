import { Module } from '@nestjs/common';
import { SellerService } from './seller.service';
import { SellerController } from './seller.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seller } from './entities/seller.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Strike } from '../strike/entities/strike.entity';
import { User } from '../users/auth/entity/users.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Review } from '../reviews/entities/review.entity';
import { Gig } from '../gigs/entities/gig.entity';
import { NotificationModule } from '../notification/notification.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Seller, User, Strike, Booking, Review, Gig]),
    AuditLogModule,
    CloudinaryModule,
    NotificationModule,
  ],
  controllers: [SellerController],
  providers: [SellerService],
})
export class SellerModule {}
