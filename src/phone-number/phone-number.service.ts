import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class phoneService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid =
      this.configService.get<string>('TWILIO_ACCOUNT_SID') || '';
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || '';
    this.fromNumber =
      this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';

    this.client = twilio(accountSid, authToken);
  }

  async sendSms(to: string, body: string) {
    try {
      await this.client.messages.create({
        body,
        from: this.fromNumber,
        to,
      });
    } catch {
      throw new InternalServerErrorException('Twilio SMS sending failed');
    }
  }
}
