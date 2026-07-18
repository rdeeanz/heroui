// ============================================================================
//  MODUL Notifikasi: in-app notifications + reminder terjadwal + email port.
//  Mengekspor NotifikasiService agar modul Laporan bisa memicu notifikasi event.
// ============================================================================
import { Module } from "@nestjs/common";
import { NotifikasiController } from "./presentation/notifikasi.controller";
import { NotifikasiService } from "./application/notifikasi.service";
import { NotifikasiScheduler } from "./notifikasi.scheduler";
import { NOTIFIKASI_REPOSITORY } from "./application/ports/notifikasi.repository";
import { EMAIL_SENDER } from "./application/ports/email-sender";
import { PrismaNotifikasiRepository } from "./infrastructure/prisma-notifikasi.repository";
import { LogEmailSender } from "./infrastructure/log-email-sender";

@Module({
  controllers: [NotifikasiController],
  providers: [
    NotifikasiService,
    NotifikasiScheduler, // Cron reminder harian.
    // Ikat port ke implementasi.
    { provide: NOTIFIKASI_REPOSITORY, useClass: PrismaNotifikasiRepository },
    { provide: EMAIL_SENDER, useClass: LogEmailSender },
  ],
  // Ekspor service agar modul lain dapat mengirim notifikasi.
  exports: [NotifikasiService],
})
export class NotifikasiModule {}
