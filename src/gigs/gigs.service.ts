import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { UploadApiResponse } from 'cloudinary';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In } from 'typeorm';
import { CreateGigDto } from './dto/create-gig.dto';
import { UpdateGigDto } from './dto/update-gig.dto';
import { Gig, GigStatus } from './entities/gig.entity';
import { DayOfWeek, GigAvailability } from './entities/gig-availability.entity';
import { GigFavourite } from './entities/gig-favourite.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Review } from '../reviews/entities/review.entity';
import { User } from '../users/auth/entity/users.entity';
import { UserRole } from '../users/auth/enums/enum';
import { ApiResponse } from '../common/utils/response.util';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Seller } from '../seller/entities/seller.entity';
import { SellerVerificationStatus } from '../seller/Enum/seller-verification-enum';
import { UserStatus } from '../users/auth/enums/status-enum';

type SortBy = {
  priceFrom: 'ASC' | 'DESC';
};

type AvailabilityInput = {
  day?: DayOfWeek | string;
  isAvailable?: boolean | string | number;
  hours?: Array<{ startTime?: string; endTime?: string }>;
  startTime?: string | null;
  endTime?: string | null;
};

type NormalizedAvailability = {
  day: DayOfWeek;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
};

@Injectable()
export class GigsService {
  private readonly logger = new Logger(GigsService.name);

  constructor(
    @InjectRepository(Gig)
    private readonly gigRepository: Repository<Gig>,
    @InjectRepository(GigAvailability)
    private readonly gigAvailabilityRepository: Repository<GigAvailability>,
    @InjectRepository(GigFavourite)
    private readonly gigFavouriteRepository: Repository<GigFavourite>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Seller)
    private readonly sellerRepository: Repository<Seller>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    return undefined;
  }

  async create(
    createGigDto: CreateGigDto,
    userId: string,
    files?: Express.Multer.File[],
  ): Promise<ApiResponse<Gig>> {
    try {
      this.logger.log(`Creating gig for user: ${userId}`);

      if (!userId) {
        this.logger.error('Seller ID is undefined');
        throw new InternalServerErrorException(
          'Authentication failed: Seller ID is missing',
        );
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user?.status === UserStatus.INACTIVE)
        throw new ForbiddenException('Seller is paused!');

      const seller = await this.sellerRepository.findOne({
        where: { user: { id: userId } },
      });
      if (!seller) throw new NotFoundException('Seller not found');

      if (seller.verificationSeller !== SellerVerificationStatus.APPROVED) {
        throw new ForbiddenException(
          'You cannot create a gig until your seller account is verified by admin.',
        );
      }

      const existingGigsCount = await this.gigRepository.count({
        where: { sellerId: userId, status: GigStatus.ACTIVE },
      });

      if (existingGigsCount >= 5) {
        this.logger.warn(
          `Seller ${userId} has reached the free plan limit of 5 gigs`,
        );
        throw new BadRequestException(
          'You have reached the maximum limit of 5 gigs for the free plan. Please upgrade your plan to create more gigs.',
        );
      }

      const photoUrls = await this.uploadPhotos(files);

      let normalizedAvailabilities: NormalizedAvailability[] | undefined;
      try {
        const candidate: unknown =
          (createGigDto as unknown as Record<string, unknown>)?.[
            'availabilityHours'
          ] ??
          (createGigDto as unknown as Record<string, unknown>)?.[
            'availabilities'
          ];

        const rawAvail: unknown =
          typeof candidate === 'string' ? JSON.parse(candidate) : candidate;

        if (Array.isArray(rawAvail)) {
          normalizedAvailabilities = [];
          for (const aUnknown of rawAvail) {
            const a = aUnknown as AvailabilityInput;
            const isAvail =
              a?.isAvailable === true ||
              a?.isAvailable === 'true' ||
              a?.isAvailable === 1 ||
              a?.isAvailable === '1';
            const dayVal =
              typeof a?.day === 'string' ? a.day.toLowerCase() : a?.day;

            if (
              Array.isArray(a?.hours) &&
              a.hours.length > 0 &&
              (dayVal as DayOfWeek)
            ) {
              for (const h of a.hours) {
                if (h?.startTime && h?.endTime) {
                  normalizedAvailabilities.push({
                    day: dayVal as DayOfWeek,
                    isAvailable: true,
                    startTime: h.startTime,
                    endTime: h.endTime,
                  });
                }
              }
            } else if (dayVal) {
              normalizedAvailabilities.push({
                day: dayVal as DayOfWeek,
                isAvailable: isAvail,
                startTime: isAvail ? (a?.startTime ?? null) : null,
                endTime: isAvail ? (a?.endTime ?? null) : null,
              });
            }
          }
        }
      } catch {
        normalizedAvailabilities = undefined;
      }

      const rest: Record<string, unknown> = {
        ...(createGigDto as unknown as Record<string, unknown>),
      };
      delete rest['availabilityHours'];
      delete rest['availabilities'];
      const gigData: Partial<Gig> = {
        ...(rest as Partial<Gig>),
        sellerId: userId,
        photos: photoUrls,
      };

      this.logger.log(
        'Creating gig with data:',
        JSON.stringify(gigData, null, 2),
      );

      const gig: Gig = this.gigRepository.create(gigData);
      const savedGig: Gig = await this.gigRepository.save(gig);

      if (normalizedAvailabilities && normalizedAvailabilities.length > 0) {
        const rows = normalizedAvailabilities.map((a) =>
          this.gigAvailabilityRepository.create({
            gigId: savedGig.id,
            day: a.day,
            isAvailable: a.isAvailable,
            startTime: a.startTime,
            endTime: a.endTime,
          }),
        );
        await this.gigAvailabilityRepository.save(rows);
      }

      const created = await this.gigRepository.findOne({
        where: { id: savedGig.id },
        relations: ['seller', 'availabilities', 'category'],
      });

      this.logger.log(`Gig created successfully: ${savedGig.id}`);

      return ApiResponse.success(created!, 'Gig created successfully');
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      const errorStack = this.getErrorStack(error);
      this.logger.error(`Failed to create gig: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException(
        `Failed to create gig: ${errorMessage}`,
      );
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    categoryId?: string,
    sortBy?: SortBy,
    search?: string,
    availabilityFilter?: string,
    userId?: string,
  ): Promise<
    ApiResponse<{
      items: (Gig & {
        isFavourited?: boolean;
        availabilityStatus?: string;
        availabilityHours?: NormalizedAvailability[];
      })[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>
  > {
    try {
      this.logger.log(
        `Finding gigs - page: ${page}, limit: ${limit}, categoryId: ${categoryId}, sortBy: ${JSON.stringify(sortBy)}, search: ${search}, availabilityFilter: ${availabilityFilter}, userId: ${userId}`,
      );

      const normalizedPage = Math.max(1, Math.floor(Number(page)) || 1);
      const normalizedLimit = Math.min(
        100,
        Math.max(1, Math.floor(Number(limit)) || 10),
      );

      const skip = (normalizedPage - 1) * normalizedLimit;

      const whereCondition: {
        status: GigStatus;
        categoryId?: string;
      } = {
        status: GigStatus.ACTIVE,
      };

      if (
        categoryId &&
        typeof categoryId === 'string' &&
        categoryId.trim() !== ''
      ) {
        whereCondition.categoryId = categoryId.trim();
        this.logger.log(`Filtering by categoryId: ${categoryId}`);
      }

      this.logger.log(`Query conditions: ${JSON.stringify(whereCondition)}`);

      const validSortBy = this.validateSortOption(sortBy);
      const orderClause = this.buildOrderClause(validSortBy);

      const queryBuilder = this.gigRepository
        .createQueryBuilder('gig')
        .leftJoin('gig.seller', 'seller')
        .leftJoin('gig.category', 'category')
        .leftJoin('gig.bookings', 'booking')
        .addSelect(['seller.id', 'seller.name'])
        .addSelect(['category.id', 'category.name'])
        .where('gig.status = :status', { status: GigStatus.ACTIVE })
        .groupBy('gig.id')
        .addGroupBy('seller.id')
        .addGroupBy('seller.name')
        .addGroupBy('category.id')
        .addGroupBy('category.name')
        .addSelect('COUNT(DISTINCT booking.id)', 'bookingCount');

      if (whereCondition.categoryId) {
        queryBuilder.andWhere('gig.categoryId = :categoryId', {
          categoryId: whereCondition.categoryId,
        });
      }

      if (search && search.trim() !== '') {
        const searchTerm = `%${search.trim()}%`;
        queryBuilder.andWhere(
          '(LOWER(gig.title) LIKE LOWER(:search) OR LOWER(gig.shortDescription) LIKE LOWER(:search))',
          { search: searchTerm },
        );
        this.logger.log(`Searching for: ${search}`);
      }

      if (availabilityFilter && availabilityFilter !== 'all') {
        this.addAvailabilityFilter(queryBuilder, availabilityFilter);
        this.logger.log(`Filtering by availability: ${availabilityFilter}`);
      }

      // Default sorting by booking count (DESC) - gigs with more bookings first
      if (!validSortBy || Object.keys(validSortBy).length === 0) {
        queryBuilder.orderBy('COUNT(DISTINCT booking.id)', 'DESC');
      }

      // Apply custom sorting if provided
      Object.entries(orderClause).forEach(([field, direction]) => {
        queryBuilder.addOrderBy(`gig.${field}`, direction);
      });

      // Always add booking count as secondary sort if custom sort is provided
      if (validSortBy && Object.keys(validSortBy).length > 0) {
        queryBuilder.addOrderBy('COUNT(DISTINCT booking.id)', 'DESC');
      }

      // Get total count first (before skip/take)
      const total = await queryBuilder.getCount();

      // Apply sorting and pagination

      // Use getRawAndEntities to get booking count in raw data
      const { entities: gigs, raw } = await queryBuilder.getRawAndEntities();

      // Create a map of gigId to bookingCount from raw data
      const bookingCountMap = new Map<string, number>();
      raw.forEach((row: any) => {
        if (row.gig_id && row.bookingCount !== undefined) {
          bookingCountMap.set(row.gig_id, parseInt(row.bookingCount) || 0);
        }
      });

      // Sort gigs by booking count if needed (for in-memory sorting as fallback)
      const sortedGigs = [...gigs].sort((a, b) => {
        const countA = bookingCountMap.get(a.id) || 0;
        const countB = bookingCountMap.get(b.id) || 0;
        return countB - countA; // DESC order
      });

      const gigIds = sortedGigs?.map((gig) => gig.id) ?? [];

      this.logger.log(
        `Found ${sortedGigs?.length || 0} gigs out of ${total || 0} total`,
      );

      const availabilityMap = new Map<string, NormalizedAvailability[]>();
      if (gigIds.length > 0) {
        const availabilities = await this.gigAvailabilityRepository.find({
          where: { gigId: In(gigIds) },
          order: { day: 'ASC', startTime: 'ASC' },
        });

        for (const availability of availabilities) {
          const existing = availabilityMap.get(availability.gigId) ?? [];
          existing.push({
            day: availability.day,
            isAvailable: availability.isAvailable,
            startTime: availability.startTime,
            endTime: availability.endTime,
          });
          availabilityMap.set(availability.gigId, existing);
        }
      }

      let gigsWithFavouriteStatus = sortedGigs || [];
      if (userId && gigIds.length > 0) {
        const favourites = await this.gigFavouriteRepository.find({
          where: {
            userId,
            gigId: gigIds.length > 0 ? In(gigIds) : In([]),
          },
        });

        const favouriteMap = new Map();
        favourites.forEach((fav) => {
          favouriteMap.set(fav.gigId, true);
        });

        gigsWithFavouriteStatus = sortedGigs.map((gig) => ({
          ...gig,
          isFavourited: favouriteMap.has(gig.id) || false,
          availabilityHours: availabilityMap.get(gig.id) ?? [],
        }));
      } else {
        gigsWithFavouriteStatus = sortedGigs.map((gig) => ({
          ...gig,
          availabilityHours: availabilityMap.get(gig.id) ?? [],
        }));
      }

      let gigsWithAvailabilityStatus = gigsWithFavouriteStatus;
      if (gigIds.length > 0) {
        // Get all incomplete bookings for these gigs
        const incompleteBookings = await this.bookingRepository.find({
          where: {
            gigId: gigIds.length > 0 ? In(gigIds) : In([]),
          },
        });

        const activeBookings = incompleteBookings.filter(
          (booking) => booking.completeJob !== true,
        );

        const gigsWithActiveBookings = new Set(
          activeBookings.map((booking) => booking.gigId),
        );

        gigsWithAvailabilityStatus = gigsWithFavouriteStatus.map((gig) => ({
          ...gig,
          availabilityStatus: gigsWithActiveBookings.has(gig.id)
            ? 'not active'
            : 'active',
        }));
      } else {
        gigsWithAvailabilityStatus = gigsWithFavouriteStatus.map((gig) => ({
          ...gig,
          availabilityStatus: 'active',
        }));
      }

      const totalPages = Math.ceil((total || 0) / normalizedLimit);

      const payload = {
        items: gigsWithAvailabilityStatus,
        total: total || 0,
        page: normalizedPage,
        limit: normalizedLimit,
        totalPages: totalPages || 1,
      };

      return ApiResponse.success(payload, 'Gigs retrieved successfully');
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      const errorStack = this.getErrorStack(error);
      this.logger.error(`Failed to retrieve gigs: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException(
        `Failed to retrieve gigs: ${errorMessage}`,
      );
    }
  }

  async findMyGigs(userId: string): Promise<ApiResponse<Gig[]>> {
    try {
      const gigs = await this.gigRepository.find({
        where: { sellerId: userId },
        relations: ['seller', 'availabilities', 'category'],
        order: {
          createdAt: 'DESC',
          updatedAt: 'DESC',
          availabilities: { day: 'ASC', startTime: 'ASC' },
        },
      });

      return ApiResponse.success(gigs, 'Your gigs retrieved successfully');
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to retrieve seller gigs: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve seller gigs');
    }
  }

  async findOne(id: string): Promise<ApiResponse<Gig>> {
    try {
      const gig = await this.gigRepository.findOne({
        where: { id },
        relations: ['seller', 'availabilities', 'category'],
        order: {
          createdAt: 'DESC',
          updatedAt: 'DESC',
          availabilities: { day: 'ASC', startTime: 'ASC' },
        },
        select: {
          seller: {
            id: true,
            name: true,
          },
          category: {
            id: true,
            name: true,
          },
        },
      });

      if (!gig) {
        throw new NotFoundException('Gig not found');
      }

      return ApiResponse.success(gig, 'Gig retrieved successfully');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to retrieve gig: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve gig');
    }
  }

  async update(
    id: string,
    updateGigDto: UpdateGigDto,
    userId: string,
    files?: Express.Multer.File[],
  ): Promise<ApiResponse<Gig>> {
    try {
      const gig = await this.findGigAndCheckOwnership(id, userId);

      let updatedPhotos = [...(gig.photos || [])];

      if (files && files.length > 0) {
        if (gig.photos && gig.photos.length > 0) {
          await this.deletePhotosFromCloudinary(gig.photos);
        }

        const newPhotoUrls = await this.uploadPhotos(files);
        updatedPhotos = newPhotoUrls;
      }

      const gigData = updateGigDto;

      let normalizedAvailabilities: NormalizedAvailability[] | undefined;
      try {
        const availInput: unknown =
          (gigData as unknown as Record<string, unknown>)?.[
            'availabilityHours'
          ] ??
          (gigData as unknown as Record<string, unknown>)?.['availabilities'];
        const rawAvail: unknown =
          typeof availInput === 'string' ? JSON.parse(availInput) : availInput;

        if (Array.isArray(rawAvail)) {
          normalizedAvailabilities = [];
          for (const aUnknown of rawAvail) {
            const a = aUnknown as AvailabilityInput;
            const isAvail =
              a?.isAvailable === true ||
              a?.isAvailable === 'true' ||
              a?.isAvailable === 1 ||
              a?.isAvailable === '1';
            const dayVal =
              typeof a?.day === 'string' ? a.day.toLowerCase() : a?.day;

            if (Array.isArray(a?.hours) && a.hours.length > 0 && dayVal) {
              for (const h of a.hours) {
                if (h?.startTime && h?.endTime) {
                  normalizedAvailabilities.push({
                    day: dayVal as DayOfWeek,
                    isAvailable: true,
                    startTime: h.startTime,
                    endTime: h.endTime,
                  });
                }
              }
            } else if (dayVal) {
              normalizedAvailabilities.push({
                day: dayVal as DayOfWeek,
                isAvailable: isAvail,
                startTime: isAvail ? (a?.startTime ?? null) : null,
                endTime: isAvail ? (a?.endTime ?? null) : null,
              });
            }
          }
        }
      } catch {
        normalizedAvailabilities = undefined;
      }

      const updateData: Partial<Gig> & Record<string, unknown> = {
        ...(gigData as Record<string, unknown>),
        photos: updatedPhotos,
      };

      Object.keys(updateData).forEach((key) => {
        const k = key;
        if (updateData[k] === undefined) {
          delete updateData[k];
        }
      });

      if ('availabilities' in updateData) {
        delete (updateData as Record<string, unknown>)['availabilities'];
      }
      if ('availabilityHours' in updateData) {
        delete (updateData as Record<string, unknown>)['availabilityHours'];
      }

      await this.gigRepository.update(id, updateData);

      if (normalizedAvailabilities) {
        await this.gigAvailabilityRepository.delete({ gigId: id });
        if (normalizedAvailabilities.length > 0) {
          const newRows = normalizedAvailabilities.map((a) =>
            this.gigAvailabilityRepository.create({
              gigId: id,
              day: a.day,
              isAvailable: a.isAvailable,
              startTime: a.startTime ?? null,
              endTime: a.endTime ?? null,
            }),
          );
          await this.gigAvailabilityRepository.save(newRows);
        }
      }

      const updatedGig = await this.gigRepository.findOne({
        where: { id },
        relations: ['seller', 'availabilities', 'category'],
      });

      return ApiResponse.success(updatedGig!, 'Gig updated successfully');
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to update gig: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to update gig');
    }
  }

  async remove(id: string, userId: string): Promise<ApiResponse<null>> {
    try {
      const gig = await this.findGigAndCheckOwnership(id, userId);

      if (gig.photos?.length > 0) {
        await this.deletePhotosFromCloudinary(gig.photos);
      }

      await this.gigRepository.delete(id);

      return ApiResponse.success(null, 'Gig deleted successfully');
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to delete gig: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to delete gig');
    }
  }

  async updateStatus(
    id: string,
    status: GigStatus,
    userId: string,
  ): Promise<ApiResponse<Gig>> {
    try {
      await this.findGigAndCheckOwnership(id, userId);

      await this.gigRepository.update(id, { status });

      const updatedGig = await this.gigRepository.findOne({
        where: { id },
        relations: ['seller', 'category'],
      });

      return ApiResponse.success(
        updatedGig!,
        'Gig status updated successfully',
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to update gig status: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to update gig status');
    }
  }

  private async findGigAndCheckOwnership(
    id: string,
    userId: string,
  ): Promise<Gig> {
    const gig = await this.gigRepository.findOne({ where: { id } });

    if (!gig) {
      throw new NotFoundException('Gig not found');
    }

    if (gig.sellerId !== userId) {
      throw new ForbiddenException('You can only modify your own gigs');
    }

    return gig;
  }

  private async uploadPhotos(files?: Express.Multer.File[]): Promise<string[]> {
    if (!files || files.length === 0) {
      return [];
    }

    try {
      this.logger.log(`Uploading ${files.length} photos to Cloudinary`);

      const uploadPromises = files.map((file) =>
        this.cloudinaryService.uploadImage(file),
      );

      const results = await Promise.all(uploadPromises);
      const urls = results
        .filter((result): result is UploadApiResponse => 'secure_url' in result)
        .map((result) => result.secure_url);

      this.logger.log(`Successfully uploaded ${urls.length} photos`);
      return urls;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to upload photos: ${errorMessage}`);
      return [];
    }
  }

  private async deletePhotosFromCloudinary(photoUrls: string[]): Promise<void> {
    try {
      const deletePromises = photoUrls.map((url) => {
        const publicId = this.extractPublicId(url);
        return this.cloudinaryService.deleteImage(publicId);
      });

      await Promise.all(deletePromises);
      this.logger.log(`Deleted ${photoUrls.length} photos from Cloudinary`);
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.warn(`Failed to delete some photos: ${errorMessage}`);
    }
  }

  private extractPublicId(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0];
  }

  private validateSortOption(sortBy?: SortBy): SortBy | undefined {
    if (!sortBy) {
      return undefined;
    }

    if (
      sortBy.priceFrom &&
      (sortBy.priceFrom === 'ASC' || sortBy.priceFrom === 'DESC')
    ) {
      return sortBy;
    }

    this.logger.warn(
      `Invalid sort option: ${JSON.stringify(sortBy)}, using default sorting`,
    );
    return undefined;
  }

  private buildOrderClause(sortBy?: SortBy): Record<string, 'ASC' | 'DESC'> {
    if (!sortBy) {
      return {
        createdAt: 'DESC',
        updatedAt: 'DESC',
      };
    }

    return sortBy;
  }

  private addAvailabilityFilter(
    queryBuilder: SelectQueryBuilder<Gig>,
    availabilityFilter: string,
  ): void {
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0];
    const currentDay = now
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase();

    switch (availabilityFilter) {
      case 'available_now':
        queryBuilder
          .leftJoin('gig.availabilities', 'availability')
          .andWhere('availability.isAvailable = :isAvailable', {
            isAvailable: true,
          })
          .andWhere('availability.day = :currentDay', { currentDay })
          .andWhere('availability.startTime <= :currentTime', { currentTime })
          .andWhere('availability.endTime >= :currentTime', { currentTime });
        break;

      case 'arrive_1_hour': {
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        const oneHourTime = oneHourLater.toTimeString().split(' ')[0];
        queryBuilder
          .leftJoin('gig.availabilities', 'availability')
          .andWhere('availability.isAvailable = :isAvailable', {
            isAvailable: true,
          })
          .andWhere('availability.day = :currentDay', { currentDay })
          .andWhere('availability.startTime <= :oneHourTime', { oneHourTime })
          .andWhere('availability.endTime >= :currentTime', { currentTime });
        break;
      }

      case 'arrive_2_hours': {
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const twoHoursTime = twoHoursLater.toTimeString().split(' ')[0];
        queryBuilder
          .leftJoin('gig.availabilities', 'availability')
          .andWhere('availability.isAvailable = :isAvailable', {
            isAvailable: true,
          })
          .andWhere('availability.day = :currentDay', { currentDay })
          .andWhere('availability.startTime <= :twoHoursTime', { twoHoursTime })
          .andWhere('availability.endTime >= :currentTime', { currentTime });
        break;
      }

      case 'arrive_3_hours': {
        const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
        const threeHoursTime = threeHoursLater.toTimeString().split(' ')[0];
        queryBuilder
          .leftJoin('gig.availabilities', 'availability')
          .andWhere('availability.isAvailable = :isAvailable', {
            isAvailable: true,
          })
          .andWhere('availability.day = :currentDay', { currentDay })
          .andWhere('availability.startTime <= :threeHoursTime', {
            threeHoursTime,
          })
          .andWhere('availability.endTime >= :currentTime', { currentTime });
        break;
      }

      case 'arrive_4_hours': {
        const fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        const fourHoursTime = fourHoursLater.toTimeString().split(' ')[0];
        queryBuilder
          .leftJoin('gig.availabilities', 'availability')
          .andWhere('availability.isAvailable = :isAvailable', {
            isAvailable: true,
          })
          .andWhere('availability.day = :currentDay', { currentDay })
          .andWhere('availability.startTime <= :fourHoursTime', {
            fourHoursTime,
          })
          .andWhere('availability.endTime >= :currentTime', { currentTime });
        break;
      }

      default:
        break;
    }
  }

  async addToFavourites(
    gigId: string,
    userId: string,
    userRole?: string,
  ): Promise<ApiResponse<GigFavourite>> {
    try {
      this.logger.log(`Adding gig ${gigId} to favourites for user ${userId}`);

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(gigId)) {
        throw new BadRequestException('Invalid gig ID format');
      }
      if (!uuidRegex.test(userId)) {
        throw new BadRequestException('Invalid user ID format');
      }

      if (userRole) {
        const normalizedRole = String(userRole).toUpperCase();
        const buyerRole = UserRole.BUYER.toUpperCase();
        if (normalizedRole !== buyerRole) {
          throw new ForbiddenException(
            'Only buyers can add gigs to favourites',
          );
        }
      }

      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'isActive'],
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      if (!user.isActive) {
        throw new ForbiddenException(
          'Please verify your OTP first before adding gigs to favourites',
        );
      }

      const gig = await this.gigRepository.findOne({ where: { id: gigId } });
      if (!gig) {
        throw new NotFoundException(`Gig with ID ${gigId} not found`);
      }

      const existingFavourite = await this.gigFavouriteRepository.findOne({
        where: { userId, gigId },
      });

      if (existingFavourite) {
        throw new BadRequestException('Gig is already in your favourites');
      }

      const favourite = this.gigFavouriteRepository.create({
        userId,
        gigId,
      });

      const savedFavourite = await this.gigFavouriteRepository.save(favourite);

      this.logger.log(`Gig ${gigId} added to favourites for user ${userId}`);

      return ApiResponse.success(
        savedFavourite,
        'Gig added to favourites successfully',
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      const errorMessage = this.getErrorMessage(error);
      const errorString = String(errorMessage).toLowerCase();

      if (
        errorString.includes('foreign key') ||
        errorString.includes('violates foreign key constraint')
      ) {
        if (errorString.includes('user_id')) {
          throw new BadRequestException(
            `Invalid user ID. User with ID ${userId} does not exist.`,
          );
        }
        if (errorString.includes('gig_id')) {
          throw new BadRequestException(
            `Invalid gig ID. Gig with ID ${gigId} does not exist.`,
          );
        }
        throw new BadRequestException(
          'Invalid user or gig ID. Please check your credentials.',
        );
      }

      if (
        errorString.includes('unique constraint') ||
        errorString.includes('duplicate key') ||
        errorString.includes('23505')
      ) {
        throw new BadRequestException('Gig is already in your favourites');
      }

      this.logger.error(
        `Failed to add gig to favourites: ${errorMessage}`,
        this.getErrorStack(error),
      );

      throw new BadRequestException(
        `Failed to add gig to favourites: ${errorMessage}`,
      );
    }
  }

  async removeFromFavourites(
    gigId: string,
    userId: string,
  ): Promise<ApiResponse<null>> {
    try {
      this.logger.log(
        `Removing gig ${gigId} from favourites for user ${userId}`,
      );

      const favourite = await this.gigFavouriteRepository.findOne({
        where: { userId, gigId },
      });

      if (!favourite) {
        throw new NotFoundException('Gig is not in your favourites');
      }

      await this.gigFavouriteRepository.remove(favourite);

      this.logger.log(
        `Gig ${gigId} removed from favourites for user ${userId}`,
      );

      return ApiResponse.success(
        null,
        'Gig removed from favourites successfully',
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(
        `Failed to remove gig from favourites: ${errorMessage}`,
      );
      throw new InternalServerErrorException(
        'Failed to remove gig from favourites',
      );
    }
  }

  async getFavoriteSellers(userId: string): Promise<ApiResponse<User[]>> {
    try {
      this.logger.log(`Getting favorite sellers for user ${userId}`);

      const favoriteGigs = await this.gigFavouriteRepository.find({
        where: { userId },
        relations: ['gig', 'gig.seller'],
      });

      if (favoriteGigs.length === 0) {
        return ApiResponse.success([], 'No favorite sellers found');
      }

      const sellerMap = new Map<string, User>();
      for (const favorite of favoriteGigs) {
        if (favorite.gig?.seller) {
          const seller = favorite.gig.seller;
          if (!sellerMap.has(seller.id)) {
            sellerMap.set(seller.id, seller);
          }
        }
      }

      const uniqueSellers = Array.from(sellerMap.values());

      this.logger.log(
        `Found ${uniqueSellers.length} unique favorite sellers for user ${userId}`,
      );

      return ApiResponse.success(
        uniqueSellers,
        'Favorite sellers retrieved successfully',
      );
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(
        `Failed to get favorite sellers: ${errorMessage}`,
        this.getErrorStack(error),
      );
      throw new InternalServerErrorException(
        `Failed to get favorite sellers: ${errorMessage}`,
      );
    }
  }

  async getServiceById(id: string): Promise<
    ApiResponse<{
      id: string;
      title: string;
      description: string;
      category: string;
      price: number;
      image_url: string;
      status: string;
      totalBookings: number;
      totalRevenue: number;
      rating: number;
      totalReviews: number;
      thisMonth: {
        bookings: number;
        revenue: number;
      };
    }>
  > {
    try {
      const gig = await this.gigRepository.findOne({
        where: { id },
        relations: ['category'],
      });

      if (!gig) {
        throw new NotFoundException('Gig not found');
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalBookings = await this.bookingRepository.count({
        where: { gigId: gig.id },
      });

      const completedBookings = await this.bookingRepository.find({
        where: {
          gigId: gig.id,
          completeJob: true,
          paymentChecked: true,
        },
        select: ['estimatedBudget', 'createdAt'],
      });

      const totalRevenue =
        completedBookings.reduce(
          (sum, booking) => sum + (Number(booking.estimatedBudget) || 0),
          0,
        ) || 0;

      const thisMonthBookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.gigId = :gigId', { gigId: gig.id })
        .andWhere('booking.createdAt >= :startOfMonth', {
          startOfMonth,
        })
        .getCount();

      const thisMonthRevenue =
        completedBookings
          .filter(
            (booking) => booking.createdAt && booking.createdAt >= startOfMonth,
          )
          .reduce(
            (sum, booking) => sum + (Number(booking.estimatedBudget) || 0),
            0,
          ) || 0;

      const reviews = await this.reviewRepository.find({
        where: { gigId: gig.id },
        select: ['rating'],
      });

      const totalReviews = reviews.length;
      const averageRating =
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

      const service = {
        id: gig.id,
        title: gig.title,
        description: gig.shortDescription || '',
        category: gig.category?.name || 'Uncategorized',
        price: Number(gig.priceFrom) || 0,
        image_url:
          gig.photos && gig.photos.length > 0
            ? gig.photos[0]
            : 'https://cdn.fixpilot.com/uploads/services/ac-repair.jpg',
        status: gig.status.toLowerCase(),
        totalBookings,
        totalRevenue,
        rating: averageRating,
        totalReviews,
        thisMonth: {
          bookings: thisMonthBookings || 0,
          revenue: thisMonthRevenue,
        },
      };

      return ApiResponse.success(service, 'Service retrieved successfully');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(
        `Failed to retrieve service: ${errorMessage}`,
        this.getErrorStack(error),
      );
      throw new InternalServerErrorException('Failed to retrieve service');
    }
  }
}
