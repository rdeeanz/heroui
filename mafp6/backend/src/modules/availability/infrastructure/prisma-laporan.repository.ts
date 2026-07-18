// ============================================================================
//  IMPLEMENTASI repository laporan memakai Prisma/PostgreSQL.
//  Kelas ini memenuhi kontrak LaporanRepositoryPort dari application layer.
// ============================================================================
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/shared/prisma/prisma.service";
import {
  LaporanRepositoryPort,
  LaporanCabangRow,
} from "../application/ports/laporan.repository";

@Injectable()
export class PrismaLaporanRepository implements LaporanRepositoryPort {
  // Suntikkan PrismaService untuk query database.
  constructor(private readonly prisma: PrismaService) {}

  // Ambil satu laporan cabang lengkap untuk periode tertentu.
  async getLaporanCabang(
    cabangId: string,
    tahun: number,
    bulan: number,
  ): Promise<LaporanCabangRow | null> {
    // Cari periode laporan beserta relasi cabang, regional, fasilitas, kategori, objek.
    const periode = await this.prisma.periodeLaporan.findFirst({
      where: { cabangId, tahun, bulan }, // Filter cabang + periode.
      include: {
        cabang: { include: { regional: true } }, // Untuk nama cabang & regional.
        fasilitas: {
          include: { kategori: true, objek: true }, // Fasilitas + kategori + objek.
          orderBy: { kategori: { urutan: "asc" } }, // Urutkan sesuai kategori.
        },
      },
    });

    // Bila periode tidak ada, kembalikan null (use-case akan mengubah jadi 404).
    if (!periode) return null;

    // Petakan hasil query Prisma ke bentuk row yang dipahami application layer.
    return this.mapPeriodeKeRow(periode);
  }

  // Ambil seluruh laporan cabang dalam satu regional untuk periode tertentu.
  async getLaporanRegional(
    regionalKode: string,
    tahun: number,
    bulan: number,
  ): Promise<LaporanCabangRow[]> {
    // Ambil seluruh periode yang cocok dengan regional (via relasi cabang) & periode.
    const periodeList = await this.prisma.periodeLaporan.findMany({
      where: {
        tahun,
        bulan,
        cabang: { regional: { kode: regionalKode } }, // Batasi pada regional tertentu.
      },
      include: {
        cabang: { include: { regional: true } },
        fasilitas: {
          include: { kategori: true, objek: true },
          orderBy: { kategori: { urutan: "asc" } },
        },
      },
      orderBy: { cabang: { nama: "asc" } }, // Urutkan cabang menurut nama.
    });

    // Petakan setiap periode ke bentuk row.
    return periodeList.map((p) => this.mapPeriodeKeRow(p));
  }

  // Fungsi bantu privat: konversi entity Prisma -> LaporanCabangRow.
  private mapPeriodeKeRow(periode: any): LaporanCabangRow {
    return {
      cabangNama: periode.cabang.nama, // Nama cabang.
      regionalNama: periode.cabang.regional.nama, // Nama regional.
      tahun: periode.tahun,
      bulan: periode.bulan,
      status: periode.status,
      // Petakan tiap fasilitas beserta kategori & objeknya.
      fasilitas: periode.fasilitas.map((f: any) => ({
        nama: f.nama,
        operator: f.operator,
        konstruksi: f.konstruksi, // Jenis konstruksi untuk kolom Excel.
        kategoriKode: f.kategori.kode,
        kategoriNama: f.kategori.nama,
        kategoriUrutan: f.kategori.urutan,
        objek: f.objek.map((o: any) => ({
          nama: o.nama,
          panjang: o.panjang,
          lebar: o.lebar,
          luas: o.luas,
          jumlah: o.jumlah,
          fasilitasTersedia: o.fasilitasTersedia,
          rusakRingan: o.rusakRingan,
          rusakSedang: o.rusakSedang,
          rusakBerat: o.rusakBerat,
          fasilitasSiapPakai: o.fasilitasSiapPakai,
          keterangan: o.keterangan,
        })),
      })),
    };
  }
}
