// ============================================================================
//  MODUL Inspeksi: merangkai controller, use-cases, repository Prisma, dan
//  penyimpanan tanda tangan (inline secara default, S3 bila env S3 lengkap).
//  Mengekspor use-case Get agar modul Export bisa memakainya untuk PDF.
// ============================================================================
import { Module } from "@nestjs/common";
import { InspeksiController } from "./presentation/inspeksi.controller";
import {
  CreateInspeksiUseCase,
  GetInspeksiUseCase,
  ListInspeksiUseCase,
} from "./application/inspeksi.usecases";
import { INSPEKSI_REPOSITORY } from "./application/ports/inspeksi.repository";
import { SIGNATURE_STORAGE } from "./application/ports/signature-storage";
import { PrismaInspeksiRepository } from "./infrastructure/prisma-inspeksi.repository";
import { InlineSignatureStorage } from "./infrastructure/inline-signature-storage";
import { S3SignatureStorage } from "./infrastructure/s3-signature-storage";

@Module({
  controllers: [InspeksiController], // Endpoint HTTP.
  providers: [
    CreateInspeksiUseCase,
    GetInspeksiUseCase,
    ListInspeksiUseCase,
    // Ikat port repository ke implementasi Prisma.
    { provide: INSPEKSI_REPOSITORY, useClass: PrismaInspeksiRepository },
    // Pilih penyimpanan tanda tangan berdasarkan konfigurasi lingkungan:
    // - Bila S3 (bucket + kredensial) lengkap -> unggah ke S3.
    // - Selain itu -> simpan inline (data URL) di database (default).
    {
      provide: SIGNATURE_STORAGE,
      useFactory: () => {
        // Baca konfigurasi S3 dari environment.
        const bucket = process.env.S3_BUCKET;
        const accessKeyId = process.env.S3_ACCESS_KEY_ID;
        const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
        // Gunakan S3 hanya bila ketiga nilai inti tersedia.
        if (bucket && accessKeyId && secretAccessKey) {
          return new S3SignatureStorage({
            region: process.env.S3_REGION ?? "ap-southeast-1",
            bucket,
            accessKeyId,
            secretAccessKey,
            endpoint: process.env.S3_ENDPOINT || undefined,
          });
        }
        // Default: penyimpanan inline (tanpa layanan eksternal).
        return new InlineSignatureStorage();
      },
    },
  ],
  // Ekspor use-case Get agar modul Export bisa memakainya untuk PDF.
  exports: [GetInspeksiUseCase],
})
export class InspeksiModule {}
