// ============================================================================
//  UJI UNIT NotifikasiService: targeting notifikasi event & pembuatan reminder,
//  tanpa database (repo & email dipalsukan).
// ============================================================================
import { describe, it, expect, beforeEach } from "vitest";
import { NotifikasiService } from "./notifikasi.service";
import type {
  NotifikasiRepositoryPort,
  CreateNotifikasiData,
  Recipient,
  FilterPenerima,
  CabangButuhLaporan,
} from "./ports/notifikasi.repository";
import type { EmailSenderPort } from "./ports/email-sender";

// Repo palsu yang merekam notifikasi yang dibuat.
class FakeRepo implements NotifikasiRepositoryPort {
  dibuat: CreateNotifikasiData[] = []; // Notifikasi via create().
  dibuatMany: CreateNotifikasiData[] = []; // Notifikasi via createManyDedup().
  penerimaByRole: Record<string, Recipient[]> = {};
  cabangButuh: CabangButuhLaporan[] = [];

  async create(data: CreateNotifikasiData): Promise<void> {
    this.dibuat.push(data);
  }
  async createManyDedup(rows: CreateNotifikasiData[]): Promise<number> {
    this.dibuatMany.push(...rows);
    return rows.length; // Anggap semua baru dibuat.
  }
  async listForUser(): Promise<any> {
    return [];
  }
  async countUnread(): Promise<number> {
    return 0;
  }
  async markRead(): Promise<void> {}
  async markAllRead(): Promise<void> {}
  async findRecipients(filter: FilterPenerima): Promise<Recipient[]> {
    // Kembalikan penerima sesuai peran (abaikan cakupan untuk uji sederhana).
    return this.penerimaByRole[filter.role] ?? [];
  }
  async findCabangButuhLaporan(): Promise<CabangButuhLaporan[]> {
    return this.cabangButuh;
  }
}

// Email palsu yang menghitung pengiriman.
class FakeEmail implements EmailSenderPort {
  terkirim: { to: string; subjek: string }[] = [];
  async send(to: string, subjek: string): Promise<void> {
    this.terkirim.push({ to, subjek });
  }
}

describe("NotifikasiService.notifyLaporanSubmitted", () => {
  let repo: FakeRepo;
  let email: FakeEmail;
  let service: NotifikasiService;
  beforeEach(() => {
    repo = new FakeRepo();
    email = new FakeEmail();
    service = new NotifikasiService(repo, email);
    // Siapkan penerima: 1 admin regional + 1 admin pusat.
    repo.penerimaByRole["ADMIN_REGIONAL"] = [{ id: "r1", email: "reg@x.id", namaLengkap: "Reg" }];
    repo.penerimaByRole["ADMIN_PUSAT"] = [{ id: "p1", email: "pusat@x.id", namaLengkap: "Pusat" }];
  });

  it("mengirim ke admin regional & pusat", async () => {
    await service.notifyLaporanSubmitted({
      cabangId: "c1", cabangNama: "Benoa", regionalKode: "REG3", tahun: 2024, bulan: 2,
    });
    // Dua notifikasi in-app dibuat (regional + pusat).
    expect(repo.dibuat.length).toBe(2);
    expect(repo.dibuat.every((d) => d.jenis === "LAPORAN_SUBMITTED")).toBe(true);
    // Email terkirim ke keduanya.
    expect(email.terkirim.length).toBe(2);
  });
});

describe("NotifikasiService.notifyLaporanReviewed", () => {
  it("mengirim ke PIC cabang dengan jenis sesuai keputusan", async () => {
    const repo = new FakeRepo();
    const email = new FakeEmail();
    const service = new NotifikasiService(repo, email);
    repo.penerimaByRole["PIC_CABANG"] = [{ id: "pic1", email: "pic@x.id", namaLengkap: "PIC" }];

    // Ditolak dengan catatan.
    await service.notifyLaporanReviewed(
      { cabangId: "c1", cabangNama: "Benoa", regionalKode: "REG3", tahun: 2024, bulan: 2 },
      false,
      "Data kurang",
    );
    expect(repo.dibuat.length).toBe(1);
    expect(repo.dibuat[0].jenis).toBe("LAPORAN_REJECTED");
    expect(repo.dibuat[0].pesan).toContain("Data kurang");
  });
});

describe("NotifikasiService.generateReminders", () => {
  it("membuat reminder untuk PIC cabang yang belum final + kunci dedupe per bulan", async () => {
    const repo = new FakeRepo();
    const email = new FakeEmail();
    const service = new NotifikasiService(repo, email);
    // Dua cabang butuh laporan; cabang pertama punya 2 PIC.
    repo.cabangButuh = [
      { cabangId: "c1", cabangNama: "Benoa", status: "DRAFT", pic: [
        { id: "u1", email: "u1@x.id", namaLengkap: "U1" },
        { id: "u2", email: "u2@x.id", namaLengkap: "U2" },
      ] },
      { cabangId: "c2", cabangNama: "Kupang", status: null, pic: [
        { id: "u3", email: "u3@x.id", namaLengkap: "U3" },
      ] },
    ];

    // Jalankan untuk tanggal tetap (Juli 2024).
    const hasil = await service.generateReminders(new Date("2024-07-10"));
    // Tiga reminder dibuat (2 + 1 PIC).
    expect(hasil.dibuat).toBe(3);
    expect(repo.dibuatMany.length).toBe(3);
    // Semua berjenis REMINDER_LAPORAN dengan kunci dedupe bulan yang sama.
    expect(repo.dibuatMany.every((r) => r.jenis === "REMINDER_LAPORAN")).toBe(true);
    expect(repo.dibuatMany.every((r) => r.kunciUnik === "rem-lap-2024-7")).toBe(true);
  });
});
