import { PartialType } from '@nestjs/swagger';
import { CreateGigDto } from './create-gig.dto';

export class UpdateGigDto extends PartialType(CreateGigDto) {}
