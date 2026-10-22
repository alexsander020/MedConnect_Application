import { EmailSender, SendEmailOptions } from './emailSender.interface';

export class ConsoleEmailSender implements EmailSender {
  async sendEmail(options: SendEmailOptions): Promise<void> {
    console.log('--------------------------------------------------');
    console.log('📧 [DEV EMAIL] Mensagem enviada para Console:');
    console.log(`Para: ${options.to}`);
    console.log(`Assunto: ${options.subject}`);
    if (options.text) console.log(`Texto: ${options.text}`);
    if (options.html) console.log(`HTML: ${options.html}`);
    console.log('--------------------------------------------------');
  }
}
