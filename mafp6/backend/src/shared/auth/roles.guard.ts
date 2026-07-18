// ============================================================================
//  GUARD peran (global).
//  Membaca daftar peran dari @Roles(...) lalu memastikan peran pengguna
//  termasuk di dalamnya. Bila endpoint tak menandai @Roles, akses diizinkan
//  (cukup terautentikasi).
// ============================================================================
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";
import type { AuthUser, Role } from "./auth-user.type";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  // Tentukan apakah peran pengguna memenuhi syarat endpoint.
  canActivate(context: ExecutionContext): boolean {
    // Ambil daftar peran yang diizinkan dari metadata handler/kelas.
    const rolesDiizinkan = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Tanpa @Roles: cukup terautentikasi (izinkan).
    if (!rolesDiizinkan || rolesDiizinkan.length === 0) return true;

    // Ambil pengguna dari request (ditempel JwtAuthGuard).
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;

    // Bila peran pengguna tidak termasuk yang diizinkan, tolak.
    if (!user || !rolesDiizinkan.includes(user.role)) {
      throw new ForbiddenException("Anda tidak memiliki hak akses untuk aksi ini.");
    }
    return true;
  }
}
