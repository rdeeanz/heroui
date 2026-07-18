// ============================================================================
//  IMPLEMENTASI repository Periode memakai Prisma.
// ============================================================================
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/shared/prisma/prisma.service";
import {
  PeriodeRepositoryPort,
  PeriodeDetail,
  UpdateStatusData,
  FilterPeriode,
  StatusLaporan,
} from "../application/ports/periode.repository";

// Query include standar: bawa data cabang & regional untuk konteks.
const INCLUDE = { cabang: { include: { regional: true } } } as const;

@Injectable()
export class PrismaPeriodeRepository implements PeriodeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // Ambil satu periode + konteks cabang/regional.
  async findById(id: string): Promise<PeriodeDetail | null> {
    const p = await this.prisma.periodeLaporan.findUnique({ where: { id }, include: INCLUDE });
    return p ? this.map(p) : null;
  }

  // Perbarui status & jejak alur.
  async updateStatus(id: string, data: UpdateStatusData): Promise<PeriodeDetail> {
    const p = await this.prisma.periodeLaporan.update({
      where: { id },
      data, // Field yang undefined diabaikan Prisma (tidak diubah).
      include: INCLUDE,
    });
    return this.map(p);
  }

  // Daftar periode sesuai filter, terbaru dulu.
  async list(filter: FilterPeriode): Promise<PeriodeDetail[]> {
    // Susun kondisi where dinamis dari filter.
    const rows = await this.prisma.periodeLaporan.findMany({
      where: {
        // Filter status bila diberikan.
        status: filter.status,
        // Filter cabang bila diberikan.
        cabangId: filter.cabangId,
        // Filter regional (via relasi cabang) bila diberikan.
        ...(filter.regionalKode
          ? { cabang: { regional: { kode: filter.regionalKode } } }
          : {}),
      },
      include: INCLUDE,
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }, { cabang: { nama: "asc" } }],
    });
    return rows.map((r) => this.map(r));
  }

  // Fungsi bantu: petakan entity Prisma -> PeriodeDetail.
  private map(p: any): PeriodeDetail {
    return {
      id: p.id,
      cabangId: p.cabangId,
      cabangNama: p.cabang.nama,
      regionalKode: p.cabang.regional.kode,
      regionalNama: p.cabang.regional.nama,
      tahun: p.tahun,
      bulan: p.bulan,
      status: p.status as StatusLaporan,
      submittedAt: p.submittedAt,
      submittedBy: p.submittedBy,
      reviewedAt: p.reviewedAt,
      reviewedBy: p.reviewedBy,
      catatanReview: p.catatanReview,
    };
  }
}
