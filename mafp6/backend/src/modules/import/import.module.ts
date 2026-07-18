// ============================================================================
//  MODUL Import: unggah & impor data historis dari Excel ke database.
// ============================================================================
import { Module } from "@nestjs/common";
import { ImportController } from "./presentation/import.controller";
import { ImportHistorisUseCase } from "./application/import-historis.usecase";
import { EXCEL_PARSER } from "./application/ports/parsed-laporan";
import { IMPORT_REPOSITORY } from "./application/ports/import.repository";
import { ExcelJsLaporanParser } from "./infrastructure/exceljs-laporan.parser";
import { PrismaImportRepository } from "./infrastructure/prisma-import.repository";

@Module({
  controllers: [ImportController], // Endpoint unggah/preview/commit.
  providers: [
    ImportHistorisUseCase,
    // Ikat port parser & repository ke implementasinya.
    { provide: EXCEL_PARSER, useClass: ExcelJsLaporanParser },
    { provide: IMPORT_REPOSITORY, useClass: PrismaImportRepository },
  ],
})
export class ImportModule {}
