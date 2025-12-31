import {
  Controller,
  Body,
  Patch,
  Param,
  UseGuards,
  Get,
  Query,
  Req,
  Request,
  Post,
} from '@nestjs/common';
import { SellerService } from './seller.service';
import { JwtAuthGuard } from '../users/auth/guard/jwt/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { SellerVerificationDto } from './dto/seller-verification-dto';
import { Roles } from '../users/auth/guard/role/roles.decorator';
import { UserRole } from '../users/auth/enums/enum';
import { SellerVerificationQueryDto } from './dto/seller-verification-query-dto';
import { sellerCoachingDto } from './dto/seller-coaching.dto';
import { RolesGuard } from '../users/auth/guard/role/roles.guard';
import { CreateFollowUpDto } from './dto/seller-followUp.dto';
import { User } from '../users/auth/entity/users.entity';

interface AuthenticatedRequest extends Request {
  user: {
    userId?: string;
    id: string;
    email: string;
    role: string;
  };
}

@ApiTags('Seller')
@Controller('seller')
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update verification seller status' })
  @SwaggerResponse({ status: 200, description: 'Status updated successfully' })
  async updateVerificationStatus(
    @Param('id') id: string,
    @Body() dto: SellerVerificationDto,
    @Req() req: Request & { user: User },
  ) {
    const userId = req.user.id;
    return this.sellerService.verificationStatusUpdate(id, dto, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('coach/:id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a coach message for a seller' })
  @SwaggerResponse({
    status: 201,
    description: 'Coaching Note created successfully.',
  })
  UpdateCoaching(
    @Req() req: Request & { user: User },
    @Param('id') id: string,
    @Body() dto: sellerCoachingDto,
  ) {
    const userId = req.user.id;
    return this.sellerService.updateCoachingNote(id, dto, userId);
  }

  @Get('verification')
  @ApiOperation({ summary: 'Get all seller verification requests' })
  @ApiOperation({ summary: 'get all seller verification for a seller' })
  @SwaggerResponse({
    status: 201,
    description: 'get all seller verification successfully.',
  })
  async getAllVerification(@Query() query: SellerVerificationQueryDto) {
    return this.sellerService.getAllSellerVerification(query);
  }

  @Get('seller-stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get seller statistics (earnings, bookings, rating, completion rate)',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Seller stats retrieved successfully',
  })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async getSellerStats(@Req() req: AuthenticatedRequest) {
    const sellerId: string = (req.user as any).id || req.user.userId;
    return this.sellerService.getSellerStats(sellerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('follow-up/:id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiBody({ type: CreateFollowUpDto })
  @ApiOperation({ summary: 'send notification of a seller' })
  @SwaggerResponse({
    status: 201,
    description: ' document request send successfully',
  })
  async followUp(
    @Body() dto: CreateFollowUpDto,
    @Param('id') sellerId: string,
    @Req() req: Request & { user: User },
  ) {
    const senderId = req.user.id;
    return await this.sellerService.followUpNotification(
      dto,
      sellerId,
      senderId,
    );
  }
}
