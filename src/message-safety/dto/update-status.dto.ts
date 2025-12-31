import { IsEnum } from 'class-validator';
import { ViolationStatus } from '../Enum/violation-status-enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStatusDto {
  @ApiProperty({
    description: 'status update',
    example: 'PENDING',
  })
  @IsEnum(ViolationStatus)
  status: ViolationStatus;
}
