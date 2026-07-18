// ============================================================================
//  USE-CASE: Login — verifikasi kredensial lalu terbitkan token JWT.
// ============================================================================
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { USER_REPOSITORY, UserRepositoryPort } from "./ports/user.repository";
import { PASSWORD_HASHER, PasswordHasherPort } from "./ports/password-hasher";
import type { AuthUser } from "@/shared/auth/auth-user.type";

// Hasil login: token + data pengguna (tanpa hash password).
export interface HasilLogin {
  accessToken: string; // Token JWT untuk header Authorization.
  user: AuthUser; // Data pengguna untuk frontend.
}

@Injectable()
export class LoginUseCase {
  // Suntikkan repository user, pemeriksa password, dan penerbit JWT.
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    private readonly jwt: JwtService,
  ) {}

  // Jalankan login dengan email & password.
  async execute(email: string, password: string): Promise<HasilLogin> {
    // Cari pengguna berdasarkan email.
    const user = await this.users.findByEmail(email.toLowerCase().trim());

    // Pesan error sengaja umum agar tidak membocorkan email mana yang ada.
    const gagal = () => new UnauthorizedException("Email atau password salah.");

    // Bila tidak ada atau akun nonaktif, gagal.
    if (!user || !user.aktif) throw gagal();

    // Verifikasi password terhadap hash tersimpan.
    const cocok = await this.hasher.compare(password, user.passwordHash);
    if (!cocok) throw gagal();

    // Susun payload token (tanpa data sensitif seperti hash).
    const payload: AuthUser = {
      sub: user.id,
      email: user.email,
      namaLengkap: user.namaLengkap,
      role: user.role,
      cabangId: user.cabangId,
      regionalKode: user.regionalKode,
    };

    // Terbitkan token JWT (masa berlaku diatur di JwtModule).
    const accessToken = await this.jwt.signAsync(payload);

    // Kembalikan token + data pengguna.
    return { accessToken, user: payload };
  }
}
