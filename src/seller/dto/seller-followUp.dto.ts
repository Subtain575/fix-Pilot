import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFollowUpDto {
  @ApiProperty({
    example: 'Document Review Needed',
    description: 'Title of the follow-up',
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(100, { message: 'Title must be under 100 characters' })
  title: string;

  @ApiProperty({
    example: 'Please upload bank statement within 3 days.',
    description: 'Message body of the follow-up',
  })
  @IsString()
  @IsNotEmpty({ message: 'Message is required' })
  @MaxLength(255, { message: 'Message must be under 255 characters' })
  message: string;

  @ApiProperty({
    example: 'https://fixpilot.com/upload',
    required: false,
  })
  @IsOptional()
  @IsString()
  link?: string;
}
