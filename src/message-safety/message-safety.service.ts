import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from 'src/users/auth/entity/users.entity';
import { CreateViolationDto } from './dto/create-message-safety.dto';
import { FilterViolationsDto } from './dto/message-query.dto';
import { ViolationActionDto } from './dto/action-message.dto';
import { ViolationStatus } from './Enum/violation-status-enum';
import { messageSafety } from './entities/message-safety.entity';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ViolationType } from './Enum/violation-type-enum';
import { ViolationSeverity } from './Enum/violation-severity-enum';

@Injectable()
export class MessageSafetyService {
  constructor(
    @InjectRepository(messageSafety)
    private readonly messageRepo: Repository<messageSafety>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateViolationDto) {
    try {
      const user = await this.userRepo.findOne({ where: { id: dto.userId } });
      if (!user) throw new NotFoundException('User not found');

      if (user.role !== 'buyer' && user.role !== 'seller') {
        throw new ForbiddenException(
          'Only buyer or seller can create messages',
        );
      }

      const phoneRegex = /(\+92|0)3\d{9}\b/;
      const linkRegex = /(https?:\/\/[^\s]+)/;

      const hasPhone = phoneRegex.test(dto.content);
      const hasLink = linkRegex.test(dto.content);

      let violationSeverity: ViolationSeverity;

      if (hasPhone && hasLink) {
        violationSeverity = ViolationSeverity.HIGH;
      } else if (hasPhone) {
        violationSeverity = ViolationSeverity.MEDIUM;
      } else if (hasLink) {
        violationSeverity = ViolationSeverity.LOW;
      } else {
        violationSeverity = ViolationSeverity.LOW;
      }

      const violation = this.messageRepo.create({
        content: dto.content,
        type: dto.type,
        severity: violationSeverity,
        status: ViolationStatus.PENDING,
        user: user,
      });

      return await this.messageRepo.save(violation);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Send message failed');
    }
  }

  async findAll(filter: FilterViolationsDto) {
    const query = this.messageRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.user', 'user')
      .orderBy('v.detectedAt', 'DESC');

    if (filter.status) {
      query.andWhere('v.status = :status', { status: filter.status });
    }

    if (filter.severity) {
      query.andWhere('v.severity = :severity', { severity: filter.severity });
    }

    if (filter.search) {
      query.andWhere('user.name ILIKE :s', { s: `%${filter.search}%` });
    }

    return query.getMany();
  }

  async takeAction(dto: ViolationActionDto) {
    try {
      const violation = await this.messageRepo.findOne({
        where: { id: dto.violationId },
      });

      if (!violation) throw new NotFoundException('Violation not found');

      violation.status = ViolationStatus.ACTION_TAKEN;
      violation.adminAction = dto.action;
      violation.notes = dto.notes;

      return this.messageRepo.save(violation);
    } catch (error) {
      throw new InternalServerErrorException('Action failed');
    }
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    console.log(dto);
    try {
      const violation = await this.messageRepo.findOne({ where: { id } });
      if (!violation) throw new NotFoundException('Violation not found');

      violation.status = dto.status;
      return this.messageRepo.save(violation);
    } catch (error) {
      throw new InternalServerErrorException('update status failed');
    }
  }
}
