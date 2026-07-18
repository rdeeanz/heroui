// ============================================================================
//  Dekorator parameter @CurrentUser() untuk mengambil pengguna terautentikasi
//  dari request (ditempel oleh JwtAuthGuard).
// ============================================================================
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthUser } from "./auth-user.type";

// Ambil objek user dari request HTTP.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    // Ambil request dari konteks HTTP.
    const request = ctx.switchToHttp().getRequest();
    // Kembalikan user yang sudah ditempel guard.
    return request.user as AuthUser;
  },
);
