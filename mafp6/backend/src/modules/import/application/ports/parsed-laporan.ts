// ============================================================================
//  Tipe hasil parsing Excel historis + PORT parser.
//  Parser mengubah file .xlsx (layout "Lap. Cabang") menjadi struktur data
//  yang dipahami sistem, dengan deteksi kolom berbasis judul (normalisasi)
//  agar tahan terhadap variasi format antar tahun/cabang.
// ============================================================================

// Satu objek fasilitas hasil parsing (nilai mentah).
export interface ParsedObjek {
  nama: string;
  panjang: number | null;
  lebar: number | null;
  luas: number | null;
  jumlah: number | null;
  fasilitasTersedia: number;
  rusakRingan: number;
  rusakSedang: number;
  rusakBerat: number;
  fasilitasSiapPakai: number;
  keterangan: string | null;
}

// Satu fasilitas hasil parsing beserta objek & konteks kategorinya.
export interface ParsedFasilitas {
  namaFasilitas: string;
  operator: string | null;
  konstruksi: string | null;
  kategoriKode: string; // "I".."IV" (dari kolom No) atau turunan.
  kategoriNama: string; // "DERMAGA", dst. (dikanonikalkan).
  objek: ParsedObjek[];
}

// Metadata dari kepala sheet (untuk saran cabang/periode di preview).
export interface ParsedMeta {
  regional?: string;
  pelabuhan?: string;
  bulan?: number; // 1..12 bila bisa dikenali.
  tahun?: number;
}

// Hasil parsing lengkap satu sheet.
export interface ParseResult {
  sheetName: string; // Nama sheet yang diparse.
  meta: ParsedMeta; // Metadata kepala.
  fasilitas: ParsedFasilitas[]; // Daftar fasilitas + objek.
  warnings: string[]; // Peringatan normalisasi (mis. tersedia kosong).
}

// Token injeksi parser.
export const EXCEL_PARSER = Symbol("EXCEL_PARSER");

// Kontrak parser Excel.
export interface ExcelParserPort {
  // Parse buffer .xlsx. `sheetName` opsional; bila kosong, auto-deteksi sheet
  // yang berlayout "Lap. Cabang".
  parse(buffer: Buffer, sheetName?: string): Promise<ParseResult>;
  // Daftar nama sheet dalam file (untuk pemilihan di UI).
  listSheets(buffer: Buffer): Promise<string[]>;
}
