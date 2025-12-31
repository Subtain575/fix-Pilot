import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsNotEmpty,
  Matches,
  IsEnum,
  IsString,
} from 'class-validator';
import { UserRole } from '../enums/enum';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Ali Khan' })
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiProperty({ example: '+923001234567' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'Phone number must be a valid international number in E.164 format (e.g. +923001234567, +14155552671, +447911123456)',
  })
  phone: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Profile image file',
  })
  @IsOptional()
  profileImage?: any;

  @ApiProperty({
    example: 'buyer',
    enum: UserRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be buyer, seller, or admin' })
  role?: UserRole;

  @ApiProperty({ example: 'Lahore' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'dubai' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty({ example: 'Punjab' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({ example: '54000' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  postalCode: string;

  @ApiProperty({ example: '123 Street, Model Town' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  address: string;
}
