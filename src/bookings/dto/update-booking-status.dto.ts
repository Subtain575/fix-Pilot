import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BookingStatus } from '../entities/booking.entity';

export class UpdateBookingStatusDto {
  @ApiProperty({
    description: 'Booking status',
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  @IsNotEmpty()
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @ApiProperty({
    description: 'End time (required when status is CONFIRMED)',
    example: '12:00 PM',
    required: false,
  })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({
    description:
      'Work note describing what will be done in this time (required when status is CONFIRMED)',
    example: 'AC repair and maintenance, cleaning filters',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  workNote?: string;
}
