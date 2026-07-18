// ============================================================================
//  IMPLEMENTASI penyimpanan tanda tangan INLINE (default).
//  Menyimpan gambar tanda tangan langsung sebagai data URL di kolom database.
//  Cocok untuk gambar kecil, tidak perlu layanan eksternal, dan memudahkan
//  PDF menyematkan gambar langsung. Cukup untuk lingkungan tanpa S3.
// ============================================================================
import { BadRequestException, Injectable } from "@nestjs/common";
import { SignatureStoragePort, validasiDataUrlGambar } from "../application/ports/signature-storage";

@Injectable()
export class InlineSignatureStorage implements SignatureStoragePort {
  // Simpan tanda tangan: validasi format lalu kembalikan data URL apa adanya.
  async simpan(dataUrl: string, _namaBerkas: string): Promise<string> {
    try {
      // Pastikan formatnya data URL gambar yang benar.
      validasiDataUrlGambar(dataUrl);
    } catch (e) {
      // Ubah menjadi error HTTP 400 yang jelas untuk klien.
      throw new BadRequestException((e as Error).message);
    }
    // Referensi yang disimpan = data URL itu sendiri (tersimpan di DB).
    return dataUrl;
  }
}
