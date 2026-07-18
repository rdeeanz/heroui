// ============================================================================
//  SCHEDULER Notifikasi — menjalankan pembuatan reminder secara terjadwal.
//  Berjalan setiap hari; berkat dedupe per bulan, aman meski dijalankan harian
//  (tiap PIC hanya menerima satu reminder per periode). Kegagalan dicatat saja.
// ============================================================================
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { NotifikasiService } from "./application/notifikasi.service";

@Injectable()
export class NotifikasiScheduler {
  private readonly logger = new Logger(NotifikasiScheduler.name);

  constructor(private readonly notifikasi: NotifikasiService) {}

  // Jalankan setiap hari pukul 08:00 (waktu server).
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async reminderHarian(): Promise<void> {
    try {
      // Buat reminder untuk PIC yang laporannya belum final bulan ini.
      const hasil = await this.notifikasi.generateReminders();
      this.logger.log(`Reminder terjadwal selesai: ${hasil.dibuat} notifikasi.`);
    } catch (e) {
      // Jangan sampai error terjadwal menjatuhkan aplikasi.
      this.logger.error(`Reminder terjadwal gagal: ${(e as Error).message}`);
    }
  }
}
