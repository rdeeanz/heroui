// ============================================================================
//  GENERATOR EXCEL — Laporan Cabang (mengikuti layout sheet "Lap. Cabang").
//  Menulis RUMUS Excel asli untuk kolom availability agar hasilnya auditable
//  (Excel menghitung ulang), sesuai amanat PRD "layout & rumus mengikuti template".
// ============================================================================
import ExcelJS from "exceljs";
import type { LaporanCabangRow } from "@/modules/availability/application/ports/laporan.repository";
import { labelPeriode } from "@/shared/util/periode";

// Definisi kolom: kunci internal, judul tampil, dan lebar kolom.
const KOLOM: { key: string; judul: string; lebar: number }[] = [
  { key: "no", judul: "No", lebar: 5 },
  { key: "kategori", judul: "Fasilitas", lebar: 18 },
  { key: "namaFasilitas", judul: "Nama Fasilitas", lebar: 22 },
  { key: "objek", judul: "Objek Fasilitas", lebar: 22 },
  { key: "panjang", judul: "Panjang (m)", lebar: 11 },
  { key: "lebar", judul: "Lebar (m)", lebar: 10 },
  { key: "luas", judul: "Luas (m2)", lebar: 11 },
  { key: "jumlah", judul: "Jumlah (unit)", lebar: 12 },
  { key: "konstruksi", judul: "Konstruksi", lebar: 14 },
  { key: "tersedia", judul: "Fasilitas Tersedia", lebar: 14 },
  { key: "rRingan", judul: "Rusak Ringan", lebar: 12 },
  { key: "rSedang", judul: "Rusak Sedang", lebar: 12 },
  { key: "rBerat", judul: "Rusak Berat", lebar: 12 },
  { key: "siapPakai", judul: "Fasilitas Siap Pakai", lebar: 15 },
  { key: "availObjek", judul: "Availability Objek (%)", lebar: 16 },
  { key: "availFasilitas", judul: "Availability Fasilitas (%)", lebar: 17 },
  { key: "operator", judul: "Operator", lebar: 12 },
  { key: "keterangan", judul: "Keterangan", lebar: 24 },
];

// Indeks kolom penting (1-based, sesuai penomoran kolom Excel).
const COL_TERSEDIA = 10; // J
const COL_SIAP = 14; // N
const COL_AVAIL_OBJEK = 15; // O
const COL_AVAIL_FASILITAS = 16; // P
const HURUF_AVAIL_OBJEK = "O"; // Huruf kolom availability objek.
const HURUF_AVAIL_FASILITAS = "P"; // Huruf kolom availability fasilitas.

// Warna & gaya dasar (biru untuk header).
const WARNA_HEADER = "FF1D4ED8"; // Biru tua.
const WARNA_KATEGORI = "FFDBEAFE"; // Biru muda.
const WARNA_FASILITAS = "FFF1F5F9"; // Abu terang.
const WARNA_TOTAL = "FFBFDBFE"; // Biru untuk total.

// Fungsi utama: hasilkan buffer .xlsx dari data laporan cabang mentah.
export async function generateExcelCabang(data: LaporanCabangRow): Promise<Buffer> {
  // Buat workbook & worksheet.
  const wb = new ExcelJS.Workbook();
  wb.creator = "SiMFAS-Pelindo"; // Metadata pembuat.
  const ws = wb.addWorksheet("Lap. Cabang", {
    // Atur agar pas di kertas saat dicetak.
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  // Terapkan lebar kolom.
  ws.columns = KOLOM.map((k) => ({ width: k.lebar }));

  // Jumlah kolom total (untuk merge judul).
  const totalKolom = KOLOM.length;
  const kolomTerakhir = ws.getColumn(totalKolom).letter; // Huruf kolom terakhir (R).

  // --- Blok judul ---
  tulisJudul(ws, `LAPORAN AVAILABILITY FASILITAS SIPIL — ${data.cabangNama.toUpperCase()}`, 1, kolomTerakhir);
  tulisJudul(ws, "PT PELABUHAN INDONESIA (PERSERO)", 2, kolomTerakhir);
  tulisJudul(ws, `Regional: ${data.regionalNama}  •  Periode: ${labelPeriode(data.bulan, data.tahun)}`, 3, kolomTerakhir);

  // --- Baris header kolom (baris ke-5) ---
  const barisHeader = 5;
  const headerRow = ws.getRow(barisHeader);
  KOLOM.forEach((k, i) => {
    // Isi judul tiap kolom.
    const cell = headerRow.getCell(i + 1);
    cell.value = k.judul;
    // Gaya header: teks putih tebal, latar biru, rata tengah, ada border.
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA_HEADER } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = borderTipis();
  });
  headerRow.height = 30; // Tinggikan agar teks wrap terbaca.

  // Baris data mulai setelah header.
  let baris = barisHeader + 1;

  // Kumpulan referensi sel subtotal kategori (untuk grand total).
  const selSubtotalKategori: string[] = [];

  // Urutkan fasilitas per kategori lalu kelompokkan.
  const kategoriList = kelompokkanKategori(data);

  // Iterasi tiap kategori.
  for (const kat of kategoriList) {
    // --- Baris judul kategori (mis. "I  DERMAGA") ---
    const rowKat = ws.getRow(baris);
    rowKat.getCell(1).value = kat.kode; // Kolom No = kode romawi.
    rowKat.getCell(2).value = kat.nama; // Kolom Fasilitas = nama kategori.
    for (let c = 1; c <= totalKolom; c++) {
      const cell = rowKat.getCell(c);
      cell.font = { bold: true, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA_KATEGORI } };
      cell.border = borderTipis();
    }
    baris++;

    // Referensi sel availability fasilitas dalam kategori ini (untuk subtotal).
    const selAvailFasilitas: string[] = [];

    // Iterasi tiap fasilitas dalam kategori.
    let noFasilitas = 1;
    for (const fas of kat.fasilitas) {
      // Baris "header fasilitas" memuat nama, konstruksi & operator.
      const rowFasilitasIndex = baris;
      const rowFas = ws.getRow(baris);
      rowFas.getCell(1).value = noFasilitas; // Nomor urut fasilitas.
      rowFas.getCell(3).value = fas.nama; // Nama fasilitas.
      rowFas.getCell(9).value = fas.konstruksi ?? ""; // Konstruksi.
      rowFas.getCell(17).value = fas.operator ?? ""; // Operator.
      for (let c = 1; c <= totalKolom; c++) {
        const cell = rowFas.getCell(c);
        cell.font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA_FASILITAS } };
        cell.border = borderTipis();
      }
      baris++;

      // Baris awal objek (untuk rumus rata-rata availability fasilitas).
      const objekMulai = baris;

      // Iterasi objek fasilitas.
      let noObjek = 1;
      for (const o of fas.objek) {
        const rowObj = ws.getRow(baris);
        // Isi kolom-kolom data mentah objek.
        rowObj.getCell(1).value = noObjek; // No objek.
        rowObj.getCell(4).value = o.nama; // Nama objek.
        rowObj.getCell(5).value = o.panjang ?? null; // Panjang.
        rowObj.getCell(6).value = o.lebar ?? null; // Lebar.
        rowObj.getCell(7).value = o.luas ?? null; // Luas.
        rowObj.getCell(8).value = o.jumlah ?? null; // Jumlah.
        rowObj.getCell(COL_TERSEDIA).value = o.fasilitasTersedia; // Tersedia (J).
        rowObj.getCell(11).value = o.rusakRingan; // Rusak ringan.
        rowObj.getCell(12).value = o.rusakSedang; // Rusak sedang.
        rowObj.getCell(13).value = o.rusakBerat; // Rusak berat.
        rowObj.getCell(COL_SIAP).value = o.fasilitasSiapPakai; // Siap pakai (N).
        // RUMUS availability objek = IF(tersedia=0;0;siap/tersedia*100).
        rowObj.getCell(COL_AVAIL_OBJEK).value = {
          formula: `IF(${kolomHuruf(COL_TERSEDIA)}${baris}=0,0,${kolomHuruf(COL_SIAP)}${baris}/${kolomHuruf(COL_TERSEDIA)}${baris}*100)`,
        };
        rowObj.getCell(18).value = o.keterangan ?? ""; // Keterangan.
        // Gaya baris objek: border + angka rata kanan.
        for (let c = 1; c <= totalKolom; c++) {
          const cell = rowObj.getCell(c);
          cell.font = { size: 10 };
          cell.border = borderTipis();
          if (c >= 5 && c <= COL_AVAIL_FASILITAS) cell.alignment = { horizontal: "right" };
        }
        rowObj.getCell(COL_AVAIL_OBJEK).numFmt = "0.00"; // 2 desimal.
        baris++;
        noObjek++;
      }

      // Baris terakhir objek.
      const objekAkhir = baris - 1;
      // RUMUS availability fasilitas = AVERAGE(O objekMulai..O objekAkhir).
      const selFas = `${HURUF_AVAIL_FASILITAS}${rowFasilitasIndex}`;
      if (objekAkhir >= objekMulai) {
        ws.getCell(selFas).value = {
          formula: `AVERAGE(${HURUF_AVAIL_OBJEK}${objekMulai}:${HURUF_AVAIL_OBJEK}${objekAkhir})`,
        };
        ws.getCell(selFas).numFmt = "0.00";
        ws.getCell(selFas).alignment = { horizontal: "right" };
      }
      // Simpan referensi untuk subtotal kategori.
      selAvailFasilitas.push(selFas);
      noFasilitas++;
    }

    // --- Baris subtotal kategori ---
    const rowSub = ws.getRow(baris);
    rowSub.getCell(2).value = `Availability ${kat.nama}`; // Label subtotal.
    const selSub = `${HURUF_AVAIL_FASILITAS}${baris}`;
    // RUMUS subtotal = AVERAGE(sel-sel availability fasilitas).
    if (selAvailFasilitas.length > 0) {
      rowSub.getCell(COL_AVAIL_FASILITAS).value = {
        formula: `AVERAGE(${selAvailFasilitas.join(",")})`,
      };
    }
    for (let c = 1; c <= totalKolom; c++) {
      const cell = rowSub.getCell(c);
      cell.font = { bold: true, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA_KATEGORI } };
      cell.border = borderTipis();
    }
    rowSub.getCell(COL_AVAIL_FASILITAS).numFmt = "0.00";
    rowSub.getCell(COL_AVAIL_FASILITAS).alignment = { horizontal: "right" };
    selSubtotalKategori.push(selSub); // Simpan referensi subtotal.
    baris++;
  }

  // --- Baris grand total availability cabang ---
  const rowTotal = ws.getRow(baris);
  rowTotal.getCell(2).value = `AVAILABILITY CABANG ${data.cabangNama.toUpperCase()}`;
  if (selSubtotalKategori.length > 0) {
    rowTotal.getCell(COL_AVAIL_FASILITAS).value = {
      formula: `AVERAGE(${selSubtotalKategori.join(",")})`,
    };
  }
  for (let c = 1; c <= totalKolom; c++) {
    const cell = rowTotal.getCell(c);
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA_TOTAL } };
    cell.border = borderTipis();
  }
  rowTotal.getCell(COL_AVAIL_FASILITAS).numFmt = "0.00";
  rowTotal.getCell(COL_AVAIL_FASILITAS).alignment = { horizontal: "right" };

  // Bekukan baris header agar tetap terlihat saat scroll (sticky).
  ws.views = [{ state: "frozen", ySplit: barisHeader }];

  // Hasilkan buffer .xlsx.
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ---------------------------------------------------------------------------
//  Fungsi bantu
// ---------------------------------------------------------------------------

// Tulis satu baris judul yang di-merge sepanjang kolom.
function tulisJudul(ws: ExcelJS.Worksheet, teks: string, baris: number, kolomTerakhir: string): void {
  ws.mergeCells(`A${baris}:${kolomTerakhir}${baris}`);
  const cell = ws.getCell(`A${baris}`);
  cell.value = teks;
  cell.font = { bold: true, size: baris === 1 ? 13 : 10 };
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

// Border tipis untuk seluruh sisi sel.
function borderTipis(): Partial<ExcelJS.Borders> {
  const sisi: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFCBD5E1" } };
  return { top: sisi, left: sisi, bottom: sisi, right: sisi };
}

// Ubah indeks kolom (1-based) menjadi huruf kolom Excel (1->A, 27->AA).
function kolomHuruf(indeks: number): string {
  let s = "";
  let n = indeks;
  while (n > 0) {
    const sisa = (n - 1) % 26;
    s = String.fromCharCode(65 + sisa) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Bentuk struktur kategori->fasilitas dari baris laporan (urut kategori).
function kelompokkanKategori(data: LaporanCabangRow) {
  const peta = new Map<
    string,
    { kode: string; nama: string; urutan: number; fasilitas: LaporanCabangRow["fasilitas"] }
  >();
  for (const f of data.fasilitas) {
    if (!peta.has(f.kategoriKode)) {
      peta.set(f.kategoriKode, {
        kode: f.kategoriKode,
        nama: f.kategoriNama,
        urutan: f.kategoriUrutan,
        fasilitas: [],
      });
    }
    peta.get(f.kategoriKode)!.fasilitas.push(f);
  }
  return [...peta.values()].sort((a, b) => a.urutan - b.urutan);
}
