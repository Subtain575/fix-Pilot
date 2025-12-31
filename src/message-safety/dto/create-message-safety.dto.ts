import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ViolationType } from '../Enum/violation-type-enum';

export class CreateViolationDto {
  @ApiProperty({
    description: 'User ID who caused the violation',
    example: '66c66612-b8e6-4462-b444-b69a0438bbbc',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Content that violated rules',
    example: 'Call me at 0300-1234567',
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Violation type',
    example: 'Phone Number',
    enum: ViolationType,
  })
  @IsOptional()
  @IsEnum(ViolationType)
  type?: ViolationType;
}
