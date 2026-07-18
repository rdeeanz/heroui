// ============================================================================
//  UJI UNIT alur persetujuan: memastikan aturan RBAC (scoping) & transisi
//  status berjalan benar tanpa perlu database (repository dipalsukan).
// ============================================================================
import { describe, it, expect, beforeEach } from "vitest";
import { SubmitLaporanUseCase } from "./submit-laporan.usecase";
import { ReviewLaporanUseCase } from "./review-laporan.usecase";
import type {
  PeriodeRepositoryPort,
  PeriodeDetail,
  UpdateStatusData,
} from "./ports/periode.repository";
import type { AuthUser } from "@/shared/auth/auth-user.type";
import type { NotifikasiService } from "@/modules/notifikasi/application/notifikasi.service";

// NotifikasiService palsu (no-op) — cukup memenuhi kontrak yang dipakai use-case.
const notifPalsu = {
  notifyLaporanSubmitted: async () => {},
  notifyLaporanReviewed: async () => {},
} as unknown as NotifikasiService;

// Buat periode contoh dengan status tertentu.
function periodeContoh(status: PeriodeDetail["status"]): PeriodeDetail {
  return {
    id: "p1",
    cabangId: "cab-benoa",
    cabangNama: "Cabang Benoa",
    regionalKode: "REG3",
    regionalNama: "Regional 3",
    tahun: 2024,
    bulan: 4,
    status,
    submittedAt: null,
    submittedBy: null,
    reviewedAt: null,
    reviewedBy: null,
    catatanReview: null,
  };
}

// Repository palsu yang menyimpan status di memori.
class FakeRepo implements PeriodeRepositoryPort {
  constructor(public periode: PeriodeDetail) {}
  async findById(id: string) {
    return id === this.periode.id ? this.periode : null;
  }
  async updateStatus(_id: string, data: UpdateStatusData) {
    // Terapkan perubahan ke objek di memori lalu kembalikan.
    this.periode = { ...this.periode, ...data } as PeriodeDetail;
    return this.periode;
  }
  async list() {
    return [this.periode];
  }
}

// Pengguna contoh per peran.
const picBenoa: AuthUser = {
  sub: "u1", email: "cabang.benoa@pelindo.co.id", namaLengkap: "PIC", role: "PIC_CABANG",
  cabangId: "cab-benoa", regionalKode: null,
};
const picLain: AuthUser = { ...picBenoa, cabangId: "cab-lain", email: "lain@x.id" };
const regional3: AuthUser = {
  sub: "u2", email: "reg3@x.id", namaLengkap: "Reg", role: "ADMIN_REGIONAL",
  cabangId: null, regionalKode: "REG3",
};
const regionalLain: AuthUser = { ...regional3, regionalKode: "REG1" };

describe("SubmitLaporanUseCase", () => {
  let repo: FakeRepo;
  let usecase: SubmitLaporanUseCase;
  beforeEach(() => {
    repo = new FakeRepo(periodeContoh("DRAFT"));
    usecase = new SubmitLaporanUseCase(repo, notifPalsu);
  });

  it("PIC cabang terkait dapat submit laporan DRAFT -> SUBMITTED", async () => {
    const hasil = await usecase.execute("p1", picBenoa);
    expect(hasil.status).toBe("SUBMITTED");
    expect(hasil.submittedBy).toBe(picBenoa.email);
  });

  it("menolak submit oleh PIC cabang lain (Forbidden)", async () => {
    await expect(usecase.execute("p1", picLain)).rejects.toThrow();
  });

  it("menolak submit oleh peran non-PIC (Forbidden)", async () => {
    await expect(usecase.execute("p1", regional3)).rejects.toThrow();
  });

  it("menolak submit bila status bukan DRAFT/REJECTED", async () => {
    repo = new FakeRepo(periodeContoh("REVIEWED"));
    usecase = new SubmitLaporanUseCase(repo, notifPalsu);
    await expect(usecase.execute("p1", picBenoa)).rejects.toThrow();
  });
});

describe("ReviewLaporanUseCase", () => {
  let repo: FakeRepo;
  let usecase: ReviewLaporanUseCase;
  beforeEach(() => {
    repo = new FakeRepo(periodeContoh("SUBMITTED"));
    usecase = new ReviewLaporanUseCase(repo, notifPalsu);
  });

  it("Admin regional yang sesuai dapat menyetujui SUBMITTED -> REVIEWED", async () => {
    const hasil = await usecase.execute("p1", regional3, "APPROVE");
    expect(hasil.status).toBe("REVIEWED");
    expect(hasil.reviewedBy).toBe(regional3.email);
  });

  it("menolak review oleh admin regional beda wilayah (Forbidden)", async () => {
    await expect(usecase.execute("p1", regionalLain, "APPROVE")).rejects.toThrow();
  });

  it("menolak reject tanpa catatan (BadRequest)", async () => {
    await expect(usecase.execute("p1", regional3, "REJECT")).rejects.toThrow();
  });

  it("reject dengan catatan -> REJECTED beserta catatan", async () => {
    const hasil = await usecase.execute("p1", regional3, "REJECT", "Data belum lengkap");
    expect(hasil.status).toBe("REJECTED");
    expect(hasil.catatanReview).toBe("Data belum lengkap");
  });

  it("menolak review bila status bukan SUBMITTED", async () => {
    repo = new FakeRepo(periodeContoh("DRAFT"));
    usecase = new ReviewLaporanUseCase(repo, notifPalsu);
    await expect(usecase.execute("p1", regional3, "APPROVE")).rejects.toThrow();
  });
});
