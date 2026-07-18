// Modul global agar PrismaService dapat dipakai di seluruh aplikasi tanpa import berulang.
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

// @Global membuat provider modul ini tersedia di mana saja.
@Global()
@Module({
  providers: [PrismaService], // Daftarkan PrismaService sebagai provider.
  exports: [PrismaService], // Ekspor agar modul lain bisa meng-inject-nya.
})
export class PrismaModule {}
