// ============================================================================
//  MODUL Auth: menyiapkan JWT, use-case login, repository & hasher,
//  serta MENDAFTARKAN guard global (JWT + Roles) untuk seluruh aplikasi.
//  JwtModule diekspor agar JwtAuthGuard (dipakai global) bisa memakai JwtService.
// ============================================================================
import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./presentation/auth.controller";
import { LoginUseCase } from "./application/login.usecase";
import { USER_REPOSITORY } from "./application/ports/user.repository";
import { PASSWORD_HASHER } from "./application/ports/password-hasher";
import { PrismaUserRepository } from "./infrastructure/prisma-user.repository";
import { BcryptPasswordHasher } from "./infrastructure/bcrypt-password-hasher";
import { JwtAuthGuard } from "@/shared/auth/jwt-auth.guard";
import { RolesGuard } from "@/shared/auth/roles.guard";

// @Global agar JwtModule/JwtService tersedia untuk guard global di modul lain.
@Global()
@Module({
  imports: [
    // Konfigurasi JWT secara async agar bisa membaca secret dari environment.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Kunci penandatangan diambil dari env (WAJIB diganti di produksi).
        secret: config.get<string>("JWT_SECRET") ?? "dev-secret-ubah-di-produksi",
        // Masa berlaku token (default 1 hari). Cast karena tipe "ms" ketat.
        signOptions: {
          expiresIn: (config.get<string>("JWT_EXPIRES_IN") ?? "1d") as unknown as number,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    // Ikat port ke implementasi konkret.
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    // Daftarkan guard sebagai GLOBAL: JWT dulu (autentikasi), lalu Roles (otorisasi).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  // Ekspor JwtModule agar JwtService dapat di-inject guard global.
  exports: [JwtModule],
})
export class AuthModule {}
