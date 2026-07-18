// ============================================================================
//  HALAMAN INSPEKSI — daftar hasil inspeksi + tombol unduh PDF per baris,
//  serta tombol "Buat Inspeksi" (untuk peran yang berhak) yang membuka form
//  dengan tanda tangan digital.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { api, exportPath, unduhFile } from "@/api/client";
import type { InspeksiLengkap, KondisiInspeksi } from "@/api/types";
import { useAuth } from "@/auth/AuthContext";
import { InspeksiForm } from "@/components/InspeksiForm";
import { formatTanggalISO } from "@/lib/format";

// Label & warna badge per kondisi (pemetaan lengkap, bukan kelas dinamis).
const KONDISI: Record<KondisiInspeksi, { label: string; kelas: string }> = {
  BAIK: { label: "Baik", kelas: "bg-green-100 text-green-700" },
  TIDAK_BERUBAH: { label: "Tidak berubah", kelas: "bg-slate-100 text-slate-700" },
  KERUSAKAN_TAMBAHAN: { label: "Kerusakan tambahan", kelas: "bg-red-100 text-red-700" },
  SUDAH_DIPERBAIKI: { label: "Sudah diperbaiki", kelas: "bg-blue-100 text-blue-700" },
};

// Komponen halaman inspeksi.
export function InspeksiView() {
  // Ambil pengguna untuk menentukan hak membuat inspeksi.
  const { user } = useAuth();
  // State daftar inspeksi + status + mode buat.
  const [list, setList] = useState<InspeksiLengkap[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buatMode, setBuatMode] = useState(false);

  // Muat ulang daftar inspeksi.
  const muat = useCallback(() => {
    setLoading(true);
    api
      .inspeksiList()
      .then(setList)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Muat saat pertama tampil.
  useEffect(() => muat(), [muat]);

  // Hanya PIC Cabang & Admin Pusat yang boleh membuat inspeksi (selaras RBAC backend).
  const bisaBuat = user?.role === "PIC_CABANG" || user?.role === "ADMIN_PUSAT";

  // Bila sedang membuat, tampilkan form.
  if (buatMode) {
    return (
      <InspeksiForm
        onSuccess={() => {
          // Setelah sukses: tutup form & segarkan daftar.
          setBuatMode(false);
          muat();
        }}
        onCancel={() => setBuatMode(false)}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Baris aksi: tombol buat inspeksi (bila berhak). */}
      {bisaBuat ? (
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onPress={() => setBuatMode(true)}>
            + Buat Inspeksi
          </Button>
        </div>
      ) : null}

      {/* Pesan error / status. */}
      {error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {loading ? <p className="text-sm text-default-500">Memuat inspeksi…</p> : null}

      {/* Tabel daftar inspeksi (atau pesan kosong). */}
      {!loading && list.length === 0 ? (
        <p className="text-sm text-default-500">Belum ada data inspeksi.</p>
      ) : null}

      {list.length > 0 ? (
        <div className="w-full overflow-x-auto rounded-xl border border-default-200">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            {/* Header tabel. */}
            <thead className="bg-default-100">
              <tr>
                {["Fasilitas", "Pelabuhan", "Tgl Inspeksi", "Tgl Sebelumnya", "Ringkasan Kondisi", "TTD", "Aksi"].map((h) => (
                  <th key={h} className="border-b border-default-200 px-3 py-2 text-left font-semibold text-default-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Baris tiap inspeksi. */}
              {list.map((ins) => (
                <tr key={ins.id} className="border-b border-default-100 hover:bg-default-50">
                  <td className="px-3 py-2 font-medium">{ins.namaFasilitas}</td>
                  <td className="px-3 py-2">{ins.namaPelabuhan}</td>
                  <td className="px-3 py-2">{formatTanggalISO(ins.tanggalInspeksi)}</td>
                  <td className="px-3 py-2">{formatTanggalISO(ins.tanggalSebelumnya)}</td>
                  {/* Ringkasan kondisi: badge kecil per item. */}
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {ins.items.map((it) => (
                        <span
                          key={it.urutan}
                          className={`rounded px-1.5 py-0.5 text-[11px] ${KONDISI[it.kondisi].kelas}`}
                          title={`${it.namaItem}: ${KONDISI[it.kondisi].label}`}
                        >
                          {it.namaItem}
                        </span>
                      ))}
                    </div>
                  </td>
                  {/* Indikator tanda tangan (menampilkan thumbnail bila ada). */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {ins.ttdCabangImage ? (
                        <img src={ins.ttdCabangImage} alt="TTD Cabang" className="h-6 w-12 rounded border border-default-200 object-contain" />
                      ) : (
                        <span className="text-[11px] text-default-400">—</span>
                      )}
                      {ins.ttdMitraImage ? (
                        <img src={ins.ttdMitraImage} alt="TTD Mitra" className="h-6 w-12 rounded border border-default-200 object-contain" />
                      ) : null}
                    </div>
                  </td>
                  {/* Tombol unduh PDF form inspeksi. */}
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => {
                        // Unduh PDF terautentikasi.
                        unduhFile(exportPath.inspeksiPdf(ins.id)).catch((e) => setError(String(e)));
                      }}
                    >
                      Unduh PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
