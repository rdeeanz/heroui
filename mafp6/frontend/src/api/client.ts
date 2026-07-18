// ============================================================================
//  Klien API berbasis fetch untuk backend SiMFAS.
//  Menangani penyimpanan token JWT, penyisipan header Authorization,
//  dan unduhan file terautentikasi (Excel/PDF).
// ============================================================================
import type {
  AuthUser,
  BuatInspeksiPayload,
  Cabang,
  AuditPage,
  ImportSummary,
  InspeksiLengkap,
  LaporanCabangOutput,
  LoginResponse,
  NotifikasiItem,
  Periode,
  PeriodeDetail,
  PreviewImport,
  Regional,
  StatusLaporan,
} from "./types";

// Base URL API; default "/api" agar bisa di-proxy Nginx/Vite.
const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

// Kunci penyimpanan token di localStorage.
const TOKEN_KEY = "simfas_token";

// --- Pengelolaan token ---
// Ambil token tersimpan (atau null).
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
// Simpan token.
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
// Hapus token (logout).
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Susun header standar: JSON + Authorization bila ada token.
function headers(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`; // Sisipkan token bila ada.
  return h;
}

// GET JSON dengan token; lempar error informatif bila gagal.
async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(await pesanError(res, path));
  return (await res.json()) as T;
}

// POST JSON dengan token; body opsional.
async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await pesanError(res, path));
  return (await res.json()) as T;
}

// POST FormData (multipart) dengan token. JANGAN set Content-Type manual —
// browser menyetel boundary multipart secara otomatis.
async function postForm<T>(path: string, form: FormData): Promise<T> {
  // Ambil header dasar lalu buang Content-Type agar browser mengaturnya.
  const h: Record<string, string> = {};
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: h, body: form });
  if (!res.ok) throw new Error(await pesanError(res, path));
  return (await res.json()) as T;
}

// Ekstrak pesan error dari respons (pakai pesan backend bila tersedia).
async function pesanError(res: Response, path: string): Promise<string> {
  try {
    const data = await res.json();
    // NestJS mengirim { message } (string atau array).
    const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    if (msg) return msg;
  } catch {
    // Abaikan bila body bukan JSON.
  }
  return `Gagal memuat ${path} (HTTP ${res.status})`;
}

// Kumpulan fungsi API.
export const api = {
  // --- Auth ---
  // Login: kirim kredensial, terima token + user.
  login: (email: string, password: string) =>
    postJson<LoginResponse>("/auth/login", { email, password }),
  // Ambil profil pengguna aktif dari token.
  me: () => getJson<AuthUser>("/auth/me"),

  // --- Master data ---
  regional: () => getJson<Regional[]>("/master/regional"),
  cabang: (regionalKode?: string) =>
    getJson<Cabang[]>(`/master/cabang${regionalKode ? `?regionalKode=${regionalKode}` : ""}`),
  periode: (cabangId: string) => getJson<Periode[]>(`/master/periode?cabangId=${cabangId}`),

  // --- Availability ---
  laporanCabang: (cabangId: string, tahun: number, bulan: number) =>
    getJson<LaporanCabangOutput>(`/availability/cabang/${cabangId}?tahun=${tahun}&bulan=${bulan}`),

  // --- Inspeksi ---
  inspeksiList: () => getJson<InspeksiLengkap[]>("/inspeksi"),
  // Buat inspeksi baru (termasuk data URL tanda tangan) -> kembalikan hasil.
  createInspeksi: (payload: BuatInspeksiPayload) =>
    postJson<InspeksiLengkap>("/inspeksi", payload),

  // --- Alur persetujuan (workflow) ---
  // Daftar periode sesuai cakupan peran; filter status opsional.
  listPeriode: (status?: StatusLaporan) =>
    getJson<PeriodeDetail[]>(`/laporan/periode${status ? `?status=${status}` : ""}`),
  // PIC Cabang submit laporan.
  submitLaporan: (id: string) => postJson<PeriodeDetail>(`/laporan/periode/${id}/submit`),
  // Regional/Pusat menyetujui/menolak laporan.
  reviewLaporan: (id: string, keputusan: "APPROVE" | "REJECT", catatan?: string) =>
    postJson<PeriodeDetail>(`/laporan/periode/${id}/review`, { keputusan, catatan }),

  // --- Notifikasi ---
  // Daftar notifikasi milik pengguna aktif.
  notifikasiList: () => getJson<NotifikasiItem[]>("/notifikasi"),
  // Jumlah notifikasi belum dibaca (untuk badge lonceng).
  notifikasiUnread: () => getJson<{ count: number }>("/notifikasi/unread-count"),
  // Tandai satu notifikasi sebagai dibaca.
  notifikasiMarkRead: (id: string) => postJson<{ ok: boolean }>(`/notifikasi/${id}/read`),
  // Tandai semua notifikasi sebagai dibaca.
  notifikasiMarkAll: () => postJson<{ ok: boolean }>("/notifikasi/read-all"),
  // (Admin Pusat) jalankan pembuatan reminder secara manual.
  runReminders: () => postJson<{ dibuat: number }>("/notifikasi/reminders/run"),

  // --- Audit trail (Admin Pusat & Auditor) ---
  // Cari jejak audit dengan filter + paginasi.
  auditCari: (params: {
    aksi?: string;
    entitas?: string;
    berhasil?: string;
    dari?: string;
    sampai?: string;
    page: number;
    pageSize: number;
  }) => {
    // Susun query string hanya dari nilai yang terisi.
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "" && v !== null) q.set(k, String(v));
    }
    return getJson<AuditPage>(`/audit?${q.toString()}`);
  },

  // --- Import historis ---
  // Preview (dry-run): unggah file untuk melihat hasil parse + availability.
  previewImport: (file: File, sheet?: string) => {
    const form = new FormData();
    form.append("file", file); // Field 'file' sesuai FileInterceptor backend.
    if (sheet) form.append("sheet", sheet);
    return postForm<PreviewImport>("/import/preview", form);
  },
  // Commit: unggah + simpan ke DB untuk cabang/periode tertentu.
  commitImport: (
    file: File,
    opts: { cabangId: string; tahun: number; bulan: number; overwrite: boolean; sheet?: string },
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("cabangId", opts.cabangId);
    form.append("tahun", String(opts.tahun));
    form.append("bulan", String(opts.bulan));
    form.append("overwrite", String(opts.overwrite));
    if (opts.sheet) form.append("sheet", opts.sheet);
    return postForm<ImportSummary>("/import/commit", form);
  },
};

// ---------------------------------------------------------------------------
//  Unduhan file terautentikasi (Excel/PDF).
//  Endpoint ekspor kini butuh token, jadi kita fetch dengan header Authorization
//  lalu ubah respons menjadi blob dan picu unduhan di sisi klien.
// ---------------------------------------------------------------------------

// Bangun path (relatif BASE) menuju endpoint ekspor.
export const exportPath = {
  cabangExcel: (cabangId: string, tahun: number, bulan: number) =>
    `/export/cabang/${cabangId}/excel?tahun=${tahun}&bulan=${bulan}`,
  regionalExcel: (regionalKode: string, tahun: number, bulan: number) =>
    `/export/regional/${regionalKode}/excel?tahun=${tahun}&bulan=${bulan}`,
  inspeksiPdf: (id: string) => `/export/inspeksi/${id}/pdf`,
};

// Unduh file dari endpoint terproteksi: fetch (dengan token) -> blob -> <a download>.
export async function unduhFile(path: string, namaDefault = "unduhan"): Promise<void> {
  // Ambil file dengan header Authorization.
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(await pesanError(res, path));

  // Coba baca nama file dari header Content-Disposition.
  const disp = res.headers.get("Content-Disposition") ?? "";
  const cocok = disp.match(/filename="?([^"]+)"?/);
  const namaFile = cocok?.[1] ?? namaDefault;

  // Ubah respons menjadi blob & buat object URL sementara.
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  // Buat elemen <a> untuk memicu unduhan.
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Bebaskan object URL.
  URL.revokeObjectURL(url);
}
