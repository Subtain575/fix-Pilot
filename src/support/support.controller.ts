import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/users/auth/guard/jwt/jwt-auth.guard';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('request')
  @ApiOperation({ summary: 'Submit a support request' })
  @SwaggerResponse({
    status: 201,
    description: 'Support request submitted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string', nullable: true },
            message: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @SwaggerResponse({ status: 400, description: 'Bad request' })
  @SwaggerResponse({ status: 500, description: 'Internal server error' })
  async create(@Body() createSupportRequestDto: CreateSupportRequestDto) {
    return this.supportService.create(createSupportRequestDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all support requests (Admin only)' })
  @SwaggerResponse({
    status: 200,
    description: 'Support requests retrieved successfully',
  })
  @SwaggerResponse({ status: 500, description: 'Internal server error' })
  async findAll() {
    return this.supportService.findAll();
  }
}
