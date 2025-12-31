import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateSubAdminDto {
  @ApiProperty({ example: 'Ali Khan' })
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiProperty({ example: 'test@example.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: '+923001234567' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'Phone number must be a valid international number in E.164 format (e.g. +923001234567, +14155552671, +447911123456)',
  })
  phone: string;

  @ApiProperty({ example: 'Pass@123' })
  @IsNotEmpty({ message: 'Password is required' })
  @Matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-={}[\]:;"'<>,.?/~`|\\]).{8,}$/, {
    message:
      'Password must be at least 8 characters long, contain at least one uppercase letter and one special character',
  })
  password: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Profile image file',
  })
  @IsOptional()
  profileImage?: any;

  @ApiPropertyOptional({ example: 'lahore' })
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'london' })
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: '239 DH street ' })
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '29900' })
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'multan chungi no 06' })
  @IsOptional()
  address?: string;
}
