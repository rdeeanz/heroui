// ============================================================================
//  MODUL Export: menyatukan endpoint ekspor Excel/PDF.
//  Mengimpor AvailabilityModule (untuk data laporan/rekap) & InspeksiModule
//  (untuk data inspeksi) — bergantung pada port/use-case yang mereka ekspor.
// ============================================================================
import { Module } from "@nestjs/common";
import { AvailabilityModule } from "@/modules/availability/availability.module";
import { InspeksiModule } from "@/modules/inspeksi/inspeksi.module";
import { ExportController } from "./presentation/export.controller";
import {
  ExportCabangExcelUseCase,
  ExportRegionalExcelUseCase,
  ExportInspeksiPdfUseCase,
} from "./application/export.usecases";

@Module({
  imports: [AvailabilityModule, InspeksiModule], // Sumber data ekspor.
  controllers: [ExportController], // Endpoint unduhan.
  providers: [
    ExportCabangExcelUseCase,
    ExportRegionalExcelUseCase,
    ExportInspeksiPdfUseCase,
  ],
})
export class ExportModule {}
