import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  Post,
  Body,
  Patch,
  Param,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../users/auth/guard/jwt/jwt-auth.guard';
import { receiverNotificationQueryDto } from './dto/receiver-query,dto';
import { User } from '../users/auth/entity/users.entity';
import { RolesGuard } from '../users/auth/guard/role/roles.guard';
import { UserRole } from '../users/auth/enums/enum';
import { SendNotificationDto } from './dto/send-notification.dto';
import { Roles } from '../users/auth/guard/role/roles.decorator';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('allNotification')
  @ApiOperation({ summary: 'Get all notification requests' })
  @SwaggerResponse({
    status: 201,
    description: 'get all notification request',
  })
  findAll(@Query() query: NotificationQueryDto) {
    return this.notificationService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('receiver')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all  received notification requests' })
  @SwaggerResponse({
    status: 201,
    description: 'get all received notification request',
  })
  getAll(
    @Query() query: receiverNotificationQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const receivedId = req.user.id;
    return this.notificationService.findReceivedNotifications(
      query,
      receivedId,
    );
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('send-notification')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @SwaggerResponse({
    status: 201,
    description: 'send notification request',
  })
  send(@Body() dto: SendNotificationDto, @Req() req: AuthenticatedRequest) {
    return this.notificationService.sendNotification(dto, {
      userId: req.user.id,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  @ApiBearerAuth()
  markAsRead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.notificationService.markAsRead(req.user.id, id);
  }
}
