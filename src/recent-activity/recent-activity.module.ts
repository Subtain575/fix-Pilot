import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecentActivityController } from './recent-activity.controller';
import { RecentActivityService } from './recent-activity.service';
import { Booking } from '../bookings/entities/booking.entity';
import { Gig } from '../gigs/entities/gig.entity';
import { User } from 'src/users/auth/entity/users.entity';
import { Seller } from 'src/seller/entities/seller.entity';
import { Category } from 'src/categories/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Gig, User, Seller, Category])],
  controllers: [RecentActivityController],
  providers: [RecentActivityService],
})
export class RecentActivityModule {}
