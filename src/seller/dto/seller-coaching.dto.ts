import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class sellerCoachingDto {
  @ApiPropertyOptional({
    description:
      'Account paused due to strike limit. Needs extensive coaching before reactivation.',
    example: 'update Coaching Note',
  })
  @IsString()
  coachingNote: string;
}
