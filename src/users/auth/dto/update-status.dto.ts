import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../enums/status-enum';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class updateUserStatusDto {
  @ApiPropertyOptional({ example: 'ACTIVE', enum: UserStatus })
  @IsEnum(UserStatus, {
    message: 'Status must be active, inactive, or suspended',
  })
  @IsNotEmpty({ message: 'Status is required for buyer or seller' })
  status: UserStatus;
}
