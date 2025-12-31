import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/auth/entity/users.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { GigFavourite } from '../gigs/entities/gig-favourite.entity';
import { Review } from '../reviews/entities/review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Booking, GigFavourite, Review])],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
