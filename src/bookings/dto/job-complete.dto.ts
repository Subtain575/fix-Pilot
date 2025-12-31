import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class JobCompleteDto {
  @ApiProperty({ required: false, description: 'Mark job completed' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value === 'true' || value === '1'
      : Boolean(value),
  )
  @IsBoolean()
  completeJob?: boolean;

  @ApiProperty({ required: false, description: 'Mark payment checked' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value === 'true' || value === '1'
      : Boolean(value),
  )
  @IsBoolean()
  paymentChecked?: boolean;

  @ApiProperty({
    required: false,
    description: 'OTP code for verification',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @Length(0, 10)
  otpCode?: string;

  @ApiProperty({
    required: false,
    description: 'Worker notes (what did you do?)',
  })
  @IsOptional()
  @IsString()
  workerNotes?: string;

  @ApiProperty({
    description: 'Pickup images (array)',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  @IsOptional()
  pickupImages?: unknown;

  @ApiProperty({
    description: 'Delivery images (array)',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  @IsOptional()
  deliveryImages?: unknown;

  @ApiProperty({ required: false, description: 'Latitude' })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined ? undefined : Number(value),
  )
  latitude?: number;

  @ApiProperty({ required: false, description: 'Longitude' })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined ? undefined : Number(value),
  )
  longitude?: number;
}
