import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAddressDto {
  @ApiProperty({
    description: 'Service address',
    example: '123 Main Street, City, Country',
  })
  @IsNotEmpty()
  @IsString()
  serviceAddress: string;

  @ApiProperty({
    description: 'Address name/label',
    example: 'Home',
  })
  @IsNotEmpty()
  @IsString()
  addressName: string;

  @ApiPropertyOptional({
    description: 'Latitude',
    example: 40.7128,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({
    description: 'Longitude',
    example: -74.006,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  long?: number;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '10001',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'United States',
  })
  @IsOptional()
  @IsString()
  country?: string;
}
