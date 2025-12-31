import { PartialType } from '@nestjs/swagger';
import { CreateStrikeDto } from './create-strike.dto';

export class UpdateStrikeDto extends PartialType(CreateStrikeDto) {}
