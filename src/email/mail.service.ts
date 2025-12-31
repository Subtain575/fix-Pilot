import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private senderEmail: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    this.senderEmail = this.configService.get<string>('MAIL_FROM') || '';

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: parseInt(this.configService.get<string>('MAIL_PORT') || '587'),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    try {
      const mailOptions = {
        from: this.senderEmail,
        to,
        subject,
        text,
        html: html || text,
      };
      const info: unknown = await this.transporter.sendMail(mailOptions);
      const messageId =
        info && typeof info === 'object' && info !== null && 'messageId' in info
          ? String((info as { messageId: unknown }).messageId)
          : 'unknown';
      this.logger.log(`Mail sent to ${to}. MessageId=${messageId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Mail send failed to ${to}: ${msg}`);
      throw new InternalServerErrorException(`Mail send failed: ${msg}`);
    }
  }
}
