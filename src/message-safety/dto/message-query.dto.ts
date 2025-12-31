import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';

import { Type } from 'class-transformer';
import { ViolationStatus } from '../Enum/violation-status-enum';
import { ViolationSeverity } from '../Enum/violation-severity-enum';

export class FilterViolationsDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ViolationStatus,
    example: 'PENDING',
  })
  @IsOptional()
  @IsEnum(ViolationStatus)
  status?: ViolationStatus;

  @ApiPropertyOptional({
    description: 'Filter by severity',
    enum: ViolationSeverity,
    example: 'HIGH',
  })
  @IsOptional()
  @IsEnum(ViolationSeverity)
  severity?: ViolationSeverity;

  @ApiPropertyOptional({
    description: 'Search by keyword (name, title etc)',
    example: 'Ahmed',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;
}
