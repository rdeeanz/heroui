// ============================================================================
//  IMPLEMENTASI repository Notifikasi memakai Prisma.
// ============================================================================
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/shared/prisma/prisma.service";
import {
  NotifikasiRepositoryPort,
  CreateNotifikasiData,
  NotifikasiRow,
  Recipient,
  FilterPenerima,
  CabangButuhLaporan,
  JenisNotifikasi,
} from "../application/ports/notifikasi.repository";
import type { Role } from "@/shared/auth/auth-user.type";

@Injectable()
export class PrismaNotifikasiRepository implements NotifikasiRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // Buat satu notifikasi; abaikan konflik dedupe (P2002) diam-diam.
  async create(data: CreateNotifikasiData): Promise<void> {
    try {
      await this.prisma.notifikasi.create({
        data: {
          userId: data.userId,
          jenis: data.jenis,
          judul: data.judul,
          pesan: data.pesan,
          tautan: data.tautan ?? null,
          kunciUnik: data.kunciUnik ?? null,
        },
      });
    } catch (e: any) {
      // P2002 = pelanggaran unik (dedupe). Selain itu, teruskan error.
      if (e?.code !== "P2002") throw e;
    }
  }

  // Buat banyak notifikasi, lewati yang bentrok kunci dedupe.
  async createManyDedup(rows: CreateNotifikasiData[]): Promise<number> {
    const hasil = await this.prisma.notifikasi.createMany({
      data: rows.map((r) => ({
        userId: r.userId,
        jenis: r.jenis,
        judul: r.judul,
        pesan: r.pesan,
        tautan: r.tautan ?? null,
        kunciUnik: r.kunciUnik ?? null,
      })),
      skipDuplicates: true, // Lewati baris yang melanggar unik (dedupe).
    });
    return hasil.count;
  }

  // Daftar notifikasi milik user, terbaru dulu.
  async listForUser(userId: string, limit: number): Promise<NotifikasiRow[]> {
    const rows = await this.prisma.notifikasi.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      jenis: r.jenis as JenisNotifikasi,
      judul: r.judul,
      pesan: r.pesan,
      tautan: r.tautan,
      dibacaAt: r.dibacaAt,
      createdAt: r.createdAt,
    }));
  }

  // Jumlah notifikasi belum dibaca.
  async countUnread(userId: string): Promise<number> {
    return this.prisma.notifikasi.count({ where: { userId, dibacaAt: null } });
  }

  // Tandai satu notifikasi milik user sebagai dibaca.
  async markRead(id: string, userId: string): Promise<void> {
    // updateMany dengan filter userId memastikan hanya milik sendiri yang berubah.
    await this.prisma.notifikasi.updateMany({
      where: { id, userId, dibacaAt: null },
      data: { dibacaAt: new Date() },
    });
  }

  // Tandai seluruh notifikasi user sebagai dibaca.
  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notifikasi.updateMany({
      where: { userId, dibacaAt: null },
      data: { dibacaAt: new Date() },
    });
  }

  // Cari penerima (user aktif) berdasarkan peran & cakupan.
  async findRecipients(filter: FilterPenerima): Promise<Recipient[]> {
    const users = await this.prisma.user.findMany({
      where: {
        aktif: true, // Hanya akun aktif.
        role: filter.role as Role,
        // Batasi cakupan bila diberikan.
        regionalKode: filter.regionalKode,
        cabangId: filter.cabangId,
      },
      select: { id: true, email: true, namaLengkap: true },
    });
    return users;
  }

  // Cari cabang yang laporannya belum final (belum ada / DRAFT / REJECTED) + PIC-nya.
  async findCabangButuhLaporan(tahun: number, bulan: number): Promise<CabangButuhLaporan[]> {
    // Ambil semua cabang beserta PIC (user role PIC_CABANG) & periode target.
    const cabangs = await this.prisma.cabang.findMany({
      include: {
        // PIC aktif cabang ini.
        users: { where: { role: "PIC_CABANG", aktif: true }, select: { id: true, email: true, namaLengkap: true } },
        // Periode target (bila ada) untuk cek status.
        periode: { where: { tahun, bulan }, select: { status: true } },
      },
    });

    // Bangun daftar cabang yang butuh reminder.
    const hasil: CabangButuhLaporan[] = [];
    for (const c of cabangs) {
      const periode = c.periode[0]; // Maksimal satu (unik per cabang+periode).
      const status = periode?.status ?? null;
      // Butuh reminder bila belum ada laporan, atau masih DRAFT/REJECTED.
      const belumFinal = !periode || status === "DRAFT" || status === "REJECTED";
      // Hanya kirim bila cabang punya PIC.
      if (belumFinal && c.users.length > 0) {
        hasil.push({ cabangId: c.id, cabangNama: c.nama, status, pic: c.users });
      }
    }
    return hasil;
  }
}
