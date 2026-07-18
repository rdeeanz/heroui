// ============================================================================
//  HALAMAN AUDIT TRAIL — tabel jejak audit dengan filter & paginasi.
//  Untuk Admin Pusat & Auditor: "siapa mengubah apa, kapan".
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { api } from "@/api/client";
import type { AuditPage } from "@/api/types";
import { formatTanggalISO } from "@/lib/format";

// Ukuran halaman tetap.
const PAGE_SIZE = 25;

// Komponen halaman audit.
export function AuditView() {
  // State filter.
  const [aksi, setAksi] = useState("");
  const [entitas, setEntitas] = useState("");
  const [berhasil, setBerhasil] = useState(""); // ""/"true"/"false".
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [page, setPage] = useState(1);

  // State hasil + status.
  const [data, setData] = useState<AuditPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Muat data audit sesuai filter & halaman aktif.
  const muat = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .auditCari({ aksi, entitas, berhasil, dari, sampai, page, pageSize: PAGE_SIZE })
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    // Sengaja tidak memasukkan filter ke deps: muat dipicu manual/halaman.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Muat saat mount & saat halaman berubah.
  useEffect(() => muat(), [muat]);

  // Terapkan filter: kembali ke halaman 1 lalu muat.
  function terapkan() {
    if (page !== 1) setPage(1);
    else muat(); // Bila sudah di halaman 1, muat langsung.
  }

  // Total halaman untuk kontrol paginasi.
  const totalHalaman = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-3">
      {/* Panel filter. */}
      <div className="flex flex-wrap items-end gap-2">
        <FieldTeks label="Aksi" value={aksi} onChange={setAksi} placeholder="mis. LAPORAN_SUBMIT" />
        <FieldTeks label="Entitas" value={entitas} onChange={setEntitas} placeholder="mis. periode" />
        {/* Filter status berhasil/gagal. */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-default-600">Status</label>
          <select
            value={berhasil}
            onChange={(e) => setBerhasil(e.target.value)}
            className="rounded-lg border border-default-300 px-3 py-2 text-sm"
          >
            <option value="">Semua</option>
            <option value="true">Berhasil</option>
            <option value="false">Gagal</option>
          </select>
        </div>
        <FieldTanggal label="Dari" value={dari} onChange={setDari} />
        <FieldTanggal label="Sampai" value={sampai} onChange={setSampai} />
        <Button variant="primary" size="sm" onPress={terapkan}>
          Terapkan
        </Button>
      </div>

      {/* Error. */}
      {error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {loading ? <p className="text-sm text-default-500">Memuat…</p> : null}

      {/* Tabel audit. */}
      <div className="w-full overflow-x-auto rounded-xl border border-default-200">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="bg-default-100">
            <tr>
              {["Waktu", "Pelaku", "Aksi", "Entitas", "Status", "IP", "Detail"].map((h) => (
                <th key={h} className="border-b border-default-200 px-3 py-2 text-left font-semibold text-default-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.items.map((r) => (
              <tr key={r.id} className="border-b border-default-100 align-top hover:bg-default-50">
                <td className="px-3 py-2 whitespace-nowrap">{formatTanggalISO(r.createdAt)}</td>
                {/* Pelaku: email + peran. */}
                <td className="px-3 py-2">
                  <span className="block">{r.userEmail ?? "-"}</span>
                  <span className="block text-[11px] text-default-400">{r.userRole ?? ""}</span>
                </td>
                <td className="px-3 py-2 font-medium">{r.aksi}</td>
                {/* Entitas + id ringkas. */}
                <td className="px-3 py-2">
                  {r.entitas ?? "-"}
                  {r.entitasId ? (
                    <span className="block text-[11px] text-default-400">{r.entitasId.slice(0, 8)}</span>
                  ) : null}
                </td>
                {/* Status berhasil/gagal + kode HTTP. */}
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                      r.berhasil ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {r.berhasil ? "OK" : "GAGAL"} {r.status ?? ""}
                  </span>
                </td>
                <td className="px-3 py-2 text-[11px] text-default-500">{r.ip ?? "-"}</td>
                {/* Detail JSON (bisa dibuka). */}
                <td className="px-3 py-2">
                  {r.detail ? (
                    <details>
                      <summary className="cursor-pointer text-[11px] text-primary-600">lihat</summary>
                      <pre className="mt-1 max-w-xs overflow-auto rounded bg-default-100 p-2 text-[10px]">
                        {JSON.stringify(r.detail, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    <span className="text-[11px] text-default-400">-</span>
                  )}
                </td>
              </tr>
            ))}
            {/* Kosong. */}
            {data && data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-default-500">
                  Tidak ada catatan audit.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Kontrol paginasi. */}
      {data ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-default-500">
            {data.total} catatan · halaman {data.page}/{totalHalaman}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" isDisabled={page <= 1} onPress={() => setPage((p) => p - 1)}>
              Sebelumnya
            </Button>
            <Button
              size="sm"
              variant="secondary"
              isDisabled={page >= totalHalaman}
              onPress={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Field teks kecil (label + input) — dipakai berulang di panel filter.
function FieldTeks({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-default-600">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-default-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

// Field tanggal kecil.
function FieldTanggal({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-default-600">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-default-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
