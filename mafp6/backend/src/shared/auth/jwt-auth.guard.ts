// ============================================================================
//  GUARD autentikasi JWT (global).
//  Memvalidasi header "Authorization: Bearer <token>", memverifikasi tanda
//  tangan JWT, lalu menempelkan payload pengguna ke request. Endpoint yang
//  ditandai @Public() dilewati tanpa pemeriksaan.
// ============================================================================
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_PUBLIC_KEY } from "./public.decorator";
import type { AuthUser } from "./auth-user.type";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  // Reflector membaca metadata (@Public); JwtService memverifikasi token.
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  // Tentukan apakah request boleh lanjut.
  canActivate(context: ExecutionContext): boolean {
    // Cek apakah handler/kelas ditandai @Public().
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Endpoint publik: langsung izinkan.
    if (isPublic) return true;

    // Ambil request & header Authorization.
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers["authorization"];

    // Wajib ada header "Bearer <token>".
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token tidak ditemukan.");
    }

    // Ambil token setelah kata "Bearer ".
    const token = authHeader.slice(7);

    try {
      // Verifikasi & dekode token; lempar bila tidak valid/kadaluarsa.
      const payload = this.jwt.verify<AuthUser>(token);
      // Tempelkan pengguna ke request agar bisa diambil controller/guard lain.
      request.user = payload;
      return true;
    } catch {
      // Token tidak valid.
      throw new UnauthorizedException("Token tidak valid atau kedaluwarsa.");
    }
  }
}
