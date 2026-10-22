import { EmailSender } from './emailSender.interface';
import { ConsoleEmailSender } from './consoleEmailSender';
import { SmtpEmailSender } from './smtpEmailSender';
import { env } from '../../config/env';

let emailSenderInstance: EmailSender;

if (env.NODE_ENV === 'production' && env.SMTP_HOST) {
  emailSenderInstance = new SmtpEmailSender();
} else {
  emailSenderInstance = new ConsoleEmailSender();
}

export const emailSender = emailSenderInstance;
export * from './emailSender.interface';
