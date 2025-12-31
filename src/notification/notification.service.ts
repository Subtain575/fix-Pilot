import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { receiverNotificationQueryDto } from './dto/receiver-query,dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { User } from '../users/auth/entity/users.entity';
import { UserRole } from '../users/auth/enums/enum';
import { NotificationTargetEnum } from './Enum/notification-enum';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(payload: CreateNotificationDto) {
    return await this.notificationRepo.save(payload);
  }

  async findAll(query: NotificationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.notificationRepo.findAndCount({
      relations: ['receiver', 'sender'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async findReceivedNotifications(
    query: receiverNotificationQueryDto,
    receivedId: string,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.notificationRepo.findAndCount({
      where: { receiver: { id: receivedId } },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async sendNotification(dto: SendNotificationDto, sender: { userId: string }) {
    try {
      // 1️⃣ Get Sender User (Admin)
      const senderUser = await this.usersRepo.findOne({
        where: { id: sender.userId },
      });

      if (!senderUser) throw new NotFoundException('Sender (admin) not found');

      let targetUsers: User[] = [];

      // 2️⃣ Individual notification (email required)
      if (dto.type === NotificationTargetEnum.INDIVIDUAL) {
        if (!dto.email) {
          throw new BadRequestException(
            'Email is required for individual notification',
          );
        }

        targetUsers = await this.usersRepo
          .createQueryBuilder('user')
          .where('LOWER(user.email) = LOWER(:email)', {
            email: dto.email.trim(),
          })
          .getMany();
      } else if (
        dto.type &&
        [
          NotificationTargetEnum.SELLER,
          NotificationTargetEnum.BUYER,
          NotificationTargetEnum.BOTH,
        ].includes(dto.type)
      ) {
        let roles: UserRole[] = [];

        switch (dto.type) {
          case NotificationTargetEnum.SELLER:
            roles = [UserRole.SELLER];
            break;
          case NotificationTargetEnum.BUYER:
            roles = [UserRole.BUYER];
            break;
          case NotificationTargetEnum.BOTH:
            roles = [UserRole.SELLER, UserRole.BUYER];
            break;
        }

        const query = this.usersRepo.createQueryBuilder('user');

        if (roles.length > 0) {
          query.where('user.role IN (:...roles)', { roles });
        }

        targetUsers = await query.getMany();
      }

      if (!targetUsers || targetUsers.length === 0) {
        return {
          success: false,
          count: 0,
          message: 'user not found',
          notifications: [],
        };
      }

      // 4️⃣ Map notifications & add individual status
      const notifications = targetUsers.map((user) => ({
        receiver: user,
        sender: senderUser,
        title: dto.title,
        message: dto.message,
        link: dto.email ?? undefined,
        status:
          dto.type === NotificationTargetEnum.INDIVIDUAL
            ? 'individual'
            : 'general',
        isRead: false,
      }));

      // 5️⃣ Save notifications
      const saved = await this.notificationRepo.save(notifications);

      return {
        success: true,
        count: saved.length,
        notifications: saved,
        message: 'Notifications successfully sent',
      };
    } catch (error) {
      console.error('Notification failed:', error);
      throw new BadRequestException('Notification failed');
    }
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
      relations: ['receiver'],
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.receiver && notification.receiver.id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (notification.isRead) {
      return { success: true, message: 'Already marked as read' };
    }

    notification.isRead = true;
    await this.notificationRepo.save(notification);

    return { success: true, message: 'Notification marked as read' };
  }
}
