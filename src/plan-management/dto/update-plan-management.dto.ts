import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';
import { planTypeEnum } from '../Enum/plan-type-enum';

export class UpdatePlanManagementDto {
  @ApiPropertyOptional({
    example: planTypeEnum.PREMIUM,
    description: 'Updated plan type',
    enum: planTypeEnum,
  })
  @IsEnum(planTypeEnum)
  @IsOptional()
  planType?: planTypeEnum;

  @ApiPropertyOptional({
    example: 'UAE',
    description: 'Updated country',
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    example: '2000',
    description: 'Updated price',
  })
  @IsNumber()
  @IsOptional()
  price?: number
}
