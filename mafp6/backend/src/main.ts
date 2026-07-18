// ============================================================================
//  TITIK MASUK aplikasi backend NestJS.
// ============================================================================
import "reflect-metadata"; // Wajib untuk dekorator & dependency injection NestJS.
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

// Fungsi bootstrap: membuat & menjalankan aplikasi.
async function bootstrap(): Promise<void> {
  // Buat instance aplikasi Nest dari modul akar.
  const app = await NestFactory.create(AppModule);

  // Semua endpoint diberi prefix /api agar rapi di belakang reverse proxy.
  app.setGlobalPrefix("api");

  // Aktifkan validasi otomatis DTO memakai class-validator (keamanan input).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Buang properti yang tidak dideklarasikan di DTO.
      transform: true, // Ubah payload ke tipe kelas DTO otomatis.
    }),
  );

  // Izinkan akses dari frontend (CORS). Origin dibatasi lewat env di produksi.
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? true, // Daftar origin atau semua saat dev.
    credentials: true, // Izinkan pengiriman cookie/authorization.
  });

  // Ambil port dari environment, default 3000.
  const port = Number(process.env.PORT ?? 3000);

  // Jalankan server dan dengarkan pada semua interface (0.0.0.0) untuk Docker.
  await app.listen(port, "0.0.0.0");

  // Catat informasi bahwa server sudah berjalan.
  Logger.log(`SiMFAS backend berjalan di http://localhost:${port}/api`, "Bootstrap");
}

// Panggil bootstrap dan tangani error fatal saat startup.
bootstrap().catch((err) => {
  // Cetak error dan hentikan proses dengan kode gagal.
  Logger.error(err, "Bootstrap");
  process.exit(1);
});
