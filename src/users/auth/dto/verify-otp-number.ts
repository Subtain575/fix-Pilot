import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Matches } from 'class-validator';

export class VerifyOtpToNumberDto {
  @ApiProperty({ example: '+923001234567' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'Phone number must be a valid international number in E.164 format (e.g. +923001234567, +14155552671, +447911123456)',
  })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsNumber({}, { message: 'Invalid otp format' })
  otp: number;
}
