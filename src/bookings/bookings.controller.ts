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
  UseInterceptors,
  UploadedFiles,
  Request,
} from '@nestjs/common';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    role: string;
  };
}
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import {
  FilesInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { JwtAuthGuard } from '../users/auth/guard/jwt/jwt-auth.guard';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingStatus } from './entities/booking.entity';
import { JobCompleteDto } from './dto/job-complete.dto';
import { GetAvailableHoursDto } from './dto/get-available-hours.dto';
import { BookingArriveDto } from './dto/booking-arrive.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('photos', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new booking with optional photos' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(
    @Body() createBookingDto: CreateBookingDto,
    @UploadedFiles() photos?: Express.Multer.File[],
  ) {
    return this.bookingsService.create(createBookingDto, photos);
  }

  @Get('available-hours')
  @ApiOperation({
    summary: 'Get available hours for a gig on a specific date',
  })
  @ApiQuery({
    name: 'gigId',
    required: true,
    description: 'Gig ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date to check availability (YYYY-MM-DD format)',
    example: '2024-01-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Available hours retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  getAvailableHours(
    @Query('gigId') gigId: string,
    @Query('date') date: string,
  ) {
    const dto: GetAvailableHoursDto = { gigId, date };
    return this.bookingsService.getAvailableHours(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bookings with optional filters' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
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
    name: 'status',
    required: false,
    description: 'Filter by booking status',
    enum: BookingStatus,
    example: BookingStatus.PENDING,
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: BookingStatus,
    @Query('userId') userId?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));

    return this.bookingsService.findAll(pageNum, limitNum, status, userId);
  }

  @Get('seller')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get bookings for logged-in seller (their gigs)' })
  @ApiResponse({
    status: 200,
    description: 'Seller bookings retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
    name: 'status',
    required: false,
    description: 'Filter by booking status',
    enum: BookingStatus,
    example: BookingStatus.PENDING,
  })
  getBookingsBySeller(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: BookingStatus,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
    const userId = (req.user as any).id || req.user.userId;

    return this.bookingsService.getBookingsBySeller(
      userId,
      pageNum,
      limitNum,
      status,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    type: 'string',
  })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a booking (Booking creator only)' })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    type: 'string',
  })
  @ApiResponse({ status: 200, description: 'Booking updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Only booking creator can update booking',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.bookingsService.update(id, updateBookingDto, req.user.userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update booking status (Gig owner only)' })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking status updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Only gig owner can update booking status',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateBookingStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = (req.user as any).id || req.user.userId;
    return this.bookingsService.updateStatus(id, updateStatusDto, userId);
  }

  @Post('arrive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark arrival by sending buyer coordinates (Seller only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Arrival coordinates stored successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Coordinates mismatch or seller not authorized',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  arrive(@Body() dto: BookingArriveDto, @Request() req: AuthenticatedRequest) {
    const userId = (req.user as any).id || req.user.userId;
    return this.bookingsService.arrive(dto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a booking (Admin or booking owner)' })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    type: 'string',
  })
  @ApiResponse({ status: 200, description: 'Booking deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'You can only delete your own bookings',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.bookingsService.remove(id, req.user.userId, req.user.role);
  }

  @Post(':id/job-complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'pickupImages', maxCount: 10 },
      { name: 'deliveryImages', maxCount: 10 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Job complete/start: optional fields + images[]' })
  @ApiParam({ name: 'id', description: 'Booking ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Job info updated successfully' })
  updateJob(
    @Param('id') id: string,
    @Body() dto: JobCompleteDto,
    @UploadedFiles()
    files: {
      pickupImages?: Express.Multer.File[];
      deliveryImages?: Express.Multer.File[];
    },
    @Request() req: AuthenticatedRequest,
  ) {
    const pickupImages = files?.pickupImages || [];
    const deliveryImages = files?.deliveryImages || [];
    const userId = (req.user as any).id || req.user.userId;
    return this.bookingsService.jobComplete(
      id,
      dto,
      pickupImages,
      deliveryImages,
      userId,
    );
  }
}
