import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsUrl,
  IsEnum,
} from 'class-validator';
import { MessageFileType } from '../enums/message-file-type.enum';

export class SendMessageDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, I am interested in your service',
    maxLength: 2000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiProperty({
    description: 'File URL from Cloudinary (for images, videos, or files)',
    example: 'https://res.cloudinary.com/.../image.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  fileUrl?: string;

  @ApiProperty({
    description: 'Type of file: image, video, or file',
    enum: MessageFileType,
    example: MessageFileType.IMAGE,
    required: false,
  })
  @IsOptional()
  @IsEnum(MessageFileType)
  fileType?: MessageFileType;
}
