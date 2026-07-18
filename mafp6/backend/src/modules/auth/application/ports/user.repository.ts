// ============================================================================
//  PORT repository User (dipakai use-case auth). Application tidak tahu Prisma.
// ============================================================================
import type { Role } from "@/shared/auth/auth-user.type";

// Data pengguna yang dibutuhkan proses login (termasuk hash password).
export interface UserRecord {
  id: string;
  email: string;
  namaLengkap: string;
  passwordHash: string; // Hash bcrypt untuk verifikasi.
  role: Role;
  cabangId: string | null;
  regionalKode: string | null;
  aktif: boolean; // Akun aktif atau tidak.
}

// Token injeksi untuk NestJS.
export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

// Kontrak repository User.
export interface UserRepositoryPort {
  // Cari pengguna berdasarkan email (untuk login). Null bila tidak ada.
  findByEmail(email: string): Promise<UserRecord | null>;
}
