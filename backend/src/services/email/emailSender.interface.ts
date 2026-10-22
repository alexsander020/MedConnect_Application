export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailSender {
  sendEmail(options: SendEmailOptions): Promise<void>;
}
