import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { planTypeEnum } from '../Enum/plan-type-enum';

export class CreatePlanManagementDto {
  @ApiProperty({
    example: planTypeEnum.BASIC,
    description: 'Type of the plan',
    enum: planTypeEnum,
  })
  @IsEnum(planTypeEnum, {
    message: 'Plan type must be basic, plus, or premium',
  })
  @IsNotEmpty({ message: 'Plan type is required' })
  planType: planTypeEnum;

  @ApiProperty({ example: 99.99, description: 'Price of the plan in USD' })
  @IsNumber({}, { message: 'Price must be a number' })
  @IsPositive({ message: 'Price must be greater than 0' })
  price: number;

  @ApiProperty({
    example: 'Pakistan',
    description: 'Country where plan is available',
  })
  @IsString()
  @IsNotEmpty({ message: 'Country is required' })
  country: string;
}
