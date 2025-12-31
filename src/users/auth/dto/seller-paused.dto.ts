import { IsEnum, IsNotEmpty } from 'class-validator';
import { SellerAccountStatus } from '../enums/seller-account-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class SellerTypeStatusDto {
  @ApiProperty({
    example: 'paused',
    description: 'Status must be paused and unpaused',
  })
  @IsEnum(SellerAccountStatus)
  @IsNotEmpty()
  status: SellerAccountStatus;
}
