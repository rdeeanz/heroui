// ============================================================================
//  CONTROLLER Export: endpoint unduhan file Excel & PDF.
//  Menyetel header Content-Type & Content-Disposition agar browser mengunduh.
// ============================================================================
import { Controller, Get, Param, Query, Res, ParseIntPipe } from "@nestjs/common";
import type { Response } from "express";
import {
  ExportCabangExcelUseCase,
  ExportRegionalExcelUseCase,
  ExportInspeksiPdfUseCase,
  FileEkspor,
} from "../application/export.usecases";

// Tipe MIME untuk file Excel (.xlsx).
const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

@Controller("export")
export class ExportController {
  constructor(
    private readonly exportCabang: ExportCabangExcelUseCase,
    private readonly exportRegional: ExportRegionalExcelUseCase,
    private readonly exportInspeksi: ExportInspeksiPdfUseCase,
  ) {}

  // GET /export/cabang/:cabangId/excel?tahun=2024&bulan=2
  @Get("cabang/:cabangId/excel")
  async cabangExcel(
    @Param("cabangId") cabangId: string,
    @Query("tahun", ParseIntPipe) tahun: number,
    @Query("bulan", ParseIntPipe) bulan: number,
    @Res() res: Response,
  ): Promise<void> {
    // Jalankan use-case lalu kirim file sebagai unduhan.
    const file = await this.exportCabang.execute(cabangId, tahun, bulan);
    kirimFile(res, file, MIME_XLSX);
  }

  // GET /export/regional/:regionalKode/excel?tahun=2024&bulan=2
  @Get("regional/:regionalKode/excel")
  async regionalExcel(
    @Param("regionalKode") regionalKode: string,
    @Query("tahun", ParseIntPipe) tahun: number,
    @Query("bulan", ParseIntPipe) bulan: number,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.exportRegional.execute(regionalKode, tahun, bulan);
    kirimFile(res, file, MIME_XLSX);
  }

  // GET /export/inspeksi/:id/pdf
  @Get("inspeksi/:id/pdf")
  async inspeksiPdf(@Param("id") id: string, @Res() res: Response): Promise<void> {
    const file = await this.exportInspeksi.execute(id);
    kirimFile(res, file, "application/pdf");
  }
}

// Fungsi bantu: kirim buffer file sebagai unduhan dengan header yang tepat.
function kirimFile(res: Response, file: FileEkspor, mime: string): void {
  // Set tipe konten sesuai jenis file.
  res.setHeader("Content-Type", mime);
  // Set nama file unduhan (Content-Disposition: attachment).
  res.setHeader("Content-Disposition", `attachment; filename="${file.namaFile}"`);
  // Kirim isi buffer.
  res.end(file.buffer);
}
