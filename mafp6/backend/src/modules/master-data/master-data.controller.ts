// ============================================================================
//  CONTROLLER master data: menyediakan daftar Regional, Cabang, Kategori,
//  serta daftar periode yang tersedia — dipakai frontend untuk mengisi filter.
// ============================================================================
import { Controller, Get, Query } from "@nestjs/common";
import { PrismaService } from "@/shared/prisma/prisma.service";

@Controller("master")
export class MasterDataController {
  // Suntikkan Prisma untuk query baca sederhana.
  constructor(private readonly prisma: PrismaService) {}

  // GET /master/regional -> daftar seluruh regional.
  @Get("regional")
  async regional() {
    // Ambil regional terurut menurut kode; hanya kolom yang diperlukan.
    return this.prisma.regional.findMany({
      select: { id: true, kode: true, nama: true },
      orderBy: { kode: "asc" },
    });
  }

  // GET /master/cabang?regionalKode=REG3 -> daftar cabang (opsional filter regional).
  @Get("cabang")
  async cabang(@Query("regionalKode") regionalKode?: string) {
    // Susun filter: bila regionalKode diberikan, batasi ke regional tersebut.
    const where = regionalKode ? { regional: { kode: regionalKode } } : {};
    return this.prisma.cabang.findMany({
      where, // Filter dinamis.
      select: { id: true, kode: true, nama: true, regionalId: true },
      orderBy: { nama: "asc" },
    });
  }

  // GET /master/kategori -> daftar kategori fasilitas.
  @Get("kategori")
  async kategori() {
    return this.prisma.kategori.findMany({
      select: { id: true, kode: true, nama: true, urutan: true },
      orderBy: { urutan: "asc" },
    });
  }

  // GET /master/periode?cabangId=... -> daftar periode (bulan-tahun) yang tersedia.
  @Get("periode")
  async periode(@Query("cabangId") cabangId?: string) {
    // Bila cabangId ada, batasi periode ke cabang itu.
    const where = cabangId ? { cabangId } : {};
    return this.prisma.periodeLaporan.findMany({
      where,
      select: { id: true, tahun: true, bulan: true, status: true, cabangId: true },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }], // Periode terbaru dulu.
    });
  }
}
