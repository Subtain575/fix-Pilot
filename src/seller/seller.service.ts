import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { Seller } from './entities/seller.entity';
import { User } from '../users/auth/entity/users.entity';
import { SellerVerificationDto } from './dto/seller-verification-dto';
import { SellerVerificationQueryDto } from './dto/seller-verification-query-dto';
import { sellerCoachingDto } from './dto/seller-coaching.dto';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Review } from '../reviews/entities/review.entity';
import { Gig } from '../gigs/entities/gig.entity';
import { ApiResponse } from '../common/utils/response.util';
import { NotificationService } from '../notification/notification.service';
import { CreateFollowUpDto } from './dto/seller-followUp.dto';
import { CreateNotificationDto } from '../notification/dto/create-notification.dto';
import { CreateAuditLogDto } from '../audit-log/dto/create-audit-log.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
@Injectable()
export class SellerService {
  private readonly logger = new Logger(SellerService.name);

  constructor(
    @InjectRepository(Seller)
    private readonly SellerRepository: Repository<Seller>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Gig)
    private readonly gigRepository: Repository<Gig>,
    private readonly notificationService: NotificationService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async verificationStatusUpdate(
    id: string,
    dto: SellerVerificationDto,
    userId: string,
  ) {
    const seller = await this.SellerRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!seller) throw new NotFoundException('Seller not found');

    seller.verificationSeller = dto.verificationSeller;

    if (dto.reason) {
      seller.reason = dto.reason;
    }
    if (dto.adminNote) {
      seller.adminNote = dto.adminNote;
    }

    await this.SellerRepository.save(seller);

    try {
      const sender = await this.usersRepo.findOne({ where: { id: userId } });
      const receiver = await this.usersRepo.findOne({
        where: { id: seller.user.id },
      });

      if (sender && receiver) {
        const notificationPayload: CreateNotificationDto = {
          receiver,
          sender,
          title: 'Update Coaching Notification',
          message: `Coaching is updated.`,
        };
        await this.notificationService.create(notificationPayload);

        // Create audit log
        const auditLogPayload: CreateAuditLogDto = {
          admin: sender,
          actionTo: receiver,
          title: 'Update Coaching Notification',
          description: 'Coaching is updated.',
        };
        await this.auditLogService.create(auditLogPayload);
      }
    } catch (error) {
      console.error('Failed to send seller verification notification:', error);
    }

    return 'Seller status updated successfully';
  }

  async getAllSellerVerification(query: SellerVerificationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    console.log(page, limit, skip);

    const qb = this.SellerRepository.createQueryBuilder('seller')
      .leftJoinAndSelect('seller.user', 'user')
      .orderBy('seller.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('seller.verificationSeller = :status', {
        status: query.status,
      });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      message: 'Sellers fetched successfully',
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async updateCoachingNote(id: string, dto: sellerCoachingDto, userId: string) {
    const seller = await this.SellerRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!seller) throw new NotFoundException('Seller not found');

    seller.coachingNote = dto.coachingNote;
    await this.SellerRepository.save(seller);

    try {
      const sender = await this.usersRepo.findOne({ where: { id: userId } });
      const receiver = await this.usersRepo.findOne({
        where: { id: seller.user.id },
      });

      if (sender && receiver) {
        const notificationPayload: CreateNotificationDto = {
          receiver,
          sender,
          title: 'Update Coaching Notification',
          message: `Coaching is updated.`,
        };
        await this.notificationService.create(notificationPayload);

        // Create audit log
        const auditLogPayload: CreateAuditLogDto = {
          admin: sender,
          actionTo: receiver,
          title: 'Update Coaching Notification',
          description: 'Coaching is updated.',
        };
        await this.auditLogService.create(auditLogPayload);
      }
    } catch (error) {
      console.error('Failed to send coaching update notification:', error);
    }

    return 'Seller Coaching Update successfully!';
  }

  async getSellerStats(sellerId: string): Promise<
    ApiResponse<{
      totalEarnings: number;
      activeBookings: number;
      gigRating: number;
      completionRate: number;
      totalReviews: number;
      totalBookings: number;
      completedBookings: number;
      arrivalRating: number;
    }>
  > {
    try {
      const sellerGigs = await this.gigRepository.find({
        where: { sellerId },
        select: ['id'],
      });

      const gigIds = sellerGigs.map((gig) => gig.id);

      if (gigIds.length === 0) {
        return ApiResponse.success(
          {
            totalEarnings: 0,
            activeBookings: 0,
            gigRating: 0,
            completionRate: 0,
            totalReviews: 0,
            totalBookings: 0,
            completedBookings: 0,
            arrivalRating: 0,
          },
          'Seller stats retrieved successfully',
        );
      }

      const totalBookings = await this.bookingRepository.count({
        where: { gigId: In(gigIds) },
      });

      const completedBookings = await this.bookingRepository.find({
        where: {
          gigId: In(gigIds),
          completeJob: true,
          paymentChecked: true,
        },
        select: ['estimatedBudget'],
      });

      const totalEarnings =
        completedBookings.reduce(
          (sum, booking) => sum + (Number(booking.estimatedBudget) || 0),
          0,
        ) || 0;

      const completedBookingsCount = completedBookings.length;

      const completionRate =
        totalBookings > 0
          ? Number(((completedBookingsCount / totalBookings) * 100).toFixed(1))
          : 0;

      const reviews = await this.reviewRepository.find({
        where: { gigId: In(gigIds) },
        select: ['rating'],
      });

      const totalReviews = reviews.length;
      const gigRating =
        totalReviews > 0
          ? Number(
              (
                reviews.reduce(
                  (sum, review) => sum + Number(review.rating),
                  0,
                ) / totalReviews
              ).toFixed(1),
            )
          : 0;

      const arrivalRatings = await this.bookingRepository.find({
        where: {
          gigId: In(gigIds),
          arrivalRating: Not(IsNull()),
        },
        select: ['arrivalRating'],
      });

      const arrivalRating =
        arrivalRatings.length > 0
          ? Number(
              (
                arrivalRatings.reduce(
                  (sum, booking) => sum + (booking.arrivalRating ?? 0),
                  0,
                ) / arrivalRatings.length
              ).toFixed(1),
            )
          : 0;

      const activeBookings = await this.bookingRepository.count({
        where: [
          { gigId: In(gigIds), status: BookingStatus.PENDING },
          {
            gigId: In(gigIds),
            status: BookingStatus.CONFIRMED,
          },
        ],
      });

      const stats = {
        totalEarnings,
        activeBookings,
        gigRating,
        completionRate,
        totalReviews,
        totalBookings,
        completedBookings: completedBookingsCount,
        arrivalRating,
      };

      return ApiResponse.success(stats, 'Seller stats retrieved successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to retrieve seller stats: ${errorMessage}`);
      throw new InternalServerErrorException(
        `Failed to retrieve seller stats: ${errorMessage}`,
      );
    }
  }

  async followUpNotification(
    dto: CreateFollowUpDto,
    sellerId: string,
    senderId: string,
  ) {
    try {
      const seller = await this.usersRepo.findOne({
        where: { id: sellerId },
      });

      if (!seller) {
        throw new NotFoundException('Seller not found');
      }

      const sender = await this.usersRepo.findOne({
        where: { id: senderId },
      });

      const notification = await this.notificationService.create({
        receiver: seller,
        sender: sender!,
        title: dto.title,
        message: dto.message,
        link: dto.link ? dto.link : `/documents/${seller.id}`,
      });
      return notification;
    } catch {
      throw new NotFoundException('notification send failed');
    }
  }
}
