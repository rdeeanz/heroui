// ============================================================================
//  CONTROLLER Inspeksi: endpoint buat/ambil/daftar inspeksi.
//  DTO divalidasi otomatis oleh ValidationPipe global (class-validator).
// ============================================================================
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  CreateInspeksiUseCase,
  GetInspeksiUseCase,
  ListInspeksiUseCase,
} from "../application/inspeksi.usecases";
import type { KondisiInspeksi } from "../application/ports/inspeksi.repository";
import { Roles } from "@/shared/auth/roles.decorator";

// Nilai kondisi yang valid (dipakai untuk validasi enum).
const KONDISI = ["BAIK", "TIDAK_BERUBAH", "KERUSAKAN_TAMBAHAN", "SUDAH_DIPERBAIKI"] as const;

// DTO satu item inspeksi.
class ItemDto {
  @IsInt() urutan!: number; // Nomor urut wajib integer.
  @IsString() namaItem!: string; // Nama item wajib string.
  @IsEnum(KONDISI) kondisi!: KondisiInspeksi; // Kondisi harus salah satu enum.
  @IsOptional() @IsString() keterangan?: string; // Keterangan opsional.
  @IsOptional() @IsString() fotoUrl?: string; // URL foto opsional.
}

// DTO pembuatan inspeksi.
class CreateInspeksiDto {
  @IsString() regionalNama!: string; // Nama regional.
  @IsString() namaPelabuhan!: string; // Nama pelabuhan/cabang.
  @IsString() namaFasilitas!: string; // Fasilitas yang diinspeksi.
  @IsOptional() @IsString() lokasiArea?: string; // Lokasi/area opsional.
  @IsDateString() tanggalInspeksi!: string; // Tanggal inspeksi (ISO).
  @IsOptional() @IsString() ttdCabangNama?: string; // Penandatangan cabang.
  @IsOptional() @IsString() ttdCabangNipp?: string; // NIPP cabang.
  @IsOptional() @IsString() ttdCabangImage?: string; // Data URL tanda tangan cabang.
  @IsOptional() @IsString() ttdMitraNama?: string; // Penandatangan mitra.
  @IsOptional() @IsString() ttdMitraNipp?: string; // NIPP mitra.
  @IsOptional() @IsString() ttdMitraImage?: string; // Data URL tanda tangan mitra.
  @IsArray()
  @ValidateNested({ each: true }) // Validasi tiap item.
  @Type(() => ItemDto) // Transform tiap elemen ke ItemDto.
  items!: ItemDto[];
}

// Controller dengan prefix /inspeksi.
@Controller("inspeksi")
export class InspeksiController {
  constructor(
    private readonly createInspeksi: CreateInspeksiUseCase,
    private readonly getInspeksi: GetInspeksiUseCase,
    private readonly listInspeksi: ListInspeksiUseCase,
  ) {}

  // POST /inspeksi -> buat inspeksi baru (hanya PIC Cabang atau Admin Pusat).
  @Roles("PIC_CABANG", "ADMIN_PUSAT")
  @Post()
  async create(@Body() dto: CreateInspeksiDto) {
    // Ubah tanggal string ISO menjadi objek Date lalu jalankan use-case.
    return this.createInspeksi.execute({
      ...dto,
      tanggalInspeksi: new Date(dto.tanggalInspeksi),
    });
  }

  // GET /inspeksi -> daftar seluruh inspeksi.
  @Get()
  async list() {
    return this.listInspeksi.execute();
  }

  // GET /inspeksi/:id -> ambil satu inspeksi.
  @Get(":id")
  async get(@Param("id") id: string) {
    return this.getInspeksi.execute(id);
  }
}
