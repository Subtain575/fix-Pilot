import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GigsService } from './gigs.service';
import { GigsController } from './gigs.controller';
import { Gig } from './entities/gig.entity';
import { GigAvailability } from './entities/gig-availability.entity';
import { GigFavourite } from './entities/gig-favourite.entity';
import { Category } from '../categories/entities/category.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Review } from '../reviews/entities/review.entity';
import { User } from '../users/auth/entity/users.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Seller } from 'src/seller/entities/seller.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Gig,
      GigAvailability,
      GigFavourite,
      Category,
      Booking,
      Review,
      User,
      Seller,
    ]),
    CloudinaryModule,
  ],
  controllers: [GigsController],
  providers: [GigsService],
  exports: [GigsService],
})
export class GigsModule {}
