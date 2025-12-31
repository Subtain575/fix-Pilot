import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Receiver ID (can be buyer or seller)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  receiverId: string;

  @ApiProperty({
    description: 'Gig ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  gigId?: string;
}
