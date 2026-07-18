// ============================================================================
//  USE-CASES Export: mengambil data lalu memanggil generator file.
//  Mengembalikan objek berisi buffer + nama file agar controller tinggal kirim.
// ============================================================================
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  LAPORAN_REPOSITORY,
  LaporanRepositoryPort,
} from "@/modules/availability/application/ports/laporan.repository";
import { GetRekapRegionalUseCase } from "@/modules/availability/application/get-rekap-regional.usecase";
import { GetInspeksiUseCase } from "@/modules/inspeksi/application/inspeksi.usecases";
import { generateExcelCabang } from "../infrastructure/excel-cabang.generator";
import { generateExcelRegional } from "../infrastructure/excel-regional.generator";
import { generatePdfInspeksi } from "../infrastructure/pdf-inspeksi.generator";

// Bentuk hasil ekspor: buffer file + nama file yang disarankan.
export interface FileEkspor {
  buffer: Buffer; // Isi file.
  namaFile: string; // Nama file unduhan.
}

// Use-case: ekspor laporan cabang ke Excel (layout "Lap. Cabang").
@Injectable()
export class ExportCabangExcelUseCase {
  constructor(
    @Inject(LAPORAN_REPOSITORY) private readonly repo: LaporanRepositoryPort,
  ) {}

  // Ambil data mentah lalu hasilkan .xlsx.
  async execute(cabangId: string, tahun: number, bulan: number): Promise<FileEkspor> {
    // Ambil laporan cabang mentah (dengan dimensi objek untuk kolom Excel).
    const row = await this.repo.getLaporanCabang(cabangId, tahun, bulan);
    if (!row) throw new NotFoundException("Laporan cabang tidak ditemukan.");
    // Bangun buffer Excel.
    const buffer = await generateExcelCabang(row);
    // Susun nama file yang informatif.
    const namaFile = `Laporan-${bersih(row.cabangNama)}-${bulan}-${tahun}.xlsx`;
    return { buffer, namaFile };
  }
}

// Use-case: ekspor rekap regional ke Excel.
@Injectable()
export class ExportRegionalExcelUseCase {
  constructor(private readonly getRekap: GetRekapRegionalUseCase) {}

  // Hitung rekap lalu hasilkan .xlsx.
  async execute(regionalKode: string, tahun: number, bulan: number): Promise<FileEkspor> {
    // Ambil rekap regional yang sudah dihitung use-case availability.
    const rekap = await this.getRekap.execute(regionalKode, tahun, bulan);
    // Bangun buffer Excel.
    const buffer = await generateExcelRegional(rekap);
    // Nama file.
    const namaFile = `Rekap-${bersih(rekap.regionalNama)}-${bulan}-${tahun}.xlsx`;
    return { buffer, namaFile };
  }
}

// Use-case: ekspor form inspeksi ke PDF.
@Injectable()
export class ExportInspeksiPdfUseCase {
  constructor(private readonly getInspeksi: GetInspeksiUseCase) {}

  // Ambil inspeksi lalu hasilkan PDF.
  async execute(id: string): Promise<FileEkspor> {
    // Ambil data inspeksi (lempar 404 bila tidak ada).
    const inspeksi = await this.getInspeksi.execute(id);
    // Bangun buffer PDF.
    const buffer = await generatePdfInspeksi(inspeksi);
    // Nama file.
    const namaFile = `Inspeksi-${bersih(inspeksi.namaFasilitas)}-${inspeksi.id.slice(0, 8)}.pdf`;
    return { buffer, namaFile };
  }
}

// Fungsi bantu: bersihkan string untuk nama file (ganti spasi/karakter aneh).
function bersih(teks: string): string {
  return teks.replace(/[^a-zA-Z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
