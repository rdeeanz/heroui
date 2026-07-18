// ============================================================================
//  USE-CASE: Ambil laporan availability satu cabang + kalkulasi berjenjang.
//  Mengorkestrasi: repository (ambil data) -> domain engine (hitung) -> hasil.
// ============================================================================
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  LAPORAN_REPOSITORY,
  LaporanRepositoryPort,
  FasilitasRow,
} from "./ports/laporan.repository";
import {
  hitungAvailabilityCabang,
  CabangResult,
  KategoriInput,
} from "@/shared/domain/availability";

// Struktur hasil akhir yang dikembalikan ke controller (data + metadata).
export interface LaporanCabangOutput {
  cabangNama: string;
  regionalNama: string;
  tahun: number;
  bulan: number;
  status: string;
  hasil: CabangResult; // Pohon availability hasil kalkulasi domain.
}

@Injectable()
export class GetLaporanCabangUseCase {
  // Suntikkan implementasi repository melalui token port (Clean Architecture).
  constructor(
    @Inject(LAPORAN_REPOSITORY)
    private readonly repo: LaporanRepositoryPort,
  ) {}

  // Jalankan use-case untuk sebuah cabang & periode.
  async execute(cabangId: string, tahun: number, bulan: number): Promise<LaporanCabangOutput> {
    // 1) Ambil data mentah dari penyimpanan lewat port.
    const row = await this.repo.getLaporanCabang(cabangId, tahun, bulan);

    // 2) Jika laporan tidak ada, kembalikan error 404 yang jelas.
    if (!row) {
      throw new NotFoundException(
        `Laporan cabang tidak ditemukan untuk periode ${bulan}-${tahun}.`,
      );
    }

    // 3) Ubah baris fasilitas menjadi input domain, dikelompokkan per kategori.
    const kategoriInput = kelompokkanPerKategori(row.fasilitas);

    // 4) Jalankan mesin kalkulasi domain (murni, teruji) untuk seluruh pohon.
    const hasil = hitungAvailabilityCabang({ nama: row.cabangNama, kategori: kategoriInput });

    // 5) Susun output akhir beserta metadata periode.
    return {
      cabangNama: row.cabangNama,
      regionalNama: row.regionalNama,
      tahun: row.tahun,
      bulan: row.bulan,
      status: row.status,
      hasil,
    };
  }
}

// Fungsi bantu: kelompokkan daftar fasilitas ke dalam struktur kategori domain.
export function kelompokkanPerKategori(fasilitas: FasilitasRow[]): KategoriInput[] {
  // Map sementara: kode kategori -> data kategori yang sedang dibangun.
  const peta = new Map<string, KategoriInput & { urutan: number }>();

  // Iterasi tiap fasilitas dan masukkan ke kategori yang sesuai.
  for (const f of fasilitas) {
    // Ambil kategori dari peta, buat baru bila belum ada.
    if (!peta.has(f.kategoriKode)) {
      peta.set(f.kategoriKode, {
        kode: f.kategoriKode,
        nama: f.kategoriNama,
        urutan: f.kategoriUrutan,
        fasilitas: [],
      });
    }
    // Tambahkan fasilitas (beserta objeknya) ke kategori tersebut.
    peta.get(f.kategoriKode)!.fasilitas.push({
      nama: f.nama,
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

  // Urutkan kategori sesuai kolom "urutan" lalu buang field bantu urutan.
  return [...peta.values()]
    .sort((a, b) => a.urutan - b.urutan)
    .map(({ urutan: _urutan, ...rest }) => rest);
}
