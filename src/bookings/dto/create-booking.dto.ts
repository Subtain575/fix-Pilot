import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  IsEmail,
} from 'class-validator';
import { UrgencyLevel } from '../entities/booking.entity';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Gig ID',
  })
  @IsNotEmpty()
  @IsString()
  gigId: string;

  @ApiProperty({
    description: 'User ID',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Booking date',
    example: '2024-01-15',
  })
  @IsNotEmpty()
  @IsDateString()
  bookingDate: string;

  @ApiProperty({
    description: 'Start time',
    example: '10:00 AM',
  })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({
    description: 'Service address',
    example: '123 Main Street, Block A',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  serviceAddress: string;

  @ApiProperty({
    description: 'City',
    example: 'Karachi',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({
    description: 'Country',
    example: 'Pakistan',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiProperty({
    description: 'Address name',
    example: 'Home',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressName?: string;

  @ApiProperty({
    description: 'Postal code',
    example: '75500',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiProperty({
    description: 'Full name of the customer',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+92-300-1234567',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phoneNumber: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(100)
  emailAddress: string;

  @ApiProperty({
    description: 'Problem description',
    example: 'AC is not cooling properly, making strange noise',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  describeProblem: string;

  @ApiProperty({
    description: 'Urgency level',
    enum: UrgencyLevel,
    example: UrgencyLevel.MEDIUM,
  })
  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgencyLevel?: UrgencyLevel;

  @ApiProperty({
    description: 'Upload photos (files)',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    required: false,
  })
  @IsOptional()
  photos?: any[];

  @ApiProperty({
    description: 'Estimated budget in PKR',
    example: 5000,
  })
  @IsOptional()
  @IsString()
  estimatedBudget?: string;

  @ApiProperty({
    description: 'Latitude',
    example: 24.8607,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @ApiProperty({
    description: 'Longitude',
    example: 67.0011,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  longitude?: number;
}
