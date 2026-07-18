// ============================================================================
//  HOOK useDarkMode — mengelola mode terang/gelap.
//  Menamb/menghapus kelas ".dark" pada <html> (mekanisme dark mode HeroUI v3),
//  menyimpan preferensi ke localStorage, dan mengikuti preferensi sistem bila
//  belum pernah dipilih.
// ============================================================================
import { useEffect, useState } from "react";

// Kunci penyimpanan preferensi tema.
const KUNCI = "simfas_theme";

// Tentukan nilai awal: dari localStorage, jika tidak ada ikuti preferensi sistem.
function nilaiAwal(): boolean {
  const tersimpan = localStorage.getItem(KUNCI);
  if (tersimpan === "dark") return true;
  if (tersimpan === "light") return false;
  // Belum pernah dipilih: ikuti preferensi sistem (prefers-color-scheme).
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

// Hook utama: kembalikan status gelap + fungsi toggle.
export function useDarkMode(): { dark: boolean; toggle: () => void } {
  // State apakah mode gelap aktif.
  const [dark, setDark] = useState<boolean>(nilaiAwal);

  // Terapkan kelas .dark ke <html> & simpan preferensi setiap kali berubah.
  useEffect(() => {
    const html = document.documentElement;
    if (dark) html.classList.add("dark");
    else html.classList.remove("dark");
    localStorage.setItem(KUNCI, dark ? "dark" : "light");
  }, [dark]);

  // Kembalikan status + pengalih.
  return { dark, toggle: () => setDark((d) => !d) };
}
