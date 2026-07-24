import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EASYMATCH_WEB_URL } from '@easymatch/shared';

export type EmailMessage = {
  to: string[];
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromAddress: string;
  private readonly resendApiKey: string | undefined;
  private readonly webBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.fromAddress =
      this.config.get<string>('STAFF_EMAIL_FROM') ?? 'EasymatchBD <alerts@easymatchbd.com>';
    this.resendApiKey = this.config.get<string>('RESEND_API_KEY');
    this.webBaseUrl =
      this.config.get<string>('STAFF_WEB_URL') ??
      this.config.get<string>('WEB_URL') ??
      EASYMATCH_WEB_URL;
  }

  buildStaffLink(path: string) {
    const base = this.webBaseUrl.replace(/\/$/, '');
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalized}`;
  }

  async send(message: EmailMessage) {
    const recipients = [...new Set(message.to.map((entry) => entry.trim()).filter(Boolean))];
    if (recipients.length === 0) {
      return;
    }

    if (!this.resendApiKey) {
      this.logger.log(
        `[dev-email] to=${recipients.join(', ')} subject=${message.subject}\n${message.text}`,
      );
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: recipients,
          subject: message.subject,
          text: message.text,
          html: message.html ?? `<p>${message.text.replace(/\n/g, '<br/>')}</p>`,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(`Resend email failed: ${response.status} ${body}`);
      }
    } catch (error) {
      this.logger.warn(`Email send failed: ${String(error)}`);
    }
  }
}
