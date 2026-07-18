// ============================================================================
//  PORT pemeriksa/penghasil hash password. Menjaga domain lepas dari bcrypt.
// ============================================================================

// Token injeksi.
export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER");

// Kontrak: bandingkan password polos dengan hash tersimpan.
export interface PasswordHasherPort {
  // Kembalikan true bila password cocok dengan hash.
  compare(plain: string, hash: string): Promise<boolean>;
  // Hasilkan hash dari password polos (untuk pembuatan/ubah akun).
  hash(plain: string): Promise<string>;
}
