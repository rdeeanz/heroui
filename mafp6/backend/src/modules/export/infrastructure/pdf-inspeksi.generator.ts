// ============================================================================
//  GENERATOR PDF — Form Inspeksi Fasilitas (mengikuti template
//  "Inspeksi Dermaga"): informasi umum, tabel hasil inspeksi, dan blok
//  tanda tangan Cabang & Mitra/Anak Usaha/Anpers. Memakai PDFKit (ringan,
//  tanpa dependensi browser sehingga mudah dijalankan di Docker).
// ============================================================================
import PDFDocument from "pdfkit";
import type { InspeksiLengkap, KondisiInspeksi } from "@/modules/inspeksi/application/ports/inspeksi.repository";
import { formatTanggal } from "@/shared/util/periode";

// Pemetaan kode kondisi ke label manusiawi (sesuai form Excel).
const LABEL_KONDISI: Record<KondisiInspeksi, string> = {
  BAIK: "1. Baik",
  TIDAK_BERUBAH: "2. Tidak ada perubahan",
  KERUSAKAN_TAMBAHAN: "3. Ada kerusakan tambahan",
  SUDAH_DIPERBAIKI: "4. Kerusakan sudah diperbaiki",
};

// Fungsi utama: hasilkan buffer PDF dari data inspeksi.
export function generatePdfInspeksi(data: InspeksiLengkap): Promise<Buffer> {
  // Bungkus dalam Promise karena PDFKit menulis via stream.
  return new Promise((resolve, reject) => {
    // Buat dokumen A4 dengan margin 40pt.
    const doc = new PDFDocument({ size: "A4", margin: 40 });

    // Kumpulkan potongan output ke array buffer.
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c)); // Tampung tiap chunk.
    doc.on("end", () => resolve(Buffer.concat(chunks))); // Gabungkan saat selesai.
    doc.on("error", reject); // Teruskan error.

    // Lebar area konten (halaman dikurangi margin kiri-kanan).
    const kiri = doc.page.margins.left; // Batas kiri.
    const lebar = doc.page.width - doc.page.margins.left - doc.page.margins.right; // Lebar konten.

    // --- Judul ---
    doc.font("Helvetica-Bold").fontSize(13).text("FORM PEMERIKSAAN INSPEKSI FASILITAS PELABUHAN", {
      align: "center",
    });
    doc.fontSize(11).text("PT PELABUHAN INDONESIA (PERSERO)", { align: "center" });
    doc.moveDown(1); // Jarak antar blok.

    // --- Bagian A: Informasi Umum ---
    doc.font("Helvetica-Bold").fontSize(11).text("A. INFORMASI UMUM");
    doc.moveDown(0.3);
    // Susun pasangan label-nilai.
    const info: [string, string][] = [
      ["Regional", data.regionalNama],
      ["Nama Pelabuhan", data.namaPelabuhan],
      ["Fasilitas", data.namaFasilitas],
      ["Lokasi/Area", data.lokasiArea ?? "-"],
      ["Tanggal Inspeksi", formatTanggal(data.tanggalInspeksi)],
      ["Tanggal Inspeksi Sebelumnya", formatTanggal(data.tanggalSebelumnya)],
    ];
    // Gambar tiap baris info sebagai "Label : Nilai".
    doc.font("Helvetica").fontSize(10);
    for (const [label, nilai] of info) {
      const y = doc.y; // Posisi vertikal saat ini.
      doc.font("Helvetica").text(label, kiri, y, { width: 180 }); // Label kolom kiri.
      doc.text(":", kiri + 180, y, { width: 10 }); // Titik dua.
      doc.font("Helvetica-Bold").text(nilai, kiri + 195, y, { width: lebar - 195 }); // Nilai.
      doc.moveDown(0.2);
    }
    doc.moveDown(0.8);

    // --- Bagian B: Hasil Inspeksi (tabel) ---
    doc.font("Helvetica-Bold").fontSize(11).text("B. HASIL INSPEKSI FASILITAS");
    doc.moveDown(0.4);

    // Definisi kolom tabel: lebar relatif.
    const kolNo = 30; // Lebar kolom No.
    const kolItem = 150; // Lebar kolom Item.
    const kolKondisi = 150; // Lebar kolom Kondisi.
    const kolKet = lebar - kolNo - kolItem - kolKondisi; // Sisanya untuk Keterangan.

    // Fungsi menggambar satu baris tabel (dengan border) mengembalikan tinggi.
    const gambarBaris = (
      teks: [string, string, string, string],
      tebal: boolean,
      latar?: string,
    ): void => {
      const yAwal = doc.y; // Y awal baris.
      // Hitung tinggi baris berdasar teks terpanjang (perkiraan sederhana).
      doc.font(tebal ? "Helvetica-Bold" : "Helvetica").fontSize(9);
      const tinggiKet = doc.heightOfString(teks[3], { width: kolKet - 8 });
      const tinggiItem = doc.heightOfString(teks[1], { width: kolItem - 8 });
      const tinggi = Math.max(18, tinggiKet + 8, tinggiItem + 8); // Tinggi minimal 18.

      // Gambar latar bila diberikan (mis. header).
      if (latar) {
        doc.rect(kiri, yAwal, lebar, tinggi).fill(latar);
        doc.fillColor("#ffffff"); // Teks putih di header.
      } else {
        doc.fillColor("#000000"); // Teks hitam di isi.
      }

      // Hitung posisi X tiap kolom.
      const x0 = kiri;
      const x1 = x0 + kolNo;
      const x2 = x1 + kolItem;
      const x3 = x2 + kolKondisi;

      // Tulis teks tiap kolom (padding 4pt).
      doc.font(tebal ? "Helvetica-Bold" : "Helvetica").fontSize(9);
      doc.text(teks[0], x0 + 4, yAwal + 4, { width: kolNo - 8 });
      doc.text(teks[1], x1 + 4, yAwal + 4, { width: kolItem - 8 });
      doc.text(teks[2], x2 + 4, yAwal + 4, { width: kolKondisi - 8 });
      doc.text(teks[3], x3 + 4, yAwal + 4, { width: kolKet - 8 });

      // Gambar garis border kolom & baris (warna abu).
      doc.strokeColor("#94a3b8").lineWidth(0.5);
      doc.rect(x0, yAwal, kolNo, tinggi).stroke();
      doc.rect(x1, yAwal, kolItem, tinggi).stroke();
      doc.rect(x2, yAwal, kolKondisi, tinggi).stroke();
      doc.rect(x3, yAwal, kolKet, tinggi).stroke();

      // Reset warna teks & pindah ke bawah baris.
      doc.fillColor("#000000");
      doc.y = yAwal + tinggi;
    };

    // Baris header tabel (latar biru).
    gambarBaris(["No", "Item Inspeksi", "Kondisi Terpilih", "Keterangan"], true, "#1d4ed8");

    // Baris data tiap item inspeksi.
    data.items.forEach((it, i) => {
      // Bila mendekati ujung halaman, tambah halaman baru.
      if (doc.y > doc.page.height - 160) doc.addPage();
      gambarBaris(
        [
          String(i + 1), // No.
          it.namaItem, // Item.
          LABEL_KONDISI[it.kondisi], // Kondisi (label manusiawi).
          it.keterangan ?? "", // Keterangan.
        ],
        false,
      );
    });

    doc.moveDown(2); // Jarak sebelum tanda tangan.

    // --- Blok tanda tangan ---
    // Bila ruang kurang, buat halaman baru untuk tanda tangan.
    if (doc.y > doc.page.height - 140) doc.addPage();

    // Tanggal & tempat di kanan atas blok.
    doc.font("Helvetica").fontSize(10).text(
      `${data.namaPelabuhan}, ${formatTanggal(data.tanggalInspeksi)}`,
      kiri,
      doc.y,
      { align: "right", width: lebar },
    );
    doc.moveDown(0.5);

    // Posisi dua kolom tanda tangan.
    const yTtd = doc.y; // Baris awal tanda tangan.
    const lebarKolom = lebar / 2; // Setiap kolom setengah lebar.

    // Judul kolom.
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("CABANG", kiri, yTtd, { width: lebarKolom, align: "center" });
    doc.text("ANAK USAHA / ANPERS / MITRA", kiri + lebarKolom, yTtd, {
      width: lebarKolom,
      align: "center",
    });

    // Ruang untuk tanda tangan (turun ~50pt).
    const yGaris = yTtd + 60;

    // Sematkan GAMBAR tanda tangan (bila tersimpan sebagai data URL) di atas garis.
    // Gambar diskalakan agar pas dalam kotak ~150x44pt dan diratakan tengah kolom.
    sematkanTtd(doc, data.ttdCabangImage, kiri, yTtd + 14, lebarKolom);
    sematkanTtd(doc, data.ttdMitraImage, kiri + lebarKolom, yTtd + 14, lebarKolom);

    // Garis tanda tangan.
    doc.strokeColor("#000000").lineWidth(0.7);
    doc.moveTo(kiri + 40, yGaris).lineTo(kiri + lebarKolom - 40, yGaris).stroke();
    doc.moveTo(kiri + lebarKolom + 40, yGaris).lineTo(kiri + lebar - 40, yGaris).stroke();

    // Nama & NIPP di bawah garis.
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text(data.ttdCabangNama ?? "( .......................... )", kiri, yGaris + 4, {
      width: lebarKolom,
      align: "center",
    });
    doc.text(data.ttdMitraNama ?? "( .......................... )", kiri + lebarKolom, yGaris + 4, {
      width: lebarKolom,
      align: "center",
    });
    // NIPP.
    doc.font("Helvetica").fontSize(9);
    doc.text(`NIPP. ${data.ttdCabangNipp ?? "................"}`, kiri, yGaris + 20, {
      width: lebarKolom,
      align: "center",
    });
    doc.text(`NIPP. ${data.ttdMitraNipp ?? "................"}`, kiri + lebarKolom, yGaris + 20, {
      width: lebarKolom,
      align: "center",
    });

    // Akhiri dokumen (memicu event "end").
    doc.end();
  });
}

// Fungsi bantu: sematkan gambar tanda tangan ke dalam PDF bila tersedia.
// Hanya menyematkan bila referensi berupa data URL (base64). Untuk URL S3
// (http) dilewati agar generator tetap sinkron (tanpa fetch jaringan).
function sematkanTtd(
  doc: PDFKit.PDFDocument,
  gambar: string | null | undefined,
  x: number,
  y: number,
  lebarKolom: number,
): void {
  // Lewati bila tidak ada gambar.
  if (!gambar) return;
  // Hanya proses data URL gambar (inline); URL http/S3 dilewati.
  if (!gambar.startsWith("data:image")) return;

  try {
    // Ambil bagian base64 setelah koma lalu ubah ke buffer biner.
    const base64 = gambar.split(",")[1] ?? "";
    const buffer = Buffer.from(base64, "base64");
    // Ukuran kotak gambar tanda tangan.
    const lebarGambar = 130;
    const tinggiGambar = 42;
    // Posisi X agar gambar terpusat di kolom.
    const gx = x + (lebarKolom - lebarGambar) / 2;
    // Gambar diskalakan agar muat dalam kotak (fit), tetap menjaga rasio.
    doc.image(buffer, gx, y, { fit: [lebarGambar, tinggiGambar], align: "center" });
  } catch {
    // Bila gambar rusak/tidak terbaca, abaikan agar PDF tetap tergenerate.
  }
}
