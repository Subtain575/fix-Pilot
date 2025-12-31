import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Pass@123' })
  @IsNotEmpty({ message: 'Old Password is required' })
  @Matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-={}[\]:;"'<>,.?/~`|\\]).{8,}$/, {
    message:
      'Old Password must be at least 8 characters long, contain at least one uppercase letter and one special character',
  })
  oldPassword: string;

  @ApiProperty({ example: 'Pass@123' })
  @IsNotEmpty({ message: 'New Password is required' })
  @Matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-={}[\]:;"'<>,.?/~`|\\]).{8,}$/, {
    message:
      'New Password must be at least 8 characters long, contain at least one uppercase letter and one special character',
  })
  newPassword: string;
}
