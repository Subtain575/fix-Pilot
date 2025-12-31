import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  UseInterceptors,
  UploadedFiles,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../users/auth/guard/jwt/jwt-auth.guard';
import { RolesGuard } from '../users/auth/guard/role/roles.guard';
import { Roles } from '../users/auth/guard/role/roles.decorator';
import { UserRole } from '../users/auth/enums/enum';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new review with image/video (Buyers only)',
  })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only buyers can create reviews',
  })
  @ApiResponse({
    status: 409,
    description: 'Review already exists for this gig',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createReviewDto: CreateReviewDto,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.create(
      createReviewDto,
      req.user.id,
      files?.image?.[0],
      files?.video?.[0],
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews with optional filters' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'gigId',
    required: false,
    description: 'Filter by gig ID',
  })
  @ApiQuery({
    name: 'buyerId',
    required: false,
    description: 'Filter by buyer ID',
  })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('gigId') gigId?: string,
    @Query('buyerId') buyerId?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));

    return this.reviewsService.findAll(pageNum, limitNum, gigId, buyerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a review by ID' })
  @ApiParam({ name: 'id', description: 'Review ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Review retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update a review with image/video (Buyers only, owner only)',
  })
  @ApiParam({ name: 'id', description: 'Review ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Invalid UUID format or bad request - Can only update your own reviews',
  })
  @ApiResponse({ status: 404, description: 'Review not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only buyers can update reviews',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.update(
      id,
      updateReviewDto,
      req.user.id,
      files?.image?.[0],
      files?.video?.[0],
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review (Buyers only, owner only)' })
  @ApiParam({ name: 'id', description: 'Review ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Invalid UUID format or bad request - Can only delete your own reviews',
  })
  @ApiResponse({ status: 404, description: 'Review not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only buyers can delete reviews',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.remove(id, req.user.id);
  }
}
