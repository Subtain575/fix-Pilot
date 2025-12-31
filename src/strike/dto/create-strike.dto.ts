import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { StrikeType } from '../Enum/strike-type.enum';

export class CreateStrikeDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  sellerId: string;

  @ApiProperty({ enum: StrikeType })
  @IsEnum(StrikeType)
  type: StrikeType;

  @ApiProperty({ example: 5, description: 'Points between 1 and 10' })
  @IsNumber()
  @Min(1)
  @Max(10)
  points: number;

  @ApiProperty({ example: 'Seller violated marketplace policy' })
  @IsNotEmpty()
  reason: string;
}
