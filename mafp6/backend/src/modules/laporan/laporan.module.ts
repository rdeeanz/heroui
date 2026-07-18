// ============================================================================
//  MODUL Laporan/Workflow: alur persetujuan Cabang -> Regional -> Pusat.
// ============================================================================
import { Module } from "@nestjs/common";
import { LaporanController } from "./presentation/laporan.controller";
import { SubmitLaporanUseCase } from "./application/submit-laporan.usecase";
import { ReviewLaporanUseCase } from "./application/review-laporan.usecase";
import { ListPeriodeUseCase } from "./application/list-periode.usecase";
import { PERIODE_REPOSITORY } from "./application/ports/periode.repository";
import { PrismaPeriodeRepository } from "./infrastructure/prisma-periode.repository";
import { NotifikasiModule } from "@/modules/notifikasi/notifikasi.module";

@Module({
  imports: [NotifikasiModule], // Sediakan NotifikasiService untuk use-case.
  controllers: [LaporanController],
  providers: [
    SubmitLaporanUseCase,
    ReviewLaporanUseCase,
    ListPeriodeUseCase,
    // Ikat port ke implementasi Prisma.
    { provide: PERIODE_REPOSITORY, useClass: PrismaPeriodeRepository },
  ],
})
export class LaporanModule {}
