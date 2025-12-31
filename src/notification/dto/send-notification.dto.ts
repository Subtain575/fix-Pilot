import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsEmail,
} from 'class-validator';

import { NotificationTargetEnum } from '../Enum/notification-enum';

export class SendNotificationDto {
  @ApiProperty({ example: 'Warning Issued' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'You have violated community guidelines.' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({
    example: 'buyer',
    enum: NotificationTargetEnum,
  })
  @IsOptional()
  @IsEnum(NotificationTargetEnum)
  type?: NotificationTargetEnum;

  @ApiPropertyOptional({ example: 'test@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
