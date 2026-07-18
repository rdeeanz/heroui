// ============================================================================
//  LONCENG NOTIFIKASI — menampilkan jumlah belum dibaca + panel daftar
//  notifikasi. Klik notifikasi menandainya dibaca & bernavigasi ke konteksnya.
//  Menyegarkan jumlah belum dibaca secara berkala (polling).
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { api } from "@/api/client";
import type { JenisNotifikasi, NotifikasiItem } from "@/api/types";

// Warna titik per jenis notifikasi (pemetaan lengkap, bukan kelas dinamis).
const WARNA_JENIS: Record<JenisNotifikasi, string> = {
  LAPORAN_SUBMITTED: "bg-amber-500",
  LAPORAN_REVIEWED: "bg-green-500",
  LAPORAN_REJECTED: "bg-red-500",
  REMINDER_LAPORAN: "bg-blue-500",
};

// Format waktu relatif sederhana ("baru saja", "5 mnt lalu", dst.).
function waktuRelatif(iso: string): string {
  const detik = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (detik < 60) return "baru saja";
  if (detik < 3600) return `${Math.floor(detik / 60)} mnt lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  return `${Math.floor(detik / 86400)} hari lalu`;
}

// Properti komponen.
interface Props {
  onNavigate: (tautan: string) => void; // Pindah tampilan sesuai tautan notifikasi.
  isAdminPusat: boolean; // Tampilkan tombol "jalankan reminder" bila admin pusat.
}

// Komponen lonceng notifikasi.
export function NotificationBell({ onNavigate, isAdminPusat }: Props) {
  // State panel terbuka, daftar, jumlah belum dibaca.
  const [buka, setBuka] = useState(false);
  const [items, setItems] = useState<NotifikasiItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  // Referensi wrapper untuk menutup panel saat klik di luar.
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Ambil jumlah belum dibaca (dipanggil saat mount & berkala).
  const muatUnread = useCallback(() => {
    api.notifikasiUnread().then((r) => setUnread(r.count)).catch(() => {});
  }, []);

  // Ambil daftar notifikasi (saat panel dibuka).
  const muatDaftar = useCallback(() => {
    setLoading(true);
    api.notifikasiList().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Saat mount: muat unread + polling tiap 30 detik.
  useEffect(() => {
    muatUnread();
    const timer = setInterval(muatUnread, 30000);
    return () => clearInterval(timer); // Bersihkan interval saat unmount.
  }, [muatUnread]);

  // Saat panel dibuka: muat daftar terbaru.
  useEffect(() => {
    if (buka) muatDaftar();
  }, [buka, muatDaftar]);

  // Tutup panel saat klik di luar area lonceng.
  useEffect(() => {
    function klikLuar(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setBuka(false);
    }
    document.addEventListener("mousedown", klikLuar);
    return () => document.removeEventListener("mousedown", klikLuar);
  }, []);

  // Klik satu notifikasi: tandai dibaca, navigasi, tutup panel.
  async function bukaNotif(n: NotifikasiItem) {
    // Tandai dibaca bila belum.
    if (!n.dibacaAt) {
      await api.notifikasiMarkRead(n.id).catch(() => {});
      muatUnread();
    }
    // Navigasi ke konteks bila ada tautan.
    if (n.tautan) onNavigate(n.tautan);
    setBuka(false);
  }

  // Tandai semua dibaca.
  async function tandaiSemua() {
    await api.notifikasiMarkAll().catch(() => {});
    muatUnread();
    muatDaftar();
  }

  // (Admin) jalankan reminder lalu segarkan.
  async function jalankanReminder() {
    await api.runReminders().catch(() => {});
    muatUnread();
    muatDaftar();
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* Tombol lonceng dengan badge jumlah belum dibaca. */}
      <button
        type="button"
        aria-label="Notifikasi"
        onClick={() => setBuka((v) => !v)}
        className="relative rounded-lg border border-default-200 bg-white p-2 hover:bg-default-50"
      >
        {/* Ikon lonceng (SVG inline, tanpa dependensi ikon). */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {/* Badge angka bila ada yang belum dibaca. */}
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {/* Panel notifikasi. */}
      {buka ? (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-default-200 bg-white shadow-lg">
          {/* Kepala panel: judul + aksi. */}
          <div className="flex items-center justify-between border-b border-default-100 px-3 py-2">
            <span className="text-sm font-semibold">Notifikasi</span>
            <div className="flex gap-1">
              {isAdminPusat ? (
                <Button size="sm" variant="tertiary" onPress={jalankanReminder}>
                  Reminder
                </Button>
              ) : null}
              <Button size="sm" variant="tertiary" onPress={tandaiSemua}>
                Tandai dibaca
              </Button>
            </div>
          </div>

          {/* Daftar notifikasi (maks tinggi + scroll). */}
          <div className="max-h-96 overflow-auto">
            {loading ? (
              <p className="px-3 py-4 text-sm text-default-500">Memuat…</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-4 text-sm text-default-500">Belum ada notifikasi.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => bukaNotif(n)}
                  className={`flex w-full gap-2 border-b border-default-50 px-3 py-2 text-left hover:bg-default-50 ${
                    n.dibacaAt ? "opacity-60" : ""
                  }`}
                >
                  {/* Titik penanda jenis + status belum dibaca. */}
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${WARNA_JENIS[n.jenis]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{n.judul}</span>
                    <span className="block text-xs text-default-600">{n.pesan}</span>
                    <span className="mt-0.5 block text-[11px] text-default-400">{waktuRelatif(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
