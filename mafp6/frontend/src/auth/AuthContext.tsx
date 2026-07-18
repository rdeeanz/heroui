// ============================================================================
//  KONTEKS AUTH — menyimpan status login (user aktif) & menyediakan
//  fungsi login/logout ke seluruh aplikasi.
// ============================================================================
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, clearToken, getToken, setToken } from "@/api/client";
import type { AuthUser } from "@/api/types";

// Bentuk nilai konteks.
interface AuthContextValue {
  user: AuthUser | null; // Pengguna aktif (null bila belum login).
  loading: boolean; // True saat memeriksa token awal.
  login: (email: string, password: string) => Promise<void>; // Proses login.
  logout: () => void; // Proses logout.
}

// Buat konteks dengan nilai awal kosong.
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provider yang membungkus aplikasi.
export function AuthProvider({ children }: { children: ReactNode }) {
  // State pengguna & status pemeriksaan awal.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Saat mount: bila ada token, validasi ke /auth/me untuk memuat user.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      // Tidak ada token: selesai memuat, tetap belum login.
      setLoading(false);
      return;
    }
    // Ada token: verifikasi dengan mengambil profil.
    api
      .me()
      .then(setUser)
      .catch(() => {
        // Token tidak valid/kedaluwarsa: bersihkan.
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fungsi login: simpan token & set user.
  async function login(email: string, password: string): Promise<void> {
    // Panggil endpoint login.
    const res = await api.login(email, password);
    // Simpan token untuk permintaan berikutnya.
    setToken(res.accessToken);
    // Set pengguna aktif.
    setUser(res.user);
  }

  // Fungsi logout: hapus token & user.
  function logout(): void {
    clearToken();
    setUser(null);
  }

  // Sediakan nilai konteks ke anak-anak.
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook praktis untuk mengakses konteks auth.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  // Pastikan dipakai di dalam provider.
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>.");
  return ctx;
}
