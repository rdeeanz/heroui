// ============================================================================
//  CONTROLLER Auth: endpoint login (publik) & profil pengguna aktif (me).
// ============================================================================
import { Body, Controller, Get, Post } from "@nestjs/common";
import { IsEmail, IsString, MinLength } from "class-validator";
import { LoginUseCase } from "../application/login.usecase";
import { Public } from "@/shared/auth/public.decorator";
import { CurrentUser } from "@/shared/auth/current-user.decorator";
import type { AuthUser } from "@/shared/auth/auth-user.type";

// DTO login: email + password tervalidasi.
class LoginDto {
  @IsEmail({}, { message: "Format email tidak valid." }) email!: string; // Email wajib valid.
  @IsString() @MinLength(6, { message: "Password minimal 6 karakter." }) password!: string; // Password.
}

@Controller("auth")
export class AuthController {
  constructor(private readonly login: LoginUseCase) {}

  // POST /auth/login (publik) -> kembalikan token + data user.
  @Public()
  @Post("login")
  async loginHandler(@Body() dto: LoginDto) {
    return this.login.execute(dto.email, dto.password);
  }

  // GET /auth/me -> kembalikan data pengguna dari token (butuh autentikasi).
  @Get("me")
  async me(@CurrentUser() user: AuthUser) {
    // Kembalikan payload pengguna yang sudah diverifikasi guard.
    return user;
  }
}
