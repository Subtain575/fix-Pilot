import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Category } from '../categories/entities/category.entity';
import { Gig } from '../gigs/entities/gig.entity';
import { Seller } from '../seller/entities/seller.entity';
import { SellerVerificationStatus } from '../seller/Enum/seller-verification-enum';
import { Strike } from '../strike/entities/strike.entity';
import { User } from '../users/auth/entity/users.entity';
import { UserRole } from '../users/auth/enums/enum';
import { UserStatus } from '../users/auth/enums/status-enum';
import { Repository } from 'typeorm';

@Injectable()
export class RecentActivityService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    @InjectRepository(Gig)
    private gigsRepo: Repository<Gig>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Seller)
    private sellerRepo: Repository<Seller>,
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
  ) {}

  async getAdminActivities() {
    try {
      const completedBookings = await this.bookingRepo.find({
        where: { status: BookingStatus.COMPLETED },
        relations: ['user'],
        select: ['id', 'user', 'updatedAt', 'status'],
      });

      const mappedCompletedBookings = completedBookings.map((c) => ({
        type: 'BOOKING_COMPLETED',
        message: `Booking for ${c.user?.name || 'customer'} completed`,
        date: c.updatedAt,
      }));

      const pausedSellers = await this.userRepo.find({
        where: { status: UserStatus.INACTIVE },
        select: ['id', 'name', 'updatedAt', 'status'],
      });

      const mappedPausedSellers = pausedSellers.map((c) => ({
        type: 'SELLER_PAUSED',
        message: `Seller ${c.name} paused`,
        date: c.updatedAt,
      }));

      const unpausedSellers = await this.userRepo.find({
        where: { status: UserStatus.ACTIVE },
        select: ['id', 'name', 'updatedAt', 'status'],
      });

      const mappedUnpausedSellers = unpausedSellers.map((c) => ({
        type: 'SELLER_UNPAUSED',
        message: `Seller ${c.name} unpaused`,
        date: c.updatedAt,
      }));

      const approvedSellers = await this.sellerRepo.find({
        where: { verificationSeller: SellerVerificationStatus.APPROVED },
        relations: ['user'],
        select: ['id', 'user', 'updatedAt'],
      });

      const mappedApprovedSellers = approvedSellers.map((c) => ({
        type: 'SELLER_APPROVED',
        message: `Seller ${c.user.name} approved`,
        date: c.updatedAt,
      }));

      const categories = await this.categoryRepo.find({
        select: ['id', 'name', 'createdAt'],
      });

      const categoriesMapped = categories.map((c) => ({
        type: 'CATEGORY_ADDED',
        message: `Category '${c.name}' added`,
        date: c.createdAt,
      }));

      const activities = [
        ...mappedCompletedBookings,
        ...mappedPausedSellers,
        ...mappedUnpausedSellers,
        ...mappedApprovedSellers,
        ...categoriesMapped,
      ];

      activities.sort((a, b) => b.date.getTime() - a.date.getTime());

      return activities;
    } catch {
      throw new NotFoundException('Get Recent Activity Filed');
    }
  }

  async getSellerActivities(userId: string) {
    try {
      const completed = await this.bookingRepo.find({
        where: { id: userId, status: BookingStatus.COMPLETED },
        relations: ['user'],
        select: ['id', 'user', 'updatedAt', 'status'],
      });

      const completedMapped = completed.map((c) => ({
        type: 'SERVICE_COMPLETED',
        message: `Completed — service for ${c.user?.name || 'customer'}`,
        date: c.updatedAt,
      }));

      const gigs = await this.gigsRepo.find({
        where: { sellerId: userId },
        select: ['id', 'updatedAt'],
      });

      const serviceUpdatesMapped = gigs.map((s) => ({
        type: 'SERVICE_UPDATED',
        message: `Updated service availability`,
        date: s.updatedAt,
      }));

      const activities = [...completedMapped, ...serviceUpdatesMapped];

      activities.sort((a, b) => b.date.getTime() - a.date.getTime());

      return activities;
    } catch {
      throw new NotFoundException('Get Recent Activity Filed');
    }
  }

  async getBuyerActivities(buyerId: string) {
    const bookings = await this.bookingRepo.find({
      where: { userId: buyerId },
      select: ['id', 'status', 'updatedAt', 'createdAt'],
    });

    const bookingMapped = bookings.map((b) => {
      let message = '';
      if (b.status === BookingStatus.CONFIRMED) {
        message = 'Booking confirmed';
      } else if (b.status === BookingStatus.REJECT) {
        message = 'Booking cancelled';
      } else if (b.status === BookingStatus.COMPLETED) {
        message = 'Service completed';
      }
      return { type: 'BOOKING', message, date: b.updatedAt };
    });

    const activities = [...bookingMapped];
    activities.sort((a, b) => b.date.getTime() - a.date.getTime());

    return activities;
  }

  async getUserActivity(userId: string) {
    const user = await this.userRepo.findOneBy({
      id: userId,
    });
    if (!user) throw new BadRequestException('User Not Found!');
    const { id, name, role } = user;

    if (user.role === UserRole.BUYER) {
      const activities = await this.getBuyerActivities(userId);
      return { id, name, role, activities };
    } else if (user.role === UserRole.SELLER) {
      const activities = await this.getSellerActivities(userId);
      return { id, name, role, activities };
    } else if (user.role === UserRole.ADMIN) {
      const activities = await this.getAdminActivities();
      return { id, name, role, activities };
    } else {
      throw new BadRequestException('Invalid User!');
    }
  }
}
