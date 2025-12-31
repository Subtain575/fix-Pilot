import { ApiProperty } from '@nestjs/swagger';
import { Matches, IsNumber, IsNotEmpty, IsEmail } from 'class-validator';

export class ResetPasswordDto {
  // @ApiProperty({ example: '+923006589266' })
  // @IsString()
  // phone: string;

  @ApiProperty({ example: 'test@example.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsNumber({}, { message: 'Invalid otp format' })
  otp: number;

  @ApiProperty({ example: 'Pass@123' })
  @IsNotEmpty({ message: 'Password is required' })
  @Matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-={}[\]:;"'<>,.?/~`|\\]).{8,}$/, {
    message:
      'Password must be at least 8 characters long, contain at least one uppercase letter and one special character',
  })
  newPassword: string;
}
