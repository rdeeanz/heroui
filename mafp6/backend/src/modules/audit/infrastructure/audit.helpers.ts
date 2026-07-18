// ============================================================================
//  Fungsi bantu AUDIT (murni, mudah diuji):
//  - harusDiaudit: tentukan apakah sebuah request perlu dicatat.
//  - turunkanAksi: turunkan kode aksi + entitas dari metode & path.
//  - redaksiBody: buat salinan body yang AMAN (menyensor data sensitif).
// ============================================================================

// Kunci field yang WAJIB disensor (jangan pernah masuk log audit).
const KUNCI_SENSITIF = /password|image|ttd|file|buffer|token|secret/i;

// Metode HTTP yang dianggap "mengubah data".
const METODE_UBAH = ["POST", "PUT", "PATCH", "DELETE"];

// Hapus prefix "/api" dari path agar pencocokan konsisten.
function tanpaPrefix(path: string): string {
  return path.replace(/^\/api/, "");
}

// Tentukan apakah request perlu diaudit.
export function harusDiaudit(metode: string, path: string): boolean {
  // Hanya audit aksi yang mengubah data.
  if (!METODE_UBAH.includes(metode.toUpperCase())) return false;
  const p = tanpaPrefix(path);
  // Lewati "tandai dibaca" (bising & tidak bernilai audit).
  if (/^\/notifikasi\/(read-all|[^/]+\/read)$/.test(p)) return false;
  return true;
}

// Turunkan kode aksi + entitas + entitasId dari metode & path.
export function turunkanAksi(
  metode: string,
  path: string,
): { aksi: string; entitas: string | null; entitasId: string | null } {
  const p = tanpaPrefix(path);
  let m: RegExpMatchArray | null;

  // Login.
  if (p === "/auth/login") return { aksi: "LOGIN", entitas: "auth", entitasId: null };
  // Submit laporan.
  if ((m = p.match(/^\/laporan\/periode\/([^/]+)\/submit$/)))
    return { aksi: "LAPORAN_SUBMIT", entitas: "periode", entitasId: m[1] };
  // Review laporan.
  if ((m = p.match(/^\/laporan\/periode\/([^/]+)\/review$/)))
    return { aksi: "LAPORAN_REVIEW", entitas: "periode", entitasId: m[1] };
  // Buat inspeksi.
  if (p === "/inspeksi") return { aksi: "INSPEKSI_CREATE", entitas: "inspeksi", entitasId: null };
  // Import.
  if (p === "/import/commit") return { aksi: "IMPORT_COMMIT", entitas: "import", entitasId: null };
  if (p === "/import/preview") return { aksi: "IMPORT_PREVIEW", entitas: "import", entitasId: null };
  // Reminder manual.
  if (p === "/notifikasi/reminders/run")
    return { aksi: "REMINDER_RUN", entitas: "notifikasi", entitasId: null };

  // Default: kode generik dari metode + path.
  return { aksi: `${metode.toUpperCase()} ${p}`, entitas: null, entitasId: null };
}

// Buat salinan body yang aman untuk dicatat (menyensor & membatasi ukuran).
export function redaksiBody(body: unknown): unknown | null {
  // Hanya proses objek biasa.
  if (!body || typeof body !== "object") return null;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    // Sensor field sensitif berdasar nama kunci.
    if (KUNCI_SENSITIF.test(k)) {
      out[k] = "[disensor]";
      continue;
    }
    // Ringkas string yang sangat panjang (mis. base64 yang lolos nama kunci).
    if (typeof v === "string" && v.length > 300) {
      out[k] = `[teks ${v.length} karakter]`;
      continue;
    }
    out[k] = v;
  }

  // Batasi ukuran keseluruhan detail agar log tidak membengkak.
  try {
    if (JSON.stringify(out).length > 4000) {
      return { catatan: "body besar, diringkas" };
    }
  } catch {
    // Bila tidak bisa diserialisasi, simpan penanda aman.
    return { catatan: "body tidak dapat diserialisasi" };
  }
  return out;
}
