import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { Booking } from './entities/booking.entity';
import { BookingImage } from './entities/booking-image.entity';
import { GigAvailability } from '../gigs/entities/gig-availability.entity';
import { Gig } from '../gigs/entities/gig.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { CommonModule } from '../common/common.module';
import { NotificationModule } from 'src/notification/notification.module';
import { User } from 'src/users/auth/entity/users.entity';
import { GigsModule } from 'src/gigs/gigs.module';
import { Seller } from 'src/seller/entities/seller.entity';
import { AddressesModule } from 'src/addresses/addresses.module';
import { BookingExpiryProcessor } from './booking-queue.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingImage,
      User,
      GigAvailability,
      Gig,
      Seller,
    ]),
    BullModule.registerQueue({
      name: 'booking-expiry',
    }),
    NotificationModule,
    GigsModule,
    CloudinaryModule,
    CommonModule,
    AddressesModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingExpiryProcessor],
  exports: [BookingsService],
})
export class BookingsModule {}
