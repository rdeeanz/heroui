// ============================================================================
//  HALAMAN LOGIN — form email + password memakai komponen HeroUI v3.
// ============================================================================
import { useState, type FormEvent } from "react";
import { Button, TextField, Label, Input, Card } from "@heroui/react";
import { useAuth } from "@/auth/AuthContext";

// Komponen halaman login.
export function LoginPage() {
  // Ambil fungsi login dari konteks.
  const { login } = useAuth();
  // State field & status.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handler submit form.
  async function onSubmit(e: FormEvent) {
    e.preventDefault(); // Cegah reload halaman.
    setError(null);
    setLoading(true);
    try {
      // Coba login; bila sukses, AuthContext mengganti tampilan.
      await login(email, password);
    } catch (err) {
      // Tampilkan pesan error dari backend.
      setError(err instanceof Error ? err.message : "Gagal login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    // Layar tengah, latar lembut.
    <div className="flex min-h-full items-center justify-center bg-default-50 px-4">
      <Card className="w-full max-w-sm p-6">
        {/* Judul aplikasi. */}
        <div className="mb-4 text-center">
          <h1 className="text-lg font-bold">SiMFAS-Pelindo</h1>
          <p className="text-xs text-default-500">
            Monitoring Availability Fasilitas Sipil Pelabuhan
          </p>
        </div>

        {/* Form login. */}
        <form onSubmit={onSubmit} className="space-y-3">
          {/* Field email. */}
          <TextField fullWidth type="email" value={email} onChange={setEmail} isRequired>
            <Label>Email</Label>
            <Input placeholder="nama@pelindo.co.id" />
          </TextField>

          {/* Field password. */}
          <TextField fullWidth type="password" value={password} onChange={setPassword} isRequired>
            <Label>Password</Label>
            <Input placeholder="••••••••" />
          </TextField>

          {/* Pesan error bila ada. */}
          {error ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          {/* Tombol submit. */}
          <Button type="submit" variant="primary" className="w-full" isPending={loading}>
            {loading ? "Memproses…" : "Masuk"}
          </Button>
        </form>

        {/* Petunjuk akun demo. */}
        <div className="mt-4 rounded-lg bg-default-100 p-3 text-[11px] text-default-500">
          <p className="font-semibold">Akun demo (password: password123):</p>
          <ul className="mt-1 space-y-0.5">
            <li>pusat@pelindo.co.id — Admin Pusat</li>
            <li>regional3@pelindo.co.id — Admin Regional</li>
            <li>cabang.benoa@pelindo.co.id — PIC Cabang</li>
            <li>auditor@pelindo.co.id — Auditor</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
