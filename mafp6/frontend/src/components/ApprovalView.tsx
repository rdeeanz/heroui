// ============================================================================
//  HALAMAN PERSETUJUAN — daftar periode laporan + aksi alur kerja sesuai peran:
//  - PIC Cabang    : "Submit" untuk laporan DRAFT/REJECTED.
//  - Admin Regional/Pusat : "Setujui" / "Tolak" untuk laporan SUBMITTED.
//  Data sudah ter-scope di backend menurut peran pengguna.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { api } from "@/api/client";
import type { PeriodeDetail } from "@/api/types";
import { useAuth } from "@/auth/AuthContext";
import { labelPeriode, STATUS_LAPORAN, formatTanggalISO } from "@/lib/format";

// Komponen halaman persetujuan.
export function ApprovalView() {
  // Ambil pengguna aktif untuk menentukan aksi yang tersedia.
  const { user } = useAuth();
  // State daftar periode + status.
  const [list, setList] = useState<PeriodeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aksiId, setAksiId] = useState<string | null>(null); // Id yang sedang diproses.

  // Muat ulang daftar periode.
  const muat = useCallback(() => {
    setLoading(true);
    api
      .listPeriode()
      .then(setList)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Muat saat pertama tampil.
  useEffect(() => muat(), [muat]);

  // Handler submit (PIC Cabang).
  async function submit(id: string) {
    setAksiId(id);
    setError(null);
    try {
      await api.submitLaporan(id); // Kirim ke backend.
      muat(); // Segarkan daftar.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAksiId(null);
    }
  }

  // Handler review (approve/reject) oleh Regional/Pusat.
  async function review(id: string, keputusan: "APPROVE" | "REJECT") {
    // Untuk penolakan, minta alasan lewat prompt sederhana.
    let catatan: string | undefined;
    if (keputusan === "REJECT") {
      const jawab = window.prompt("Alasan penolakan:") ?? "";
      if (jawab.trim() === "") return; // Batal bila kosong.
      catatan = jawab;
    }
    setAksiId(id);
    setError(null);
    try {
      await api.reviewLaporan(id, keputusan, catatan);
      muat();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAksiId(null);
    }
  }

  // Tentukan hak aksi berdasarkan peran.
  const bisaSubmit = user?.role === "PIC_CABANG";
  const bisaReview = user?.role === "ADMIN_REGIONAL" || user?.role === "ADMIN_PUSAT";

  // Status memuat/error/kosong.
  if (loading) return <p className="text-sm text-default-500">Memuat daftar laporan…</p>;

  return (
    <div className="space-y-3">
      {/* Pesan error aksi. */}
      {error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {/* Tabel periode laporan. */}
      <div className="w-full overflow-x-auto rounded-xl border border-default-200">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="bg-default-100">
            <tr>
              {["Cabang", "Regional", "Periode", "Status", "Dikirim", "Direview", "Aksi"].map((h) => (
                <th key={h} className="border-b border-default-200 px-3 py-2 text-left font-semibold text-default-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-default-100 hover:bg-default-50">
                <td className="px-3 py-2 font-medium">{p.cabangNama}</td>
                <td className="px-3 py-2">{p.regionalNama}</td>
                <td className="px-3 py-2">{labelPeriode(p.bulan, p.tahun)}</td>
                {/* Badge status. */}
                <td className="px-3 py-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_LAPORAN[p.status].badge}`}>
                    {STATUS_LAPORAN[p.status].label}
                  </span>
                  {/* Tampilkan catatan penolakan bila ada. */}
                  {p.status === "REJECTED" && p.catatanReview ? (
                    <p className="mt-1 text-[11px] text-red-600">Catatan: {p.catatanReview}</p>
                  ) : null}
                </td>
                {/* Info pengiriman & review. */}
                <td className="px-3 py-2 text-xs text-default-500">
                  {p.submittedBy ? `${p.submittedBy}` : "-"}
                  <br />
                  {formatTanggalISO(p.submittedAt)}
                </td>
                <td className="px-3 py-2 text-xs text-default-500">
                  {p.reviewedBy ? `${p.reviewedBy}` : "-"}
                  <br />
                  {formatTanggalISO(p.reviewedAt)}
                </td>
                {/* Kolom aksi sesuai peran & status. */}
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    {/* Submit tersedia untuk PIC pada DRAFT/REJECTED. */}
                    {bisaSubmit && (p.status === "DRAFT" || p.status === "REJECTED") ? (
                      <Button size="sm" variant="primary" isPending={aksiId === p.id} onPress={() => submit(p.id)}>
                        Submit
                      </Button>
                    ) : null}
                    {/* Setujui/Tolak tersedia untuk Regional/Pusat pada SUBMITTED. */}
                    {bisaReview && p.status === "SUBMITTED" ? (
                      <>
                        <Button size="sm" variant="primary" isPending={aksiId === p.id} onPress={() => review(p.id, "APPROVE")}>
                          Setujui
                        </Button>
                        <Button size="sm" variant="secondary" isPending={aksiId === p.id} onPress={() => review(p.id, "REJECT")}>
                          Tolak
                        </Button>
                      </>
                    ) : null}
                    {/* Tanda strip bila tak ada aksi. */}
                    {(!bisaSubmit || (p.status !== "DRAFT" && p.status !== "REJECTED")) &&
                    (!bisaReview || p.status !== "SUBMITTED") ? (
                      <span className="text-xs text-default-400">—</span>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {/* Baris kosong bila tidak ada data. */}
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-default-500">
                  Tidak ada laporan pada cakupan Anda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
