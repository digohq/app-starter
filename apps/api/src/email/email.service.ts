import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    // Use localhost when running locally, mailpit when in Docker
    const smtpHost = this.configService.get<string>('SMTP_HOST', 'localhost');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 1025);
    const smtpUser = this.configService.get<string>('SMTP_USER', '');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD', '');

    // Port 465 uses SSL (secure: true), port 587 uses TLS (requireTLS: true)
    const isSecurePort = smtpPort === 465;
    const isTlsPort = smtpPort === 587;

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSecurePort, // true for 465 (SSL), false for other ports
      requireTLS: isTlsPort, // true for 587 (TLS), ensures TLS is used
      auth:
        smtpUser && smtpPassword
          ? {
              user: smtpUser,
              pass: smtpPassword,
            }
          : undefined,
    });
  }

  /**
   * Send a generic email with HTML and text content.
   * @param options.replyTo - Optional reply-to address
   * @param options.fromName - Optional custom sender name
   */
  async sendEmail(
    email: string,
    subject: string,
    html: string,
    text: string,
    options?: { replyTo?: string; fromName?: string },
  ): Promise<void> {
    const defaultFromEmail = this.configService.get<string>(
      'SMTP_FROM_EMAIL',
      'noreply@app-starter.local',
    );
    const defaultFromName = this.configService.get<string>('SMTP_FROM_NAME', 'App Starter');

    const fromName = options?.fromName || defaultFromName;
    const fromEmail = defaultFromEmail;

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject,
      html,
      text,
    };
    if (options?.replyTo) {
      mailOptions.replyTo = options.replyTo;
    }

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      this.logger.error(
        'Error sending email',
        error instanceof Error ? error.stack : String(error),
      );
      throw new Error('Failed to send email');
    }
  }
}
