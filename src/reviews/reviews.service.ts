import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ApiResponse } from '../common/utils/response.util';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
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
    createReviewDto: CreateReviewDto,
    buyerId: string,
    imageFile?: Express.Multer.File,
    videoFile?: Express.Multer.File,
  ): Promise<ApiResponse<Review>> {
    try {
      this.logger.log('Creating new review');

      const existing = await this.reviewRepository.findOne({
        where: {
          gigId: createReviewDto.gigId,
          buyerId: buyerId,
        },
      });

      if (existing) {
        throw new ConflictException(
          'You have already reviewed this gig. You can update your existing review.',
        );
      }

      let imageUrl: string | undefined = undefined;
      if (imageFile) {
        try {
          const uploadResult =
            await this.cloudinaryService.uploadImage(imageFile);
          if ('secure_url' in uploadResult) {
            imageUrl = (uploadResult as UploadApiResponse).secure_url;
          }
        } catch (error) {
          this.logger.error(
            `Failed to upload image: ${this.getErrorMessage(error)}`,
          );
        }
      }

      let videoUrl: string | undefined = undefined;
      if (videoFile) {
        try {
          const uploadResult =
            await this.cloudinaryService.uploadImage(videoFile);
          if ('secure_url' in uploadResult) {
            videoUrl = (uploadResult as UploadApiResponse).secure_url;
          }
        } catch (error) {
          this.logger.error(
            `Failed to upload video: ${this.getErrorMessage(error)}`,
          );
        }
      }

      const review = this.reviewRepository.create({
        gigId: createReviewDto.gigId,
        rating: createReviewDto.rating,
        reviews: createReviewDto.reviews,
        buyerId: buyerId,
        image: imageUrl,
        video: videoUrl,
      });
      const savedReview = await this.reviewRepository.save(review);

      this.logger.log(`Review created successfully: ${savedReview.id}`);

      return ApiResponse.success(savedReview, 'Review created successfully');
    } catch (error) {
      if (error instanceof ConflictException) {
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
        throw new ConflictException(
          'You have already reviewed this gig. You can update your existing review.',
        );
      }
      const errorMessage = this.getErrorMessage(error);
      const errorStack = this.getErrorStack(error);
      this.logger.error(`Failed to create review: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException(
        `Failed to create review: ${errorMessage}`,
      );
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    gigId?: string,
    buyerId?: string,
  ): Promise<
    ApiResponse<{
      items: Review[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>
  > {
    try {
      const normalizedPage = Math.max(1, Math.floor(Number(page)) || 1);
      const normalizedLimit = Math.min(
        100,
        Math.max(1, Math.floor(Number(limit)) || 10),
      );

      const skip = (normalizedPage - 1) * normalizedLimit;

      const queryBuilder = this.reviewRepository
        .createQueryBuilder('review')
        .leftJoin('review.gig', 'gig')
        .leftJoin('review.buyer', 'buyer')
        .addSelect(['gig.id', 'gig.title'])
        .addSelect(['buyer.id', 'buyer.name'])
        .orderBy('review.createdAt', 'DESC')
        .skip(skip)
        .take(normalizedLimit);

      if (gigId) {
        queryBuilder.andWhere('review.gigId = :gigId', { gigId });
      }

      if (buyerId) {
        queryBuilder.andWhere('review.buyerId = :buyerId', { buyerId });
      }

      const [reviews, total] = await queryBuilder.getManyAndCount();

      const totalPages = Math.ceil((total || 0) / normalizedLimit);

      const payload = {
        items: reviews || [],
        total: total || 0,
        page: normalizedPage,
        limit: normalizedLimit,
        totalPages: totalPages || 1,
      };

      return ApiResponse.success(payload, 'Reviews retrieved successfully');
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      const errorStack = this.getErrorStack(error);
      this.logger.error(
        `Failed to retrieve reviews: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve reviews: ${errorMessage}`,
      );
    }
  }

  async findOne(id: string): Promise<ApiResponse<Review>> {
    try {
      const review = await this.reviewRepository.findOne({
        where: { id },
        relations: ['gig', 'buyer'],
        select: {
          gig: {
            id: true,
            title: true,
          },
          buyer: {
            id: true,
            name: true,
          },
        },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      return ApiResponse.success(review, 'Review retrieved successfully');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(
        `Failed to retrieve review: ${errorMessage}`,
        this.getErrorStack(error),
      );
      throw new InternalServerErrorException('Failed to retrieve review');
    }
  }

  async update(
    id: string,
    updateReviewDto: UpdateReviewDto,
    userId?: string,
    imageFile?: Express.Multer.File,
    videoFile?: Express.Multer.File,
  ): Promise<ApiResponse<Review>> {
    try {
      const review = await this.reviewRepository.findOne({
        where: { id },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      if (userId && review.buyerId !== userId) {
        throw new BadRequestException('You can only update your own reviews');
      }

      if (updateReviewDto.rating !== undefined) {
        review.rating = updateReviewDto.rating;
      }
      if (updateReviewDto.reviews !== undefined) {
        review.reviews = updateReviewDto.reviews;
      }

      if (imageFile) {
        if (review.image) {
          try {
            const publicId = this.cloudinaryService.extractPublicId(
              review.image,
            );
            if (publicId) {
              await this.cloudinaryService.deleteImage(publicId);
            }
          } catch (error) {
            this.logger.warn(
              `Failed to delete old image from Cloudinary: ${this.getErrorMessage(error)}`,
            );
          }
        }

        try {
          const uploadResult =
            await this.cloudinaryService.uploadImage(imageFile);
          if ('secure_url' in uploadResult) {
            review.image = (uploadResult as UploadApiResponse).secure_url;
          }
        } catch (error) {
          this.logger.error(
            `Failed to upload new image: ${this.getErrorMessage(error)}`,
          );
        }
      }

      if (videoFile) {
        if (review.video) {
          try {
            const publicId = this.cloudinaryService.extractPublicId(
              review.video,
            );
            if (publicId) {
              await this.cloudinaryService.deleteImage(publicId);
            }
          } catch (error) {
            this.logger.warn(
              `Failed to delete old video from Cloudinary: ${this.getErrorMessage(error)}`,
            );
          }
        }

        try {
          const uploadResult =
            await this.cloudinaryService.uploadImage(videoFile);
          if ('secure_url' in uploadResult) {
            review.video = (uploadResult as UploadApiResponse).secure_url;
          }
        } catch (error) {
          this.logger.error(
            `Failed to upload new video: ${this.getErrorMessage(error)}`,
          );
        }
      }

      const updatedReview = await this.reviewRepository.save(review);

      this.logger.log(`Review updated successfully: ${updatedReview.id}`);

      return ApiResponse.success(updatedReview, 'Review updated successfully');
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(
        `Failed to update review: ${errorMessage}`,
        this.getErrorStack(error),
      );
      throw new InternalServerErrorException('Failed to update review');
    }
  }

  async remove(id: string, userId?: string): Promise<ApiResponse<null>> {
    try {
      const review = await this.reviewRepository.findOne({
        where: { id },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      if (userId && review.buyerId !== userId) {
        throw new BadRequestException('You can only delete your own reviews');
      }

      if (review.image) {
        try {
          const publicId = this.cloudinaryService.extractPublicId(review.image);
          if (publicId) {
            await this.cloudinaryService.deleteImage(publicId);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to delete image from Cloudinary: ${this.getErrorMessage(error)}`,
          );
        }
      }

      if (review.video) {
        try {
          const publicId = this.cloudinaryService.extractPublicId(review.video);
          if (publicId) {
            await this.cloudinaryService.deleteImage(publicId);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to delete video from Cloudinary: ${this.getErrorMessage(error)}`,
          );
        }
      }

      await this.reviewRepository.remove(review);

      this.logger.log(`Review deleted successfully: ${id}`);

      return ApiResponse.success(null, 'Review deleted successfully');
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(
        `Failed to delete review: ${errorMessage}`,
        this.getErrorStack(error),
      );
      throw new InternalServerErrorException('Failed to delete review');
    }
  }
}
