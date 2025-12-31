import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  Max,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Gig ID',
  })
  @IsNotEmpty()
  @IsString()
  gigId: string;

  @ApiProperty({
    description: 'Rating (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Review text',
    example: 'Great service, very professional!',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviews?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Image file to upload',
  })
  @IsOptional()
  image?: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Video file to upload',
  })
  @IsOptional()
  video?: any;
}
