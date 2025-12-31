import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { RecentActivityService } from './recent-activity.service';
import { JwtAuthGuard } from '../users/auth/guard/jwt/jwt-auth.guard';
import { Roles } from '../users/auth/guard/role/roles.decorator';
import { UserRole } from '../users/auth/enums/enum';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from '../users/auth/entity/users.entity';
import { RolesGuard } from '../users/auth/guard/role/roles.guard';

@Controller('recent-activity')
export class RecentActivityController {
  constructor(private readonly activityService: RecentActivityService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/user/activity-by-super-admin/:userId')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async getUserActivityBySuperAdmin(@Param('userId') userId: string) {
    return await this.activityService.getUserActivity(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('user/activity/admin')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async getAdminActivities() {
    return await this.activityService.getAdminActivities();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/user/activity-by-admin/:userId')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async getUserActivityByAdmin(@Param('userId') userId: string) {
    return await this.activityService.getUserActivity(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('user/activity/buyer')
  @Roles(UserRole.BUYER)
  @ApiBearerAuth()
  async getBuyerActivities(@Req() req: Request & { user: User }) {
    const { id, name, role } = req.user;
    const activities = await this.activityService.getBuyerActivities(id);
    return { id, name, role, activities };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('user/activity/seller')
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  async getSellerActivities(@Req() req: Request & { user: User }) {
    const { id, name, role } = req.user;
    const activities = await this.activityService.getSellerActivities(id);
    return { id, name, role, activities };
  }
}
