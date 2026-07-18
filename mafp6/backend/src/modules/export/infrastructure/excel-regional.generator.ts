// ============================================================================
//  GENERATOR EXCEL — Rekap Regional (mengikuti sheet "Rekap Regional").
//  Menyajikan matriks availability: baris = Cabang, kolom = Kategori + Total,
//  dengan baris rata-rata regional di bawah. Availability ditampilkan sebagai
//  nilai presisi penuh (sudah dihitung use-case) dan diformat 2 desimal.
// ============================================================================
import ExcelJS from "exceljs";
import type { RekapRegionalOutput } from "@/modules/availability/application/get-rekap-regional.usecase";
import { labelPeriode } from "@/shared/util/periode";

// Warna gaya (senada dengan generator cabang).
const WARNA_HEADER = "FF1D4ED8";
const WARNA_TOTAL = "FFBFDBFE";

// Fungsi utama: hasilkan buffer .xlsx rekap regional.
export async function generateExcelRegional(data: RekapRegionalOutput): Promise<Buffer> {
  // Buat workbook & worksheet.
  const wb = new ExcelJS.Workbook();
  wb.creator = "SiMFAS-Pelindo";
  const ws = wb.addWorksheet("Rekap Regional", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  // Kumpulkan daftar kategori unik (union) dari seluruh cabang, urut kode.
  const kategoriUnik = kumpulkanKategori(data);

  // Susun definisi kolom: No, Cabang, tiap kategori, lalu Total.
  const jumlahKolom = 2 + kategoriUnik.length + 1;

  // Atur lebar kolom.
  ws.getColumn(1).width = 5; // No.
  ws.getColumn(2).width = 26; // Cabang.
  kategoriUnik.forEach((_, i) => (ws.getColumn(3 + i).width = 16)); // Kategori.
  ws.getColumn(jumlahKolom).width = 18; // Total.

  // Huruf kolom terakhir untuk merge judul.
  const kolomTerakhir = ws.getColumn(jumlahKolom).letter;

  // --- Blok judul ---
  tulisJudul(ws, "REKAPITULASI LAPORAN AVAILABILITY", 1, kolomTerakhir, 13);
  tulisJudul(ws, `PT PELABUHAN INDONESIA (PERSERO) — ${data.regionalNama.toUpperCase()}`, 2, kolomTerakhir, 10);
  tulisJudul(ws, `PERIODE: ${labelPeriode(data.bulan, data.tahun)}`, 3, kolomTerakhir, 10);

  // --- Baris header kolom (baris ke-5) ---
  const barisHeader = 5;
  const headerRow = ws.getRow(barisHeader);
  headerRow.getCell(1).value = "No"; // Kolom 1.
  headerRow.getCell(2).value = "Cabang"; // Kolom 2.
  // Judul kolom kategori.
  kategoriUnik.forEach((k, i) => (headerRow.getCell(3 + i).value = k.nama));
  headerRow.getCell(jumlahKolom).value = "Availability Cabang (%)"; // Kolom total.
  // Gaya header.
  for (let c = 1; c <= jumlahKolom; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA_HEADER } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = borderTipis();
  }
  headerRow.height = 30;

  // --- Baris data per cabang ---
  let baris = barisHeader + 1;
  data.cabang.forEach((cab, idx) => {
    const row = ws.getRow(baris);
    row.getCell(1).value = idx + 1; // Nomor urut.
    row.getCell(2).value = cab.cabangNama; // Nama cabang.
    // Isi availability per kategori (cocokkan berdasar kode).
    kategoriUnik.forEach((k, i) => {
      // Cari availability kategori pada cabang ini.
      const found = cab.perKategori.find((p) => p.kode === k.kode);
      const cell = row.getCell(3 + i);
      cell.value = found ? bulatkan2(found.availability) : null; // 2 desimal.
      cell.numFmt = "0.00";
      cell.alignment = { horizontal: "right" };
    });
    // Total cabang.
    const cellTotal = row.getCell(jumlahKolom);
    cellTotal.value = bulatkan2(cab.availability);
    cellTotal.numFmt = "0.00";
    cellTotal.font = { bold: true };
    cellTotal.alignment = { horizontal: "right" };
    // Border seluruh sel baris.
    for (let c = 1; c <= jumlahKolom; c++) row.getCell(c).border = borderTipis();
    baris++;
  });

  // --- Baris rata-rata regional (grand total) ---
  const rowTotal = ws.getRow(baris);
  rowTotal.getCell(2).value = "RATA-RATA REGIONAL"; // Label.
  // Rata-rata per kolom kategori (memakai rumus AVERAGE atas rentang cabang).
  const barisPertama = barisHeader + 1;
  const barisTerakhir = baris - 1;
  kategoriUnik.forEach((_, i) => {
    const huruf = ws.getColumn(3 + i).letter;
    const cell = rowTotal.getCell(3 + i);
    // Rumus AVERAGE agar auditable di Excel.
    if (barisTerakhir >= barisPertama) {
      cell.value = { formula: `AVERAGE(${huruf}${barisPertama}:${huruf}${barisTerakhir})` };
    }
    cell.numFmt = "0.00";
    cell.alignment = { horizontal: "right" };
  });
  // Total regional (nilai dari use-case).
  const cellGrand = rowTotal.getCell(jumlahKolom);
  cellGrand.value = bulatkan2(data.availability);
  cellGrand.numFmt = "0.00";
  cellGrand.alignment = { horizontal: "right" };
  // Gaya baris total.
  for (let c = 1; c <= jumlahKolom; c++) {
    const cell = rowTotal.getCell(c);
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA_TOTAL } };
    cell.border = borderTipis();
  }

  // Bekukan header.
  ws.views = [{ state: "frozen", ySplit: barisHeader }];

  // Hasilkan buffer .xlsx.
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ---------------------------------------------------------------------------
//  Fungsi bantu
// ---------------------------------------------------------------------------

// Bulatkan ke 2 desimal untuk tampilan.
function bulatkan2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Kumpulkan kategori unik (kode+nama) dari seluruh cabang, terurut kode.
function kumpulkanKategori(data: RekapRegionalOutput): { kode: string; nama: string }[] {
  const peta = new Map<string, string>(); // kode -> nama.
  for (const cab of data.cabang) {
    for (const p of cab.perKategori) {
      if (!peta.has(p.kode)) peta.set(p.kode, p.nama);
    }
  }
  // Ubah ke array & urutkan berdasar kode (I, II, III, IV).
  return [...peta.entries()]
    .map(([kode, nama]) => ({ kode, nama }))
    .sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true }));
}

// Tulis judul yang di-merge sepanjang kolom.
function tulisJudul(
  ws: ExcelJS.Worksheet,
  teks: string,
  baris: number,
  kolomTerakhir: string,
  ukuran: number,
): void {
  ws.mergeCells(`A${baris}:${kolomTerakhir}${baris}`);
  const cell = ws.getCell(`A${baris}`);
  cell.value = teks;
  cell.font = { bold: true, size: ukuran };
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

// Border tipis untuk seluruh sisi sel.
function borderTipis(): Partial<ExcelJS.Borders> {
  const sisi: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFCBD5E1" } };
  return { top: sisi, left: sisi, bottom: sisi, right: sisi };
}
