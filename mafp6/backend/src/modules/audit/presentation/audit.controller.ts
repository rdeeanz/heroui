// ============================================================================
//  CONTROLLER Audit: baca jejak audit (khusus Admin Pusat & Auditor).
// ============================================================================
import { Controller, Get, Query } from "@nestjs/common";
import { AuditService } from "../application/audit.service";
import { Roles } from "@/shared/auth/roles.decorator";

// Hanya Admin Pusat & Auditor yang boleh melihat jejak audit (PRD §3).
@Roles("ADMIN_PUSAT", "AUDITOR")
@Controller("audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  // GET /audit?aksi=&entitas=&userId=&berhasil=&dari=&sampai=&page=&pageSize=
  @Get()
  async cari(
    @Query("aksi") aksi?: string,
    @Query("entitas") entitas?: string,
    @Query("userId") userId?: string,
    @Query("berhasil") berhasil?: string,
    @Query("dari") dari?: string,
    @Query("sampai") sampai?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    // Konversi & beri nilai default yang aman untuk paginasi.
    const halaman = Math.max(1, parseInt(page ?? "1", 10) || 1);
    const ukuran = Math.min(100, Math.max(1, parseInt(pageSize ?? "25", 10) || 25));

    // Jalankan query dengan filter opsional.
    return this.audit.cari({
      aksi: aksi || undefined,
      entitas: entitas || undefined,
      userId: userId || undefined,
      // "true"/"false" -> boolean; selain itu tak difilter.
      berhasil: berhasil === "true" ? true : berhasil === "false" ? false : undefined,
      dari: dari ? new Date(dari) : undefined,
      sampai: sampai ? new Date(sampai) : undefined,
      page: halaman,
      pageSize: ukuran,
    });
  }
}
