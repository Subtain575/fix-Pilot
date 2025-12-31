import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateJobDto {
  @ApiProperty({ required: false, description: 'Mark job completed' })
  @IsOptional()
  @IsBoolean()
  completeJob?: boolean;

  @ApiProperty({ required: false, description: 'Mark payment checked' })
  @IsOptional()
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
}
