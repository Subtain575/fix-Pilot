import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNumber } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsNumber({}, { message: 'Invalid otp format' })
  otp: number;
}
