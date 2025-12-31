import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class BookingArriveDto {
  @ApiProperty({
    description: 'Booking ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @ApiProperty({
    description: 'Latitude shared by the buyer at booking time',
    example: 24.8607,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Longitude shared by the buyer at booking time',
    example: 67.0011,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  longitude: number;
}
