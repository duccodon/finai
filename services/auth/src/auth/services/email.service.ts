import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
import nodemailer from 'nodemailer';

interface MailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

interface TransportOptions {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls: {
    rejectUnauthorized: boolean;
  };
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter;

  constructor(private configService: ConfigService) {
    const transportConfig: TransportOptions = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: this.configService.get<string>('EMAIL_USER') || '',
        pass: this.configService.get<string>('EMAIL_PASS') || '',
      },
      tls: {
        rejectUnauthorized: false,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.transporter = nodemailer.createTransport(transportConfig);

    // Verify connection configuration
    void this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.transporter.verify();
      this.logger.log('Email service connected successfully');
    } catch (error: unknown) {
      this.logger.error(
        'Email service connection failed:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async sendResetEmail(email: string, resetSessionId: string): Promise<boolean> {
    try {
      const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?resetSessionId=${resetSessionId}`;

      const mailOptions: MailOptions = {
        from: this.configService.get<string>('EMAIL_USER') || '',
        to: email,
        subject: 'Reset Password - FinAI',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            <p>You requested a password reset for your FinAI account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Reset Password
            </a>
            <p style="color: #666; font-size: 14px;">
              If you didn't request this reset, please ignore this email.<br>
              This link will expire in 1 hour.
            </p>
          </div>
        `,
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to: ${email}`);
      return true;
    } catch (error: unknown) {
      this.logger.error(
        'Failed to send reset email:',
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }
}
