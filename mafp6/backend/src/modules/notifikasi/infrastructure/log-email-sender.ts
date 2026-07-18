// ============================================================================
//  IMPLEMENTASI EmailSender default: mencatat email ke LOG (bukan mengirim).
//  Cocok untuk pengembangan/lingkungan tanpa server email. Transport nyata
//  (SMTP/SES) dapat menggantikan implementasi ini tanpa mengubah use-case.
// ============================================================================
import { Injectable, Logger } from "@nestjs/common";
import { EmailSenderPort } from "../application/ports/email-sender";

@Injectable()
export class LogEmailSender implements EmailSenderPort {
  private readonly logger = new Logger("Email");

  // "Kirim" email: cukup catat ke log agar terlihat saat pengembangan.
  async send(to: string, subjek: string, isi: string): Promise<void> {
    this.logger.log(`[EMAIL] ke=${to} | subjek="${subjek}" | isi="${isi}"`);
  }
}
