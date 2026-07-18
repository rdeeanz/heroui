// ============================================================================
//  SERVICE Notifikasi (application) — pusat logika notifikasi:
//  - Membuat notifikasi in-app + mengirim email (best-effort) via port.
//  - Notifikasi event alur kerja (submit -> Regional/Pusat, review -> PIC).
//  - Query notifikasi milik pengguna (list/count/mark).
//  - Membuat reminder laporan bulanan (deduped).
//  Diekspor agar modul lain (Laporan) dapat memicu notifikasi.
// ============================================================================
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  NOTIFIKASI_REPOSITORY,
  NotifikasiRepositoryPort,
  CreateNotifikasiData,
  NotifikasiRow,
  Recipient,
} from "./ports/notifikasi.repository";
import { EMAIL_SENDER, EmailSenderPort } from "./ports/email-sender";
import { labelPeriode } from "@/shared/util/periode";

// Info periode minimal yang dibutuhkan untuk notifikasi alur kerja.
export interface PeriodeNotifInfo {
  cabangId: string;
  cabangNama: string;
  regionalKode: string;
  tahun: number;
  bulan: number;
}

@Injectable()
export class NotifikasiService {
  // Logger untuk mencatat aktivitas notifikasi.
  private readonly logger = new Logger(NotifikasiService.name);

  constructor(
    @Inject(NOTIFIKASI_REPOSITORY) private readonly repo: NotifikasiRepositoryPort,
    @Inject(EMAIL_SENDER) private readonly email: EmailSenderPort,
  ) {}

  // --- Query (dipakai controller) ---
  listForUser(userId: string, limit = 50): Promise<NotifikasiRow[]> {
    return this.repo.listForUser(userId, limit);
  }
  countUnread(userId: string): Promise<number> {
    return this.repo.countUnread(userId);
  }
  markRead(id: string, userId: string): Promise<void> {
    return this.repo.markRead(id, userId);
  }
  markAllRead(userId: string): Promise<void> {
    return this.repo.markAllRead(userId);
  }

  // --- Notifikasi event alur kerja ---

  // Saat Cabang submit laporan: beri tahu Admin Regional (wilayah tsb) & Pusat.
  async notifyLaporanSubmitted(p: PeriodeNotifInfo): Promise<void> {
    // Kumpulkan penerima: admin regional wilayah ini + admin pusat.
    const regional = await this.repo.findRecipients({ role: "ADMIN_REGIONAL", regionalKode: p.regionalKode });
    const pusat = await this.repo.findRecipients({ role: "ADMIN_PUSAT" });
    const penerima = gabungUnik(regional, pusat);
    // Susun pesan.
    const judul = "Laporan menunggu review";
    const pesan = `Cabang ${p.cabangNama} mengirim laporan ${labelPeriode(p.bulan, p.tahun)} untuk direview.`;
    // Kirim ke tiap penerima (in-app + email best-effort).
    await this.kirimKeBanyak(penerima, { jenis: "LAPORAN_SUBMITTED", judul, pesan, tautan: "persetujuan" });
  }

  // Saat Regional mereview: beri tahu PIC cabang (disetujui/ditolak).
  async notifyLaporanReviewed(p: PeriodeNotifInfo, disetujui: boolean, catatan?: string): Promise<void> {
    // Penerima: PIC cabang terkait.
    const pic = await this.repo.findRecipients({ role: "PIC_CABANG", cabangId: p.cabangId });
    // Susun pesan sesuai keputusan.
    const judul = disetujui ? "Laporan disetujui" : "Laporan ditolak";
    const dasar = `Laporan ${labelPeriode(p.bulan, p.tahun)} cabang ${p.cabangNama}`;
    const pesan = disetujui
      ? `${dasar} telah disetujui Regional.`
      : `${dasar} ditolak.${catatan ? ` Catatan: ${catatan}` : ""} Silakan revisi & kirim ulang.`;
    // Kirim.
    await this.kirimKeBanyak(pic, {
      jenis: disetujui ? "LAPORAN_REVIEWED" : "LAPORAN_REJECTED",
      judul,
      pesan,
      tautan: "persetujuan",
    });
  }

  // --- Reminder laporan bulanan ---

  // Buat pengingat untuk PIC cabang yang belum menyelesaikan laporan periode ini.
  // Idempoten per bulan berkat kunci dedupe (aman dijalankan harian).
  async generateReminders(now: Date = new Date()): Promise<{ dibuat: number }> {
    // Periode target = bulan berjalan.
    const tahun = now.getFullYear();
    const bulan = now.getMonth() + 1;

    // Ambil cabang yang laporannya belum final (belum ada / DRAFT / REJECTED).
    const cabangList = await this.repo.findCabangButuhLaporan(tahun, bulan);

    // Susun baris reminder untuk tiap PIC (dengan kunci dedupe per bulan).
    const rows: CreateNotifikasiData[] = [];
    const emailTugas: { to: string; subjek: string; isi: string }[] = [];
    for (const c of cabangList) {
      // Pesan menjelaskan status saat ini.
      const statusTeks = c.status ? `masih berstatus ${c.status}` : "belum dibuat";
      const judul = "Pengingat: laporan bulanan";
      const pesan = `Laporan availability ${labelPeriode(bulan, tahun)} untuk ${c.cabangNama} ${statusTeks}. Mohon segera dilengkapi & dikirim.`;
      for (const pic of c.pic) {
        rows.push({
          userId: pic.id,
          jenis: "REMINDER_LAPORAN",
          judul,
          pesan,
          tautan: "dashboard",
          // Kunci dedupe: satu reminder per user per bulan-tahun.
          kunciUnik: `rem-lap-${tahun}-${bulan}`,
        });
        emailTugas.push({ to: pic.email, subjek: judul, isi: pesan });
      }
    }

    // Simpan (lewati yang sudah ada berkat dedupe) & catat berapa yang baru.
    const dibuat = rows.length > 0 ? await this.repo.createManyDedup(rows) : 0;

    // Kirim email best-effort (hanya bila ada yang baru dibuat agar tak spam).
    if (dibuat > 0) {
      for (const e of emailTugas) await this.kirimEmailAman(e.to, e.subjek, e.isi);
    }

    this.logger.log(`Reminder laporan ${bulan}-${tahun}: ${dibuat} notifikasi dibuat.`);
    return { dibuat };
  }

  // --- Util privat ---

  // Kirim satu notifikasi ke banyak penerima (in-app + email best-effort).
  private async kirimKeBanyak(
    penerima: Recipient[],
    data: Omit<CreateNotifikasiData, "userId">,
  ): Promise<void> {
    for (const p of penerima) {
      // Buat notifikasi in-app; bungkus agar kegagalan satu tak menghentikan lain.
      try {
        await this.repo.create({ ...data, userId: p.id });
      } catch (e) {
        this.logger.warn(`Gagal membuat notifikasi untuk ${p.email}: ${(e as Error).message}`);
      }
      // Kirim email pendamping (best-effort).
      await this.kirimEmailAman(p.email, data.judul, data.pesan);
    }
  }

  // Kirim email tanpa melempar error (kegagalan email tidak fatal).
  private async kirimEmailAman(to: string, subjek: string, isi: string): Promise<void> {
    try {
      await this.email.send(to, subjek, isi);
    } catch (e) {
      this.logger.warn(`Gagal mengirim email ke ${to}: ${(e as Error).message}`);
    }
  }
}

// Gabungkan dua daftar penerima tanpa duplikat (berdasarkan id).
function gabungUnik(a: Recipient[], b: Recipient[]): Recipient[] {
  const peta = new Map<string, Recipient>();
  for (const r of [...a, ...b]) peta.set(r.id, r);
  return [...peta.values()];
}
