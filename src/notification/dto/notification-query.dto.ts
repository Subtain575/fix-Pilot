import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumberString } from 'class-validator';

export class NotificationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumberString()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumberString()
  limit?: number;
}
