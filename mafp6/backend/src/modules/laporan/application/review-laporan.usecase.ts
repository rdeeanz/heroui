// ============================================================================
//  USE-CASE: Review laporan (Regional menyetujui/menolak laporan Cabang).
//  Transisi status: SUBMITTED -> REVIEWED (approve) atau -> REJECTED (reject).
// ============================================================================
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  PERIODE_REPOSITORY,
  PeriodeRepositoryPort,
  PeriodeDetail,
} from "./ports/periode.repository";
import { NotifikasiService } from "@/modules/notifikasi/application/notifikasi.service";
import type { AuthUser } from "@/shared/auth/auth-user.type";

// Keputusan review.
export type KeputusanReview = "APPROVE" | "REJECT";

@Injectable()
export class ReviewLaporanUseCase {
  constructor(
    @Inject(PERIODE_REPOSITORY) private readonly repo: PeriodeRepositoryPort,
    private readonly notifikasi: NotifikasiService, // Untuk memberi tahu PIC Cabang.
  ) {}

  // Jalankan review oleh Admin Regional/Pusat.
  async execute(
    periodeId: string,
    user: AuthUser,
    keputusan: KeputusanReview,
    catatan?: string,
  ): Promise<PeriodeDetail> {
    // Ambil periode; 404 bila tidak ada.
    const periode = await this.repo.findById(periodeId);
    if (!periode) throw new NotFoundException("Periode laporan tidak ditemukan.");

    // Scoping otorisasi:
    // - ADMIN_PUSAT boleh mereview semua.
    // - ADMIN_REGIONAL hanya boleh mereview regionalnya sendiri.
    const bolehPusat = user.role === "ADMIN_PUSAT";
    const bolehRegional =
      user.role === "ADMIN_REGIONAL" && user.regionalKode === periode.regionalKode;
    if (!bolehPusat && !bolehRegional) {
      throw new ForbiddenException("Anda tidak berhak mereview laporan ini.");
    }

    // Hanya laporan berstatus SUBMITTED yang bisa direview.
    if (periode.status !== "SUBMITTED") {
      throw new BadRequestException(
        `Laporan berstatus ${periode.status} tidak dapat direview.`,
      );
    }

    // Untuk penolakan, catatan alasan wajib diisi.
    if (keputusan === "REJECT" && (!catatan || catatan.trim() === "")) {
      throw new BadRequestException("Catatan alasan wajib diisi saat menolak laporan.");
    }

    // Terapkan transisi status sesuai keputusan.
    const hasil = await this.repo.updateStatus(periodeId, {
      status: keputusan === "APPROVE" ? "REVIEWED" : "REJECTED",
      reviewedAt: new Date(),
      reviewedBy: user.email,
      catatanReview: catatan ?? null,
    });

    // Beri tahu PIC cabang tentang hasil review (disetujui/ditolak).
    await this.notifikasi.notifyLaporanReviewed(hasil, keputusan === "APPROVE", catatan);

    return hasil;
  }
}
