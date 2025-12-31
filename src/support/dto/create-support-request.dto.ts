import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateSupportRequestDto {
  @ApiProperty({
    description: 'Full name of the requester',
    example: 'John Doe',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @ApiProperty({
    description: 'Email address of the requester',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiPropertyOptional({
    description: 'Phone number (optional)',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiProperty({
    description: 'Support request message or question',
    example: 'I need help with my booking cancellation.',
  })
  @IsNotEmpty({ message: 'Message is required' })
  @IsString({ message: 'Message must be a string' })
  @MinLength(10, { message: 'Message must be at least 10 characters long' })
  message: string;
}
