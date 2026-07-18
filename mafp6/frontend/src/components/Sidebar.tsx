// ============================================================================
//  SIDEBAR — navigasi samping yang bisa di-expand/collapse di semua mode.
//  - Desktop (lg+): sidebar selalu tampil; expand = lebar penuh (ikon+label),
//    collapse = rail sempit (ikon saja).
//  - Tablet/Mobile: sidebar jadi drawer overlay; expand = tampil + backdrop,
//    collapse = tersembunyi.
//  Menyertakan toggle mode terang/gelap, info pengguna, dan tombol keluar.
// ============================================================================

import type { ReactNode } from "react";

// Satu item menu.
export interface MenuItem {
  key: string;
  label: string;
}

// Properti komponen.
interface Props {
  items: MenuItem[]; // Daftar menu (sudah difilter sesuai peran).
  active: string; // Menu aktif.
  onSelect: (key: string) => void; // Pilih menu.
  open: boolean; // Sidebar sedang expand?
  onToggle: () => void; // Alih expand/collapse.
  dark: boolean; // Mode gelap aktif?
  onToggleDark: () => void; // Alih mode terang/gelap.
  userName: string; // Nama pengguna.
  userRole: string; // Label peran.
  onLogout: () => void; // Keluar.
}

// Kumpulan ikon SVG sederhana (tanpa dependensi ikon eksternal).
const IKON: Record<string, ReactNode> = {
  menu: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  inspeksi: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V3a1 1 0 0 1 1-1z" /><path d="m9 14 2 2 4-4" />
    </svg>
  ),
  persetujuan: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
    </svg>
  ),
  import: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  audit: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" />
    </svg>
  ),
  sun: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  moon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

// Komponen Sidebar.
export function Sidebar({
  items, active, onSelect, open, onToggle, dark, onToggleDark, userName, userRole, onLogout,
}: Props) {
  // Kelas item baris (dipakai nav, toggle dark, logout) agar konsisten.
  const kelasItem = (aktif: boolean) =>
    [
      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
      aktif ? "bg-primary text-white font-semibold" : "text-default-700 hover:bg-default-100",
      // Saat collapse (rail) di desktop, ikon dipusatkan tanpa padding samping.
      open ? "" : "lg:justify-center lg:px-0",
    ].join(" ");

  return (
    <>
      {/* Backdrop gelap saat drawer terbuka di layar kecil. */}
      {open ? (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onToggle} aria-hidden="true" />
      ) : null}

      {/* Panel sidebar. */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-default-200 bg-surface transition-all duration-200",
          // Mobile/tablet: geser masuk/keluar (drawer).
          open ? "w-64 translate-x-0" : "w-64 -translate-x-full",
          // Desktop: selalu tampil in-flow; lebar mengecil jadi rail saat collapse.
          "lg:static lg:z-auto lg:translate-x-0",
          open ? "lg:w-64" : "lg:w-16",
        ].join(" ")}
      >
        {/* Header sidebar: tombol toggle + judul. */}
        <div className="flex items-center gap-2 border-b border-default-200 px-3 py-3">
          <button
            onClick={onToggle}
            aria-label="Buka/tutup menu"
            className="rounded-lg p-1.5 text-default-700 hover:bg-default-100"
          >
            {IKON.menu}
          </button>
          {open ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">SiMFAS-Pelindo</p>
              <p className="truncate text-[10px] text-default-500">PT Pelabuhan Indonesia</p>
            </div>
          ) : null}
        </div>

        {/* Daftar menu navigasi. */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {items.map((it) => (
            <button key={it.key} onClick={() => onSelect(it.key)} title={it.label} className={kelasItem(it.key === active)}>
              <span className="shrink-0">{IKON[it.key] ?? IKON.dashboard}</span>
              {/* Label disembunyikan saat rail (collapse) di desktop. */}
              {open ? <span className="truncate">{it.label}</span> : null}
            </button>
          ))}
        </nav>

        {/* Footer: toggle mode, info pengguna, keluar. */}
        <div className="space-y-1 border-t border-default-200 p-2">
          {/* Toggle mode terang/gelap. */}
          <button onClick={onToggleDark} title="Ganti mode terang/gelap" className={kelasItem(false)}>
            <span className="shrink-0">{dark ? IKON.sun : IKON.moon}</span>
            {open ? <span>{dark ? "Mode Terang" : "Mode Gelap"}</span> : null}
          </button>

          {/* Info pengguna (hanya saat expand). */}
          {open ? (
            <div className="rounded-lg px-3 py-2">
              <p className="truncate text-xs font-semibold">{userName}</p>
              <p className="truncate text-[10px] text-default-500">{userRole}</p>
            </div>
          ) : null}

          {/* Tombol keluar. */}
          <button
            onClick={onLogout}
            title="Keluar"
            className={[
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50",
              open ? "" : "lg:justify-center lg:px-0",
            ].join(" ")}
          >
            <span className="shrink-0">{IKON.logout}</span>
            {open ? <span>Keluar</span> : null}
          </button>
        </div>
      </aside>
    </>
  );
}
