// ============================================================================
//  PORT repository Periode Laporan (untuk alur persetujuan).
// ============================================================================

// Status yang mungkin (selaras enum Prisma StatusLaporan).
export type StatusLaporan = "DRAFT" | "SUBMITTED" | "REVIEWED" | "REJECTED";

// Detail satu periode laporan beserta konteks cabang & regional.
export interface PeriodeDetail {
  id: string;
  cabangId: string;
  cabangNama: string;
  regionalKode: string;
  regionalNama: string;
  tahun: number;
  bulan: number;
  status: StatusLaporan;
  submittedAt: Date | null;
  submittedBy: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  catatanReview: string | null;
}

// Data perubahan status (sebagian field diisi sesuai tahap).
export interface UpdateStatusData {
  status: StatusLaporan;
  submittedAt?: Date | null;
  submittedBy?: string | null;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  catatanReview?: string | null;
}

// Filter daftar periode (dipakai untuk scoping RBAC).
export interface FilterPeriode {
  regionalKode?: string; // Batasi ke satu regional.
  cabangId?: string; // Batasi ke satu cabang.
  status?: StatusLaporan; // Batasi ke satu status.
}

// Token injeksi.
export const PERIODE_REPOSITORY = Symbol("PERIODE_REPOSITORY");

// Kontrak repository periode.
export interface PeriodeRepositoryPort {
  // Ambil satu periode berdasarkan id.
  findById(id: string): Promise<PeriodeDetail | null>;
  // Perbarui status & jejak alur, kembalikan detail terbaru.
  updateStatus(id: string, data: UpdateStatusData): Promise<PeriodeDetail>;
  // Daftar periode sesuai filter, terbaru dulu.
  list(filter: FilterPeriode): Promise<PeriodeDetail[]>;
}
