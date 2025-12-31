import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { Repository } from 'typeorm';
import { AuthService } from '../users/auth/auth.service';
import { UserRole } from '../users/auth/enums/enum';
import { GetAuditLogDto } from './dto/audit-log.dto';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly authService: AuthService,
  ) {}

  async create(createAuditLogDto: CreateAuditLogDto) {
    return await this.auditLogRepo.save(createAuditLogDto);
  }

  async getAll(dto: GetAuditLogDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;

    const [data, total] = await this.auditLogRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllByAdmin(adminId: string) {
    const admin = await this.authService.findUserById(adminId);

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new BadRequestException('Admin not found!');
    }

    return this.auditLogRepo.find({
      where: { admin: { id: adminId } },
      relations: ['admin', 'actionTo'],
      order: { createdAt: 'DESC' },
    });
  }
}
