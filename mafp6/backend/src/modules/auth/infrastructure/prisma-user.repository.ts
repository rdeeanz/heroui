// ============================================================================
//  IMPLEMENTASI repository User memakai Prisma.
// ============================================================================
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/shared/prisma/prisma.service";
import { UserRepositoryPort, UserRecord } from "../application/ports/user.repository";
import type { Role } from "@/shared/auth/auth-user.type";

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // Cari pengguna berdasarkan email.
  async findByEmail(email: string): Promise<UserRecord | null> {
    // Query satu pengguna dengan email unik.
    const u = await this.prisma.user.findUnique({ where: { email } });
    // Kembalikan null bila tidak ada.
    if (!u) return null;
    // Petakan ke bentuk UserRecord (role di-cast ke tipe union domain).
    return {
      id: u.id,
      email: u.email,
      namaLengkap: u.namaLengkap,
      passwordHash: u.passwordHash,
      role: u.role as Role,
      cabangId: u.cabangId,
      regionalKode: u.regionalKode,
      aktif: u.aktif,
    };
  }
}
