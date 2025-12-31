import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsArray,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../enums/enum';

export class SignupDto {
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
    example: 'buyer',
    enum: [UserRole.BUYER, UserRole.SELLER, UserRole.SUPER_ADMIN],
    required: false,
    description:
      'Buyer, seller, or super_admin roles allowed. Sub admin (admin) cannot be created through signup.',
  })
  @IsOptional()
  @IsEnum([UserRole.BUYER, UserRole.SELLER, UserRole.SUPER_ADMIN], {
    message:
      'Role must be buyer, seller, or super_admin. Sub admin cannot be created through signup.',
  })
  role?: UserRole;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Profile image file',
  })
  @IsOptional()
  profileImage?: any;

  @ApiPropertyOptional({ example: 'lahore' })
  @ValidateIf(
    (o: SignupDto) =>
      o.role !== UserRole.ADMIN && o.role !== UserRole.SUPER_ADMIN,
  )
  @IsNotEmpty({ message: 'City is required for buyer or seller' })
  city: string;

  @ApiPropertyOptional({ example: 'london' })
  @ValidateIf(
    (o: SignupDto) =>
      o.role !== UserRole.ADMIN && o.role !== UserRole.SUPER_ADMIN,
  )
  @IsNotEmpty({ message: 'Country is required for buyer or seller' })
  country: string;

  @ApiPropertyOptional({ example: '239 DH street ' })
  @ValidateIf(
    (o: SignupDto) =>
      o.role !== UserRole.ADMIN && o.role !== UserRole.SUPER_ADMIN,
  )
  @IsNotEmpty({ message: 'State is required for buyer or seller' })
  state: string;

  @ApiPropertyOptional({ example: '29900' })
  @ValidateIf(
    (o: SignupDto) =>
      o.role !== UserRole.ADMIN && o.role !== UserRole.SUPER_ADMIN,
  )
  @IsNotEmpty({ message: 'Postal code is required for buyer or seller' })
  postalCode: string;

  @ApiPropertyOptional({ example: 'multan chungi no 06' })
  @ValidateIf(
    (o: SignupDto) =>
      o.role !== UserRole.ADMIN && o.role !== UserRole.SUPER_ADMIN,
  )
  @IsNotEmpty({ message: 'Address is required for buyer or seller' })
  address: string;

  @ApiProperty({
    type: 'string',
    required: false,
    description:
      'JSON string array of file objects with image URL and type (Seller only). Send as JSON string in multipart form-data. Example: [{"image":"https://res.cloudinary.com/.../image.jpg","type":"license"}]',
    example:
      '[{"image":"https://res.cloudinary.com/.../image.jpg","type":"license"}]',
  })
  @IsOptional()
  @ValidateIf((o: SignupDto) => o.role === UserRole.SELLER)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as Array<{ image: string; type: string }>;
      } catch {
        return value as unknown as Array<{ image: string; type: string }>;
      }
    }
    return value as unknown as Array<{ image: string; type: string }>;
  })
  @IsArray({ message: 'files must be an array' })
  files?: Array<{ image: string; type: string }>;
}

export class LoginDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: 'Pass@123' })
  @IsNotEmpty({ message: 'Password is required' })
  @Matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-={}[\]:;"'<>,.?/~`|\\]).{8,}$/, {
    message:
      'Password must be at least 8 characters long, contain at least one uppercase letter and one special character',
  })
  password: string;
}

export class LoginWithPhoneDto {
  @ApiProperty({ example: '+923001234567' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'Phone number must be a valid international number in E.164 format (e.g. +923001234567, +14155552671, +447911123456)',
  })
  phone: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class GoogleSigninDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJSUzI1NiIsImtpZCI6IjdkYzAyYjg1ZjU5ZjIwNzg4ZjE5ZGY4ZGY4ZGY4ZGY4ZGY4ZGY4ZGYiLCJ0eXAiOiJKV1QifQ...',
    description: 'Google ID Token received from Google Sign-in',
  })
  @IsNotEmpty({ message: 'ID Token is required' })
  idToken: string;
}
