// ============================================================================
//  IMPLEMENTASI penyimpanan tanda tangan ke AWS S3 (opsional, produksi).
//  Meng-upload gambar tanda tangan sebagai objek PNG lalu mengembalikan URL-nya.
//  Dipakai bila variabel lingkungan S3 diset (lihat wiring di inspeksi.module).
//  Catatan: pada lingkungan build ini S3 tidak tersedia sehingga implementasi
//  ini BELUM diuji langsung; default sistem memakai penyimpanan inline.
// ============================================================================
import { BadRequestException, Injectable } from "@nestjs/common";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { SignatureStoragePort, validasiDataUrlGambar } from "../application/ports/signature-storage";

// Konfigurasi yang dibutuhkan penyimpanan S3.
export interface S3Config {
  region: string; // Region bucket.
  bucket: string; // Nama bucket.
  accessKeyId: string; // Kredensial IAM.
  secretAccessKey: string; // Kredensial IAM.
  endpoint?: string; // Endpoint kustom (untuk S3-compatible seperti MinIO).
}

@Injectable()
export class S3SignatureStorage implements SignatureStoragePort {
  // Klien S3 dibuat sekali dari konfigurasi.
  private readonly client: S3Client;

  constructor(private readonly config: S3Config) {
    // Inisialisasi klien S3 dengan region, kredensial, dan endpoint opsional.
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // forcePathStyle memudahkan kompatibilitas dengan MinIO bila endpoint diisi.
      ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
    });
  }

  // Simpan tanda tangan ke S3 lalu kembalikan URL objeknya.
  async simpan(dataUrl: string, namaBerkas: string): Promise<string> {
    // Validasi format data URL gambar.
    try {
      validasiDataUrlGambar(dataUrl);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    // Pisahkan header data URL dari isi base64: "data:image/png;base64,<isi>".
    const [header, base64] = dataUrl.split(",");
    // Tentukan tipe konten dari header (png/jpeg).
    const contentType = header.includes("jpeg") || header.includes("jpg")
      ? "image/jpeg"
      : "image/png";
    // Ekstensi berkas sesuai tipe.
    const ext = contentType === "image/jpeg" ? "jpg" : "png";
    // Ubah base64 menjadi buffer biner.
    const buffer = Buffer.from(base64, "base64");

    // Susun key objek yang unik (mis. "signatures/cabang-<uuid>.png").
    const key = `signatures/${namaBerkas}-${randomUUID()}.${ext}`;

    // Unggah objek ke S3.
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    // Susun URL objek: pakai endpoint kustom bila ada, jika tidak URL AWS standar.
    if (this.config.endpoint) {
      // Format path-style untuk endpoint kustom (MinIO).
      return `${this.config.endpoint.replace(/\/$/, "")}/${this.config.bucket}/${key}`;
    }
    // Format URL virtual-hosted-style AWS.
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }
}
