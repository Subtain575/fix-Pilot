import { Processor, Process } from '@nestjs/bull';
import * as Bull from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { NotificationService } from 'src/notification/notification.service';
import { CreateNotificationDto } from 'src/notification/dto/create-notification.dto';
import { User } from 'src/users/auth/entity/users.entity';

export interface BookingExpiryJob {
  bookingId: string;
  createdAt: Date;
}

@Processor('booking-expiry')
export class BookingExpiryProcessor {
  private readonly logger = new Logger(BookingExpiryProcessor.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  @Process('expire-pending-booking')
  async handleExpiredBooking(job: Bull.Job<BookingExpiryJob>) {
    const { bookingId } = job.data;

    this.logger.log(
      `Processing expiry job for booking ${bookingId} (Job ID: ${job.id})`,
    );

    try {
      const booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
        relations: ['gig', 'gig.seller', 'user'],
      });

      if (!booking) {
        this.logger.warn(
          `Booking ${bookingId} not found. It may have been deleted.`,
        );
        return;
      }

      if (booking.status !== BookingStatus.PENDING) {
        this.logger.log(
          `Booking ${bookingId} is no longer PENDING (status: ${booking.status}). Skipping deletion.`,
        );
        return;
      }

      await this.bookingRepository.remove(booking);

      this.logger.log(
        `Successfully deleted expired booking ${bookingId} (not approved within 30 minutes)`,
      );

      if (booking.user) {
        try {
          const sender = await this.usersRepo.findOne({
            where: { id: booking.userId },
          });

          if (sender) {
            const notificationPayload: CreateNotificationDto = {
              receiver: booking.user,
              sender: sender,
              title: 'Booking Auto-Deleted',
              message: `Your booking has been automatically deleted as it was not approved within 30 minutes. You can now make a new booking.`,
            };

            await this.notificationService.create(notificationPayload);
            this.logger.log(
              `Notification sent to buyer for auto-deleted booking ${bookingId}`,
            );
          }
        } catch (notificationError) {
          this.logger.warn(
            `Failed to send notification for auto-deleted booking ${bookingId}: ${notificationError.message}`,
          );
        }
      }

      if (booking.gig?.sellerId) {
        try {
          const seller = await this.usersRepo.findOne({
            where: { id: booking.gig.sellerId },
          });
          const buyer = await this.usersRepo.findOne({
            where: { id: booking.userId },
          });

          if (seller && buyer) {
            const notificationPayload: CreateNotificationDto = {
              receiver: seller,
              sender: buyer,
              title: 'Booking Auto-Deleted',
              message: `A pending booking has been automatically deleted as it was not approved within 30 minutes. The time slot is now available.`,
            };

            await this.notificationService.create(notificationPayload);
            this.logger.log(
              `Notification sent to seller for auto-deleted booking ${bookingId}`,
            );
          }
        } catch (notificationError) {
          this.logger.warn(
            `Failed to send seller notification for auto-deleted booking ${bookingId}: ${notificationError.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to process expired booking ${bookingId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
