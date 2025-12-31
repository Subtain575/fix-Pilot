import { ApiProperty } from '@nestjs/swagger';

class UserInfoDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;
}

class GigInfoDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Plumbing Services' })
  title: string;
}

export class ConversationResponseDto {
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

  @ApiProperty({ type: UserInfoDto })
  seller: UserInfoDto;

  @ApiProperty({ type: UserInfoDto })
  buyer: UserInfoDto;

  @ApiProperty({ type: GigInfoDto, nullable: true })
  gig: GigInfoDto | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}
