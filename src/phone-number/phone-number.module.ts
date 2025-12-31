import { Module } from '@nestjs/common';
import { phoneService } from './phone-number.service';

@Module({
  providers: [phoneService],
  exports: [phoneService],
})
export class PhoneModule {}
