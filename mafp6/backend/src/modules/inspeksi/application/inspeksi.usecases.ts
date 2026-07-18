// ============================================================================
//  USE-CASES Inspeksi: buat, ambil satu, dan daftar.
//  Logika orkestrasi tipis di atas repository (Clean Architecture).
// ============================================================================
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  INSPEKSI_REPOSITORY,
  InspeksiRepositoryPort,
  BuatInspeksiInput,
  InspeksiLengkap,
} from "./ports/inspeksi.repository";
import {
  SIGNATURE_STORAGE,
  SignatureStoragePort,
} from "./ports/signature-storage";

// Use-case: membuat inspeksi baru (termasuk memproses tanda tangan digital).
@Injectable()
export class CreateInspeksiUseCase {
  constructor(
    @Inject(INSPEKSI_REPOSITORY) private readonly repo: InspeksiRepositoryPort,
    @Inject(SIGNATURE_STORAGE) private readonly storage: SignatureStoragePort,
  ) {}

  // Jalankan pembuatan; simpan gambar tanda tangan lalu persist datanya.
  async execute(data: BuatInspeksiInput): Promise<InspeksiLengkap> {
    // Simpan tanda tangan Cabang bila ada -> dapatkan referensi (data URL/URL S3).
    const ttdCabangImage = data.ttdCabangImage
      ? await this.storage.simpan(data.ttdCabangImage, "cabang")
      : null;
    // Simpan tanda tangan Mitra bila ada.
    const ttdMitraImage = data.ttdMitraImage
      ? await this.storage.simpan(data.ttdMitraImage, "mitra")
      : null;

    // Persist inspeksi dengan referensi tanda tangan yang sudah tersimpan.
    return this.repo.create({
      ...data,
      ttdCabangImage,
      ttdMitraImage,
    });
  }
}

// Use-case: mengambil satu inspeksi (lempar 404 bila tidak ada).
@Injectable()
export class GetInspeksiUseCase {
  constructor(
    @Inject(INSPEKSI_REPOSITORY) private readonly repo: InspeksiRepositoryPort,
  ) {}

  // Ambil berdasarkan id.
  async execute(id: string): Promise<InspeksiLengkap> {
    const hasil = await this.repo.findById(id);
    if (!hasil) throw new NotFoundException(`Inspeksi ${id} tidak ditemukan.`);
    return hasil;
  }
}

// Use-case: daftar seluruh inspeksi.
@Injectable()
export class ListInspeksiUseCase {
  constructor(
    @Inject(INSPEKSI_REPOSITORY) private readonly repo: InspeksiRepositoryPort,
  ) {}

  // Ambil daftar.
  async execute(): Promise<InspeksiLengkap[]> {
    return this.repo.list();
  }
}
