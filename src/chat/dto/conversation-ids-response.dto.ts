import { ApiProperty } from '@nestjs/swagger';

export class ConversationIdsResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  sellerId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  buyerId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  gigId: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}
