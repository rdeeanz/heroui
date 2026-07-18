// ============================================================================
//  HALAMAN IMPORT HISTORIS — unggah file Excel lama, PRATINJAU hasil parsing
//  (termasuk availability terhitung & peringatan normalisasi), lalu IMPOR ke
//  cabang + periode tujuan. Dibatasi peran PIC Cabang & Admin Pusat.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { Button, Card } from "@heroui/react";
import { api } from "@/api/client";
import type { Cabang, ImportSummary, PreviewImport, Regional } from "@/api/types";
import { SelectField } from "@/components/SelectField";
import { SummaryCards } from "@/components/SummaryCards";
import { NAMA_BULAN } from "@/lib/format";

// Opsi bulan 1..12 untuk SelectField.
const OPSI_BULAN = NAMA_BULAN.map((nama, i) => ({ key: String(i + 1), label: nama }));

// Komponen halaman import.
export function ImportView() {
  // --- State file & pratinjau ---
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewImport | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);

  // --- State target (cabang + periode) ---
  const [regionalList, setRegionalList] = useState<Regional[]>([]);
  const [cabangList, setCabangList] = useState<Cabang[]>([]);
  const [regionalKode, setRegionalKode] = useState<string | null>(null);
  const [cabangId, setCabangId] = useState<string | null>(null);
  const [bulan, setBulan] = useState<string | null>(null);
  const [tahun, setTahun] = useState<string>(String(new Date().getFullYear()));
  const [overwrite, setOverwrite] = useState(false);

  // --- State proses ---
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  // Muat daftar regional saat mount.
  useEffect(() => {
    api.regional().then((d) => {
      setRegionalList(d);
      if (d[0]) setRegionalKode(d[0].kode);
    }).catch((e) => setError(String(e)));
  }, []);

  // Muat cabang saat regional berubah.
  useEffect(() => {
    if (!regionalKode) return;
    api.cabang(regionalKode).then((d) => {
      setCabangList(d);
      setCabangId(d[0]?.id ?? null);
    }).catch((e) => setError(String(e)));
  }, [regionalKode]);

  // Handler pilih file.
  function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(null); // Reset pratinjau lama.
    setSummary(null);
    setSheet(null);
    setError(null);
  }

  // Jalankan pratinjau (parse tanpa simpan).
  async function pratinjau(sheetPilihan?: string) {
    if (!file) {
      setError("Pilih file .xlsx terlebih dahulu.");
      return;
    }
    setLoadingPreview(true);
    setError(null);
    setSummary(null);
    try {
      const hasil = await api.previewImport(file, sheetPilihan ?? sheet ?? undefined);
      setPreview(hasil);
      setSheet(hasil.sheetName);
      // Pra-isi bulan/tahun dari metadata bila terdeteksi.
      if (hasil.meta.bulan) setBulan(String(hasil.meta.bulan));
      if (hasil.meta.tahun) setTahun(String(hasil.meta.tahun));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingPreview(false);
    }
  }

  // Jalankan import (simpan ke DB).
  async function impor() {
    if (!file || !cabangId || !bulan) {
      setError("Lengkapi file, cabang, dan bulan tujuan.");
      return;
    }
    setLoadingCommit(true);
    setError(null);
    try {
      const hasil = await api.commitImport(file, {
        cabangId,
        tahun: parseInt(tahun, 10),
        bulan: parseInt(bulan, 10),
        overwrite,
        sheet: sheet ?? undefined,
      });
      setSummary(hasil); // Tampilkan ringkasan sukses.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingCommit(false);
    }
  }

  // Opsi filter (memoized).
  const opsiRegional = useMemo(() => regionalList.map((r) => ({ key: r.kode, label: r.nama })), [regionalList]);
  const opsiCabang = useMemo(() => cabangList.map((c) => ({ key: c.id, label: c.nama })), [cabangList]);
  const opsiSheet = useMemo(() => (preview?.sheets ?? []).map((s) => ({ key: s, label: s })), [preview]);

  return (
    <div className="space-y-4">
      {/* Langkah 1: unggah & pratinjau. */}
      <Card className="space-y-3 p-4">
        <p className="text-xs font-semibold text-default-600">1. UNGGAH FILE EXCEL (.xlsx)</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* Input file. */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-default-700">Berkas laporan lama</label>
            <input
              type="file"
              accept=".xlsx"
              onChange={pilihFile}
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-default-200 file:px-3 file:py-1.5"
            />
          </div>
          {/* Pemilih sheet (muncul bila file punya banyak sheet). */}
          {opsiSheet.length > 1 ? (
            <SelectField
              label="Sheet"
              opsi={opsiSheet}
              nilai={sheet}
              onChange={(s) => {
                setSheet(s);
                pratinjau(s); // Pratinjau ulang untuk sheet terpilih.
              }}
            />
          ) : null}
          {/* Tombol pratinjau. */}
          <Button variant="secondary" isPending={loadingPreview} isDisabled={!file} onPress={() => pratinjau()}>
            Pratinjau
          </Button>
        </div>
      </Card>

      {/* Pesan error. */}
      {error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {/* Hasil pratinjau. */}
      {preview ? (
        <Card className="space-y-3 p-4">
          <p className="text-xs font-semibold text-default-600">2. PRATINJAU HASIL</p>
          {/* Ringkasan metadata & jumlah. */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>Sheet: <b>{preview.sheetName}</b></span>
            <span>Regional (file): <b>{preview.meta.regional ?? "-"}</b></span>
            <span>Pelabuhan (file): <b>{preview.meta.pelabuhan ?? "-"}</b></span>
            <span>Fasilitas: <b>{preview.fasilitasCount}</b></span>
            <span>Objek: <b>{preview.objekCount}</b></span>
          </div>

          {/* Kartu availability terhitung dari data yang diparse. */}
          <SummaryCards data={preview.availability} />

          {/* Peringatan normalisasi (bila ada), ditampilkan ringkas. */}
          {preview.warnings.length > 0 ? (
            <details className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <summary className="cursor-pointer font-semibold">
                {preview.warnings.length} peringatan normalisasi (klik untuk lihat)
              </summary>
              <ul className="mt-2 max-h-48 space-y-0.5 overflow-auto">
                {preview.warnings.slice(0, 200).map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </Card>
      ) : null}

      {/* Langkah 3: target & import (aktif setelah pratinjau). */}
      {preview ? (
        <Card className="space-y-3 p-4">
          <p className="text-xs font-semibold text-default-600">3. TUJUAN IMPOR</p>
          <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-end">
            <SelectField label="Regional" opsi={opsiRegional} nilai={regionalKode} onChange={setRegionalKode} />
            <SelectField label="Cabang" opsi={opsiCabang} nilai={cabangId} onChange={setCabangId} disabled={opsiCabang.length === 0} />
            <SelectField label="Bulan" opsi={OPSI_BULAN} nilai={bulan} onChange={setBulan} />
            {/* Input tahun. */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-default-700">Tahun</label>
              <input
                type="number"
                value={tahun}
                onChange={(e) => setTahun(e.target.value)}
                className="w-28 rounded-lg border border-default-300 px-3 py-2 text-sm"
              />
            </div>
            {/* Opsi timpa. */}
            <label className="flex items-center gap-2 text-sm text-default-700">
              <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
              Timpa bila periode sudah ada
            </label>
            {/* Tombol import. */}
            <Button variant="primary" isPending={loadingCommit} onPress={impor} className="sm:ml-auto">
              Impor ke Database
            </Button>
          </div>
          <p className="text-[11px] text-default-400">
            Data diimpor sebagai laporan berstatus <b>DRAFT</b> untuk cabang & periode di atas.
          </p>
        </Card>
      ) : null}

      {/* Ringkasan sukses import. */}
      {summary ? (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Berhasil mengimpor <b>{summary.fasilitasCount}</b> fasilitas & <b>{summary.objekCount}</b> objek
          (periode dibuat sebagai DRAFT). {summary.warnings.length} peringatan tercatat saat parsing.
        </div>
      ) : null}
    </div>
  );
}
