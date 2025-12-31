import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { MailService } from '../email/mail.service';
import { phoneService } from '../phone-number/phone-number.service';

@Injectable()
export class CommonService {
  constructor(
    @Inject(forwardRef(() => MailService))
    private readonly mailService: MailService,

    @Inject(forwardRef(() => phoneService))
    private readonly phoneService: phoneService,
  ) {}

  generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000);
  };

  sendOtpToMail = async (toMail: string, otp: number) => {
    const subject = 'Verify Your Email Address';
    const text = `Your OTP for verifying your email is: ${otp}`;
    const html = `<h2>Email Verification</h2>
   <p>Your <strong>OTP</strong> is:</p>
   <div style="font-size:24px;font-weight:bold;color:#2b6cb0;margin:10px 0;">
      ${otp}
   </div>`;
    return this.mailService.sendMail(toMail, subject, text, html);
  };
  sendOtpToPhone = async (phone: string, otp: number) => {
    try {
      const message = `Your verification code is ${otp}`;
      await this.phoneService.sendSms(phone, message);
      return 'OTP sent successfully';
    } catch {
      throw new InternalServerErrorException('Failed to send OTP to phone');
    }
  };
}
