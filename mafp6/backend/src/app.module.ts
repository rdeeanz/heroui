// ============================================================================
//  MODUL AKAR aplikasi: merakit seluruh modul fitur + konfigurasi global.
// ============================================================================
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./shared/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AvailabilityModule } from "./modules/availability/availability.module";
import { MasterDataModule } from "./modules/master-data/master-data.module";
import { InspeksiModule } from "./modules/inspeksi/inspeksi.module";
import { ExportModule } from "./modules/export/export.module";
import { LaporanModule } from "./modules/laporan/laporan.module";
import { ImportModule } from "./modules/import/import.module";
import { NotifikasiModule } from "./modules/notifikasi/notifikasi.module";
import { AuditModule } from "./modules/audit/audit.module";

@Module({
  imports: [
    // Muat environment variable dari .env dan sediakan secara global.
    ConfigModule.forRoot({ isGlobal: true }),
    // Aktifkan penjadwalan (cron) untuk reminder terjadwal.
    ScheduleModule.forRoot(),
    PrismaModule, // Koneksi database (global).
    AuthModule, // Autentikasi + guard global (JWT & Roles).
    MasterDataModule, // Endpoint master data.
    AvailabilityModule, // Endpoint & kalkulasi availability.
    InspeksiModule, // Endpoint modul inspeksi.
    ExportModule, // Endpoint ekspor Excel & PDF.
    LaporanModule, // Alur persetujuan laporan (submit/review).
    ImportModule, // Impor data historis dari Excel.
    NotifikasiModule, // Notifikasi in-app + reminder.
    AuditModule, // Jejak audit (interceptor global + API baca).
  ],
})
export class AppModule {}
