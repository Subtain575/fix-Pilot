import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { adminActionStatus } from '../Enum/action-status-enum';

export class ViolationActionDto {
  @ApiProperty({
    description: 'ID of the violation',
    example: 'f38d13c3-8ad7-41ba-a120-5c41ce39ccbb',
  })
  @IsNotEmpty()
  @IsString()
  violationId: string;

  @ApiProperty({
    description: 'Admin action to apply',
    example: 'warn',
    enum: adminActionStatus,
  })
  @IsEnum(adminActionStatus)
  action: adminActionStatus;

  @ApiProperty({
    description: 'Optional notes by admin',
    example: 'User shared phone number',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
