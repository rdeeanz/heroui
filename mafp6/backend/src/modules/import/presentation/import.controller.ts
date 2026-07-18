// ============================================================================
//  CONTROLLER Import: unggah file .xlsx untuk PREVIEW (dry-run) & COMMIT.
//  Memakai FileInterceptor (multer, penyimpanan memori) sehingga file tersedia
//  sebagai buffer. Dibatasi peran PIC_CABANG & ADMIN_PUSAT.
// ============================================================================
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ImportHistorisUseCase } from "../application/import-historis.usecase";
import { Roles } from "@/shared/auth/roles.decorator";
import { CurrentUser } from "@/shared/auth/current-user.decorator";
import type { AuthUser } from "@/shared/auth/auth-user.type";

// Tipe minimal file unggahan (menghindari ketergantungan @types/multer).
interface FileUnggah {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

// Batas ukuran file 15 MB.
const OPSI_FILE = { limits: { fileSize: 15 * 1024 * 1024 } };

// Pastikan file ada & berekstensi .xlsx.
function pastikanExcel(file?: FileUnggah): FileUnggah {
  if (!file) throw new BadRequestException("File Excel wajib diunggah (field 'file').");
  // Terima berdasarkan ekstensi .xlsx (mimetype multipart kadang tidak konsisten).
  if (!/\.xlsx$/i.test(file.originalname)) {
    throw new BadRequestException("Hanya file .xlsx yang didukung.");
  }
  return file;
}

@Roles("PIC_CABANG", "ADMIN_PUSAT") // Seluruh endpoint impor dibatasi peran ini.
@Controller("import")
export class ImportController {
  constructor(private readonly importHistoris: ImportHistorisUseCase) {}

  // POST /import/preview -> parse + hitung availability tanpa menyimpan.
  @Post("preview")
  @UseInterceptors(FileInterceptor("file", OPSI_FILE))
  async preview(
    @UploadedFile() file: FileUnggah,
    @Body("sheet") sheet?: string,
  ) {
    // Validasi file lalu jalankan preview.
    const f = pastikanExcel(file);
    return this.importHistoris.preview(f.buffer, sheet || undefined);
  }

  // POST /import/commit -> parse + tulis ke DB (butuh cabang & periode target).
  @Post("commit")
  @UseInterceptors(FileInterceptor("file", OPSI_FILE))
  async commit(
    @UploadedFile() file: FileUnggah,
    @Body() body: Record<string, string>,
    @CurrentUser() user: AuthUser,
  ) {
    // Validasi file.
    const f = pastikanExcel(file);

    // Ambil & konversi field form (multipart mengirim string).
    const cabangId = body.cabangId;
    const tahun = parseInt(body.tahun, 10);
    const bulan = parseInt(body.bulan, 10);
    const overwrite = body.overwrite === "true" || body.overwrite === "1";
    const sheet = body.sheet || undefined;

    // Validasi field wajib.
    if (!cabangId) throw new BadRequestException("cabangId wajib diisi.");
    if (Number.isNaN(tahun) || Number.isNaN(bulan)) {
      throw new BadRequestException("tahun & bulan wajib berupa angka.");
    }

    // Jalankan commit.
    return this.importHistoris.commit({
      buffer: f.buffer,
      sheetName: sheet,
      cabangId,
      tahun,
      bulan,
      overwrite,
      user,
    });
  }
}
