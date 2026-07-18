// ============================================================================
//  MODUL Audit: mencatat jejak (via interceptor global) & menyediakan API baca.
// ============================================================================
import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditController } from "./presentation/audit.controller";
import { AuditService } from "./application/audit.service";
import { AUDIT_REPOSITORY } from "./application/ports/audit.repository";
import { PrismaAuditRepository } from "./infrastructure/prisma-audit.repository";
import { AuditInterceptor } from "./infrastructure/audit.interceptor";

@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    // Ikat port ke implementasi Prisma.
    { provide: AUDIT_REPOSITORY, useClass: PrismaAuditRepository },
    // Daftarkan interceptor audit sebagai GLOBAL (mencatat semua aksi ubah data).
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService], // Ekspor bila modul lain butuh mencatat manual.
})
export class AuditModule {}
