// ============================================================================
//  IMPLEMENTASI repository Audit memakai Prisma.
// ============================================================================
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@/shared/prisma/prisma.service";
import {
  AuditRepositoryPort,
  AuditEntry,
  AuditFilter,
  AuditPage,
  AuditRow,
} from "../application/ports/audit.repository";

@Injectable()
export class PrismaAuditRepository implements AuditRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // Simpan satu entri audit.
  async simpan(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        userEmail: entry.userEmail,
        userRole: entry.userRole,
        aksi: entry.aksi,
        metode: entry.metode,
        path: entry.path,
        entitas: entry.entitas,
        entitasId: entry.entitasId,
        status: entry.status,
        berhasil: entry.berhasil,
        ip: entry.ip,
        userAgent: entry.userAgent,
        // Simpan detail sebagai JSON; null bila kosong.
        detail: (entry.detail ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  }

  // Cari entri audit sesuai filter, berpaginasi.
  async cari(filter: AuditFilter): Promise<AuditPage> {
    // Susun kondisi where dinamis dari filter.
    const where: Prisma.AuditLogWhereInput = {
      aksi: filter.aksi,
      entitas: filter.entitas,
      userId: filter.userId,
      berhasil: filter.berhasil,
      // Rentang tanggal bila diberikan.
      createdAt:
        filter.dari || filter.sampai
          ? { gte: filter.dari, lte: filter.sampai }
          : undefined,
    };

    // Hitung total & ambil satu halaman secara paralel.
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" }, // Terbaru dulu.
        skip: (filter.page - 1) * filter.pageSize, // Lewati halaman sebelumnya.
        take: filter.pageSize, // Ambil sejumlah pageSize.
      }),
    ]);

    // Petakan ke bentuk tampilan.
    const items: AuditRow[] = rows.map((r) => ({
      id: r.id,
      userEmail: r.userEmail,
      userRole: r.userRole,
      aksi: r.aksi,
      metode: r.metode,
      path: r.path,
      entitas: r.entitas,
      entitasId: r.entitasId,
      status: r.status,
      berhasil: r.berhasil,
      ip: r.ip,
      detail: r.detail,
      createdAt: r.createdAt,
    }));

    return { items, total, page: filter.page, pageSize: filter.pageSize };
  }
}
