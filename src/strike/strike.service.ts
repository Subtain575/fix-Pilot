import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateStrikeDto } from './dto/create-strike.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Strike } from './entities/strike.entity';
import { Repository } from 'typeorm';
import { Seller } from '../seller/entities/seller.entity';
import { StrikeQueryDto } from './dto/strike-query.dto';
import { User } from '../users/auth/entity/users.entity';
import { NotificationService } from '../notification/notification.service';
import { CreateNotificationDto } from '../notification/dto/create-notification.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateAuditLogDto } from '../audit-log/dto/create-audit-log.dto';

@Injectable()
export class StrikeService {
  constructor(
    @InjectRepository(Strike)
    private readonly StrikeRepository: Repository<Strike>,
    @InjectRepository(Seller)
    private readonly SellerRepository: Repository<Seller>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private readonly notificationService: NotificationService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async addStrike(dto: CreateStrikeDto, senderId: string) {
    const seller = await this.SellerRepository.findOne({
      where: { id: dto.sellerId },
      relations: ['user'],
    });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const strikes = await this.StrikeRepository.find({
      where: { seller: { id: dto.sellerId } },
    });

    let totalPoints = 0;
    strikes.forEach((item) => {
      totalPoints = totalPoints + item.points;
    });
    if (totalPoints + dto.points > 10) {
      throw new BadRequestException('Total point cannot be exceed to 10');
    }
    const strike = this.StrikeRepository.create({
      seller,
      type: dto.type,
      reason: dto.reason,
      points: dto.points,
    });

    const strikeResult = await this.StrikeRepository.save(strike);

    try {
      const sender = await this.usersRepo.findOne({
        where: { id: senderId },
      });

      const receiver = await this.usersRepo.findOne({
        where: { id: seller.user.id },
      });

      if (sender && receiver) {
        const notificationPayload: CreateNotificationDto = {
          receiver,
          sender,
          title: 'Strike Notification',
          message: `Your account has received a strike. Please review the violation details and take action accordingly.`,
        };
        await this.notificationService.create(notificationPayload);

        // Create audit log
        const auditLogPayload: CreateAuditLogDto = {
          admin: sender,
          actionTo: receiver,
          title: 'Strike added',
          description: 'Admin add strike against seller.',
        };
        await this.auditLogService.create(auditLogPayload);
      }
    } catch (error) {
      console.error('Failed to send strike notification:', error);
    }

    return strikeResult;
  }

  async removeStrike(id: string, userId: string) {
    const strike = await this.StrikeRepository.findOne({
      where: { id },
      relations: ['seller'],
    });
    if (!strike) {
      throw new NotFoundException('Strike not found');
    }

    await this.StrikeRepository.remove(strike);

    try {
      const sender = await this.usersRepo.findOne({ where: { id: userId } });
      const receiver = await this.usersRepo.findOne({
        where: { id: strike.seller.user as unknown as string },
      });

      if (sender && receiver) {
        const notificationPayload: CreateNotificationDto = {
          receiver,
          sender,
          title: 'Strike Notification',
          message: `Strike is removed form your account.`,
        };
        await this.notificationService.create(notificationPayload);

        // Create audit log
        const auditLogPayload: CreateAuditLogDto = {
          admin: sender,
          actionTo: receiver,
          title: 'Strike added',
          description: 'Admin add strike against seller.',
        };
        await this.auditLogService.create(auditLogPayload);
      }
    } catch (error) {
      console.error('Failed to send strike removal notification:', error);
    }

    return 'Strike removed successfully';
  }

  async findAll(dto: StrikeQueryDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 5;
    const skip = (page - 1) * limit;

    const [sellers, total] = await this.SellerRepository.findAndCount({
      relations: ['strikes', 'user'],
      skip,
      take: limit,
    });

    const updatedSellers = sellers.map((seller) => {
      // --- Total Strike Points ---
      const totalStrikePoints =
        seller.strikes?.reduce(
          (sum, strike) => sum + (strike.points || 0),
          0,
        ) ?? 0;

      // --- Status Logic ---
      let status = 'Active';

      if (totalStrikePoints >= 7) {
        status = 'Paused';
      } else if (totalStrikePoints >= 4) {
        status = 'Warning';
      } else if (totalStrikePoints >= 2) {
        status = 'Active';
      }

      return {
        ...seller,
        totalStrikePoints,
        status,
      };
    });

    return {
      success: true,
      message: 'Strikes fetched successfully',
      data: updatedSellers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
