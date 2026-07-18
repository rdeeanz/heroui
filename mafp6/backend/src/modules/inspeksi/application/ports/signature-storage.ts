// ============================================================================
//  PORT penyimpanan tanda tangan digital.
//  Menerima gambar tanda tangan (data URL base64 PNG) lalu mengembalikan
//  "referensi" tersimpan — bisa berupa data URL itu sendiri (inline/DB) atau
//  URL objek di S3, tergantung implementasi. Application tidak tahu detailnya.
// ============================================================================

// Token injeksi untuk NestJS.
export const SIGNATURE_STORAGE = Symbol("SIGNATURE_STORAGE");

// Kontrak penyimpanan tanda tangan.
export interface SignatureStoragePort {
  // Simpan satu tanda tangan. `dataUrl` = "data:image/png;base64,....".
  // `namaBerkas` dipakai sebagai bagian nama objek (mis. "cabang", "mitra").
  // Mengembalikan referensi yang akan disimpan di database.
  simpan(dataUrl: string, namaBerkas: string): Promise<string>;
}

// Validasi sederhana: pastikan string adalah data URL gambar PNG/JPEG base64.
// Dipakai bersama oleh implementasi agar aturannya konsisten.
export function validasiDataUrlGambar(dataUrl: string): void {
  // Pola: data:image/(png|jpeg|jpg);base64,<isi>.
  const pola = /^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=]+$/;
  // Lempar error bila format tidak sesuai (mencegah data sampah/injeksi).
  if (!pola.test(dataUrl)) {
    throw new Error("Format tanda tangan tidak valid (harus data URL PNG/JPEG base64).");
  }
}
