// ============================================================================
//  PARSER Excel historis (layout "Lap. Cabang") memakai ExcelJS.
//  Mendeteksi baris header & memetakan kolom berdasarkan JUDULNYA (bukan posisi
//  tetap), sehingga tahan terhadap variasi format (kolom bergeser, dsb.).
//  Logika inti (parseWorksheet) murni agar mudah diuji terhadap file nyata.
// ============================================================================
import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import {
  ExcelParserPort,
  ParseResult,
  ParsedFasilitas,
  ParsedObjek,
  ParsedMeta,
} from "../application/ports/parsed-laporan";

// --- Util normalisasi teks: huruf kecil, rapatkan spasi, buang spasi tepi. ---
function normalize(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Ambil nilai mentah sebuah sel (menangani formula, rich text, error).
function rawValue(cell: ExcelJS.Cell): unknown {
  let v: any = cell.value;
  if (v === null || v === undefined) return null;
  // Objek bernilai khusus dari ExcelJS.
  if (typeof v === "object") {
    if ("result" in v) v = v.result; // Sel formula -> pakai hasil terhitung.
    else if ("richText" in v) return v.richText.map((t: any) => t.text).join(""); // Rich text.
    else if ("text" in v) return v.text; // Hyperlink.
    else if ("error" in v) return null; // Nilai error (#DIV/0! dsb).
    // Bila hasil formula ternyata objek error, anggap kosong.
    if (v && typeof v === "object" && "error" in v) return null;
  }
  return v;
}

// Ambil teks bersih dari sel (null bila kosong).
function txt(cell: ExcelJS.Cell): string | null {
  const v = rawValue(cell);
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// Ambil angka dari sel (null bila tidak bisa diangkakan).
function num(cell: ExcelJS.Cell): number | null {
  const v = rawValue(cell);
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  // Coba parse string angka (toleran koma desimal).
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

// Petakan judul kolom (dinormalisasi) ke kunci field internal.
// Urutan pengecekan penting: frasa spesifik didahulukan sebelum kata umum.
function fieldFromHeader(t: string): string | null {
  if (t.includes("nama fasilitas")) return "namaFasilitas";
  if (t.includes("objek fasilitas") || t === "objek") return "objek";
  if (t.includes("fasilitas tersedia") || t === "tersedia") return "tersedia";
  if (t.includes("siap pakai")) return "siapPakai";
  if (t.includes("availability objek")) return "availObjek";
  if (t.includes("availability fasilitas") || t.includes("availability fas")) return "availFasilitas";
  if (t.includes("ringan")) return "ringan";
  if (t.includes("sedang")) return "sedang";
  if (t.includes("berat")) return "berat";
  if (t.includes("panjang")) return "panjang";
  if (t.includes("lebar")) return "lebar";
  if (t.includes("luas")) return "luas";
  if (t.includes("jumlah")) return "jumlah";
  if (t.includes("konstruksi")) return "konstruksi";
  if (t.includes("operator")) return "operator";
  if (t.includes("keterangan")) return "keterangan";
  if (t === "no" || t === "no.") return "no";
  if (t === "fasilitas") return "kategori"; // Cocok persis saja (bukan turunannya).
  return null;
}

// Kanonikalkan nama kategori dari teks bebas -> nama & kode standar.
function kanonKategori(text: string): { nama: string; kode: string } | null {
  const t = normalize(text);
  // Abaikan baris subtotal/total yang kebetulan memuat kata kategori.
  if (t.includes("availability") || t.includes("total") || t.includes("rata")) return null;
  if (t.includes("dermaga")) return { nama: "DERMAGA", kode: "I" };
  if (t.includes("lapangan")) return { nama: "LAPANGAN PENUMPUKAN", kode: "II" };
  if (t.includes("gudang")) return { nama: "GUDANG", kode: "III" };
  if (t.includes("terminal")) return { nama: "TERMINAL PENUMPANG", kode: "IV" };
  return null;
}

// Cek apakah string berupa bilangan bulat pendek (untuk mengenali baris nomor kolom).
function pureInt(s: string | null): boolean {
  return !!s && /^\d{1,3}$/.test(s.trim());
}

// Ubah nama bulan Indonesia -> angka 1..12 (berdasar 3 huruf awal).
function bulanDariTeks(text: string): number | undefined {
  const t = normalize(text).slice(0, 3);
  const peta: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, jun: 6,
    jul: 7, ags: 8, agu: 8, sep: 9, okt: 10, nov: 11, des: 12,
  };
  return peta[t];
}

// Cari baris header: baris pertama yang memetakan objek+tersedia+namaFasilitas.
function cariHeader(ws: ExcelJS.Worksheet): { baris: number; kolom: Record<string, number> } | null {
  const maksBaris = Math.min(ws.rowCount, 40); // Batasi pencarian di kepala sheet.
  for (let r = 1; r <= maksBaris; r++) {
    const row = ws.getRow(r);
    const kolom: Record<string, number> = {};
    // Petakan tiap kolom pada baris ini.
    for (let c = 1; c <= Math.min(ws.columnCount, 30); c++) {
      const t = normalize(txt(row.getCell(c)));
      if (!t) continue;
      const field = fieldFromHeader(t);
      // Ambil kemunculan pertama tiap field.
      if (field && !(field in kolom)) kolom[field] = c;
    }
    // Baris header valid bila menemukan kolom kunci.
    if ("objek" in kolom && "tersedia" in kolom && "namaFasilitas" in kolom) {
      return { baris: r, kolom };
    }
  }
  return null;
}

// Ekstrak metadata kepala (regional, pelabuhan, bulan, tahun) dari baris atas.
function ekstrakMeta(ws: ExcelJS.Worksheet, batasBaris: number): ParsedMeta {
  const meta: ParsedMeta = {};
  // Fungsi bantu: ambil "nilai" dari pola "Label : Nilai".
  // File historis menaruh nilai pada sel yang diawali ":" (mis. ": TANJUNG PRIOK"),
  // sedangkan sel di antaranya sering mengulang teks label. Maka kita cari sel
  // yang MENGANDUNG ":" mulai dari kolom label, lalu ambil teks setelah ":".
  const nilaiSetelah = (row: ExcelJS.Row, mulai: number): string | null => {
    for (let c = mulai; c <= Math.min(ws.columnCount, 30); c++) {
      const v = txt(row.getCell(c));
      if (v && v.includes(":")) {
        // Ambil bagian setelah ":" pertama.
        const val = v.split(":").slice(1).join(":").trim();
        if (val) return val;
      }
    }
    return null;
  };
  // Pindai baris di atas header.
  for (let r = 1; r < batasBaris; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= Math.min(ws.columnCount, 30); c++) {
      const t = normalize(txt(row.getCell(c)));
      if (!t) continue;
      if (t.startsWith("regional") && !meta.regional) meta.regional = nilaiSetelah(row, c) ?? undefined;
      else if (t.startsWith("pelabuhan") && !meta.pelabuhan) meta.pelabuhan = nilaiSetelah(row, c) ?? undefined;
      else if ((t.includes("periodik") || t.startsWith("bulan") || t.startsWith("periode")) && meta.bulan === undefined) {
        const v = nilaiSetelah(row, c);
        if (v) meta.bulan = bulanDariTeks(v);
      } else if (t.startsWith("tahun") && meta.tahun === undefined) {
        const v = nilaiSetelah(row, c);
        if (v) {
          const n = parseInt(v.replace(/\D/g, ""), 10);
          if (!Number.isNaN(n)) meta.tahun = n;
        }
      }
    }
  }
  return meta;
}

// FUNGSI INTI: parse satu worksheet menjadi ParseResult.
export function parseWorksheet(ws: ExcelJS.Worksheet): ParseResult {
  const warnings: string[] = [];

  // Temukan header & pemetaan kolom.
  const header = cariHeader(ws);
  if (!header) {
    // Tanpa header yang dikenali, kembalikan hasil kosong + peringatan.
    return {
      sheetName: ws.name,
      meta: {},
      fasilitas: [],
      warnings: [`Sheet "${ws.name}": baris header tidak ditemukan (butuh kolom Objek/Tersedia/Nama Fasilitas).`],
    };
  }
  const K = header.kolom; // Peta field -> indeks kolom.

  // Ekstrak metadata kepala.
  const meta = ekstrakMeta(ws, header.baris);

  // Ambil sel berdasarkan field bila kolomnya terdeteksi.
  const cellNum = (row: ExcelJS.Row, field: string): number | null =>
    field in K ? num(row.getCell(K[field])) : null;
  const cellTxt = (row: ExcelJS.Row, field: string): string | null =>
    field in K ? txt(row.getCell(K[field])) : null;

  const fasilitas: ParsedFasilitas[] = [];
  let kategoriSaatIni: { nama: string; kode: string } | null = null;
  let fasilitasSaatIni: ParsedFasilitas | null = null;

  // Iterasi baris data setelah header (lewati baris satuan/nomor kolom).
  for (let r = header.baris + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const namaFas = cellTxt(row, "namaFasilitas"); // Kolom Nama Fasilitas.
    const objekNama = cellTxt(row, "objek"); // Kolom Objek Fasilitas.
    const katText = cellTxt(row, "kategori"); // Kolom Fasilitas (kategori).

    // 0) Lewati baris SUB-HEADER: pengulangan judul (mis. "Nama Fasilitas",
    //    "Objek Fasilitas") atau baris nomor kolom (mis. Nama="3", Objek="4").
    if (
      normalize(namaFas) === "nama fasilitas" ||
      normalize(objekNama) === "objek fasilitas" ||
      normalize(katText) === "fasilitas" ||
      (pureInt(namaFas) && pureInt(objekNama))
    ) {
      continue;
    }

    // 1) Baris FASILITAS: kolom Nama Fasilitas terisi.
    if (namaFas) {
      // Tentukan kategori: pakai yang aktif; bila belum ada, coba simpulkan dari kolom kategori.
      let kat = kategoriSaatIni;
      if (!kat && katText) kat = kanonKategori(katText);
      if (!kat) {
        // Tanpa kategori, fasilitas tetap dibuat dengan kategori "LAINNYA" + warning.
        kat = { nama: "LAINNYA", kode: "0" };
        warnings.push(`Baris ${r}: fasilitas "${namaFas}" tanpa kategori jelas; dikelompokkan ke LAINNYA.`);
      }
      // Buat fasilitas baru dan jadikan konteks aktif.
      fasilitasSaatIni = {
        namaFasilitas: namaFas,
        operator: cellTxt(row, "operator"),
        konstruksi: cellTxt(row, "konstruksi"),
        kategoriKode: kat.kode,
        kategoriNama: kat.nama,
        objek: [],
      };
      fasilitas.push(fasilitasSaatIni);
      continue;
    }

    // 2) Baris OBJEK: kolom Objek Fasilitas terisi.
    if (objekNama) {
      // Objek harus punya fasilitas induk.
      if (!fasilitasSaatIni) {
        warnings.push(`Baris ${r}: objek "${objekNama}" tanpa fasilitas induk; dilewati.`);
        continue;
      }
      // Ambil nilai numerik (fallback 0 bila kosong).
      const tersedia = cellNum(row, "tersedia") ?? 0;
      const siapPakai = cellNum(row, "siapPakai");
      // Bila tersedia 0/kosong, beri peringatan (data historis kerap belum lengkap).
      if (!tersedia) {
        warnings.push(`Baris ${r}: objek "${objekNama}" pada "${fasilitasSaatIni.namaFasilitas}" memiliki Fasilitas Tersedia kosong/0.`);
      }
      // Susun objek.
      const objek: ParsedObjek = {
        nama: objekNama,
        panjang: cellNum(row, "panjang"),
        lebar: cellNum(row, "lebar"),
        luas: cellNum(row, "luas"),
        jumlah: cellNum(row, "jumlah"),
        fasilitasTersedia: tersedia,
        rusakRingan: cellNum(row, "ringan") ?? 0,
        rusakSedang: cellNum(row, "sedang") ?? 0,
        rusakBerat: cellNum(row, "berat") ?? 0,
        // Siap pakai: pakai nilai file bila ada; jika tidak, hitung dari kerusakan.
        fasilitasSiapPakai:
          siapPakai !== null
            ? siapPakai
            : Math.max(0, tersedia - ((cellNum(row, "ringan") ?? 0) + (cellNum(row, "sedang") ?? 0) + (cellNum(row, "berat") ?? 0))),
        keterangan: cellTxt(row, "keterangan"),
      };
      fasilitasSaatIni.objek.push(objek);
      continue;
    }

    // 3) Baris KATEGORI: kolom Fasilitas berisi nama kategori yang dikenali.
    if (katText) {
      const kanon = kanonKategori(katText);
      if (kanon) {
        // Ambil kode dari kolom No bila berupa angka romawi, jika tidak pakai kanon.
        const noText = cellTxt(row, "no");
        kategoriSaatIni = {
          nama: kanon.nama,
          kode: noText && /^[ivxlc]+$/i.test(noText) ? noText.toUpperCase() : kanon.kode,
        };
        // Kategori baru mengakhiri konteks fasilitas sebelumnya.
        fasilitasSaatIni = null;
        continue;
      }
    }

    // 4) Baris lain (kosong/subtotal/satuan) diabaikan.
  }

  // Ringkas peringatan bila fasilitas kosong.
  if (fasilitas.length === 0) {
    warnings.push(`Sheet "${ws.name}": tidak ada baris fasilitas terdeteksi.`);
  }

  return { sheetName: ws.name, meta, fasilitas, warnings };
}

// Implementasi port parser memakai ExcelJS.
@Injectable()
export class ExcelJsLaporanParser implements ExcelParserPort {
  // Parse buffer .xlsx; auto-deteksi sheet berlayout Lap. Cabang bila tak diberi.
  async parse(buffer: Buffer, sheetName?: string): Promise<ParseResult> {
    // Muat workbook dari buffer.
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);

    // Bila sheet ditentukan, pakai itu.
    if (sheetName) {
      const ws = wb.getWorksheet(sheetName);
      if (!ws) throw new Error(`Sheet "${sheetName}" tidak ditemukan.`);
      return parseWorksheet(ws);
    }

    // Auto-deteksi: pilih sheet pertama yang menghasilkan fasilitas.
    let terbaik: ParseResult | null = null;
    for (const ws of wb.worksheets) {
      const hasil = parseWorksheet(ws);
      if (hasil.fasilitas.length > 0) return hasil; // Sheet valid pertama.
      // Simpan kandidat pertama untuk pesan bila tak ada yang cocok.
      if (!terbaik) terbaik = hasil;
    }
    // Tak ada sheet berisi fasilitas: kembalikan kandidat/kosong + peringatan.
    return (
      terbaik ?? {
        sheetName: wb.worksheets[0]?.name ?? "",
        meta: {},
        fasilitas: [],
        warnings: ["File tidak memuat sheet berlayout laporan yang dikenali."],
      }
    );
  }

  // Daftar nama sheet dalam file.
  async listSheets(buffer: Buffer): Promise<string[]> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    return wb.worksheets.map((w) => w.name);
  }
}
