// ============================================================================
//  USE-CASE: Rekap availability seluruh cabang dalam satu regional.
//  Menghasilkan ringkasan per cabang + per kategori + grand total regional,
//  mengikuti layout sheet "Rekap Regional" pada template Excel.
// ============================================================================
import { Inject, Injectable } from "@nestjs/common";
import { LAPORAN_REPOSITORY, LaporanRepositoryPort } from "./ports/laporan.repository";
import { hitungAvailabilityCabang, rataRata } from "@/shared/domain/availability";
import { kelompokkanPerKategori } from "./get-laporan-cabang.usecase";

// Ringkasan availability satu cabang di dalam rekap regional.
export interface RingkasanCabang {
  cabangNama: string;
  // Availability per kategori (kode -> persen presisi penuh).
  perKategori: { kode: string; nama: string; availability: number }[];
  // Availability total cabang.
  availability: number;
}

// Output rekap regional lengkap.
export interface RekapRegionalOutput {
  regionalNama: string;
  tahun: number;
  bulan: number;
  cabang: RingkasanCabang[];
  // Grand total availability regional (rata-rata seluruh cabang).
  availability: number;
}

@Injectable()
export class GetRekapRegionalUseCase {
  constructor(
    @Inject(LAPORAN_REPOSITORY)
    private readonly repo: LaporanRepositoryPort,
  ) {}

  // Hitung rekap untuk sebuah regional & periode.
  async execute(regionalKode: string, tahun: number, bulan: number): Promise<RekapRegionalOutput> {
    // Ambil seluruh laporan cabang pada regional & periode ini.
    const rows = await this.repo.getLaporanRegional(regionalKode, tahun, bulan);

    // Hitung availability tiap cabang memakai domain engine.
    const cabang: RingkasanCabang[] = rows.map((row) => {
      // Bentuk pohon kategori lalu hitung availability cabang.
      const hasil = hitungAvailabilityCabang({
        nama: row.cabangNama,
        kategori: kelompokkanPerKategori(row.fasilitas),
      });
      // Ambil ringkasan per kategori untuk tampilan rekap.
      return {
        cabangNama: row.cabangNama,
        perKategori: hasil.kategori.map((k) => ({
          kode: k.kode,
          nama: k.nama,
          availability: k.availability,
        })),
        availability: hasil.availability,
      };
    });

    // Grand total regional = rata-rata availability seluruh cabang.
    const availability = rataRata(cabang.map((c) => c.availability));

    // Ambil nama regional dari data pertama (bila ada), fallback ke kode.
    const regionalNama = rows[0]?.regionalNama ?? regionalKode;

    return { regionalNama, tahun, bulan, cabang, availability };
  }
}
