import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/auth/entity/users.entity';
import { Booking } from 'src/bookings/entities/booking.entity';
import { GigFavourite } from 'src/gigs/entities/gig-favourite.entity';
import { Review } from 'src/reviews/entities/review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Booking, GigFavourite, Review])],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
