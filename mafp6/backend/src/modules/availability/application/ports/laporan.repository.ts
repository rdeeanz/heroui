// ============================================================================
//  PORT (interface) untuk akses data laporan availability.
//  Application layer HANYA bergantung pada interface ini, bukan Prisma langsung,
//  sehingga implementasi database bisa diganti tanpa mengubah use-case (Clean Arch).
// ============================================================================

// Bentuk baris objek fasilitas mentah dari penyimpanan data.
export interface ObjekRow {
  nama: string;
  panjang: number | null;
  lebar: number | null;
  luas: number | null;
  jumlah: number | null;
  fasilitasTersedia: number;
  rusakRingan: number;
  rusakSedang: number;
  rusakBerat: number;
  fasilitasSiapPakai: number;
  keterangan: string | null;
}

// Bentuk baris fasilitas beserta objek dan kategorinya.
export interface FasilitasRow {
  nama: string;
  operator: string | null;
  konstruksi: string | null; // Jenis konstruksi (kolom pada template Lap. Cabang).
  kategoriKode: string; // "I".."IV".
  kategoriNama: string; // "DERMAGA", dst.
  kategoriUrutan: number; // Untuk pengurutan tampilan.
  objek: ObjekRow[];
}

// Bentuk laporan satu cabang pada satu periode.
export interface LaporanCabangRow {
  cabangNama: string;
  regionalNama: string;
  tahun: number;
  bulan: number;
  status: string;
  fasilitas: FasilitasRow[];
}

// Token injeksi untuk NestJS (karena interface tidak ada di runtime).
export const LAPORAN_REPOSITORY = Symbol("LAPORAN_REPOSITORY");

// Kontrak yang harus dipenuhi implementasi repository.
export interface LaporanRepositoryPort {
  // Ambil satu laporan cabang lengkap (fasilitas + objek) untuk periode tertentu.
  getLaporanCabang(
    cabangId: string,
    tahun: number,
    bulan: number,
  ): Promise<LaporanCabangRow | null>;

  // Ambil seluruh laporan cabang dalam satu regional untuk periode tertentu (rekap).
  getLaporanRegional(
    regionalKode: string,
    tahun: number,
    bulan: number,
  ): Promise<LaporanCabangRow[]>;
}
