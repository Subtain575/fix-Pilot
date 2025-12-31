import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateDocumentRequestDto {
  @ApiProperty({
    description: 'Type of document request',
    example: 'ID_PROOF',
  })
  @IsString()
  requestType: string;
}
