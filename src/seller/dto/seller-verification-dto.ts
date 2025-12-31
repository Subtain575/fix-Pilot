import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SellerVerificationStatus } from '../Enum/seller-verification-enum';

export class SellerVerificationDto {
  @ApiProperty({
    description: 'Customer status',
    enum: SellerVerificationStatus,
    example: SellerVerificationStatus.PENDING,
  })
  @IsEnum(SellerVerificationStatus, {
    message: 'Status must be one of pending, approved, or reject',
  })
  verificationSeller: SellerVerificationStatus;

  @ApiProperty({
    example: 'I want to verify my account to start selling services.',
    description: 'Reason for seller verification request',
  })
  @IsNotEmpty({ message: 'Reason is required' })
  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason: string;

  @ApiProperty({
    example: 'Documents verified successfully',
    description: 'Note from admin after reviewing verification',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Admin note must be a string' })
  @MaxLength(500, { message: 'Admin note cannot exceed 500 characters' })
  adminNote?: string;
}
