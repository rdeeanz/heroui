// ============================================================================
//  IMPLEMENTASI repository IMPORT memakai Prisma.
//  Menulis periode + fasilitas + objek dalam satu TRANSAKSI agar konsisten
//  (semua berhasil atau tidak sama sekali). Kategori dicocokkan/ dibuat
//  otomatis (find-or-create) berdasarkan nama.
// ============================================================================
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/shared/prisma/prisma.service";
import {
  ImportRepositoryPort,
  CabangInfo,
  ImportParams,
  ImportHasil,
} from "../application/ports/import.repository";

// Ubah angka romawi -> angka biasa (untuk urutan kategori). Null bila bukan romawi.
function romawiKeAngka(s: string): number | null {
  const peta: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  const up = s.toUpperCase();
  // Validasi hanya huruf romawi.
  if (!/^[IVXLC]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = peta[up[i]];
    const next = peta[up[i + 1]] ?? 0;
    // Aturan pengurangan romawi (mis. IV = 4).
    total += cur < next ? -cur : cur;
  }
  return total;
}

@Injectable()
export class PrismaImportRepository implements ImportRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // Ambil info cabang + regionalnya.
  async getCabang(cabangId: string): Promise<CabangInfo | null> {
    const c = await this.prisma.cabang.findUnique({
      where: { id: cabangId },
      include: { regional: true },
    });
    if (!c) return null;
    return { id: c.id, nama: c.nama, regionalKode: c.regional.kode, regionalNama: c.regional.nama };
  }

  // Status periode yang sudah ada (untuk cek overwrite).
  async getPeriodeStatus(
    cabangId: string,
    tahun: number,
    bulan: number,
  ): Promise<{ id: string; status: string } | null> {
    const p = await this.prisma.periodeLaporan.findFirst({
      where: { cabangId, tahun, bulan },
      select: { id: true, status: true },
    });
    return p ?? null;
  }

  // Tulis data import secara transaksional.
  async importData(params: ImportParams): Promise<ImportHasil> {
    // Jalankan seluruh penulisan dalam satu transaksi (timeout diperpanjang
    // karena bisa ada ratusan baris objek).
    return this.prisma.$transaction(
      async (tx) => {
        // 1) Cari/siapkan periode. Bila ada & overwrite -> hapus data lama.
        let periode = await tx.periodeLaporan.findFirst({
          where: { cabangId: params.cabangId, tahun: params.tahun, bulan: params.bulan },
        });
        if (periode) {
          // Overwrite: hapus fasilitas lama (objek ikut terhapus via cascade).
          await tx.fasilitas.deleteMany({ where: { periodeId: periode.id } });
          // Kembalikan status ke DRAFT karena data baru diimpor.
          periode = await tx.periodeLaporan.update({
            where: { id: periode.id },
            data: { status: "DRAFT" },
          });
        } else {
          // Buat periode baru berstatus DRAFT.
          periode = await tx.periodeLaporan.create({
            data: { cabangId: params.cabangId, tahun: params.tahun, bulan: params.bulan, status: "DRAFT" },
          });
        }

        // 2) Muat kategori yang ada -> peta by nama (lowercase) & set kode terpakai.
        const kategoriAda = await tx.kategori.findMany();
        const petaKategori = new Map(kategoriAda.map((k) => [k.nama.toLowerCase(), k]));
        const kodeTerpakai = new Set(kategoriAda.map((k) => k.kode));

        // 3) Iterasi fasilitas: pastikan kategori, buat fasilitas + objek.
        let fasilitasCount = 0;
        let objekCount = 0;

        for (const f of params.fasilitas) {
          // Find-or-create kategori berdasarkan nama.
          let kategori = petaKategori.get(f.kategoriNama.toLowerCase());
          if (!kategori) {
            // Tentukan kode unik: pakai kode parse bila belum terpakai, jika tidak beri sufiks.
            let kode = f.kategoriKode || "X";
            if (kodeTerpakai.has(kode)) kode = `${kode}-${petaKategori.size + 1}`;
            // Urutan: dari romawi bila memungkinkan, jika tidak urut setelah yang ada.
            const urutan = romawiKeAngka(f.kategoriKode) ?? kategoriAda.length + 1;
            kategori = await tx.kategori.create({
              data: { kode, nama: f.kategoriNama, urutan },
            });
            // Perbarui cache.
            petaKategori.set(f.kategoriNama.toLowerCase(), kategori);
            kodeTerpakai.add(kode);
            kategoriAda.push(kategori);
          }

          // Buat fasilitas.
          const fasilitas = await tx.fasilitas.create({
            data: {
              periodeId: periode.id,
              kategoriId: kategori.id,
              nama: f.namaFasilitas,
              operator: f.operator,
              konstruksi: f.konstruksi,
            },
          });
          fasilitasCount++;

          // Sisipkan seluruh objek fasilitas ini sekaligus (createMany efisien).
          if (f.objek.length > 0) {
            await tx.objekFasilitas.createMany({
              data: f.objek.map((o) => ({
                fasilitasId: fasilitas.id,
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
            });
            objekCount += f.objek.length;
          }
        }

        // Kembalikan ringkasan.
        return { periodeId: periode.id, fasilitasCount, objekCount };
      },
      // Opsi transaksi: perpanjang batas waktu untuk data besar.
      { timeout: 120000, maxWait: 15000 },
    );
  }
}
