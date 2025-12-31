import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/auth/entity/users.entity';
import { UserRole } from 'src/users/auth/enums/enum';
import { UserStatus } from 'src/users/auth/enums/status-enum';
import { Booking } from 'src/bookings/entities/booking.entity';
import { GigFavourite } from 'src/gigs/entities/gig-favourite.entity';
import { Review } from 'src/reviews/entities/review.entity';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(GigFavourite)
    private readonly gigFavouriteRepository: Repository<GigFavourite>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async updateStatus(id: string, status: UserStatus, userId: string) {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
      });
      if (!user) throw new NotFoundException('User not found');

      if (user.role !== UserRole.BUYER) {
        throw new ForbiddenException('Only customers can update their status');
      }

      const customer = await this.usersRepository.findOne({ where: { id } });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
      customer.status = status;
      await this.usersRepository.save(customer);

      return {
        message: 'Customer status updated successfully',
        customer,
      };
    } catch {
      throw new InternalServerErrorException('Failed to update status');
    }
  }

  async getStats(userId: string) {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
      });
      if (!user) throw new NotFoundException('User not found');

      if (user.role !== UserRole.BUYER) {
        throw new ForbiddenException('Only buyers can view their stats');
      }

      const totalBookings = await this.bookingRepository.count({
        where: { userId },
      });

      const activeBookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.userId = :userId', { userId })
        .andWhere(
          '(booking.completeJob = false OR booking.completeJob IS NULL)',
        )
        .getCount();

      const totalSpentResult = (await this.bookingRepository
        .createQueryBuilder('booking')
        .select('COALESCE(SUM(booking.estimatedBudget), 0)', 'total')
        .where('booking.userId = :userId', { userId })
        .andWhere('booking.completeJob = true')
        .getRawOne()) as unknown as
        | { total: string | number | null }
        | undefined;

      const totalValue: string | number | null =
        totalSpentResult?.total !== null &&
        totalSpentResult?.total !== undefined
          ? totalSpentResult.total
          : '0';

      const totalSpent = parseFloat(String(totalValue));

      const favoriteServices = await this.gigFavouriteRepository.count({
        where: { userId },
      });

      const reviewsGiven = await this.reviewRepository.count({
        where: { buyerId: userId },
      });

      return {
        success: true,
        data: {
          totalBookings,
          activeBookings,
          totalSpent: parseFloat(totalSpent.toFixed(2)),
          favoriteServices,
          reviewsGiven,
        },
        message: 'Customer stats retrieved successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to retrieve customer stats',
      );
    }
  }
}
