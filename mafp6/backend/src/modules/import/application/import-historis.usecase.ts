// ============================================================================
//  USE-CASE Import Historis: preview (dry-run) & commit (tulis ke DB).
//  Preview memparse file lalu menghitung availability (memakai domain engine)
//  agar pengguna bisa meninjau sebelum menyimpan. Commit menegakkan RBAC &
//  menangani konflik periode yang sudah ada (opsi overwrite).
// ============================================================================
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  EXCEL_PARSER,
  ExcelParserPort,
  ParsedFasilitas,
  ParsedMeta,
} from "./ports/parsed-laporan";
import {
  IMPORT_REPOSITORY,
  ImportRepositoryPort,
  FasilitasTulis,
} from "./ports/import.repository";
import { hitungAvailabilityCabang, CabangResult, KategoriInput } from "@/shared/domain/availability";
import type { AuthUser } from "@/shared/auth/auth-user.type";

// Hasil preview: struktur + availability terhitung + peringatan + saran periode.
export interface PreviewHasil {
  sheetName: string;
  meta: ParsedMeta;
  fasilitasCount: number;
  objekCount: number;
  availability: CabangResult; // Pohon availability hasil hitung domain.
  warnings: string[];
  sheets: string[]; // Daftar sheet lain (untuk pemilihan ulang).
}

@Injectable()
export class ImportHistorisUseCase {
  constructor(
    @Inject(EXCEL_PARSER) private readonly parser: ExcelParserPort,
    @Inject(IMPORT_REPOSITORY) private readonly repo: ImportRepositoryPort,
  ) {}

  // PREVIEW: parse + hitung availability, tanpa menyimpan.
  async preview(buffer: Buffer, sheetName?: string): Promise<PreviewHasil> {
    // Parse file (auto-deteksi sheet bila tak diberi).
    const hasil = await this.parser.parse(buffer, sheetName);
    // Daftar seluruh sheet untuk opsi pemilihan di UI.
    const sheets = await this.parser.listSheets(buffer);

    // Hitung availability memakai domain engine (nama cabang dari meta/sheet).
    const availability = hitungAvailabilityCabang({
      nama: hasil.meta.pelabuhan ?? hasil.sheetName,
      kategori: kelompokkanKategori(hasil.fasilitas),
    });

    // Hitung total objek.
    const objekCount = hasil.fasilitas.reduce((n, f) => n + f.objek.length, 0);

    return {
      sheetName: hasil.sheetName,
      meta: hasil.meta,
      fasilitasCount: hasil.fasilitas.length,
      objekCount,
      availability,
      warnings: hasil.warnings,
      sheets,
    };
  }

  // COMMIT: parse + validasi RBAC + tulis ke DB.
  async commit(params: {
    buffer: Buffer;
    sheetName?: string;
    cabangId: string;
    tahun: number;
    bulan: number;
    overwrite: boolean;
    user: AuthUser;
  }): Promise<{ periodeId: string; fasilitasCount: number; objekCount: number; warnings: string[] }> {
    // Ambil info cabang target; 404 bila tidak ada.
    const cabang = await this.repo.getCabang(params.cabangId);
    if (!cabang) throw new NotFoundException("Cabang tujuan tidak ditemukan.");

    // RBAC: PIC hanya cabangnya sendiri; ADMIN_PUSAT boleh semua.
    const bolehPusat = params.user.role === "ADMIN_PUSAT";
    const bolehPic = params.user.role === "PIC_CABANG" && params.user.cabangId === params.cabangId;
    if (!bolehPusat && !bolehPic) {
      throw new ForbiddenException("Anda tidak berhak mengimpor data untuk cabang ini.");
    }

    // Validasi bulan/tahun.
    if (params.bulan < 1 || params.bulan > 12) throw new BadRequestException("Bulan harus 1..12.");
    if (params.tahun < 2000 || params.tahun > 2100) throw new BadRequestException("Tahun tidak wajar.");

    // Parse file.
    const hasil = await this.parser.parse(params.buffer, params.sheetName);
    if (hasil.fasilitas.length === 0) {
      throw new BadRequestException("Tidak ada data fasilitas yang bisa diimpor dari file/sheet ini.");
    }

    // Cek konflik: bila periode sudah ada & tidak overwrite -> 409.
    const existing = await this.repo.getPeriodeStatus(params.cabangId, params.tahun, params.bulan);
    if (existing && !params.overwrite) {
      throw new ConflictException(
        `Laporan periode ${params.bulan}-${params.tahun} sudah ada (status ${existing.status}). Aktifkan "timpa" untuk mengganti.`,
      );
    }

    // Susun daftar fasilitas siap tulis (langsung dari hasil parse).
    const fasilitas: FasilitasTulis[] = hasil.fasilitas.map((f) => ({
      kategoriKode: f.kategoriKode,
      kategoriNama: f.kategoriNama,
      namaFasilitas: f.namaFasilitas,
      operator: f.operator,
      konstruksi: f.konstruksi,
      objek: f.objek,
    }));

    // Tulis ke database.
    const tulis = await this.repo.importData({
      cabangId: params.cabangId,
      tahun: params.tahun,
      bulan: params.bulan,
      overwrite: params.overwrite,
      fasilitas,
    });

    // Kembalikan ringkasan + peringatan parsing.
    return {
      periodeId: tulis.periodeId,
      fasilitasCount: tulis.fasilitasCount,
      objekCount: tulis.objekCount,
      warnings: hasil.warnings,
    };
  }
}

// Kelompokkan ParsedFasilitas -> struktur kategori domain (untuk hitung availability).
function kelompokkanKategori(fasilitas: ParsedFasilitas[]): KategoriInput[] {
  // Peta kode kategori -> data kategori domain.
  const peta = new Map<string, KategoriInput>();
  for (const f of fasilitas) {
    // Buat kategori bila belum ada.
    if (!peta.has(f.kategoriKode)) {
      peta.set(f.kategoriKode, { kode: f.kategoriKode, nama: f.kategoriNama, fasilitas: [] });
    }
    // Tambahkan fasilitas + objeknya (petakan ke bentuk input domain).
    peta.get(f.kategoriKode)!.fasilitas.push({
      nama: f.namaFasilitas,
      operator: f.operator ?? undefined,
      objek: f.objek.map((o) => ({
        nama: o.nama,
        fasilitasTersedia: o.fasilitasTersedia,
        rusakRingan: o.rusakRingan,
        rusakSedang: o.rusakSedang,
        rusakBerat: o.rusakBerat,
        fasilitasSiapPakai: o.fasilitasSiapPakai,
      })),
    });
  }
  // Urutkan kategori menurut kode (I, II, III, IV, ...).
  return [...peta.values()].sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true }));
}
