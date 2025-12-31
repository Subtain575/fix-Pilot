import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entity/users.entity';
import { JwtStrategy } from './guard/jwt/jwt.strategy';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';
import { CommonModule } from '../../common/common.module';
import { MailModule } from '../../email/mail.module';
import { PhoneModule } from 'src/phone-number/phone-number.module';
import { SellerFile } from './entity/seller-file.entity';
import { Seller } from 'src/seller/entities/seller.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { BookingsModule } from 'src/bookings/bookings.module';
import { GigFavourite } from '../../gigs/entities/gig-favourite.entity';
import { messageSafety } from 'src/message-safety/entities/message-safety.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Gig } from '../../gigs/entities/gig.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      SellerFile,
      Seller,
      GigFavourite,
      messageSafety,
      Booking,
      Gig,
    ]),
    PassportModule,
    NotificationModule,
    BookingsModule,
    forwardRef(() => MailModule),
    forwardRef(() => PhoneModule),
    forwardRef(() => CommonModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecretkey',
      signOptions: { expiresIn: '1d' },
    }),
    CloudinaryModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
