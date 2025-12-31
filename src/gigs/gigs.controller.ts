import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { GigsService } from './gigs.service';
import { CreateGigDto } from './dto/create-gig.dto';
import { UpdateGigDto } from './dto/update-gig.dto';
import { JwtAuthGuard } from '../users/auth/guard/jwt/jwt-auth.guard';
import { RolesGuard } from '../users/auth/guard/role/roles.guard';
import { Roles } from '../users/auth/guard/role/roles.decorator';
import { UserRole } from '../users/auth/enums/enum';
import { GigStatus } from './entities/gig.entity';

type SortBy = {
  priceFrom: 'ASC' | 'DESC';
};

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

@ApiTags('Gigs')
@Controller('gigs')
export class GigsController {
  constructor(private readonly gigsService: GigsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @UseInterceptors(FilesInterceptor('photos', 10))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new gig (Seller only)' })
  @ApiBody({ type: CreateGigDto })
  @ApiResponse({ status: 201, description: 'Gig created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Seller role required' })
  create(
    @Body() createGigDto: CreateGigDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: AuthenticatedRequest,
  ) {
    return this.gigsService.create(createGigDto, req.user.id, files);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all active gigs with optional category filter',
  })
  @ApiResponse({ status: 200, description: 'Gigs retrieved successfully' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 50)',
    example: 10,
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort option as JSON string',
    example: '{"priceFrom": "ASC"}',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term to filter gigs by title and description',
  })
  @ApiQuery({
    name: 'availabilityFilter',
    required: false,
    description: 'Filter by availability time',
    enum: [
      'all',
      'available_now',
      'arrive_1_hour',
      'arrive_2_hours',
      'arrive_3_hours',
      'arrive_4_hours',
    ],
    example: 'available_now',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID to check favourite status',
  })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('search') search?: string,
    @Query('availabilityFilter') availabilityFilter?: string,
    @Query('userId') userId?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));

    let parsedSortBy: SortBy | undefined;
    if (sortBy) {
      try {
        parsedSortBy = JSON.parse(sortBy) as SortBy;
      } catch {
        parsedSortBy = undefined;
      }
    }

    return this.gigsService.findAll(
      pageNum,
      limitNum,
      categoryId,
      parsedSortBy,
      search,
      availabilityFilter,
      userId,
    );
  }

  @Get('my-gigs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get seller's own gigs" })
  @ApiResponse({
    status: 200,
    description: 'Seller gigs retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findMyGigs(@Request() req: AuthenticatedRequest) {
    return this.gigsService.findMyGigs(req.user.id);
  }

  @Get('favorite-sellers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get favorite sellers (sellers whose gigs are favorited by buyer)',
  })
  @ApiResponse({
    status: 200,
    description: 'Favorite sellers retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getFavoriteSellers(@Request() req: AuthenticatedRequest) {
    return this.gigsService.getFavoriteSellers(req.user.id);
  }

  @Get('services/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get service details with bookings and revenue stats by gig ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Gig ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Service retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Gig not found' })
  getServiceById(@Param('id') id: string) {
    return this.gigsService.getServiceById(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific gig by ID' })
  @ApiResponse({ status: 200, description: 'Gig retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Gig not found' })
  findOne(@Param('id') id: string) {
    return this.gigsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @UseInterceptors(FilesInterceptor('photos', 10))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a gig (Seller only)' })
  @ApiBody({ type: UpdateGigDto })
  @ApiResponse({ status: 200, description: 'Gig updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Gig not found' })
  update(
    @Param('id') id: string,
    @Body() updateGigDto: UpdateGigDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: AuthenticatedRequest,
  ) {
    return this.gigsService.update(id, updateGigDto, req.user.id, files);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a gig (Seller only)' })
  @ApiResponse({ status: 200, description: 'Gig deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Gig not found' })
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.gigsService.remove(id, req.user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update gig status (Seller only)' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Gig not found' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: GigStatus,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.gigsService.updateStatus(id, status, req.user.id);
  }

  @Post(':id/favourite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add gig to favourites' })
  @ApiResponse({
    status: 201,
    description: 'Gig added to favourites successfully',
  })
  @ApiResponse({ status: 400, description: 'Gig already in favourites' })
  @ApiResponse({ status: 404, description: 'Gig not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addToFavourites(
    @Param('id') gigId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.gigsService.addToFavourites(gigId, req.user.id, req.user.role);
  }

  @Delete(':id/favourite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove gig from favourites' })
  @ApiResponse({
    status: 200,
    description: 'Gig removed from favourites successfully',
  })
  @ApiResponse({ status: 404, description: 'Gig not in favourites' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  removeFromFavourites(
    @Param('id') gigId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.gigsService.removeFromFavourites(gigId, req.user.id);
  }
}
