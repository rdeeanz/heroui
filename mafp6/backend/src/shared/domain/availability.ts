/**
 * ============================================================================
 *  MESIN KALKULASI AVAILABILITY FASILITAS (pure domain logic)
 * ----------------------------------------------------------------------------
 *  File ini TIDAK bergantung pada NestJS, Prisma, atau framework apa pun.
 *  Isinya murni aturan bisnis, sehingga mudah diuji unit dan diaudit.
 *
 *  Aturan availability (diturunkan langsung dari template Excel Pelindo):
 *    - Availability Objek Fasilitas (%) = Fasilitas Siap Pakai / Fasilitas Tersedia x 100
 *    - Availability Fasilitas           = rata-rata availability seluruh Objek di dalamnya
 *    - Availability Kategori            = rata-rata availability seluruh Fasilitas
 *    - Availability Cabang              = rata-rata availability seluruh Kategori
 *    - Availability Regional            = rata-rata availability seluruh Cabang
 * ============================================================================
 */

/** Data mentah satu Objek Fasilitas (mis. Pelat Lantai, Bollard, Fender). */
export interface ObjekFasilitasInput {
  /** Nama objek/komponen fasilitas. */
  nama: string;
  /** Jumlah/ukuran fasilitas yang tersedia (unit / m / m2). Menjadi PEMBAGI. */
  fasilitasTersedia: number;
  /** Bagian yang rusak ringan (opsional, untuk informasi & audit). */
  rusakRingan?: number;
  /** Bagian yang rusak sedang (opsional). */
  rusakSedang?: number;
  /** Bagian yang rusak berat (opsional). */
  rusakBerat?: number;
  /**
   * Fasilitas yang benar-benar siap pakai. Menjadi PEMBILANG.
   * Jika tidak diisi, dihitung otomatis: tersedia - (ringan + sedang + berat).
   */
  fasilitasSiapPakai?: number;
}

/** Hasil kalkulasi satu Objek Fasilitas. */
export interface ObjekFasilitasResult extends ObjekFasilitasInput {
  /** Nilai siap pakai final yang dipakai (setelah fallback perhitungan). */
  siapPakai: number;
  /** Availability objek dalam persen (0..100), dibulatkan sesuai presisi. */
  availability: number;
}

/** Satu unit presisi standar (2 desimal) agar konsisten dengan output Excel. */
const PRESISI_DESIMAL = 2;

/** Membulatkan angka ke sejumlah desimal tertentu secara stabil. */
export function bulatkan(nilai: number, desimal: number = PRESISI_DESIMAL): number {
  // Faktor pengali untuk menggeser koma (mis. 2 desimal -> 100).
  const faktor = Math.pow(10, desimal);
  // Bulatkan lalu bagi kembali agar dapat angka dengan desimal yang diminta.
  return Math.round((nilai + Number.EPSILON) * faktor) / faktor;
}

/**
 * Hitung availability satu Objek Fasilitas.
 * Rumus: siapPakai / tersedia x 100. Aman terhadap pembagian nol.
 */
export function hitungAvailabilityObjek(objek: ObjekFasilitasInput): ObjekFasilitasResult {
  // Ambil nilai tersedia; jaga agar tidak negatif.
  const tersedia = Math.max(0, objek.fasilitasTersedia ?? 0);

  // Jumlah kerusakan total (dipakai untuk menghitung siap pakai bila tidak diisi).
  const totalRusak =
    (objek.rusakRingan ?? 0) + (objek.rusakSedang ?? 0) + (objek.rusakBerat ?? 0);

  // Tentukan nilai siap pakai: pakai input bila ada, jika tidak hitung dari kerusakan.
  const siapPakai =
    objek.fasilitasSiapPakai !== undefined && objek.fasilitasSiapPakai !== null
      ? Math.max(0, objek.fasilitasSiapPakai)
      : Math.max(0, tersedia - totalRusak);

  // Hindari pembagian nol: bila tidak ada fasilitas tersedia, availability dianggap 0.
  // Catatan penting: nilai disimpan dengan PRESISI PENUH (tanpa pembulatan).
  // Pembulatan HANYA dilakukan saat menampilkan/ekspor (pakai fungsi `bulatkan`),
  // agar hasil agregasi berjenjang persis sama dengan rumus Excel.
  const availability = tersedia === 0 ? 0 : (siapPakai / tersedia) * 100;

  // Kembalikan objek beserta hasil hitungnya.
  return { ...objek, siapPakai, availability };
}

/**
 * Rata-rata sederhana dari daftar persentase.
 * Sesuai template Excel: agregasi antar-level memakai mean aritmetik.
 */
export function rataRata(nilaiPersen: number[]): number {
  // Bila daftar kosong, kembalikan 0 agar tidak NaN.
  if (nilaiPersen.length === 0) return 0;
  // Jumlahkan semua nilai lalu bagi dengan banyaknya elemen.
  // Hasil dibiarkan presisi penuh (tanpa pembulatan) untuk agregasi berjenjang.
  const total = nilaiPersen.reduce((acc, n) => acc + n, 0);
  return total / nilaiPersen.length;
}

/** Input satu Fasilitas (mis. "Dermaga A") berisi banyak Objek. */
export interface FasilitasInput {
  nama: string;
  /** Operator/mitra pengelola (mis. SPTP, SPMT, SPSL). */
  operator?: string;
  objek: ObjekFasilitasInput[];
}

/** Hasil kalkulasi satu Fasilitas. */
export interface FasilitasResult {
  nama: string;
  operator?: string;
  objek: ObjekFasilitasResult[];
  /** Availability fasilitas = rata-rata availability objek di dalamnya. */
  availability: number;
}

/** Hitung availability satu Fasilitas dari seluruh objeknya. */
export function hitungAvailabilityFasilitas(fasilitas: FasilitasInput): FasilitasResult {
  // Hitung availability tiap objek terlebih dahulu.
  const objek = fasilitas.objek.map(hitungAvailabilityObjek);
  // Availability fasilitas = rata-rata availability seluruh objek.
  const availability = rataRata(objek.map((o) => o.availability));
  return { nama: fasilitas.nama, operator: fasilitas.operator, objek, availability };
}

/** Input satu Kategori (mis. DERMAGA) berisi banyak Fasilitas. */
export interface KategoriInput {
  /** Kode urut kategori (I, II, III, IV) untuk tampilan. */
  kode: string;
  nama: string;
  fasilitas: FasilitasInput[];
}

/** Hasil kalkulasi satu Kategori. */
export interface KategoriResult {
  kode: string;
  nama: string;
  fasilitas: FasilitasResult[];
  /** Availability kategori = rata-rata availability seluruh fasilitas. */
  availability: number;
}

/** Hitung availability satu Kategori dari seluruh fasilitasnya. */
export function hitungAvailabilityKategori(kategori: KategoriInput): KategoriResult {
  // Hitung availability tiap fasilitas.
  const fasilitas = kategori.fasilitas.map(hitungAvailabilityFasilitas);
  // Availability kategori = rata-rata availability seluruh fasilitas.
  const availability = rataRata(fasilitas.map((f) => f.availability));
  return { kode: kategori.kode, nama: kategori.nama, fasilitas, availability };
}

/** Input satu Cabang/Pelabuhan berisi banyak Kategori. */
export interface CabangInput {
  nama: string;
  kategori: KategoriInput[];
}

/** Hasil kalkulasi satu Cabang. */
export interface CabangResult {
  nama: string;
  kategori: KategoriResult[];
  /** Availability cabang = rata-rata availability seluruh kategori. */
  availability: number;
}

/** Hitung availability satu Cabang dari seluruh kategorinya. */
export function hitungAvailabilityCabang(cabang: CabangInput): CabangResult {
  // Hitung availability tiap kategori.
  const kategori = cabang.kategori.map(hitungAvailabilityKategori);
  // Availability cabang = rata-rata availability seluruh kategori.
  const availability = rataRata(kategori.map((k) => k.availability));
  return { nama: cabang.nama, kategori, availability };
}

/** Input satu Regional berisi banyak Cabang. */
export interface RegionalInput {
  nama: string;
  cabang: CabangInput[];
}

/** Hasil kalkulasi satu Regional. */
export interface RegionalResult {
  nama: string;
  cabang: CabangResult[];
  /** Availability regional = rata-rata availability seluruh cabang. */
  availability: number;
}

/** Hitung availability satu Regional dari seluruh cabangnya. */
export function hitungAvailabilityRegional(regional: RegionalInput): RegionalResult {
  // Hitung availability tiap cabang.
  const cabang = regional.cabang.map(hitungAvailabilityCabang);
  // Availability regional = rata-rata availability seluruh cabang.
  const availability = rataRata(cabang.map((c) => c.availability));
  return { nama: regional.nama, cabang, availability };
}
