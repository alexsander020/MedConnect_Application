import nodemailer, { Transporter } from 'nodemailer';
import { EmailSender, SendEmailOptions } from './emailSender.interface';
import { env } from '../../config/env';

export class SmtpEmailSender implements EmailSender {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT || 587,
      secure: env.SMTP_PORT === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS
            }
          : undefined
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    });
  }
}
