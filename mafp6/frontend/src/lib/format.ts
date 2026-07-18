// ============================================================================
//  Utilitas format angka & status availability untuk tampilan.
// ============================================================================

// Format persentase dengan 2 desimal dan tanda "%" (mis. 96.83%).
export function formatPersen(nilai: number): string {
  // toFixed(2) membulatkan ke 2 desimal untuk tampilan (data mentah tetap presisi penuh).
  return `${nilai.toFixed(2)}%`;
}

// Format angka umum (tanpa desimal berlebih) untuk kolom ukuran/jumlah.
export function formatAngka(nilai: number | null | undefined): string {
  // Tampilkan tanda strip bila kosong.
  if (nilai === null || nilai === undefined) return "-";
  // Gunakan pemformat lokal Indonesia (ribuan pakai titik).
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(nilai);
}

// Nama bulan Indonesia berdasarkan angka 1..12.
export const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Format label periode "Februari 2024".
export function labelPeriode(bulan: number, tahun: number): string {
  return `${NAMA_BULAN[bulan - 1] ?? bulan} ${tahun}`;
}

// Format tanggal ISO (mis. "2024-06-20T00:00:00Z") menjadi "20 Juni 2024".
export function formatTanggalISO(iso: string | null | undefined): string {
  // Kembalikan strip bila kosong.
  if (!iso) return "-";
  // Parse string ISO menjadi Date.
  const d = new Date(iso);
  // Bila tidak valid, kembalikan apa adanya.
  if (Number.isNaN(d.getTime())) return "-";
  // Susun "tanggal Bulan tahun".
  return `${d.getDate()} ${NAMA_BULAN[d.getMonth()] ?? ""} ${d.getFullYear()}`;
}

// Tingkat status availability untuk pewarnaan (ambang bisa disesuaikan kebijakan).
export type TingkatAvailability = "baik" | "sedang" | "buruk";

// Tentukan tingkat berdasarkan nilai persen.
export function tingkatAvailability(nilai: number): TingkatAvailability {
  if (nilai >= 95) return "baik"; // >=95% dianggap baik.
  if (nilai >= 85) return "sedang"; // 85-95% perlu perhatian.
  return "buruk"; // <85% kritis.
}

// Pemetaan LENGKAP kelas Tailwind per tingkat (JANGAN buat kelas dinamis,
// agar Tailwind dapat mendeteksinya saat memindai file sebagai teks).
export const KELAS_STATUS: Record<TingkatAvailability, { teks: string; badge: string }> = {
  baik: { teks: "text-green-600", badge: "bg-green-100 text-green-700" },
  sedang: { teks: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
  buruk: { teks: "text-red-600", badge: "bg-red-100 text-red-700" },
};

// Status laporan yang mungkin.
export type StatusLaporan = "DRAFT" | "SUBMITTED" | "REVIEWED" | "REJECTED";

// Label & warna badge per status alur (pemetaan lengkap, bukan kelas dinamis).
export const STATUS_LAPORAN: Record<StatusLaporan, { label: string; badge: string }> = {
  DRAFT: { label: "Draft", badge: "bg-slate-100 text-slate-700" },
  SUBMITTED: { label: "Menunggu Review", badge: "bg-amber-100 text-amber-700" },
  REVIEWED: { label: "Disetujui", badge: "bg-green-100 text-green-700" },
  REJECTED: { label: "Ditolak", badge: "bg-red-100 text-red-700" },
};

// Label peran pengguna untuk tampilan header.
export const LABEL_ROLE: Record<string, string> = {
  ADMIN_PUSAT: "Admin Pusat",
  ADMIN_REGIONAL: "Admin Regional",
  PIC_CABANG: "PIC Cabang",
  MITRA: "Mitra",
  AUDITOR: "Auditor",
};
