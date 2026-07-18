// ============================================================================
//  SEED DATABASE — mengisi data awal yang MERUJUK pada template Excel Pelindo,
//  agar aplikasi bisa langsung menampilkan angka yang cocok dengan template.
// ============================================================================
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

// Instansiasi client Prisma untuk operasi tulis.
const prisma = new PrismaClient();

// Definisi objek fasilitas ringkas: [nama, tersedia, siapPakai, panjang?, lebar?].
type ObjDef = [string, number, number, (number | null)?, (number | null)?];

// Data fasilitas per kategori, disalin dari sheet "Lap. Cabang" template.
const dataKategori: {
  kode: string;
  nama: string;
  urutan: number;
  fasilitas: { nama: string; operator: string; objek: ObjDef[] }[];
}[] = [
  {
    kode: "I",
    nama: "DERMAGA",
    urutan: 1,
    fasilitas: [
      {
        nama: "Dermaga A",
        operator: "SPTP",
        objek: [
          ["Pelat Lantai", 3750, 3750, 250, 15],
          ["Balok", 25, 24.5, 25, null],
          ["Poer", 10, 9, 10, null],
          ["Tiang Pancang", 250, 242.5, 250, 250],
          ["Fender", 450, 450, 450, 450],
        ],
      },
      {
        nama: "Jetty B",
        operator: "SPMT",
        objek: [
          ["Pelat Lantai", 1000, 1000, 100, 10],
          ["Balok", 10, 9, 10, null],
          ["Poer", 5, 4.5, 5, null],
          ["Tiang Pancang", 100, 100, 100, 100],
          ["Bollard", 2, 2, 2, null],
          ["Fender", 2, 2, 2, null],
        ],
      },
    ],
  },
  {
    kode: "II",
    nama: "LAPANGAN PENUMPUKAN",
    urutan: 2,
    fasilitas: [
      {
        nama: "Lapangan Penumpukan A",
        operator: "SPTP",
        objek: [
          ["Perkerasan", 20000, 19900, 200, 100],
          ["Drainase", 175, 175, 175, null],
          ["Pagar", 600, 550, 600, 600],
          ["Penerangan", 24, 24, 24, null],
        ],
      },
      {
        nama: "Lapangan Penumpukan B",
        operator: "SPMT",
        objek: [["Perkerasan", 40000, 40000, 200, 200]],
      },
    ],
  },
  {
    kode: "III",
    nama: "GUDANG",
    urutan: 3,
    fasilitas: [
      {
        nama: "Gudang A",
        operator: "SPSL",
        objek: [
          ["Lantai", 4000, 4000, 200, 20],
          ["Atap", 4000, 4000, 200, 20],
          ["Dinding", 1760, 1760, 440, 4],
          ["Pintu", 4, 4, 4, null],
        ],
      },
      {
        nama: "Gudang B",
        operator: "SPSL",
        objek: [
          ["Lantai", 2000, 1900, 100, 20],
          ["Atap", 2000, 2000, 100, 20],
          ["Dinding", 960, 960, 240, 4],
          ["Pintu", 4, 3.5, 4, null],
        ],
      },
    ],
  },
  {
    kode: "IV",
    nama: "TERMINAL PENUMPANG",
    urutan: 4,
    fasilitas: [
      {
        nama: "Terminal Penumpang A",
        operator: "SPMT",
        objek: [
          ["Lantai", 2000, 2000, 100, 20],
          ["Atap", 2000, 2000, 100, 20],
          ["Kursi Tunggu", 10, 10, 10, null],
          ["AC", 20, 20, 20, null],
          ["Dinding", 960, 960, 240, 4],
          ["Ruang Tunggu", 2000, 2000, 100, 20],
        ],
      },
    ],
  },
];

// Fungsi utama seed.
async function main(): Promise<void> {
  // Bersihkan data lama (urutan menghormati foreign key) agar seed idempotent.
  await prisma.objekFasilitas.deleteMany();
  await prisma.fasilitas.deleteMany();
  await prisma.periodeLaporan.deleteMany();
  await prisma.inspeksiItem.deleteMany();
  await prisma.inspeksi.deleteMany();
  await prisma.user.deleteMany();
  await prisma.cabang.deleteMany();
  await prisma.regional.deleteMany();
  await prisma.kategori.deleteMany();

  // Buat kategori master.
  const kategoriMap = new Map<string, string>(); // kode -> id.
  for (const k of dataKategori) {
    const created = await prisma.kategori.create({
      data: { kode: k.kode, nama: k.nama, urutan: k.urutan },
    });
    kategoriMap.set(k.kode, created.id);
  }

  // Buat satu Regional contoh (Regional 3).
  const regional = await prisma.regional.create({
    data: { kode: "REG3", nama: "Regional 3" },
  });

  // Buat beberapa cabang; cabang pertama memakai data lengkap template.
  const namaCabang = ["Cabang Benoa", "Cabang Kupang", "Cabang Maumere"];
  const cabangList = [];
  for (const nama of namaCabang) {
    const c = await prisma.cabang.create({
      data: { kode: nama.replace(/\s+/g, "-").toUpperCase(), nama, regionalId: regional.id },
    });
    cabangList.push(c);
  }

  // Password demo yang sama untuk semua akun contoh (HANYA untuk demo/uji).
  const passwordDemo = await hash("password123", 10); // Hash bcrypt sekali, dipakai ulang.

  // Admin Pusat: memantau seluruh nasional.
  await prisma.user.create({
    data: {
      email: "pusat@pelindo.co.id",
      namaLengkap: "Admin Pusat",
      passwordHash: passwordDemo,
      role: Role.ADMIN_PUSAT,
    },
  });

  // Admin Regional: memantau & mereview cabang di regionalnya (REG3).
  await prisma.user.create({
    data: {
      email: "regional3@pelindo.co.id",
      namaLengkap: "Admin Regional 3",
      passwordHash: passwordDemo,
      role: Role.ADMIN_REGIONAL,
      regionalKode: regional.kode, // Batas akses ke regional ini.
    },
  });

  // PIC Cabang: satu akun untuk cabang pertama (input & submit laporan).
  await prisma.user.create({
    data: {
      email: "cabang.benoa@pelindo.co.id",
      namaLengkap: "PIC Cabang Benoa",
      passwordHash: passwordDemo,
      role: Role.PIC_CABANG,
      cabangId: cabangList[0].id, // Batas akses ke cabang ini.
    },
  });

  // Mitra/Anak Usaha: validasi tanda tangan inspeksi.
  await prisma.user.create({
    data: {
      email: "mitra@pelindo.co.id",
      namaLengkap: "Mitra SPTP",
      passwordHash: passwordDemo,
      role: Role.MITRA,
    },
  });

  // Auditor: read-only seluruh data.
  await prisma.user.create({
    data: {
      email: "auditor@pelindo.co.id",
      namaLengkap: "Auditor Internal",
      passwordHash: passwordDemo,
      role: Role.AUDITOR,
    },
  });

  // Untuk tiap cabang, buat laporan beberapa bulan agar grafik tren ada isinya.
  const periodeBulan = [
    { tahun: 2024, bulan: 2 },
    { tahun: 2024, bulan: 3 },
    { tahun: 2024, bulan: 4 },
  ];

  // Iterasi cabang & periode.
  for (let ci = 0; ci < cabangList.length; ci++) {
    const cabang = cabangList[ci];
    for (const p of periodeBulan) {
      // Tentukan status agar seluruh alur kerja terwakili saat demo:
      // - Periode terbaru (April) cabang pertama = DRAFT (siap disubmit PIC).
      // - Maret cabang pertama & April cabang kedua = SUBMITTED (menunggu review regional).
      // - Sisanya = REVIEWED (sudah disetujui, tampil di monitor pusat).
      let status: "DRAFT" | "SUBMITTED" | "REVIEWED" = "REVIEWED";
      if (ci === 0 && p.bulan === 4) status = "DRAFT";
      else if ((ci === 0 && p.bulan === 3) || (ci === 1 && p.bulan === 4)) status = "SUBMITTED";

      // Buat periode laporan dengan jejak alur sesuai status.
      const periode = await prisma.periodeLaporan.create({
        data: {
          cabangId: cabang.id,
          tahun: p.tahun,
          bulan: p.bulan,
          status,
          // Isi jejak waktu/aktor sesuai tahap status.
          submittedAt: status === "REVIEWED" || status === "SUBMITTED" ? new Date() : null,
          submittedBy:
            status === "REVIEWED" || status === "SUBMITTED" ? "cabang.benoa@pelindo.co.id" : null,
          reviewedAt: status === "REVIEWED" ? new Date() : null,
          reviewedBy: status === "REVIEWED" ? "regional3@pelindo.co.id" : null,
        },
      });

      // Isi fasilitas + objek dari template, dengan sedikit variasi per cabang/bulan
      // supaya angka availability berbeda tiap periode (biar tren terlihat).
      for (const k of dataKategori) {
        for (const f of k.fasilitas) {
          // Buat fasilitas.
          const fasilitas = await prisma.fasilitas.create({
            data: {
              periodeId: periode.id,
              kategoriId: kategoriMap.get(k.kode)!,
              nama: f.nama,
              operator: f.operator,
              konstruksi: "Beton Bertulang", // Contoh jenis konstruksi.
            },
          });
          // Buat objek-objeknya. Variasi kecil: kurangi siap pakai sesuai indeks cabang/bulan.
          for (const [nama, tersedia, siapPakai, panjang, lebar] of f.objek) {
            // Faktor variasi kecil (0..~3%) berdasarkan cabang & bulan.
            const variasi = 1 - ((ci + p.bulan) % 4) * 0.01;
            const siapVar = Math.min(tersedia, Math.round(siapPakai * variasi * 100) / 100);
            await prisma.objekFasilitas.create({
              data: {
                fasilitasId: fasilitas.id,
                nama,
                panjang: panjang ?? null,
                lebar: lebar ?? null,
                fasilitasTersedia: tersedia,
                fasilitasSiapPakai: siapVar,
              },
            });
          }
        }
      }
    }
  }

  // --- Seed data Inspeksi (dua tanggal untuk fasilitas sama, agar
  //     "Tanggal Inspeksi Sebelumnya" otomatis terisi dari histori). ---
  const cabangPertama = cabangList[0];

  // Inspeksi lama (Januari 2024) — kondisi awal.
  await prisma.inspeksi.create({
    data: {
      regionalNama: regional.nama,
      namaPelabuhan: cabangPertama.nama,
      namaFasilitas: "Dermaga A",
      lokasiArea: "Sisi Utara",
      tanggalInspeksi: new Date("2024-01-15"),
      tanggalSebelumnya: null, // Belum ada histori sebelumnya.
      ttdCabangNama: "Budi Santoso",
      ttdCabangNipp: "1990001",
      ttdMitraNama: "Agus Wijaya",
      ttdMitraNipp: "2990002",
      items: {
        create: [
          { urutan: 1, namaItem: "Pelat Lantai", kondisi: "BAIK", keterangan: "Kondisi baik" },
          { urutan: 2, namaItem: "Bollard", kondisi: "BAIK" },
          { urutan: 3, namaItem: "Fender", kondisi: "KERUSAKAN_TAMBAHAN", keterangan: "Retak ringan" },
          { urutan: 4, namaItem: "Manhole", kondisi: "BAIK" },
        ],
      },
    },
  });

  // Inspeksi baru (Juni 2024) — repository create nanti mengisi tanggalSebelumnya
  // otomatis; di seed kita set eksplisit ke tanggal inspeksi lama.
  await prisma.inspeksi.create({
    data: {
      regionalNama: regional.nama,
      namaPelabuhan: cabangPertama.nama,
      namaFasilitas: "Dermaga A",
      lokasiArea: "Sisi Utara",
      tanggalInspeksi: new Date("2024-06-20"),
      tanggalSebelumnya: new Date("2024-01-15"), // Pembanding dari inspeksi lama.
      ttdCabangNama: "Budi Santoso",
      ttdCabangNipp: "1990001",
      ttdMitraNama: "Agus Wijaya",
      ttdMitraNipp: "2990002",
      items: {
        create: [
          { urutan: 1, namaItem: "Pelat Lantai", kondisi: "TIDAK_BERUBAH" },
          { urutan: 2, namaItem: "Bollard", kondisi: "BAIK" },
          { urutan: 3, namaItem: "Fender", kondisi: "SUDAH_DIPERBAIKI", keterangan: "Sudah diperbaiki Mei 2024" },
          { urutan: 4, namaItem: "Manhole", kondisi: "KERUSAKAN_TAMBAHAN", keterangan: "Penutup pecah" },
        ],
      },
    },
  });

  // Tampilkan ringkasan hasil seed.
  console.log("Seed selesai: 1 regional, 3 cabang, 3 periode/cabang, kategori + fasilitas template, 2 inspeksi.");
}

// Jalankan seed lalu tutup koneksi; tangani error.
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
