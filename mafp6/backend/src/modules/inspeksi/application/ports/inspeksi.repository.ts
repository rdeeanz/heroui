// ============================================================================
//  PORT repository Inspeksi + tipe data lintas-layer.
// ============================================================================

// Kondisi hasil inspeksi (selaras enum Prisma KondisiInspeksi).
export type KondisiInspeksi =
  | "BAIK" // 1. Baik.
  | "TIDAK_BERUBAH" // 2. Tidak ada perubahan.
  | "KERUSAKAN_TAMBAHAN" // 3. Ada kerusakan tambahan.
  | "SUDAH_DIPERBAIKI"; // 4. Kerusakan sudah diperbaiki.

// Satu item detail inspeksi.
export interface ItemInspeksi {
  urutan: number; // Nomor urut item.
  namaItem: string; // Nama item (mis. "Pelat Lantai").
  kondisi: KondisiInspeksi; // Kondisi terpilih.
  keterangan?: string | null; // Keterangan tambahan.
  fotoUrl?: string | null; // URL foto kondisi (S3).
}

// Data untuk membuat inspeksi baru (tanpa id/timestamps).
export interface BuatInspeksiData {
  regionalNama: string;
  namaPelabuhan: string;
  namaFasilitas: string;
  lokasiArea?: string | null;
  tanggalInspeksi: Date;
  ttdCabangNama?: string | null;
  ttdCabangNipp?: string | null;
  ttdCabangImage?: string | null; // Referensi gambar tanda tangan Cabang (data URL / URL S3).
  ttdMitraNama?: string | null;
  ttdMitraNipp?: string | null;
  ttdMitraImage?: string | null; // Referensi gambar tanda tangan Mitra.
  items: ItemInspeksi[];
}

// Inspeksi lengkap (hasil baca), termasuk id & tanggal sebelumnya.
export interface InspeksiLengkap extends BuatInspeksiData {
  id: string;
  tanggalSebelumnya: Date | null; // Auto dari histori fasilitas yang sama.
  createdAt: Date;
}

// Data mentah pembuatan inspeksi dari controller: gambar tanda tangan masih
// berupa data URL base64 sebelum diproses oleh SignatureStoragePort.
export interface BuatInspeksiInput extends Omit<BuatInspeksiData, "ttdCabangImage" | "ttdMitraImage"> {
  ttdCabangImage?: string | null; // Data URL PNG dari signature pad Cabang.
  ttdMitraImage?: string | null; // Data URL PNG dari signature pad Mitra.
}

// Token injeksi untuk NestJS.
export const INSPEKSI_REPOSITORY = Symbol("INSPEKSI_REPOSITORY");

// Kontrak repository Inspeksi.
export interface InspeksiRepositoryPort {
  // Simpan inspeksi baru; tanggalSebelumnya diisi otomatis dari histori.
  create(data: BuatInspeksiData): Promise<InspeksiLengkap>;

  // Ambil satu inspeksi berdasarkan id.
  findById(id: string): Promise<InspeksiLengkap | null>;

  // Daftar ringkas inspeksi (untuk tabel/list).
  list(): Promise<InspeksiLengkap[]>;

  // Cari tanggal inspeksi terakhir untuk fasilitas tertentu (pembanding).
  findTanggalTerakhir(namaFasilitas: string, sebelum: Date): Promise<Date | null>;
}
