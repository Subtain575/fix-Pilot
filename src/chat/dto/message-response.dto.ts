import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageFileType } from '../enums/message-file-type.enum';

class SenderInfoDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  conversationId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  senderId: string;

  @ApiPropertyOptional({
    example: 'Hello, I am interested in your service',
    nullable: true,
  })
  message: string | null;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/.../image.jpg',
    nullable: true,
  })
  fileUrl: string | null;

  @ApiPropertyOptional({
    enum: MessageFileType,
    example: MessageFileType.IMAGE,
    nullable: true,
  })
  fileType: MessageFileType | null;

  @ApiProperty({ type: SenderInfoDto })
  sender: SenderInfoDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class MessagesListResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  items: MessageResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 2 })
  totalPages: number;
}
