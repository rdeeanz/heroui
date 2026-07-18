// ============================================================================
//  CONTROLLER Laporan/Workflow: daftar periode + submit + review.
//  Gating kasar via @Roles; scoping halus (regional/cabang) di dalam use-case.
// ============================================================================
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { IsIn, IsOptional, IsString } from "class-validator";
import { SubmitLaporanUseCase } from "../application/submit-laporan.usecase";
import { ReviewLaporanUseCase, KeputusanReview } from "../application/review-laporan.usecase";
import { ListPeriodeUseCase } from "../application/list-periode.usecase";
import type { StatusLaporan } from "../application/ports/periode.repository";
import { Roles } from "@/shared/auth/roles.decorator";
import { CurrentUser } from "@/shared/auth/current-user.decorator";
import type { AuthUser } from "@/shared/auth/auth-user.type";

// DTO body review: keputusan + catatan opsional.
class ReviewDto {
  @IsIn(["APPROVE", "REJECT"]) keputusan!: KeputusanReview; // Setujui atau tolak.
  @IsOptional() @IsString() catatan?: string; // Alasan (wajib bila REJECT — dicek use-case).
}

@Controller("laporan")
export class LaporanController {
  constructor(
    private readonly listPeriode: ListPeriodeUseCase,
    private readonly submitLaporan: SubmitLaporanUseCase,
    private readonly reviewLaporan: ReviewLaporanUseCase,
  ) {}

  // GET /laporan/periode?status=SUBMITTED -> daftar sesuai cakupan peran.
  @Get("periode")
  async periode(
    @CurrentUser() user: AuthUser, // Pengguna aktif (untuk scoping).
    @Query("status") status?: StatusLaporan, // Filter status opsional.
  ) {
    return this.listPeriode.execute(user, status);
  }

  // POST /laporan/periode/:id/submit -> PIC Cabang submit laporan.
  @Roles("PIC_CABANG") // Hanya PIC Cabang yang boleh memanggil.
  @Post("periode/:id/submit")
  async submit(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.submitLaporan.execute(id, user);
  }

  // POST /laporan/periode/:id/review -> Regional/Pusat menyetujui/menolak.
  @Roles("ADMIN_REGIONAL", "ADMIN_PUSAT") // Hanya regional/pusat.
  @Post("periode/:id/review")
  async review(
    @Param("id") id: string,
    @Body() dto: ReviewDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reviewLaporan.execute(id, user, dto.keputusan, dto.catatan);
  }
}
