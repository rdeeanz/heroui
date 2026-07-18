// ============================================================================
//  PORT pengirim email. Menjaga logika notifikasi lepas dari detail transport
//  email (SMTP/SES/dll). Implementasi default hanya mencatat ke log; transport
//  nyata dapat dipasang belakangan tanpa mengubah use-case.
// ============================================================================

// Token injeksi.
export const EMAIL_SENDER = Symbol("EMAIL_SENDER");

// Kontrak pengirim email.
export interface EmailSenderPort {
  // Kirim satu email. Tidak melempar error fatal (kegagalan email tak boleh
  // menggagalkan alur bisnis utama) — implementasi menangani/mencatat sendiri.
  send(to: string, subjek: string, isi: string): Promise<void>;
}
