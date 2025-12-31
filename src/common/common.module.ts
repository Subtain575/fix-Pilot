import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CommonService } from './common.service';
import { MailModule } from '../email/mail.module';
import { PhoneModule } from '../phone-number/phone-number.module';

@Module({
  imports: [
    forwardRef(() => MailModule),
    forwardRef(() => PhoneModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecretkey',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
