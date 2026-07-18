// ============================================================================
//  IMPLEMENTASI repository Inspeksi memakai Prisma/PostgreSQL.
// ============================================================================
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/shared/prisma/prisma.service";
import {
  InspeksiRepositoryPort,
  BuatInspeksiData,
  InspeksiLengkap,
  KondisiInspeksi,
} from "../application/ports/inspeksi.repository";

@Injectable()
export class PrismaInspeksiRepository implements InspeksiRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // Simpan inspeksi baru + itemnya dalam satu operasi.
  async create(data: BuatInspeksiData): Promise<InspeksiLengkap> {
    // Cari tanggal inspeksi terakhir untuk fasilitas yang sama (pembanding).
    const tanggalSebelumnya = await this.findTanggalTerakhir(
      data.namaFasilitas,
      data.tanggalInspeksi,
    );

    // Buat record inspeksi beserta item (nested create).
    const dibuat = await this.prisma.inspeksi.create({
      data: {
        regionalNama: data.regionalNama,
        namaPelabuhan: data.namaPelabuhan,
        namaFasilitas: data.namaFasilitas,
        lokasiArea: data.lokasiArea ?? null,
        tanggalInspeksi: data.tanggalInspeksi,
        tanggalSebelumnya: tanggalSebelumnya, // Auto dari histori.
        ttdCabangNama: data.ttdCabangNama ?? null,
        ttdCabangNipp: data.ttdCabangNipp ?? null,
        ttdCabangImage: data.ttdCabangImage ?? null, // Referensi tanda tangan Cabang.
        ttdMitraNama: data.ttdMitraNama ?? null,
        ttdMitraNipp: data.ttdMitraNipp ?? null,
        ttdMitraImage: data.ttdMitraImage ?? null, // Referensi tanda tangan Mitra.
        // Buat item-item inspeksi sekaligus.
        items: {
          create: data.items.map((it) => ({
            urutan: it.urutan,
            namaItem: it.namaItem,
            kondisi: it.kondisi,
            keterangan: it.keterangan ?? null,
            fotoUrl: it.fotoUrl ?? null,
          })),
        },
      },
      include: { items: { orderBy: { urutan: "asc" } } }, // Sertakan item terurut.
    });

    // Petakan hasil ke bentuk domain.
    return this.mapKeLengkap(dibuat);
  }

  // Ambil satu inspeksi berdasarkan id.
  async findById(id: string): Promise<InspeksiLengkap | null> {
    const found = await this.prisma.inspeksi.findUnique({
      where: { id },
      include: { items: { orderBy: { urutan: "asc" } } },
    });
    return found ? this.mapKeLengkap(found) : null;
  }

  // Daftar seluruh inspeksi (terbaru dulu).
  async list(): Promise<InspeksiLengkap[]> {
    const rows = await this.prisma.inspeksi.findMany({
      include: { items: { orderBy: { urutan: "asc" } } },
      orderBy: { tanggalInspeksi: "desc" },
    });
    return rows.map((r) => this.mapKeLengkap(r));
  }

  // Cari tanggal inspeksi terakhir sebelum tanggal tertentu untuk fasilitas sama.
  async findTanggalTerakhir(namaFasilitas: string, sebelum: Date): Promise<Date | null> {
    const terakhir = await this.prisma.inspeksi.findFirst({
      where: { namaFasilitas, tanggalInspeksi: { lt: sebelum } }, // Sebelum tanggal ini.
      orderBy: { tanggalInspeksi: "desc" }, // Ambil yang paling baru.
      select: { tanggalInspeksi: true },
    });
    return terakhir?.tanggalInspeksi ?? null;
  }

  // Fungsi bantu: konversi record Prisma -> InspeksiLengkap.
  private mapKeLengkap(row: any): InspeksiLengkap {
    return {
      id: row.id,
      regionalNama: row.regionalNama,
      namaPelabuhan: row.namaPelabuhan,
      namaFasilitas: row.namaFasilitas,
      lokasiArea: row.lokasiArea,
      tanggalInspeksi: row.tanggalInspeksi,
      tanggalSebelumnya: row.tanggalSebelumnya,
      ttdCabangNama: row.ttdCabangNama,
      ttdCabangNipp: row.ttdCabangNipp,
      ttdCabangImage: row.ttdCabangImage, // Referensi gambar tanda tangan Cabang.
      ttdMitraNama: row.ttdMitraNama,
      ttdMitraNipp: row.ttdMitraNipp,
      ttdMitraImage: row.ttdMitraImage, // Referensi gambar tanda tangan Mitra.
      createdAt: row.createdAt,
      items: row.items.map((it: any) => ({
        urutan: it.urutan,
        namaItem: it.namaItem,
        kondisi: it.kondisi as KondisiInspeksi,
        keterangan: it.keterangan,
        fotoUrl: it.fotoUrl,
      })),
    };
  }
}
