import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class StrikeQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination (default: 1)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer value' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of records per page (default: 10)',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer value' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number;
}
