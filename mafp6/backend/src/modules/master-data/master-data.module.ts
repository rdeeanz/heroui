// Modul master data: mengekspos controller baca untuk regional/cabang/kategori/periode.
import { Module } from "@nestjs/common";
import { MasterDataController } from "./master-data.controller";

@Module({
  controllers: [MasterDataController], // Daftarkan controller master data.
})
export class MasterDataModule {}
