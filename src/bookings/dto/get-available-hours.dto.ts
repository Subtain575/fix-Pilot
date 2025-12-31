import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString, IsUUID } from 'class-validator';

export class GetAvailableHoursDto {
  @ApiProperty({
    description: 'Gig ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  gigId: string;

  @ApiProperty({
    description: 'Date to check availability (YYYY-MM-DD format)',
    example: '2024-01-15',
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;
}
