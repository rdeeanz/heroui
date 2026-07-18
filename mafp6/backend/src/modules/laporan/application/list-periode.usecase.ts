// ============================================================================
//  USE-CASE: Daftar periode laporan dengan SCOPING sesuai peran pengguna.
//  - ADMIN_PUSAT / AUDITOR / MITRA : lihat semua.
//  - ADMIN_REGIONAL : hanya regionalnya.
//  - PIC_CABANG : hanya cabangnya.
// ============================================================================
import { Inject, Injectable } from "@nestjs/common";
import {
  PERIODE_REPOSITORY,
  PeriodeRepositoryPort,
  PeriodeDetail,
  StatusLaporan,
} from "./ports/periode.repository";
import type { AuthUser } from "@/shared/auth/auth-user.type";

@Injectable()
export class ListPeriodeUseCase {
  constructor(
    @Inject(PERIODE_REPOSITORY) private readonly repo: PeriodeRepositoryPort,
  ) {}

  // Jalankan daftar periode; filter status opsional.
  async execute(user: AuthUser, status?: StatusLaporan): Promise<PeriodeDetail[]> {
    // Tentukan batasan cakupan berdasarkan peran pengguna.
    if (user.role === "ADMIN_REGIONAL") {
      // Regional: batasi ke regionalnya.
      return this.repo.list({ regionalKode: user.regionalKode ?? "___none___", status });
    }
    if (user.role === "PIC_CABANG") {
      // PIC Cabang: batasi ke cabangnya.
      return this.repo.list({ cabangId: user.cabangId ?? "___none___", status });
    }
    // Pusat/Auditor/Mitra: seluruh data (read).
    return this.repo.list({ status });
  }
}
