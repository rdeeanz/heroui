// ============================================================================
//  PORT repository IMPORT: menulis hasil parsing ke database (periode +
//  fasilitas + objek), plus lookup untuk validasi/RBAC.
// ============================================================================
import type { ParsedObjek } from "./parsed-laporan";

// Info cabang (untuk validasi target & scoping RBAC).
export interface CabangInfo {
  id: string;
  nama: string;
  regionalKode: string;
  regionalNama: string;
}

// Satu fasilitas siap-tulis (hasil parsing yang sudah dikelompokkan).
export interface FasilitasTulis {
  kategoriKode: string;
  kategoriNama: string;
  namaFasilitas: string;
  operator: string | null;
  konstruksi: string | null;
  objek: ParsedObjek[];
}

// Parameter operasi import.
export interface ImportParams {
  cabangId: string;
  tahun: number;
  bulan: number;
  overwrite: boolean; // Bila true & periode sudah ada, ganti datanya.
  fasilitas: FasilitasTulis[];
}

// Hasil import (ringkasan jumlah).
export interface ImportHasil {
  periodeId: string;
  fasilitasCount: number;
  objekCount: number;
}

// Token injeksi.
export const IMPORT_REPOSITORY = Symbol("IMPORT_REPOSITORY");

// Kontrak repository import.
export interface ImportRepositoryPort {
  // Ambil info cabang berdasarkan id (null bila tidak ada).
  getCabang(cabangId: string): Promise<CabangInfo | null>;
  // Status periode yang sudah ada (untuk cek overwrite). Null bila belum ada.
  getPeriodeStatus(cabangId: string, tahun: number, bulan: number): Promise<{ id: string; status: string } | null>;
  // Tulis data import secara transaksional; kembalikan ringkasan.
  importData(params: ImportParams): Promise<ImportHasil>;
}
