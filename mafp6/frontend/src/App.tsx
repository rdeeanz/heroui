// ============================================================================
//  APP — Dashboard monitoring availability.
//  Alur: pilih Regional -> Cabang -> Periode, lalu tampilkan kartu ringkasan,
//  grafik tren, dan tabel ala Excel. Semua data diambil dari backend.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { api, exportPath, unduhFile } from "@/api/client";
import type { Cabang, LaporanCabangOutput, Periode, Regional } from "@/api/types";
import { SelectField } from "@/components/SelectField";
import { SummaryCards } from "@/components/SummaryCards";
import { AvailabilityTable } from "@/components/AvailabilityTable";
import { TrendChart, type TitikTren } from "@/components/TrendChart";
import { InspeksiView } from "@/components/InspeksiView";
import { ApprovalView } from "@/components/ApprovalView";
import { ImportView } from "@/components/ImportView";
import { AuditView } from "@/components/AuditView";
import { NotificationBell } from "@/components/NotificationBell";
import { LoginPage } from "@/components/LoginPage";
import { useAuth } from "@/auth/AuthContext";
import { labelPeriode, LABEL_ROLE, NAMA_BULAN } from "@/lib/format";

// Tampilan-tampilan utama aplikasi.
type Tampilan = "dashboard" | "inspeksi" | "persetujuan" | "import" | "audit";

// Gerbang autentikasi: tampilkan layar login bila belum masuk, jika tidak
// tampilkan cangkang aplikasi. Memisahkan ini menjaga aturan hooks (hooks di
// AppShell hanya berjalan setelah login).
export default function App() {
  const { user, loading } = useAuth();
  // Saat memeriksa token awal, tampilkan indikator sederhana.
  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-default-50 text-sm text-default-500">
        Memuat…
      </div>
    );
  }
  // Belum login: tampilkan halaman login.
  if (!user) return <LoginPage />;
  // Sudah login: tampilkan aplikasi.
  return <AppShell />;
}

// Cangkang aplikasi utama (hanya dirender setelah pengguna login).
function AppShell() {
  // Ambil pengguna aktif & fungsi logout.
  const { user, logout } = useAuth();
  // State daftar master untuk filter.
  const [regionalList, setRegionalList] = useState<Regional[]>([]);
  const [cabangList, setCabangList] = useState<Cabang[]>([]);
  const [periodeList, setPeriodeList] = useState<Periode[]>([]);

  // State pilihan filter aktif.
  const [regionalKode, setRegionalKode] = useState<string | null>(null);
  const [cabangId, setCabangId] = useState<string | null>(null);
  const [periodeId, setPeriodeId] = useState<string | null>(null);

  // Tampilan aktif (dashboard availability atau daftar inspeksi).
  const [tampilan, setTampilan] = useState<Tampilan>("dashboard");

  // State data laporan aktif + data tren + status muat/error.
  const [laporan, setLaporan] = useState<LaporanCabangOutput | null>(null);
  const [tren, setTren] = useState<TitikTren[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1) Saat mount: muat daftar regional.
  useEffect(() => {
    api
      .regional()
      .then((data) => {
        setRegionalList(data);
        // Pilih regional pertama otomatis bila ada.
        if (data[0]) setRegionalKode(data[0].kode);
      })
      .catch((e) => setError(String(e)));
  }, []);

  // 2) Saat regional berubah: muat daftar cabang regional tersebut.
  useEffect(() => {
    if (!regionalKode) return;
    api
      .cabang(regionalKode)
      .then((data) => {
        setCabangList(data);
        // Pilih cabang pertama otomatis; reset bila kosong.
        setCabangId(data[0]?.id ?? null);
      })
      .catch((e) => setError(String(e)));
  }, [regionalKode]);

  // 3) Saat cabang berubah: muat daftar periode cabang tersebut.
  useEffect(() => {
    if (!cabangId) return;
    api
      .periode(cabangId)
      .then((data) => {
        setPeriodeList(data);
        // Pilih periode terbaru (paling atas) otomatis.
        setPeriodeId(data[0]?.id ?? null);
      })
      .catch((e) => setError(String(e)));
  }, [cabangId]);

  // 4) Saat periode terpilih berubah: muat laporan cabang untuk periode itu.
  useEffect(() => {
    // Cari objek periode terpilih.
    const p = periodeList.find((x) => x.id === periodeId);
    if (!cabangId || !p) return;
    setLoading(true);
    setError(null);
    api
      .laporanCabang(cabangId, p.tahun, p.bulan)
      .then(setLaporan)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [periodeId, cabangId, periodeList]);

  // 5) Saat daftar periode cabang berubah: bangun data tren dari semua periode.
  useEffect(() => {
    if (!cabangId || periodeList.length === 0) {
      setTren([]);
      return;
    }
    // Ambil laporan untuk tiap periode (urut lama->baru) lalu susun titik tren.
    const urut = [...periodeList].sort((a, b) => a.tahun - b.tahun || a.bulan - b.bulan);
    Promise.all(urut.map((p) => api.laporanCabang(cabangId, p.tahun, p.bulan).catch(() => null)))
      .then((hasil) => {
        // Bentuk tiap titik tren dari hasil kalkulasi.
        const titik: TitikTren[] = hasil
          .filter((h): h is LaporanCabangOutput => h !== null)
          .map((h) => {
            // Titik dasar: label periode + availability cabang.
            const t: TitikTren = {
              periode: `${NAMA_BULAN[h.bulan - 1]?.slice(0, 3)} ${h.tahun}`,
              cabang: h.hasil.availability,
            };
            // Tambahkan availability tiap kategori sebagai seri.
            for (const k of h.hasil.kategori) t[k.nama] = k.availability;
            return t;
          });
        setTren(titik);
      })
      .catch((e) => setError(String(e)));
  }, [periodeList, cabangId]);

  // Opsi filter diturunkan dari daftar master (memoized agar tidak dihitung ulang).
  const opsiRegional = useMemo(
    () => regionalList.map((r) => ({ key: r.kode, label: r.nama })),
    [regionalList],
  );
  const opsiCabang = useMemo(
    () => cabangList.map((c) => ({ key: c.id, label: c.nama })),
    [cabangList],
  );
  const opsiPeriode = useMemo(
    () => periodeList.map((p) => ({ key: p.id, label: labelPeriode(p.bulan, p.tahun) })),
    [periodeList],
  );

  // Nama kategori sebagai seri grafik (dari laporan aktif).
  const seriKategori = useMemo(
    () => laporan?.hasil.kategori.map((k) => k.nama) ?? [],
    [laporan],
  );

  // Objek periode yang sedang terpilih (untuk URL ekspor).
  const periodeTerpilih = useMemo(
    () => periodeList.find((p) => p.id === periodeId) ?? null,
    [periodeList, periodeId],
  );

  // Handler unduh Excel laporan cabang (terautentikasi) untuk periode terpilih.
  function unduhExcelCabang() {
    if (cabangId && periodeTerpilih) {
      unduhFile(
        exportPath.cabangExcel(cabangId, periodeTerpilih.tahun, periodeTerpilih.bulan),
      ).catch((e) => setError(String(e)));
    }
  }

  // Handler unduh Excel rekap regional (terautentikasi) untuk periode terpilih.
  function unduhExcelRegional() {
    if (regionalKode && periodeTerpilih) {
      unduhFile(
        exportPath.regionalExcel(regionalKode, periodeTerpilih.tahun, periodeTerpilih.bulan),
      ).catch((e) => setError(String(e)));
    }
  }

  return (
    // Kontainer halaman: latar lembut, padding responsif.
    <div className="min-h-full bg-default-50 text-default-900">
      {/* Header aplikasi. */}
      <header className="border-b border-default-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold sm:text-xl">
              SiMFAS-Pelindo — Monitoring Availability Fasilitas Sipil Pelabuhan
            </h1>
            <p className="text-xs text-default-500">PT Pelabuhan Indonesia (Persero)</p>
          </div>
          {/* Navigasi + identitas pengguna + logout. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <nav className="flex gap-2">
              <Button
                size="sm"
                variant={tampilan === "dashboard" ? "primary" : "secondary"}
                onPress={() => setTampilan("dashboard")}
              >
                Dashboard
              </Button>
              <Button
                size="sm"
                variant={tampilan === "inspeksi" ? "primary" : "secondary"}
                onPress={() => setTampilan("inspeksi")}
              >
                Inspeksi
              </Button>
              <Button
                size="sm"
                variant={tampilan === "persetujuan" ? "primary" : "secondary"}
                onPress={() => setTampilan("persetujuan")}
              >
                Persetujuan
              </Button>
              {/* Import historis hanya untuk PIC Cabang & Admin Pusat. */}
              {user?.role === "PIC_CABANG" || user?.role === "ADMIN_PUSAT" ? (
                <Button
                  size="sm"
                  variant={tampilan === "import" ? "primary" : "secondary"}
                  onPress={() => setTampilan("import")}
                >
                  Import
                </Button>
              ) : null}
              {/* Audit trail hanya untuk Admin Pusat & Auditor. */}
              {user?.role === "ADMIN_PUSAT" || user?.role === "AUDITOR" ? (
                <Button
                  size="sm"
                  variant={tampilan === "audit" ? "primary" : "secondary"}
                  onPress={() => setTampilan("audit")}
                >
                  Audit
                </Button>
              ) : null}
            </nav>
            {/* Lonceng notifikasi + identitas pengguna & tombol keluar. */}
            <div className="flex items-center gap-2 sm:border-l sm:border-default-200 sm:pl-3">
              {/* Lonceng: navigasi mengikuti tautan notifikasi (bila tampilan valid). */}
              <NotificationBell
                isAdminPusat={user?.role === "ADMIN_PUSAT"}
                onNavigate={(tautan) => {
                  // Pindah tampilan hanya bila tautan cocok dengan tampilan yang ada.
                  if (["dashboard", "inspeksi", "persetujuan", "import"].includes(tautan)) {
                    setTampilan(tautan as Tampilan);
                  }
                }}
              />
              <div className="text-right">
                <p className="text-xs font-semibold leading-tight">{user?.namaLengkap}</p>
                <p className="text-[11px] text-default-500 leading-tight">
                  {user ? (LABEL_ROLE[user.role] ?? user.role) : ""}
                </p>
              </div>
              <Button size="sm" variant="tertiary" onPress={logout}>
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tampilan Inspeksi. */}
      {tampilan === "inspeksi" ? (
        <main className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6">
          <h2 className="text-sm font-semibold">Daftar Inspeksi Fasilitas</h2>
          <InspeksiView />
        </main>
      ) : tampilan === "persetujuan" ? (
        /* Tampilan Persetujuan (alur kerja submit/review). */
        <main className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6">
          <h2 className="text-sm font-semibold">Persetujuan Laporan (Cabang → Regional → Pusat)</h2>
          <ApprovalView />
        </main>
      ) : tampilan === "import" ? (
        /* Tampilan Import Historis (unggah Excel lama). */
        <main className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6">
          <h2 className="text-sm font-semibold">Import Data Historis (Excel)</h2>
          <ImportView />
        </main>
      ) : tampilan === "audit" ? (
        /* Tampilan Audit Trail. */
        <main className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6">
          <h2 className="text-sm font-semibold">Jejak Audit (Siapa Mengubah Apa, Kapan)</h2>
          <AuditView />
        </main>
      ) : (
      /* Tampilan Dashboard availability. */
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6">
        {/* Panel filter: responsif (kolom di mobile, sebaris di desktop). */}
        <section className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-end">
          <SelectField
            label="Regional"
            opsi={opsiRegional}
            nilai={regionalKode}
            onChange={setRegionalKode}
          />
          <SelectField
            label="Cabang"
            opsi={opsiCabang}
            nilai={cabangId}
            onChange={setCabangId}
            disabled={opsiCabang.length === 0}
          />
          <SelectField
            label="Periode"
            opsi={opsiPeriode}
            nilai={periodeId}
            onChange={setPeriodeId}
            disabled={opsiPeriode.length === 0}
          />
          {/* Tombol ekspor Excel (aktif bila periode terpilih). */}
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="secondary" isDisabled={!periodeTerpilih} onPress={unduhExcelCabang}>
              Ekspor Excel (Cabang)
            </Button>
            <Button variant="secondary" isDisabled={!periodeTerpilih} onPress={unduhExcelRegional}>
              Ekspor Rekap Regional
            </Button>
          </div>
        </section>

        {/* Pesan error bila ada. */}
        {error ? (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {/* Indikator memuat. */}
        {loading ? <p className="text-sm text-default-500">Memuat data…</p> : null}

        {/* Konten laporan bila data tersedia. */}
        {laporan ? (
          <>
            {/* Kartu ringkasan availability. */}
            <SummaryCards data={laporan.hasil} />

            {/* Grafik tren availability. */}
            <section className="rounded-xl border border-default-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold">Tren Availability (per periode)</h2>
              <TrendChart data={tren} seriKategori={seriKategori} />
            </section>

            {/* Tabel detail ala Excel. */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">
                Detail Availability — {laporan.cabangNama} · {labelPeriode(laporan.bulan, laporan.tahun)}
              </h2>
              <AvailabilityTable data={laporan.hasil} />
            </section>
          </>
        ) : null}
      </main>
      )}
    </div>
  );
}
