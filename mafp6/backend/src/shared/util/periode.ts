// ============================================================================
//  Utilitas periode (nama bulan Indonesia & label periode) — dipakai ekspor.
// ============================================================================

// Nama bulan Indonesia berindeks 0..11.
export const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Format label periode "Februari 2024" dari angka bulan (1..12) & tahun.
export function labelPeriode(bulan: number, tahun: number): string {
  // Ambil nama bulan; fallback ke angka bila di luar rentang.
  const nama = NAMA_BULAN[bulan - 1] ?? String(bulan);
  return `${nama} ${tahun}`;
}

// Format tanggal lengkap "18 Juli 2026" dari objek Date (atau "-" bila null).
export function formatTanggal(tanggal: Date | null | undefined): string {
  // Kembalikan strip bila kosong.
  if (!tanggal) return "-";
  // Susun tanggal-bulan-tahun dari komponen Date.
  const d = tanggal.getDate();
  const namaBulan = NAMA_BULAN[tanggal.getMonth()] ?? "";
  const y = tanggal.getFullYear();
  return `${d} ${namaBulan} ${y}`;
}
