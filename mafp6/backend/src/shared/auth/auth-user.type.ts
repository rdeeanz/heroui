// ============================================================================
//  Tipe pengguna terautentikasi (payload JWT) & daftar peran RBAC.
// ============================================================================

// Peran pengguna (selaras enum Role pada Prisma).
export type Role = "ADMIN_PUSAT" | "ADMIN_REGIONAL" | "PIC_CABANG" | "MITRA" | "AUDITOR";

// Data pengguna yang dibawa dalam token JWT dan ditempel ke request.
export interface AuthUser {
  sub: string; // ID pengguna (subject token).
  email: string; // Email/NIPP.
  namaLengkap: string; // Nama lengkap untuk tampilan.
  role: Role; // Peran RBAC.
  cabangId: string | null; // Batas akses cabang (untuk PIC_CABANG).
  regionalKode: string | null; // Batas akses regional (untuk ADMIN_REGIONAL).
}
