// ============================================================================
//  PORT repository Audit Trail + tipe lintas-layer.
// ============================================================================

// Data satu entri audit yang akan dicatat.
export interface AuditEntry {
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  aksi: string; // Kode aksi (mis. "LAPORAN_SUBMIT").
  metode: string; // Metode HTTP.
  path: string; // Path request.
  entitas: string | null; // Jenis entitas.
  entitasId: string | null; // ID entitas.
  status: number | null; // Kode status HTTP.
  berhasil: boolean; // Berhasil/gagal.
  ip: string | null; // IP pelaku.
  userAgent: string | null; // User-Agent.
  detail: unknown | null; // Rincian ter-redaksi (JSON).
}

// Baris audit untuk ditampilkan.
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
  createdAt: Date;
}

// Filter pencarian audit.
export interface AuditFilter {
  aksi?: string;
  entitas?: string;
  userId?: string;
  berhasil?: boolean;
  dari?: Date; // Batas bawah tanggal.
  sampai?: Date; // Batas atas tanggal.
  page: number; // Halaman (mulai 1).
  pageSize: number; // Jumlah per halaman.
}

// Hasil pencarian audit (berpaginasi).
export interface AuditPage {
  items: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
}

// Token injeksi.
export const AUDIT_REPOSITORY = Symbol("AUDIT_REPOSITORY");

// Kontrak repository audit.
export interface AuditRepositoryPort {
  // Simpan satu entri audit.
  simpan(entry: AuditEntry): Promise<void>;
  // Cari entri audit sesuai filter (berpaginasi, terbaru dulu).
  cari(filter: AuditFilter): Promise<AuditPage>;
}
