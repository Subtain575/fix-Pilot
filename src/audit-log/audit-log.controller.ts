import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../users/auth/guard/jwt/jwt-auth.guard';
import { RolesGuard } from '../users/auth/guard/role/roles.guard';
import { Roles } from '../users/auth/guard/role/roles.decorator';
import { UserRole } from '../users/auth/enums/enum';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetAuditLogDto } from './dto/audit-log.dto';

@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('/')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all audit logs' })
  @ApiResponse({
    status: 200,
    description: 'Audit log retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAll(@Query() dto: GetAuditLogDto) {
    return this.auditLogService.getAll(dto);
  }

  @Get(':adminId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get audit logs by admin' })
  @ApiResponse({
    status: 200,
    description: 'Audit log retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAllByAdmin(@Param('adminId') adminId: string) {
    return this.auditLogService.getAllByAdmin(adminId);
  }
}
