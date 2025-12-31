import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../users/auth/guard/jwt/jwt-auth.guard';
import { updateUserStatusDto } from '../users/auth/dto/update-status.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@ApiTags('Customer')
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('stats')
  @ApiOperation({ summary: 'Get customer statistics' })
  @SwaggerResponse({
    status: 200,
    description: 'Customer stats retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalBookings: { type: 'number', example: 24 },
            activeBookings: { type: 'number', example: 3 },
            totalSpent: { type: 'number', example: 45000 },
            favoriteServices: { type: 'number', example: 8 },
            reviewsGiven: { type: 'number', example: 12 },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async getStats(@Req() req: AuthenticatedRequest) {
    const userId: string = req.user.id;
    return this.customerService.getStats(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update customer status' })
  @SwaggerResponse({ status: 200, description: 'Status updated successfully' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: updateUserStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId: string = req.user.id;
    return this.customerService.updateStatus(id, dto.status, userId);
  }
}
