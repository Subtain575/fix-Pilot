import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import * as Bull from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Booking, BookingStatus } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { ApiResponse } from '../common/utils/response.util';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CommonService } from '../common/common.service';
import { UploadApiResponse } from 'cloudinary';
import {
  BookingImage,
  BookingImageType,
} from './entities/booking-image.entity';
import { JobCompleteDto } from './dto/job-complete.dto';
import { User } from '../users/auth/entity/users.entity';
import { NotificationService } from '../notification/notification.service';
import { CreateNotificationDto } from '../notification/dto/create-notification.dto';
import { GigsService } from '../gigs/gigs.service';
import {
  DayOfWeek,
  GigAvailability,
} from '../gigs/entities/gig-availability.entity';
import { Gig } from '../gigs/entities/gig.entity';
import { GetAvailableHoursDto } from './dto/get-available-hours.dto';
import { BookingArriveDto } from './dto/booking-arrive.dto';
import { SellerVerificationStatus } from '../seller/Enum/seller-verification-enum';
import { Seller } from '../seller/entities/seller.entity';
import { UserStatus } from '../users/auth/enums/status-enum';
import { UserRole } from '../users/auth/enums/enum';
import { AddressesService } from '../addresses/addresses.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  // Maximum allowed distance (in meters) between booking location and seller's
  // reported arrival location.
  private static readonly ARRIVAL_TOLERANCE = 150; // 150 meters

  private readonly bookingJobMap = new Map<string, string>();

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingImage)
    private readonly bookingImageRepository: Repository<BookingImage>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly commonService: CommonService,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private readonly notificationService: NotificationService,
    private readonly gigsService: GigsService,
    @InjectRepository(GigAvailability)
    private readonly gigAvailabilityRepository: Repository<GigAvailability>,
    @InjectRepository(Seller)
    private readonly sellerRepository: Repository<Seller>,
    @InjectRepository(Gig)
    private readonly gigRepository: Repository<Gig>,
    private readonly addressesService: AddressesService,
    @InjectQueue('booking-expiry')
    private readonly bookingExpiryQueue: Bull.Queue,
  ) {}

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Calculate distance between two coordinates using the Haversine formula.
   * Returns distance in meters.
   */
  private static calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const R = 6371000; // Earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateSellerLevel(completedBookings: number): number {
    if (completedBookings <= 10) return 0;
    if (completedBookings <= 25) return 1;
    if (completedBookings <= 62) return 2;
    if (completedBookings <= 155) return 3;
    if (completedBookings <= 387) return 4;
    if (completedBookings <= 967) return 5;
    if (completedBookings <= 2417) return 6;
    if (completedBookings <= 6042) return 7;
    if (completedBookings <= 15105) return 8;
    return 9;
  }

  private async updateSellerLevel(sellerId: string): Promise<void> {
    try {
      const seller = await this.sellerRepository.findOne({
        where: { user: { id: sellerId } },
      });

      if (!seller) {
        this.logger.warn(`Seller not found for sellerId: ${sellerId}`);
        return;
      }

      const sellerGigs = await this.gigRepository.find({
        where: { sellerId },
        select: ['id'],
      });

      const gigIds = sellerGigs.map((gig) => gig.id);

      if (gigIds.length === 0) {
        return;
      }

      const completedCount = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.gigId IN (:...gigIds)', { gigIds })
        .andWhere('booking.completeJob = :completeJob', { completeJob: true })
        .andWhere('booking.paymentChecked = :paymentChecked', {
          paymentChecked: true,
        })
        .getCount();

      const newLevel = this.calculateSellerLevel(completedCount);
      const oldLevel = seller.level ?? 0;

      if (newLevel !== oldLevel) {
        seller.level = newLevel;
        await this.sellerRepository.save(seller);

        this.logger.log(
          `Seller ${sellerId} level updated: ${oldLevel} → ${newLevel} (${completedCount} completed bookings)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update seller level for sellerId ${sellerId}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  async jobComplete(
    id: string,
    dto: JobCompleteDto,
    pickupImages: Express.Multer.File[] = [],
    deliveryImages: Express.Multer.File[] = [],
    userId?: string,
  ) {
    try {
      if (!userId) {
        throw new BadRequestException(
          'Unauthorized: User ID not found in token',
        );
      }

      const booking = await this.bookingRepository.findOne({
        where: { id },
        relations: ['gig'],
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (!booking.gig) {
        throw new BadRequestException('Booking gig not found');
      }

      const gigSellerIdStr = String(booking.gig.sellerId || '');
      const userIdStr = String(userId || '');

      if (gigSellerIdStr !== userIdStr) {
        throw new BadRequestException('Only gig owner can complete/start job');
      }

      const wasCompleteBefore = booking.completeJob === true;
      const wasPaymentCheckedBefore = booking.paymentChecked === true;
      const wasCompleteAndPaidBefore =
        wasCompleteBefore && wasPaymentCheckedBefore;

      if (
        wasCompleteAndPaidBefore &&
        dto.completeJob === undefined &&
        dto.paymentChecked === undefined &&
        !pickupImages?.length &&
        !deliveryImages?.length
      ) {
        return ApiResponse.success(
          {
            id: booking.id,
            status: booking.status,
            completeJob: booking.completeJob ?? true,
            paymentChecked: booking.paymentChecked ?? false,
            workerNotes: booking.workerNotes ?? null,
            pickupImages: [],
            deliveryImages: [],
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt,
          },
          'Job already completed',
        );
      }

      if (booking.otpCode && dto.otpCode !== booking.otpCode) {
        throw new BadRequestException('Invalid or missing OTP code');
      }

      if (typeof dto.completeJob === 'boolean')
        booking.completeJob = dto.completeJob;
      if (typeof dto.paymentChecked === 'boolean')
        booking.paymentChecked = dto.paymentChecked;
      if (typeof dto.otpCode === 'string') booking.otpCode = dto.otpCode;
      if (typeof dto.workerNotes === 'string')
        booking.workerNotes = dto.workerNotes;

      if (typeof dto.latitude === 'number') booking.latitude = dto.latitude;
      if (typeof dto.longitude === 'number') booking.longitude = dto.longitude;

      if (booking.completeJob === true) {
        booking.status = BookingStatus.COMPLETED;
      }

      const isNowCompleteAndPaid =
        booking.completeJob === true && booking.paymentChecked === true;

      if (
        isNowCompleteAndPaid &&
        !wasCompleteAndPaidBefore &&
        booking.gig?.sellerId
      ) {
        await this.updateSellerLevel(booking.gig.sellerId);
      }

      if (pickupImages?.length) {
        for (const file of pickupImages) {
          try {
            const uploaded: Partial<UploadApiResponse> =
              await this.cloudinaryService.uploadImage(file);
            if (uploaded?.secure_url) {
              const entity = this.bookingImageRepository.create({
                bookingId: booking.id,
                imageUrl: uploaded.secure_url,
                type: BookingImageType.PICKUP,
              });
              await this.bookingImageRepository.save(entity);
            }

            const sender = await this.usersRepo.findOne({
              where: { id: userId },
            });
            const receiver = await this.usersRepo.findOne({
              where: { id: booking.userId },
            });

            const notificationPayload: CreateNotificationDto = {
              receiver: receiver!,
              sender: sender!,
              title: 'Job Update',
              message: `Pickup images uploaded for booking ${booking.id}.`,
            };

            await this.notificationService.create(notificationPayload);
          } catch (e) {
            this.logger.warn(
              `Image upload failed (pickup): ${this.getErrorMessage(e)}`,
            );
          }
        }
      }

      if (deliveryImages?.length) {
        for (const file of deliveryImages) {
          try {
            const uploaded: Partial<UploadApiResponse> =
              await this.cloudinaryService.uploadImage(file);
            if (uploaded?.secure_url) {
              const entity = this.bookingImageRepository.create({
                bookingId: booking.id,
                imageUrl: uploaded.secure_url,
                type: BookingImageType.DELIVERY,
              });
              await this.bookingImageRepository.save(entity);
            }
          } catch (e) {
            this.logger.warn(
              `Image upload failed (delivery): ${this.getErrorMessage(e)}`,
            );
          }
        }
      }

      const updated = await this.bookingRepository.save(booking);

      const [before, after] = await Promise.all([
        this.bookingImageRepository.find({
          where: { bookingId: updated.id, type: BookingImageType.PICKUP },
          order: { createdAt: 'ASC' },
        }),
        this.bookingImageRepository.find({
          where: { bookingId: updated.id, type: BookingImageType.DELIVERY },
          order: { createdAt: 'ASC' },
        }),
      ]);

      const responsePayload = {
        id: updated.id,
        status: updated.status,
        completeJob: updated.completeJob ?? false,
        paymentChecked: updated.paymentChecked ?? false,
        workerNotes: updated.workerNotes ?? null,
        pickupImages: before.map((b) => b.imageUrl),
        deliveryImages: after.map((a) => a.imageUrl),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };

      return ApiResponse.success(
        responsePayload,
        'Job marked as completed successfully',
      );
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const errorMessage = this.getErrorMessage(error);
      const errorStack = this.getErrorStack(error);
      this.logger.error(`Failed to update job: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException(
        `Failed to update job: ${errorMessage}`,
      );
    }
  }

  private getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    return undefined;
  }

  async create(
    createBookingDto: CreateBookingDto,
    uploadedPhotos?: Express.Multer.File[],
  ): Promise<ApiResponse<Booking>> {
    try {
      const { userId, gigId } = createBookingDto;

      if (!userId || !gigId) {
        throw new BadRequestException('userId and gigId are required');
      }

      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (user.status === UserStatus.INACTIVE) {
        throw new ForbiddenException('Your account is paused!');
      }

      const gigResponse = await this.gigsService.findOne(gigId);
      if (!gigResponse || !gigResponse.data) {
        throw new NotFoundException('Gig not found');
      }

      const gig = gigResponse.data;
      const sellerId = gig.sellerId;

      this.logger.log(
        `Validating seller for sellerId: ${sellerId}, gigId: ${gigId}`,
      );

      const sellerUser = await this.usersRepo.findOne({
        where: { id: sellerId },
      });

      if (!sellerUser) {
        this.logger.error(`User not found for sellerId: ${sellerId}`);
        throw new NotFoundException('Gig owner not found');
      }

      if (sellerUser.status === UserStatus.INACTIVE) {
        throw new ForbiddenException(
          'This gig is not available. The seller account is paused.',
        );
      }

      let seller = await this.sellerRepository.findOne({
        where: { user: { id: sellerId } },
      });

      if (!seller) {
        this.logger.warn(
          `Seller not found with relation query, trying QueryBuilder for sellerId: ${sellerId}`,
        );
        seller = await this.sellerRepository
          .createQueryBuilder('seller')
          .leftJoinAndSelect('seller.user', 'user')
          .where('user.id = :userId', { userId: sellerId })
          .getOne();
      }

      if (!seller && sellerUser) {
        const userWithSeller = await this.usersRepo.findOne({
          where: { id: sellerId },
          relations: ['seller'],
        });
        if (userWithSeller?.seller) {
          seller = userWithSeller.seller;
        }
      }

      if (!seller && sellerUser && sellerUser.role === UserRole.SELLER) {
        this.logger.warn(
          `Seller record missing for sellerId: ${sellerId}. Auto-creating seller record with default values.`,
        );
        try {
          seller = this.sellerRepository.create({
            user: sellerUser,
            verificationSeller: SellerVerificationStatus.PENDING,
            level: 0,
          });
          seller = await this.sellerRepository.save(seller);
          this.logger.log(
            `Successfully created seller record for sellerId: ${sellerId}`,
          );
        } catch (createError) {
          this.logger.error(
            `Failed to auto-create seller record: ${this.getErrorMessage(createError)}`,
          );
          throw new InternalServerErrorException(
            'Failed to create seller profile. Please contact support.',
          );
        }
      }

      if (!seller) {
        this.logger.error(
          `Seller record not found for sellerId: ${sellerId}, gigId: ${gigId}. User exists: ${!!sellerUser}, User role: ${sellerUser?.role}`,
        );
        throw new NotFoundException(
          'Seller account not found. The seller profile may not be properly set up. Please ensure the user has a seller account.',
        );
      }

      if (seller.verificationSeller !== SellerVerificationStatus.APPROVED) {
        throw new ForbiddenException(
          'This gig is not available. The seller account is not verified yet.',
        );
      }

      this.logger.log('Creating new booking');

      this.logger.log(
        `🔍 Checking duplicate booking: userId=${createBookingDto.userId}, gigId=${createBookingDto.gigId}`,
      );

      const allExistingBookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.userId = :userId', { userId: createBookingDto.userId })
        .andWhere('booking.gigId = :gigId', { gigId: createBookingDto.gigId })
        .orderBy('booking.createdAt', 'DESC')
        .getMany();

      this.logger.log(
        `📊 Found ${allExistingBookings.length} existing booking(s) for userId=${createBookingDto.userId}, gigId=${createBookingDto.gigId}`,
      );

      if (allExistingBookings.length > 0) {
        const incompleteBookings = allExistingBookings.filter(
          (b) => b.completeJob !== true && b.status !== BookingStatus.REJECT,
        );

        if (incompleteBookings.length > 0) {
          const incompleteBooking = incompleteBookings[0];
          this.logger.error(
            `❌ DUPLICATE BOOKING BLOCKED: Found ${incompleteBookings.length} incomplete booking(s). First incomplete: id=${incompleteBooking.id}, status=${incompleteBooking.status}, completeJob=${incompleteBooking.completeJob}`,
          );
          throw new ConflictException(
            'You have already booked this gig. Please wait for job completion.',
          );
        }

        this.logger.log(
          `✅ All ${allExistingBookings.length} existing booking(s) are complete or rejected. Re-booking allowed.`,
        );
      } else {
        this.logger.log(
          `✅ No existing booking found - proceeding with new booking`,
        );
      }

      const bookingDateObj = new Date(createBookingDto.bookingDate);

      if (Number.isNaN(bookingDateObj.getTime())) {
        this.logger.error(
          `❌ INVALID BOOKING DATE: ${createBookingDto.bookingDate}`,
        );
        throw new BadRequestException('Invalid booking date provided');
      }

      const now = new Date();
      const bookingDayStart = new Date(bookingDateObj);
      bookingDayStart.setHours(0, 0, 0, 0);
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      if (bookingDayStart < todayStart) {
        this.logger.error(
          `❌ BOOKING DATE IN PAST: Requested ${createBookingDto.bookingDate}, today ${todayStart.toISOString().split('T')[0]}`,
        );
        throw new BadRequestException(
          'You cannot book for a day that has already passed',
        );
      }

      if (bookingDayStart.getTime() === todayStart.getTime()) {
        const requestedStartMinutes = this.convertTimeToMinutes(
          createBookingDto.startTime,
        );
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        if (requestedStartMinutes <= currentMinutes) {
          this.logger.error(
            `❌ BOOKING TIME IN PAST: Requested ${createBookingDto.startTime}, current minutes ${currentMinutes}`,
          );
          throw new BadRequestException(
            'You cannot book a time slot that has already passed today',
          );
        }
      }

      if (
        createBookingDto.gigId &&
        createBookingDto.bookingDate &&
        createBookingDto.startTime
      ) {
        const dayOfWeek = this.getDayOfWeek(bookingDateObj);
        this.logger.log(
          `🔍 Validating gig availability: gigId=${createBookingDto.gigId}, day=${dayOfWeek}, time=${createBookingDto.startTime}`,
        );

        const gigAvailability = await this.gigAvailabilityRepository.findOne({
          where: {
            gigId: createBookingDto.gigId,
            day: dayOfWeek,
            isAvailable: true,
          },
        });

        if (!gigAvailability) {
          this.logger.error(
            `❌ GIG NOT AVAILABLE ON THIS DAY: gigId=${createBookingDto.gigId}, day=${dayOfWeek}`,
          );
          throw new BadRequestException(
            `This gig is not available on ${dayOfWeek}. Please choose another day.`,
          );
        }

        if (gigAvailability.startTime && gigAvailability.endTime) {
          const requestedStartMinutes = this.convertTimeToMinutes(
            createBookingDto.startTime,
          );
          const availStartMinutes = this.convertTimeToMinutes(
            gigAvailability.startTime.split(':').slice(0, 2).join(':'),
          );
          const availEndMinutes = this.convertTimeToMinutes(
            gigAvailability.endTime.split(':').slice(0, 2).join(':'),
          );

          if (
            requestedStartMinutes < availStartMinutes ||
            requestedStartMinutes >= availEndMinutes
          ) {
            this.logger.error(
              `❌ TIME OUTSIDE AVAILABLE HOURS: Requested ${createBookingDto.startTime} (${requestedStartMinutes} min), Available: ${gigAvailability.startTime} - ${gigAvailability.endTime} (${availStartMinutes}-${availEndMinutes} min)`,
            );
            throw new BadRequestException(
              `The requested time ${createBookingDto.startTime} is outside the available hours (${gigAvailability.startTime} - ${gigAvailability.endTime}) for this day.`,
            );
          }

          this.logger.log(
            `✅ Time ${createBookingDto.startTime} is within available hours ${gigAvailability.startTime} - ${gigAvailability.endTime}`,
          );
        }
      }

      if (
        createBookingDto.gigId &&
        createBookingDto.bookingDate &&
        createBookingDto.startTime
      ) {
        this.logger.log(
          `🔍 Checking time slot conflict: gigId=${createBookingDto.gigId}, date=${createBookingDto.bookingDate}, time=${createBookingDto.startTime}`,
        );

        const confirmedBookings = await this.bookingRepository
          .createQueryBuilder('booking')
          .where('booking.gigId = :gigId', { gigId: createBookingDto.gigId })
          .andWhere('booking.bookingDate = :bookingDate', {
            bookingDate: bookingDateObj,
          })
          .andWhere('booking.status = :status', {
            status: BookingStatus.CONFIRMED,
          })
          .getMany();

        if (confirmedBookings.length > 0) {
          const bookingStartMinutes = this.convertTimeToMinutes(
            createBookingDto.startTime,
          );

          const overlappingBooking = confirmedBookings.find((booking) => {
            if (!booking.startTime) {
              return false;
            }
            const existingStart = this.convertTimeToMinutes(booking.startTime);

            if (booking.endTime) {
              const existingEnd = this.convertTimeToMinutes(booking.endTime);
              return (
                bookingStartMinutes >= existingStart &&
                bookingStartMinutes < existingEnd
              );
            } else {
              return booking.startTime === createBookingDto.startTime;
            }
          });

          if (overlappingBooking) {
            this.logger.error(
              `❌ TIME SLOT BLOCKED: CONFIRMED booking exists for this time slot. BookingId=${overlappingBooking.id}, userId=${overlappingBooking.userId}, completeJob=${overlappingBooking.completeJob}`,
            );
            throw new ConflictException(
              'This time slot is already booked and confirmed. Please choose another time.',
            );
          }
        }

        this.logger.log(
          `✅ Time slot available - no CONFIRMED booking found for this time slot`,
        );
      }

      const photoUrls: string[] = [];

      if (uploadedPhotos && uploadedPhotos.length > 0) {
        this.logger.log(
          `Uploading ${uploadedPhotos.length} photos to Cloudinary`,
        );

        for (const photo of uploadedPhotos) {
          try {
            const uploadResult: Partial<UploadApiResponse> =
              await this.cloudinaryService.uploadImage(photo);

            if (uploadResult?.secure_url) {
              photoUrls.push(uploadResult.secure_url);
            } else {
              this.logger.warn('Failed to upload photo to Cloudinary');
            }
          } catch (uploadError) {
            this.logger.error(
              `Failed to upload photo: ${this.getErrorMessage(uploadError)}`,
            );
          }
        }
      }
      const bookingData = {
        ...createBookingDto,
        uploadPhotos: photoUrls,
        estimatedBudget: createBookingDto.estimatedBudget
          ? parseFloat(createBookingDto.estimatedBudget)
          : undefined,
        latitude:
          typeof createBookingDto.latitude === 'number'
            ? createBookingDto.latitude
            : undefined,
        longitude:
          typeof createBookingDto.longitude === 'number'
            ? createBookingDto.longitude
            : undefined,
        country:
          typeof createBookingDto.country === 'string'
            ? createBookingDto.country
            : undefined,
        addressName:
          typeof createBookingDto.addressName === 'string'
            ? createBookingDto.addressName
            : undefined,
        postalCode:
          typeof createBookingDto.postalCode === 'string'
            ? createBookingDto.postalCode
            : undefined,
      };

      const booking = this.bookingRepository.create(bookingData);
      const savedBooking = await this.bookingRepository.save(booking);

      try {
        this.logger.log(
          `Attempting to schedule queue job for booking ${savedBooking.id}...`,
        );

        const queuePromise = this.bookingExpiryQueue.add(
          'expire-pending-booking',
          {
            bookingId: savedBooking.id,
            createdAt: savedBooking.createdAt,
          },
          {
            delay: 30 * 60 * 1000,
            attempts: 1,
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Queue operation timeout')), 3000),
        );

        const job = await Promise.race([queuePromise, timeoutPromise]);

        const jobId = String((job as any).id);
        this.bookingJobMap.set(savedBooking.id, jobId);

        this.logger.log(
          `✅ Queue job scheduled successfully for booking ${savedBooking.id} (Job ID: ${jobId}) - will run in 30 minutes`,
        );
      } catch (queueError) {
        this.logger.warn(
          `⚠️ Failed to schedule queue job for booking ${savedBooking.id}: ${this.getErrorMessage(queueError)}. Fallback cron job will handle deletion after 30 minutes.`,
        );
      }

      try {
        const addressData = {
          serviceAddress: createBookingDto.serviceAddress,
          addressName: createBookingDto.addressName || 'Booking Address',
          postalCode: createBookingDto.postalCode,
          country: createBookingDto.country,
          city: createBookingDto.city,
          lat:
            typeof createBookingDto.latitude === 'number'
              ? createBookingDto.latitude
              : undefined,
          long:
            typeof createBookingDto.longitude === 'number'
              ? createBookingDto.longitude
              : undefined,
        };

        await this.addressesService.create(addressData);
        this.logger.log(
          `Address saved successfully for booking: ${savedBooking.id}`,
        );
      } catch (addressError) {
        this.logger.warn(
          `Failed to save address for booking: ${this.getErrorMessage(addressError)}`,
        );
      }

      try {
        const sender = await this.usersRepo.findOne({
          where: { id: createBookingDto.userId },
        });

        const receiver = await this.usersRepo.findOne({
          where: { id: gig.sellerId },
        });

        if (sender && receiver) {
          const notificationPayload: CreateNotificationDto = {
            receiver,
            sender,
            title: 'New Booking Received',
            message: `You have received a new booking for your gig.`,
          };

          await this.notificationService.create(notificationPayload);
        }
      } catch (notificationError) {
        this.logger.warn(
          `Failed to send booking notification: ${this.getErrorMessage(notificationError)}`,
        );
      }

      this.logger.log(
        `Booking created successfully: ${savedBooking.id} with ${photoUrls.length} photos`,
      );

      return ApiResponse.success(savedBooking, 'Booking created successfully');
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      const errorObj = error as { code?: string; message?: string };
      if (
        typeof error === 'object' &&
        error !== null &&
        (errorObj.code === '23505' ||
          (errorObj.message &&
            String(errorObj.message).includes('duplicate key value')))
      ) {
        throw new ConflictException('You have already booked this gig');
      }
      const errorMessage = this.getErrorMessage(error);
      const errorStack = this.getErrorStack(error);
      this.logger.error(
        `Failed to create booking: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        `Failed to create booking: ${errorMessage}`,
      );
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    status?: BookingStatus,
    userId?: string,
  ): Promise<
    ApiResponse<{
      items: Booking[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>
  > {
    try {
      this.logger.log(
        `Finding bookings - page: ${page}, limit: ${limit}, status: ${status}, userId: ${userId}`,
      );

      const normalizedPage = Math.max(1, Math.floor(Number(page)) || 1);
      const normalizedLimit = Math.min(
        100,
        Math.max(1, Math.floor(Number(limit)) || 10),
      );

      const skip = (normalizedPage - 1) * normalizedLimit;

      const whereCondition: Record<string, any> = {};
      if (status) {
        whereCondition.status = status;
      }
      if (userId) {
        whereCondition.userId = userId;
      }

      const [bookings, total] = await this.bookingRepository.findAndCount({
        where: whereCondition,
        order: { createdAt: 'DESC' },
        skip: skip,
        take: normalizedLimit,
      });

      this.logger.log(
        `Found ${bookings?.length || 0} bookings out of ${total || 0} total`,
      );

      const totalPages = Math.ceil((total || 0) / normalizedLimit);

      const payload = {
        items: bookings || [],
        total: total || 0,
        page: normalizedPage,
        limit: normalizedLimit,
        totalPages: totalPages || 1,
      };

      return ApiResponse.success(payload, 'Bookings retrieved successfully');
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      const errorStack = this.getErrorStack(error);
      this.logger.error(
        `Failed to retrieve bookings: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve bookings: ${errorMessage}`,
      );
    }
  }

  async findOne(id: string): Promise<ApiResponse<Booking>> {
    try {
      const booking = await this.bookingRepository.findOne({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      return ApiResponse.success(booking, 'Booking retrieved successfully');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to retrieve booking: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve booking');
    }
  }

  async update(
    id: string,
    updateBookingDto: UpdateBookingDto,
    userId?: string,
  ): Promise<ApiResponse<Booking>> {
    try {
      const booking = await this.bookingRepository.findOne({ where: { id } });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (booking.userId !== userId) {
        throw new BadRequestException(
          'Only booking creator can update booking',
        );
      }

      Object.assign(booking, updateBookingDto);
      const updatedBooking = await this.bookingRepository.save(booking);

      const sender = await this.usersRepo.findOne({
        where: { id: userId },
      });

      const receiver = await this.usersRepo.findOne({
        where: { id: booking.userId },
      });

      const notificationPayload: CreateNotificationDto = {
        receiver: receiver!,
        sender: sender!,
        title: 'Booking Updated',
        message: `Your booking has been updated successfully.`,
      };

      await this.notificationService.create(notificationPayload);

      this.logger.log(`Booking updated successfully: ${id} by booking creator`);

      return ApiResponse.success(
        updatedBooking,
        'Booking updated successfully',
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to update booking: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to update booking');
    }
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateBookingStatusDto,
    userId?: string,
  ): Promise<ApiResponse<Booking>> {
    try {
      const booking = await this.bookingRepository.findOne({
        where: { id },
        relations: ['gig', 'gig.seller'],
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      this.logger.log(
        `[updateStatus] userId from token: ${userId}, booking.gig?.sellerId: ${booking.gig?.sellerId}, booking.gig exists: ${!!booking.gig}`,
      );

      if (!booking.gig) {
        throw new BadRequestException('Booking gig not found');
      }

      const sellerIdStr = String(booking.gig.sellerId || '');
      const userIdStr = String(userId || '');

      if (sellerIdStr !== userIdStr) {
        this.logger.warn(
          `[updateStatus] Authorization failed: sellerId (${sellerIdStr}) !== userId (${userIdStr})`,
        );
        throw new BadRequestException(
          'Only gig owner can update booking status',
        );
      }

      booking.status = updateStatusDto.status;

      if (updateStatusDto.status === BookingStatus.CONFIRMED) {
        Promise.race([
          (async () => {
            try {
              const jobId = this.bookingJobMap.get(id);
              if (jobId) {
                const job = await this.bookingExpiryQueue.getJob(jobId);
                if (job) {
                  await job.remove();
                  this.bookingJobMap.delete(id);
                  this.logger.log(
                    `Cancelled auto-deletion job for approved booking ${id} (Job ID: ${jobId})`,
                  );
                }
              } else {
                const jobs = await this.bookingExpiryQueue.getJobs([
                  'delayed',
                  'waiting',
                ]);
                const foundJob = jobs.find((j) => j.data.bookingId === id);
                if (foundJob) {
                  await foundJob.remove();
                  this.logger.log(
                    `Cancelled auto-deletion job for approved booking ${id} (found by search, Job ID: ${foundJob.id})`,
                  );
                }
              }
            } catch (cancelError) {
              this.logger.warn(
                `Failed to cancel auto-deletion job for booking ${id}: ${this.getErrorMessage(cancelError)}`,
              );
            }
          })(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Queue operation timeout')),
              2000,
            ),
          ),
        ]).catch((timeoutError) => {
          this.logger.warn(
            `Queue cancellation timeout for booking ${id}: ${this.getErrorMessage(timeoutError)}`,
          );
        });
      }

      if (updateStatusDto.status === BookingStatus.CONFIRMED) {
        if (!updateStatusDto.endTime) {
          throw new BadRequestException(
            'End time is required when confirming a booking',
          );
        }
        if (!updateStatusDto.workNote) {
          throw new BadRequestException(
            'Work note is required when confirming a booking',
          );
        }

        booking.endTime = updateStatusDto.endTime;
        booking.workerNotes = updateStatusDto.workNote;

        const otp = this.commonService.generateOtp();
        booking.otpCode = String(otp);
        const sellerEmail = booking.gig?.seller?.email;
        this.logger.log(
          `Booking ${id} confirmed. Generated OTP. Seller email resolved: ${sellerEmail ?? 'N/A'}`,
        );
        if (sellerEmail) {
          Promise.race([
            this.commonService.sendOtpToMail(sellerEmail, otp),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Email send timeout')), 5000),
            ),
          ])
            .then(() => {
              this.logger.log(`OTP email sent to seller: ${sellerEmail}`);
            })
            .catch((e) => {
              this.logger.warn(
                `Failed to send OTP email to seller (${sellerEmail}): ${this.getErrorMessage(e)}`,
              );
            });
        } else {
          this.logger.warn(
            `Seller email not found for booking ${id}. OTP stored but email not sent.`,
          );
        }
      }
      const updatedBooking = await this.bookingRepository.save(booking);

      Promise.all([
        this.usersRepo.findOne({ where: { id: userId } }),
        this.usersRepo.findOne({ where: { id: booking.userId } }),
      ])
        .then(([sender, receiver]) => {
          if (sender && receiver) {
            const notificationPayload: CreateNotificationDto = {
              receiver: receiver,
              sender: sender,
              title: 'Booking Updated',
              message: `Your booking status has been updated successfully.`,
            };
            return this.notificationService.create(notificationPayload);
          }
        })
        .catch((notificationError) => {
          this.logger.warn(
            `Failed to send notification for booking ${id}: ${this.getErrorMessage(notificationError)}`,
          );
        });

      this.logger.log(
        `Booking status updated to ${updateStatusDto.status} for booking: ${id} by gig owner`,
      );

      return ApiResponse.success(
        updatedBooking,
        'Booking status updated successfully',
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to update booking status: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to update booking status');
    }
  }

  async getBookingsBySeller(
    sellerId: string,
    page = 1,
    limit = 10,
    status?: BookingStatus,
  ): Promise<
    ApiResponse<{
      items: Booking[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>
  > {
    try {
      if (!sellerId) {
        throw new BadRequestException('Seller ID is required');
      }

      this.logger.log(
        `Finding bookings for seller: ${sellerId} - page: ${page}, limit: ${limit}, status: ${status}`,
      );

      const normalizedPage = Math.max(1, Math.floor(Number(page)) || 1);
      const normalizedLimit = Math.min(
        100,
        Math.max(1, Math.floor(Number(limit)) || 10),
      );

      const skip = (normalizedPage - 1) * normalizedLimit;

      const queryBuilder = this.bookingRepository
        .createQueryBuilder('booking')
        .innerJoinAndSelect('booking.gig', 'gig')
        .leftJoinAndSelect('booking.user', 'user')
        .where('gig.sellerId = :sellerId', { sellerId })
        .orderBy('booking.createdAt', 'DESC')
        .skip(skip)
        .take(normalizedLimit);

      if (status) {
        queryBuilder.andWhere('booking.status = :status', { status });
      }

      const [bookings, total] = await queryBuilder.getManyAndCount();

      this.logger.log(
        `Found ${bookings?.length || 0} bookings for seller ${sellerId} out of ${total || 0} total`,
      );

      const totalPages = Math.ceil((total || 0) / normalizedLimit);

      const payload = {
        items: bookings || [],
        total: total || 0,
        page: normalizedPage,
        limit: normalizedLimit,
        totalPages: totalPages || 1,
      };

      return ApiResponse.success(
        payload,
        'Seller bookings retrieved successfully',
      );
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      const errorStack = this.getErrorStack(error);
      this.logger.error(
        `Failed to retrieve seller bookings: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve seller bookings: ${errorMessage}`,
      );
    }
  }

  private getDayOfWeek(date: Date): DayOfWeek {
    const days: DayOfWeek[] = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    return days[date.getDay()];
  }

  private convertTimeToMinutes(timeStr: string): number {
    const time = timeStr.trim().toUpperCase();

    let hours = 0;
    let minutes = 0;

    if (time.includes('AM') || time.includes('PM')) {
      const parts = time.replace(/\s*(AM|PM)/, '').split(':');
      hours = parseInt(parts[0], 10);
      minutes = parts[1] ? parseInt(parts[1], 10) : 0;

      if (time.includes('PM') && hours !== 12) {
        hours += 12;
      }
      if (time.includes('AM') && hours === 12) {
        hours = 0;
      }
    } else {
      const parts = time.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parts[1] ? parseInt(parts[1], 10) : 0;
    }

    return hours * 60 + minutes;
  }

  private timeRangesOverlap(
    start1: number,
    end1: number,
    start2: number,
    end2: number,
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  private getScheduledStartDate(booking: Booking): Date | null {
    if (!booking.bookingDate || !booking.startTime) {
      return null;
    }

    const bookingDate =
      booking.bookingDate instanceof Date
        ? new Date(booking.bookingDate)
        : new Date(booking.bookingDate);

    if (Number.isNaN(bookingDate.getTime())) {
      return null;
    }

    const minutesFromMidnight = this.convertTimeToMinutes(booking.startTime);
    if (Number.isNaN(minutesFromMidnight)) {
      return null;
    }

    const scheduledStart = new Date(bookingDate);
    scheduledStart.setHours(
      Math.floor(minutesFromMidnight / 60),
      minutesFromMidnight % 60,
      0,
      0,
    );

    return scheduledStart;
  }

  private calculateArrivalDelayMinutes(
    scheduledStart: Date | null,
    arrivalTime: Date,
  ): number {
    if (!scheduledStart) {
      return 0;
    }

    const diffMs = arrivalTime.getTime() - scheduledStart.getTime();
    if (diffMs <= 0) {
      return 0;
    }

    return Math.floor(diffMs / 60000);
  }

  private calculateArrivalRating(minutesLate: number): number {
    if (minutesLate <= 30) {
      return 5;
    }
    if (minutesLate <= 60) {
      return 4;
    }
    if (minutesLate <= 120) {
      return 3;
    }
    if (minutesLate <= 180) {
      return 2;
    }
    return 1;
  }

  async getAvailableHours(dto: GetAvailableHoursDto): Promise<
    ApiResponse<{
      availableHours: Array<{ startTime: string; endTime: string }>;
      existingBookings: Array<{
        startTime: string;
        endTime: string;
        status: BookingStatus;
      }>;
    }>
  > {
    try {
      const { gigId, date } = dto;
      const bookingDate = new Date(date);

      const dayOfWeek = this.getDayOfWeek(bookingDate);

      this.logger.log(
        `Getting available hours for gigId=${gigId}, date=${date}, day=${dayOfWeek}`,
      );

      const gigAvailability = await this.gigAvailabilityRepository.findOne({
        where: {
          gigId,
          day: dayOfWeek,
          isAvailable: true,
        },
      });

      if (
        !gigAvailability ||
        !gigAvailability.startTime ||
        !gigAvailability.endTime
      ) {
        return ApiResponse.success(
          {
            availableHours: [],
            existingBookings: [],
          },
          'No availability found for this day',
        );
      }

      const dateStr = date.split('T')[0];
      const bookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.gigId = :gigId', { gigId })
        .andWhere('DATE(booking.bookingDate) = :date', { date: dateStr })
        .getMany();

      const incompleteBookings = bookings.filter(
        (booking) => booking.completeJob !== true,
      );
      console.log('incompleteBookings', incompleteBookings);
      const existingBookings = incompleteBookings.map((booking) => ({
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
      }));

      const availStartTime = gigAvailability.startTime
        .split(':')
        .slice(0, 2)
        .join(':');
      const availEndTime = gigAvailability.endTime
        .split(':')
        .slice(0, 2)
        .join(':');

      const availStartMinutes = this.convertTimeToMinutes(availStartTime);
      const availEndMinutes = this.convertTimeToMinutes(availEndTime);

      const bookedSlots: Array<{ start: number; end: number }> = [];
      for (const booking of incompleteBookings) {
        if (booking.startTime && booking.endTime) {
          const bookingStart = this.convertTimeToMinutes(booking.startTime);
          const bookingEnd = this.convertTimeToMinutes(booking.endTime);
          bookedSlots.push({ start: bookingStart, end: bookingEnd });
        }
      }

      const availableHours: Array<{ startTime: string; endTime: string }> = [];

      if (bookedSlots.length === 0) {
        availableHours.push({
          startTime: availStartTime,
          endTime: availEndTime,
        });
      } else {
        bookedSlots.sort((a, b) => a.start - b.start);

        if (availStartMinutes < bookedSlots[0].start) {
          const hours = Math.floor(availStartMinutes / 60);
          const minutes = availStartMinutes % 60;
          const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

          const endHours = Math.floor(bookedSlots[0].start / 60);
          const endMinutes = bookedSlots[0].start % 60;
          const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

          availableHours.push({ startTime, endTime });
        }

        for (let i = 0; i < bookedSlots.length - 1; i++) {
          const gapStart = bookedSlots[i].end;
          const gapEnd = bookedSlots[i + 1].start;

          if (gapStart < gapEnd) {
            const startHours = Math.floor(gapStart / 60);
            const startMinutes = gapStart % 60;
            const startTime = `${startHours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;

            const endHours = Math.floor(gapEnd / 60);
            const endMinutes = gapEnd % 60;
            const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

            availableHours.push({ startTime, endTime });
          }
        }

        if (bookedSlots[bookedSlots.length - 1].end < availEndMinutes) {
          const startHours = Math.floor(
            bookedSlots[bookedSlots.length - 1].end / 60,
          );
          const startMinutes = bookedSlots[bookedSlots.length - 1].end % 60;
          const startTime = `${startHours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;

          const endHours = Math.floor(availEndMinutes / 60);
          const endMinutes = availEndMinutes % 60;
          const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

          availableHours.push({ startTime, endTime });
        }
      }

      this.logger.log(
        `Found ${availableHours.length} available time slots and ${existingBookings.length} existing bookings`,
      );

      return ApiResponse.success(
        {
          availableHours,
          existingBookings,
        },
        'Available hours retrieved successfully',
      );
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      const errorStack = this.getErrorStack(error);
      this.logger.error(
        `Failed to get available hours: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        `Failed to get available hours: ${errorMessage}`,
      );
    }
  }

  async remove(
    id: string,
    userId?: string,
    userRole?: string,
  ): Promise<ApiResponse<null>> {
    try {
      const booking = await this.bookingRepository.findOne({ where: { id } });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (userRole !== 'ADMIN' && booking.userId !== userId) {
        throw new BadRequestException('You can only delete your own bookings');
      }

      await this.bookingRepository.remove(booking);

      const sender = await this.usersRepo.findOne({
        where: { id: userId },
      });

      const receiver = await this.usersRepo.findOne({
        where: { id: booking.userId },
      });

      const notificationPayload: CreateNotificationDto = {
        receiver: receiver!,
        sender: sender!,
        title: 'Booking Updated',
        message: `Your booking has been removed successfully.`,
      };

      await this.notificationService.create(notificationPayload);

      this.logger.log(
        `Booking deleted successfully: ${id} by ${userRole === 'ADMIN' ? 'admin' : 'user'}`,
      );

      return ApiResponse.success(null, 'Booking deleted successfully');
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to delete booking: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to delete booking');
    }
  }

  async arrive(
    dto: BookingArriveDto,
    sellerId?: string,
  ): Promise<
    ApiResponse<{
      id: string;
      latitude: number;
      longitude: number;
      arrivalLatitude: number;
      arrivalLongitude: number;
      status: BookingStatus;
      arrivalRating?: number | null;
    }>
  > {
    try {
      if (!sellerId) {
        throw new BadRequestException(
          'Unauthorized: Seller ID not found in token',
        );
      }

      const booking = await this.bookingRepository.findOne({
        where: { id: dto.bookingId },
        relations: ['gig'],
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (!booking.gig) {
        throw new BadRequestException('Booking gig not found');
      }

      const gigSellerIdStr = String(booking.gig.sellerId || '');
      const sellerIdStr = String(sellerId || '');

      if (gigSellerIdStr !== sellerIdStr) {
        throw new BadRequestException(
          'Only gig owner can mark arrival for this booking',
        );
      }

      if (
        booking.latitude === null ||
        booking.latitude === undefined ||
        booking.longitude === null ||
        booking.longitude === undefined
      ) {
        throw new BadRequestException(
          'Booking does not have customer coordinates to verify',
        );
      }

      const toNumber = (value: string | number, label: string): number => {
        const parsed =
          typeof value === 'string' ? parseFloat(value) : Number(value);
        if (Number.isNaN(parsed)) {
          throw new BadRequestException(`Invalid ${label} provided`);
        }
        return parsed;
      };

      const originalLatitude = toNumber(booking.latitude, 'latitude');
      const originalLongitude = toNumber(booking.longitude, 'longitude');
      const arrivalLatitude = toNumber(dto.latitude, 'arrival latitude');
      const arrivalLongitude = toNumber(dto.longitude, 'arrival longitude');

      const distanceMeters = BookingsService.calculateDistanceMeters(
        originalLatitude,
        originalLongitude,
        arrivalLatitude,
        arrivalLongitude,
      );

      this.logger.log(
        `Arrival check: Booking location (${originalLatitude}, ${originalLongitude}), ` +
          `Arrival location (${arrivalLatitude}, ${arrivalLongitude}), ` +
          `Distance: ${distanceMeters.toFixed(2)} meters, ` +
          `Tolerance: ${BookingsService.ARRIVAL_TOLERANCE} meters`,
      );

      if (distanceMeters > BookingsService.ARRIVAL_TOLERANCE) {
        throw new BadRequestException(
          `You are too far from the booking location to mark arrival. ` +
            `Distance: ${distanceMeters.toFixed(2)} meters. ` +
            `Maximum allowed: ${BookingsService.ARRIVAL_TOLERANCE} meters.`,
        );
      }

      const arrivalRecordedAt = new Date();
      const scheduledStart = this.getScheduledStartDate(booking);
      const minutesLate = this.calculateArrivalDelayMinutes(
        scheduledStart,
        arrivalRecordedAt,
      );
      const arrivalRating = this.calculateArrivalRating(minutesLate);

      if (minutesLate >= 15 && !booking.arrival15Notified) {
        const receiverUser = await this.usersRepo.findOne({
          where: { id: sellerId },
        });
        if (!receiverUser) {
          throw new NotFoundException('Seller not found');
        }
        const notificationPayload = {
          receiver: receiverUser,
          sender: undefined,
          title: 'You are Late',
          message: `You arrived ${minutesLate} minutes late for the booking.`,
        };
        await this.notificationService.create(notificationPayload);
        booking.arrival15Notified = true;
      }
      if (minutesLate >= 30 && !booking.arrival30Notified) {
        const receiverUser = await this.usersRepo.findOne({
          where: { id: sellerId },
        });
        if (!receiverUser) {
          throw new NotFoundException('Seller not found');
        }
        const notificationPayload = {
          receiver: receiverUser,
          sender: undefined,
          title: 'You are Late',
          message: `You arrived ${minutesLate} minutes late for the booking.`,
        };
        await this.notificationService.create(notificationPayload);
        booking.arrival30Notified = true;
      }

      if (minutesLate >= 60 && !booking.arrival1Notified) {
        const receiverUser = await this.usersRepo.findOne({
          where: { id: sellerId },
        });

        if (!receiverUser) {
          throw new NotFoundException('Seller not found');
        }
        const notificationPayload = {
          receiver: receiverUser,
          sender: undefined,
          title: 'You are Late',
          message: `You arrived ${minutesLate} minutes late for the booking.`,
        };
        await this.notificationService.create(notificationPayload);
        booking.arrival1Notified = true;
      }

      if (minutesLate >= 120 && !booking.arrival2Notified) {
        const receiverUser = await this.usersRepo.findOne({
          where: { id: sellerId },
        });

        if (!receiverUser) {
          throw new NotFoundException('Seller not found');
        }

        const notificationPayload: CreateNotificationDto = {
          receiver: receiverUser,
          sender: undefined,
          title: 'You are Extremely Late',
          message: `You arrived ${minutesLate} minutes late for the booking.`,
        };

        await this.notificationService.create(notificationPayload);
        booking.arrival2Notified = true;
      }

      // ------------------------------
      // Save arrival details
      // ------------------------------
      booking.arrivalLatitude = arrivalLatitude;
      booking.arrivalLongitude = arrivalLongitude;
      booking.arrivalRating = arrivalRating;

      const updated = await this.bookingRepository.save(booking);

      return ApiResponse.success(
        {
          id: updated.id,
          latitude: originalLatitude,
          longitude: originalLongitude,
          arrivalLatitude: Number(updated.arrivalLatitude),
          arrivalLongitude: Number(updated.arrivalLongitude),
          status: updated.status,
          arrivalRating: updated.arrivalRating ?? null,
        },
        'Arrival recorded successfully',
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage = this.getErrorMessage(error);
      const errorStack = this.getErrorStack(error);
      this.logger.error(
        `Failed to record arrival: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        `Failed to record arrival: ${errorMessage}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async autoDeleteExpiredBookingsFallback(): Promise<void> {
    try {
      const expiryMinutes = 30;
      const expiryTimeAgo = new Date();
      expiryTimeAgo.setMinutes(expiryTimeAgo.getMinutes() - expiryMinutes);

      this.logger.log(
        `[Fallback Cron] Checking for pending bookings older than ${expiryMinutes} minutes (before ${expiryTimeAgo.toISOString()})`,
      );

      const expiredBookings = await this.bookingRepository.find({
        where: {
          status: BookingStatus.PENDING,
          createdAt: LessThan(expiryTimeAgo),
        },
        relations: ['gig', 'gig.seller', 'user'],
      });

      if (expiredBookings.length === 0) {
        return;
      }

      this.logger.log(
        `[Fallback Cron] Found ${expiredBookings.length} expired pending booking(s) to auto-delete`,
      );

      for (const booking of expiredBookings) {
        try {
          const currentBooking = await this.bookingRepository.findOne({
            where: { id: booking.id },
          });

          if (!currentBooking) {
            continue;
          }

          if (currentBooking.status !== BookingStatus.PENDING) {
            this.logger.log(
              `[Fallback Cron] Booking ${booking.id} is no longer PENDING (status: ${currentBooking.status}). Skipping deletion.`,
            );
            continue;
          }

          await this.bookingRepository.remove(currentBooking);

          this.logger.log(
            `[Fallback Cron] Successfully deleted expired booking ${booking.id} (created at ${booking.createdAt.toISOString()})`,
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
                  `[Fallback Cron] Notification sent to buyer for auto-deleted booking ${booking.id}`,
                );
              }
            } catch (notificationError) {
              this.logger.warn(
                `[Fallback Cron] Failed to send notification for auto-deleted booking ${booking.id}: ${this.getErrorMessage(notificationError)}`,
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
                  `[Fallback Cron] Notification sent to seller for auto-deleted booking ${booking.id}`,
                );
              }
            } catch (notificationError) {
              this.logger.warn(
                `[Fallback Cron] Failed to send seller notification for auto-deleted booking ${booking.id}: ${this.getErrorMessage(notificationError)}`,
              );
            }
          }
        } catch (bookingError) {
          this.logger.error(
            `[Fallback Cron] Failed to delete booking ${booking.id}: ${this.getErrorMessage(bookingError)}`,
          );
        }
      }

      this.logger.log(
        `[Fallback Cron] Successfully processed ${expiredBookings.length} expired booking(s)`,
      );
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      const errorStack = this.getErrorStack(error);
      this.logger.error(
        `[Fallback Cron] Failed to auto-delete expired bookings: ${errorMessage}`,
        errorStack,
      );
    }
  }
}
