import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional } from 'class-validator';
import { SellerVerificationStatus } from '../Enum/seller-verification-enum';

export class SellerVerificationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsNumberString()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumberString()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by verification status',
    enum: SellerVerificationStatus,
  })
  @IsOptional()
  @IsEnum(SellerVerificationStatus)
  status?: SellerVerificationStatus;
}
