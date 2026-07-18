// ============================================================================
//  PORT repository Notifikasi + tipe lintas-layer.
// ============================================================================
import type { Role } from "@/shared/auth/auth-user.type";

// Jenis notifikasi (selaras enum Prisma JenisNotifikasi).
export type JenisNotifikasi =
  | "LAPORAN_SUBMITTED"
  | "LAPORAN_REVIEWED"
  | "LAPORAN_REJECTED"
  | "REMINDER_LAPORAN";

// Penerima notifikasi (untuk in-app + email).
export interface Recipient {
  id: string;
  email: string;
  namaLengkap: string;
}

// Data pembuatan satu notifikasi.
export interface CreateNotifikasiData {
  userId: string;
  jenis: JenisNotifikasi;
  judul: string;
  pesan: string;
  tautan?: string | null;
  kunciUnik?: string | null; // Untuk dedupe reminder.
}

// Baris notifikasi untuk ditampilkan.
export interface NotifikasiRow {
  id: string;
  jenis: JenisNotifikasi;
  judul: string;
  pesan: string;
  tautan: string | null;
  dibacaAt: Date | null;
  createdAt: Date;
}

// Filter pencarian penerima berdasarkan peran & cakupan.
export interface FilterPenerima {
  role: Role;
  regionalKode?: string;
  cabangId?: string;
}

// Cabang yang belum menyelesaikan laporan pada suatu periode + PIC-nya.
export interface CabangButuhLaporan {
  cabangId: string;
  cabangNama: string;
  status: string | null; // null = belum ada laporan; atau DRAFT/REJECTED.
  pic: Recipient[]; // PIC cabang yang perlu diingatkan.
}

// Token injeksi.
export const NOTIFIKASI_REPOSITORY = Symbol("NOTIFIKASI_REPOSITORY");

// Kontrak repository notifikasi.
export interface NotifikasiRepositoryPort {
  // Buat satu notifikasi (untuk event). Mengabaikan konflik dedupe diam-diam.
  create(data: CreateNotifikasiData): Promise<void>;
  // Buat banyak notifikasi sekaligus, LEWATI yang bentrok kunci dedupe.
  // Kembalikan jumlah yang benar-benar dibuat.
  createManyDedup(rows: CreateNotifikasiData[]): Promise<number>;
  // Daftar notifikasi milik user (terbaru dulu), dibatasi jumlah.
  listForUser(userId: string, limit: number): Promise<NotifikasiRow[]>;
  // Jumlah notifikasi belum dibaca.
  countUnread(userId: string): Promise<number>;
  // Tandai satu notifikasi (milik user) sebagai dibaca.
  markRead(id: string, userId: string): Promise<void>;
  // Tandai seluruh notifikasi user sebagai dibaca.
  markAllRead(userId: string): Promise<void>;
  // Cari penerima berdasarkan peran & cakupan (untuk targeting notifikasi).
  findRecipients(filter: FilterPenerima): Promise<Recipient[]>;
  // Cari cabang yang belum menyelesaikan laporan periode tsb + PIC-nya.
  findCabangButuhLaporan(tahun: number, bulan: number): Promise<CabangButuhLaporan[]>;
}
