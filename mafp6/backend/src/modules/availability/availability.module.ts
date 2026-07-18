// ============================================================================
//  MODUL Availability: merangkai presentation, application, dan infrastructure.
//  Di sinilah token port LAPORAN_REPOSITORY diikat ke implementasi Prisma.
// ============================================================================
import { Module } from "@nestjs/common";
import { AvailabilityController } from "./presentation/availability.controller";
import { GetLaporanCabangUseCase } from "./application/get-laporan-cabang.usecase";
import { GetRekapRegionalUseCase } from "./application/get-rekap-regional.usecase";
import { LAPORAN_REPOSITORY } from "./application/ports/laporan.repository";
import { PrismaLaporanRepository } from "./infrastructure/prisma-laporan.repository";

@Module({
  controllers: [AvailabilityController], // Endpoint HTTP modul ini.
  providers: [
    GetLaporanCabangUseCase, // Use-case laporan cabang.
    GetRekapRegionalUseCase, // Use-case rekap regional.
    // Ikat interface (port) ke implementasi konkret (dependency inversion).
    { provide: LAPORAN_REPOSITORY, useClass: PrismaLaporanRepository },
  ],
  // Ekspor port & use-case rekap agar modul Export dapat memakainya.
  exports: [LAPORAN_REPOSITORY, GetRekapRegionalUseCase],
})
export class AvailabilityModule {}
