// Service pembungkus PrismaClient agar terintegrasi dengan siklus hidup NestJS.
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

// @Injectable menandai kelas ini dapat di-inject ke service/repository lain.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Dipanggil saat modul diinisialisasi: buka koneksi ke database.
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  // Dipanggil saat aplikasi dimatikan: tutup koneksi dengan rapi.
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
