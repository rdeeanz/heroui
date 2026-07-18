// ============================================================================
//  Tipe data yang dikembalikan backend (harus selaras dengan output use-case).
// ============================================================================

// Satu objek fasilitas hasil kalkulasi.
export interface ObjekResult {
  nama: string; // Nama objek/komponen.
  fasilitasTersedia: number; // Nilai tersedia (pembagi).
  rusakRingan?: number; // Rusak ringan.
  rusakSedang?: number; // Rusak sedang.
  rusakBerat?: number; // Rusak berat.
  siapPakai: number; // Nilai siap pakai (pembilang).
  availability: number; // Availability objek (%) presisi penuh.
}

// Satu fasilitas beserta objek dan availabilitynya.
export interface FasilitasResult {
  nama: string;
  operator?: string;
  objek: ObjekResult[];
  availability: number; // Availability fasilitas (%).
}

// Satu kategori beserta fasilitas dan availabilitynya.
export interface KategoriResult {
  kode: string;
  nama: string;
  fasilitas: FasilitasResult[];
  availability: number; // Availability kategori (%).
}

// Hasil kalkulasi satu cabang (pohon lengkap).
export interface CabangResult {
  nama: string;
  kategori: KategoriResult[];
  availability: number; // Availability cabang (%).
}

// Output endpoint laporan cabang.
export interface LaporanCabangOutput {
  cabangNama: string;
  regionalNama: string;
  tahun: number;
  bulan: number;
  status: string;
  hasil: CabangResult;
}

// Entitas master ringkas untuk filter.
export interface Regional {
  id: string;
  kode: string;
  nama: string;
}
export interface Cabang {
  id: string;
  kode: string;
  nama: string;
  regionalId: string;
}
export interface Periode {
  id: string;
  tahun: number;
  bulan: number;
  status: string;
  cabangId: string;
}

// Kondisi item inspeksi (selaras enum backend).
export type KondisiInspeksi =
  | "BAIK"
  | "TIDAK_BERUBAH"
  | "KERUSAKAN_TAMBAHAN"
  | "SUDAH_DIPERBAIKI";

// Satu item detail inspeksi.
export interface ItemInspeksi {
  urutan: number;
  namaItem: string;
  kondisi: KondisiInspeksi;
  keterangan?: string | null;
  fotoUrl?: string | null;
}

// --- Auth & RBAC ---
// Peran pengguna (selaras backend).
export type Role = "ADMIN_PUSAT" | "ADMIN_REGIONAL" | "PIC_CABANG" | "MITRA" | "AUDITOR";

// Data pengguna terautentikasi (payload token).
export interface AuthUser {
  sub: string;
  email: string;
  namaLengkap: string;
  role: Role;
  cabangId: string | null;
  regionalKode: string | null;
}

// Respons login.
export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

// --- Alur persetujuan ---
// Status laporan (selaras enum backend).
export type StatusLaporan = "DRAFT" | "SUBMITTED" | "REVIEWED" | "REJECTED";

// Detail periode laporan untuk workflow.
export interface PeriodeDetail {
  id: string;
  cabangId: string;
  cabangNama: string;
  regionalKode: string;
  regionalNama: string;
  tahun: number;
  bulan: number;
  status: StatusLaporan;
  submittedAt: string | null;
  submittedBy: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  catatanReview: string | null;
}

// Inspeksi lengkap dari backend.
export interface InspeksiLengkap {
  id: string;
  regionalNama: string;
  namaPelabuhan: string;
  namaFasilitas: string;
  lokasiArea?: string | null;
  tanggalInspeksi: string; // ISO string dari API.
  tanggalSebelumnya: string | null;
  ttdCabangNama?: string | null;
  ttdCabangImage?: string | null;
  ttdMitraNama?: string | null;
  ttdMitraImage?: string | null;
  items: ItemInspeksi[];
}

// --- Audit trail ---
// Satu baris jejak audit.
export interface AuditRow {
  id: string;
  userEmail: string | null;
  userRole: string | null;
  aksi: string;
  metode: string;
  path: string;
  entitas: string | null;
  entitasId: string | null;
  status: number | null;
  berhasil: boolean;
  ip: string | null;
  detail: unknown | null;
  createdAt: string;
}

// Hasil pencarian audit (berpaginasi).
export interface AuditPage {
  items: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
}

// --- Notifikasi ---
// Jenis notifikasi (selaras enum backend).
export type JenisNotifikasi =
  | "LAPORAN_SUBMITTED"
  | "LAPORAN_REVIEWED"
  | "LAPORAN_REJECTED"
  | "REMINDER_LAPORAN";

// Satu notifikasi in-app.
export interface NotifikasiItem {
  id: string;
  jenis: JenisNotifikasi;
  judul: string;
  pesan: string;
  tautan: string | null;
  dibacaAt: string | null;
  createdAt: string;
}

// --- Import historis ---
// Metadata kepala hasil parsing.
export interface ParsedMeta {
  regional?: string;
  pelabuhan?: string;
  bulan?: number;
  tahun?: number;
}

// Hasil preview import (dry-run).
export interface PreviewImport {
  sheetName: string;
  meta: ParsedMeta;
  fasilitasCount: number;
  objekCount: number;
  availability: CabangResult; // Pohon availability terhitung.
  warnings: string[];
  sheets: string[]; // Daftar sheet dalam file.
}

// Ringkasan hasil commit import.
export interface ImportSummary {
  periodeId: string;
  fasilitasCount: number;
  objekCount: number;
  warnings: string[];
}

// Payload pembuatan inspeksi (dikirim dari form).
export interface BuatInspeksiPayload {
  regionalNama: string;
  namaPelabuhan: string;
  namaFasilitas: string;
  lokasiArea?: string;
  tanggalInspeksi: string; // ISO date string.
  ttdCabangNama?: string;
  ttdCabangNipp?: string;
  ttdCabangImage?: string | null; // Data URL PNG tanda tangan Cabang.
  ttdMitraNama?: string;
  ttdMitraNipp?: string;
  ttdMitraImage?: string | null; // Data URL PNG tanda tangan Mitra.
  items: {
    urutan: number;
    namaItem: string;
    kondisi: KondisiInspeksi;
    keterangan?: string;
  }[];
}
