# PRD — Sistem Monitoring Availability Fasilitas Sipil Pelabuhan
**PT Pelabuhan Indonesia (Persero)**

| | |
|---|---|
| **Nama kerja produk** | SiMFAS-Pelindo *(Sistem Informasi Monitoring Fasilitas Pelabuhan — dapat diganti)* |
| **Dokumen** | Product Requirements Document (PRD) |
| **Status** | Draft v1.0 |
| **Tanggal** | 18 Juli 2026 |

---

## 1. Latar Belakang & Masalah

Saat ini pelaporan **availability fasilitas sipil pelabuhan** (Dermaga, Lapangan Penumpukan, Gudang, Terminal Penumpang) dikelola manual melalui file Excel berjenjang (Cabang → Regional → Pusat), satu file per cabang/bulan, dengan puluhan sheet dan rumus manual. Berdasarkan file contoh yang dilampirkan (`template-output-rekap.xlsx`, `data-output-regional2.xlsx`, `template-output-inspeksi.xlsx`), pola kerja saat ini:

- Tiap Cabang mengisi data kondisi objek fasilitas (panjang, luas, jumlah, kerusakan ringan/sedang/berat) per bulan.
- Availability dihitung manual: `Fasilitas Siap Pakai / Fasilitas Tersedia × 100%`, berjenjang dari **Objek Fasilitas → Fasilitas → Kategori → Regional**.
- Ada form **Inspeksi** terpisah (per fasilitas, dibandingkan dengan inspeksi sebelumnya) yang ditandatangani Cabang & Mitra/Anak Usaha/Anpers.
- Risiko: format tidak konsisten antar sheet/tahun, rawan salah rumus, sulit diaudit, sulit dipantau real-time oleh Kantor Pusat.

**Masalah yang diselesaikan:** menyediakan aplikasi web tersentralisasi untuk input, kalkulasi otomatis, monitoring, dan pelaporan availability fasilitas sipil pelabuhan, dengan output yang familiar (tabel ala Excel) namun dapat diakses & diaudit secara digital.

## 2. Tujuan

1. Menggantikan proses input Excel manual dengan form web terstruktur & tervalidasi.
2. Kalkulasi availability otomatis, konsisten di semua level (Objek → Fasilitas → Kategori → Cabang → Regional → Pusat).
3. Monitoring kondisi fasilitas secara real-time oleh Regional & Pusat.
4. Digitalisasi form Inspeksi fasilitas berkala dengan pembanding kondisi sebelumnya.
5. Ekspor laporan dalam format Excel & PDF yang sama dengan template eksisting agar tidak mengubah kebiasaan pelaporan ke manajemen.

## 3. Target Pengguna & Role

| Role | Deskripsi | Akses Utama |
|---|---|---|
| **Admin Pusat** | Kantor pusat, pemantau seluruh regional | Read semua data, rekap nasional, manajemen master data & user |
| **Admin/PIC Regional** | Pemantau availability cabang-cabang di regionalnya | Read semua cabang di regionalnya, approve rekap regional, export |
| **PIC Cabang/Pelabuhan** | Petugas teknik/fasilitas di pelabuhan | Input & edit data availability & inspeksi cabangnya, submit laporan bulanan |
| **Mitra/Anak Usaha/Anpers** | Operator fasilitas (mis. SPTP, SPMT, SPSL) | Validasi/tanda tangan digital hasil inspeksi terkait |
| **Auditor/Viewer** | Internal audit, manajemen | Read-only seluruh data & riwayat perubahan |

Autentikasi berbasis akun (email/NIPP + password, opsional SSO) dengan **Role-Based Access Control (RBAC)** mengikuti hierarki Pusat → Regional → Cabang.

## 4. Ruang Lingkup

**In-scope (v1):**
- Input & kalkulasi data availability bulanan per kategori fasilitas: Dermaga, Lapangan Penumpukan, Gudang, Terminal Penumpang (kategori dapat ditambah via master data).
- Rekap berjenjang: Objek Fasilitas → Fasilitas → Kategori → Cabang → Regional → Nasional.
- Modul Form Inspeksi fasilitas berkala dengan histori & tanda tangan digital.
- Dashboard monitoring (tabel + grafik tren availability).
- Ekspor Excel (.xlsx) & PDF sesuai format template terlampir.
- Import data historis dari file Excel eksisting (migrasi awal).
- Manajemen user & role, audit trail perubahan data.
- Notifikasi pengingat pengisian laporan bulanan & jadwal inspeksi.

**Out-of-scope (v1):**
- Integrasi langsung ke sistem ERP/SAP Pelindo (disiapkan sebagai future work via API).
- Modul keuangan/anggaran perbaikan fasilitas.
- Aplikasi mobile native (cukup web responsive untuk v1).
- Analitik prediktif/AI (predictive maintenance) — future consideration.

## 5. Struktur Data Inti (Data Model)

Diturunkan dari analisis template Excel terlampir:

```
Regional (Regional 1–4, dst.)
 └─ Cabang / Pelabuhan (mis. Tanjung Priok, Panjang, Banten, Benoa, Kupang, dst.)
     └─ Periode Pelaporan (Bulan–Tahun)
         └─ Kategori Fasilitas (I. Dermaga, II. Lapangan Penumpukan, III. Gudang, IV. Terminal Penumpang)
             └─ Fasilitas (mis. "Dermaga Pelabuhan Nusantara I", Konstruksi, Operator)
                 └─ Objek Fasilitas / Komponen (mis. Pelat Lantai, Fender, Bolder, Kanstin, Rel Crane)
                     - Panjang (m), Lebar (m), Luas (m²), Jumlah (unit)
                     - Fasilitas Tersedia, Rusak Ringan, Rusak Sedang, Rusak Berat
                     - Fasilitas Siap Pakai (dihitung)
                     - Availability Objek Fasilitas (%) = Fasilitas Siap Pakai / Fasilitas Tersedia × 100
                     - Keterangan (catatan kerusakan/perbaikan)
```

**Aturan agregasi otomatis:**
- `Availability Fasilitas` = rata-rata tertimbang seluruh Objek Fasilitas dalam satu Fasilitas.
- `Availability Kategori` (mis. "Availability Dermaga") = rata-rata tertimbang seluruh Fasilitas dalam kategori tsb.
- `Availability Cabang/Regional` = rata-rata tertimbang seluruh kategori.

**Modul Inspeksi** (entitas terpisah, terhubung ke Fasilitas):
- Header: Regional, Nama Pelabuhan, Fasilitas, Lokasi/Area, Tanggal Inspeksi, Tanggal Inspeksi Sebelumnya (auto dari histori).
- Detail per Item Inspeksi: kondisi terpilih (1. Baik / 2. Tidak ada perubahan / 3. Kerusakan tambahan / 4. Kerusakan sudah diperbaiki) + keterangan + (opsional) foto.
- Validasi/tanda tangan digital: pihak Cabang & pihak Mitra/Anak Usaha/Anpers.

## 6. Fitur Utama (Functional Requirements)

| # | Fitur | Prioritas |
|---|---|---|
| 1 | Form input data availability bulanan (dinamis per kategori/fasilitas/objek), dengan validasi & auto-kalkulasi | P0 |
| 2 | Tabel web interaktif ala Excel: grouping kategori, sub-total, filter Regional/Cabang/Periode, sticky header | P0 |
| 3 | Dashboard rekap: kartu ringkasan % availability, grafik tren bulanan per kategori/cabang | P0 |
| 4 | Ekspor Excel (.xlsx) — layout & rumus mengikuti template `Rekap Regional` dan `Lap. Cabang` terlampir | P0 |
| 5 | Ekspor PDF — layout mengikuti form `Inspeksi Dermaga` terlampir | P0 |
| 6 | Modul Form Inspeksi digital + histori & pembanding kondisi sebelumnya | P0 |
| 7 | RBAC & alur submit/approval (Cabang submit → Regional review → Pusat monitor) | P0 |
| 8 | Import data historis dari Excel eksisting (mapping sheet per bulan/cabang) | P1 |
| 9 | Audit trail (siapa mengubah apa, kapan) | P1 |
| 10 | Notifikasi/reminder pengisian laporan & jadwal inspeksi (email/in-app) | P1 |
| 11 | Manajemen master data (Regional, Cabang, Kategori, Fasilitas, Operator) | P1 |
| 12 | Tanda tangan digital pada form inspeksi | P1 |
| 13 | Upload foto kondisi fasilitas pada inspeksi | P2 |
| 14 | API integrasi eksternal (ERP/SAP) | P2 |
| 15 | Analitik prediktif kondisi fasilitas | P2 |

## 7. Kebutuhan Non-Fungsional

- **Performa:** waktu muat halaman < 2 detik pada koneksi standar; lazy-loading tabel besar (virtualisasi baris); caching hasil rekap.
- **Clean code & clean architecture:**
  - Struktur berlapis (presentation / application / domain / infrastructure), dependency mengarah ke dalam (domain tidak bergantung ke framework).
  - Penamaan jelas, fungsi kecil & bertanggung jawab tunggal.
  - **Setiap baris/unit kode diberi komentar** yang menjelaskan maksudnya secara sederhana, agar mudah dipahami developer pemula maupun auditor non-teknis.
  - Linting & type-checking wajib lulus sebelum commit (selaras konvensi di `AGENTS.md`/`CLAUDE.md`: conventional commits, `pnpm lint && pnpm typecheck`).
- **Responsif:** breakpoint Desktop (≥1280px), Tablet (768–1279px), Smartphone (<768px); tabel beralih ke mode kartu/scroll horizontal di layar kecil.
- **Keamanan:** hashing password, JWT/session aman, RBAC per endpoint, enkripsi data sensitif at-rest & in-transit (HTTPS/TLS), rate limiting.
- **Skalabilitas & portabilitas:** seluruh service di-containerize (Docker), stateless app server agar mudah dipindah/discale ke server/VPS lain.
- **Ketersediaan data:** backup database terjadwal (harian) ke object storage.

## 8. Arsitektur Sistem & Tech Stack

### 8.1 Frontend
- **React 19 + TypeScript**, UI library **HeroUI v3** (`npm i @heroui/styles @heroui/react`) — mengikuti [Quick Start HeroUI](https://heroui.com/en/docs/react/getting-started/quick-start).
- **Tailwind CSS v4** untuk styling, komponen mengikuti pola *compound component* & BEM (`block__element--modifier`) sesuai konvensi di `AGENTS.md`/`CLAUDE.md`.
- **Wajib:** sebelum mengimplementasikan/mengubah komponen atau memakai library pihak ketiga (Tailwind v4, React Aria, dsb.), developer/agent **mengecek dokumentasi terbaru via Context7 MCP** (`resolve-library-id` → `get-library-docs`) agar tidak memakai API yang usang.
- Tabel data besar: virtualisasi baris, export client-triggered (request ke backend generate file).
- Grafik tren: library chart ringan (mis. Recharts).

### 8.2 Backend
- REST API (Node.js/TypeScript, mis. NestJS) dengan **clean architecture** (controller → service/use-case → domain → repository).
- Modul: Auth/RBAC, Master Data, Availability, Inspeksi, Export (Excel/PDF), Notifikasi, Audit Log.
- Generator file: Excel via `exceljs` (mengikuti layout template), PDF via engine templating (mis. Puppeteer/PDFKit) mengikuti layout form inspeksi.

### 8.3 Data & Storage
- **Database:** PostgreSQL (relasional, cocok untuk struktur hierarkis Regional → Cabang → Fasilitas → Objek).
- **Object storage:** AWS S3 (atau S3-compatible) untuk file hasil export, lampiran foto inspeksi, dan backup — dipilih agar lepas dari batas disk VPS dan mudah diskalakan.
- Cache ringan (Redis, opsional) untuk hasil rekap yang sering diakses.

### 8.4 Infrastruktur & Deployment
- Seluruh komponen (frontend, backend, DB, reverse proxy) dibungkus **Docker** (multi-stage build) & diorkestrasi dengan `docker-compose` — mengikuti prinsip *build once, deploy anywhere*.
- **Hosting awal:** VPS Hostinger `168.231.118.3`, dengan reverse proxy (Nginx/Traefik) + SSL (Let's Encrypt).
- Karena dibungkus Docker, environment dapat dipindah ke VPS/cloud lain tanpa perubahan kode (hanya `.env`).
- Environment variables untuk kredensial DB/S3 (tidak di-hardcode).
- CI sederhana: lint → typecheck → test → build image (selaras `pnpm lint && pnpm typecheck` di `AGENTS.md`).

## 9. Output & Pelaporan

| Output | Bentuk | Referensi Format |
|---|---|---|
| Tabel web availability | Tabel interaktif (grouping, sub-total, filter) mirip tampilan Excel | `Lap. Cabang`, sheet bulanan (`FEB-2024`, dst.) |
| Rekap Regional | Tabel + ringkasan availability per kategori & grand total | Sheet `Rekap Regional` |
| Export Excel | File `.xlsx` unduhan, layout & rumus sama seperti template | `template-output-rekap.xlsx`, `data-output-regional2.xlsx` |
| Export PDF | Form hasil inspeksi siap cetak/tanda tangan | `template-output-inspeksi.xlsx` (sheet `Inspeksi Dermaga`) |

## 10. Alur Kerja Utama

1. **Pelaporan bulanan:** PIC Cabang input/update data objek fasilitas → sistem hitung availability otomatis berjenjang → submit → Regional review & rekap → Pusat memonitor dashboard nasional.
2. **Inspeksi berkala:** PIC Cabang membuka form inspeksi per fasilitas → sistem menampilkan hasil inspeksi sebelumnya sebagai pembanding → isi kondisi & keterangan → tanda tangan digital Cabang + Mitra → tersimpan sebagai riwayat & dapat diekspor PDF.
3. **Monitoring:** Regional/Pusat/Auditor mengakses dashboard, memfilter per periode/cabang/kategori, mengekspor laporan kapan pun dibutuhkan.

## 11. Fase Pengembangan (Ringkas)

| Fase | Cakupan |
|---|---|
| 1 | Setup infra Docker, autentikasi & RBAC, master data, model data inti |
| 2 | Modul input availability + kalkulasi berjenjang + tabel web + export Excel |
| 3 | Modul Inspeksi digital + export PDF + notifikasi |
| 4 | Dashboard analitik/tren, import data historis, audit trail, hardening & UAT |

## 12. Risiko & Asumsi

- Format Excel historis tidak konsisten antar tahun/cabang (kolom bertambah/berkurang) → perlu proses normalisasi saat import.
- Ketersediaan koneksi internet stabil di cabang-cabang remote → perlu mode input yang toleran koneksi lambat (draft lokal/retry).
- Skema tanda tangan digital perlu kepastian legal/kebijakan internal Pelindo.
- Struktur regional/cabang final (jumlah kategori fasilitas, dsb.) perlu konfirmasi ke pemilik proses bisnis sebelum kickoff.

## 13. Referensi

- HeroUI Quick Start: https://heroui.com/en/docs/react/getting-started/quick-start
- Konvensi pengembangan: `AGENTS.md`, `CLAUDE.md` (struktur monorepo, compound component, BEM, commit convention)
- Dokumentasi library up-to-date: Context7 MCP
- Template data acuan: `template-output-rekap.xlsx`, `data-output-regional2.xlsx`, `template-output-inspeksi.xlsx`
