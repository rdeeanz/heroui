// ============================================================================
//  USE-CASE: Submit laporan (PIC Cabang mengirim laporan ke Regional).
//  Transisi status: DRAFT | REJECTED -> SUBMITTED.
// ============================================================================
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  PERIODE_REPOSITORY,
  PeriodeRepositoryPort,
  PeriodeDetail,
} from "./ports/periode.repository";
import { NotifikasiService } from "@/modules/notifikasi/application/notifikasi.service";
import type { AuthUser } from "@/shared/auth/auth-user.type";

@Injectable()
export class SubmitLaporanUseCase {
  constructor(
    @Inject(PERIODE_REPOSITORY) private readonly repo: PeriodeRepositoryPort,
    private readonly notifikasi: NotifikasiService, // Untuk memberi tahu Regional/Pusat.
  ) {}

  // Jalankan submit oleh pengguna tertentu.
  async execute(periodeId: string, user: AuthUser): Promise<PeriodeDetail> {
    // Ambil periode; 404 bila tidak ada.
    const periode = await this.repo.findById(periodeId);
    if (!periode) throw new NotFoundException("Periode laporan tidak ditemukan.");

    // Scoping: hanya PIC Cabang pemilik cabang tersebut yang boleh submit.
    if (user.role !== "PIC_CABANG" || user.cabangId !== periode.cabangId) {
      throw new ForbiddenException("Hanya PIC cabang terkait yang dapat submit laporan ini.");
    }

    // Hanya laporan DRAFT atau yang REJECTED (revisi) yang boleh disubmit.
    if (periode.status !== "DRAFT" && periode.status !== "REJECTED") {
      throw new BadRequestException(
        `Laporan berstatus ${periode.status} tidak dapat disubmit.`,
      );
    }

    // Ubah status menjadi SUBMITTED + catat jejak pengirim.
    const hasil = await this.repo.updateStatus(periodeId, {
      status: "SUBMITTED",
      submittedAt: new Date(),
      submittedBy: user.email,
      catatanReview: null, // Bersihkan catatan penolakan sebelumnya.
    });

    // Beri tahu Admin Regional (wilayah tsb) & Pusat bahwa ada laporan baru.
    // Kegagalan notifikasi tidak boleh menggagalkan submit -> ditangani service.
    await this.notifikasi.notifyLaporanSubmitted(hasil);

    return hasil;
  }
}
