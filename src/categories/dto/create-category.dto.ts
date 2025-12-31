import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name (must be unique)',
    example: 'Electronics',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Parent category name (for subcategories)',
    example: 'Home Services',
    required: false,
  })
  @IsOptional()
  @IsString()
  parentCategoryName?: string;

  @ApiProperty({
    description: 'Category description',
    example: 'Air conditioning repair and maintenance services',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Help text for buyers',
    example: 'Choose this service for AC installation, repair, or maintenance',
  })
  @IsOptional()
  @IsString()
  helpTextForBuyers?: string;

  @ApiProperty({
    description: 'Category icon name',
    example: 'wrench',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({
    description: 'Minimum price in PKR',
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPrice?: number;

  @ApiProperty({
    description: 'Maximum price in PKR',
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumPrice?: number;

  @ApiProperty({
    description: 'Suggested base price in PKR',
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  suggestedBasePrice?: number;

  @ApiProperty({
    description: 'Platform commission rate percentage',
    example: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  platformCommissionRate?: number;

  @ApiProperty({
    description: 'Default service radius in kilometers',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  defaultServiceRadius?: number;

  @ApiProperty({
    description: 'Does this category require a license?',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isLicense?: boolean;

  @ApiProperty({
    description: 'Does this category require insurance?',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isInsurance?: boolean;

  @ApiProperty({
    description: 'Minimum required experience in years',
    example: 2,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minExperience: number;

  @ApiProperty({
    description: 'Common add-ons for this category',
    example: ['Installation', 'Repair', 'Maintenance'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  commonAddOns?: string[];
}
