# SiMFAS-Pelindo

Sistem Monitoring Availability Fasilitas Sipil Pelabuhan — PT Pelabuhan Indonesia (Persero).

Aplikasi web tersentralisasi untuk input, kalkulasi otomatis, monitoring, dan pelaporan
availability fasilitas sipil pelabuhan (Dermaga, Lapangan Penumpukan, Gudang, Terminal
Penumpang) secara berjenjang: **Regional → Cabang/Pelabuhan → Kategori → Fasilitas → Objek Fasilitas**.

> Dokumen kebutuhan lengkap ada di [`PRD.md`](./PRD.md). Template acuan output ada di
> `template-output-rekap.xlsx`, `data-output-regional2.xlsx`, dan `template-output-inspeksi.xlsx`.

---

## Arsitektur

```
mafp6/
├── backend/            # REST API — Node.js + NestJS + TypeScript (Clean Architecture)
│   └── src/
│       ├── modules/<fitur>/
│       │   ├── domain/          # Entity + business rules (tidak tahu framework/DB)
│       │   ├── application/     # Use-case (orkestrasi) + port (interface repository)
│       │   ├── infrastructure/  # Implementasi repository (Prisma/PostgreSQL)
│       │   └── presentation/    # Controller HTTP (NestJS)
│       └── shared/              # Util lintas modul (kalkulasi, dll.)
├── frontend/           # React 19 + TypeScript + HeroUI v3 + Tailwind CSS v4 (Vite)
├── docker-compose.yml  # PostgreSQL + backend + frontend (nginx) — build once, deploy anywhere
└── .env.example        # Contoh variabel lingkungan (DB, JWT, S3)
```

Arah dependensi mengikuti Clean Architecture: **presentation → application → domain**, dan
`infrastructure` mengimplementasikan port yang dideklarasikan di `application`. `domain` murni
TypeScript tanpa ketergantungan ke NestJS/Prisma sehingga mudah diuji dan diaudit.

## Tech stack

| Lapisan | Teknologi |
|---|---|
| Frontend | React 19, TypeScript, HeroUI v3 (`@heroui/react`, `@heroui/styles`), Tailwind CSS v4, Vite, Recharts |
| Backend | Node.js 22, NestJS, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 |
| Object storage | AWS S3 (atau S3-compatible) untuk lampiran & hasil ekspor |
| Infrastruktur | Docker + docker-compose, Nginx reverse proxy |

## Menjalankan secara lokal (Docker)

```bash
cp .env.example .env          # sesuaikan kredensial
docker compose up --build     # jalankan postgres + backend + frontend
# Frontend: http://localhost:8080   Backend API: http://localhost:3000/api
```

## Menjalankan tanpa Docker (dev)

```bash
# Backend
cd backend && npm install && npm run prisma:generate && npm run start:dev
# Frontend (terminal lain)
cd frontend && npm install && npm run dev
```

## Status implementasi

Lihat bagian "Status implementasi" di bawah — proyek ini dibangun bertahap sesuai fase pada PRD §11.

- [x] Fase 1 (sebagian): struktur data inti, domain + **mesin kalkulasi availability berjenjang** (teruji), scaffold backend & frontend, Docker.
- [x] Modul master data + laporan availability (contoh vertical slice: API → use-case → domain → repository).
- [x] Dashboard HeroUI: tabel ala Excel (grouping + sub-total + filter) + grafik tren.
- [x] **Ekspor Excel** (laporan cabang "Lap. Cabang" dengan RUMUS availability asli + rekap regional) via ExcelJS.
- [x] **Ekspor PDF** form inspeksi (layout "Inspeksi Dermaga" + blok tanda tangan Cabang & Mitra) via PDFKit.
- [x] Modul Inspeksi (buat/daftar/ambil) + pembanding "tanggal inspeksi sebelumnya" otomatis + halaman Inspeksi di frontend.
- [x] **Autentikasi JWT + RBAC** (5 peran) dengan guard global (JWT + Roles) & scoping regional/cabang.
- [x] **Alur persetujuan** Cabang→Regional→Pusat (submit / setujui / tolak dengan catatan) + halaman "Persetujuan" di frontend + login page.
- [x] **Tanda tangan digital**: signature pad kanvas (mouse+sentuh) pada form inspeksi untuk Cabang & Mitra, tersimpan via abstraksi penyimpanan (inline/DB default, **S3 opsional** bila env S3 lengkap), dan **disematkan ke PDF** inspeksi.
- [x] **Import Excel historis**: unggah file lama (layout "Lap. Cabang"), parser dengan deteksi kolom otomatis/normalisasi (tahan variasi format), pratinjau (dry-run) menampilkan availability terhitung + peringatan, lalu impor transaksional ke cabang/periode (status DRAFT, opsi timpa). Teruji terhadap file nyata (`data-output-regional2.xlsx`).
- [x] **Notifikasi & reminder**: notifikasi in-app (lonceng + badge belum dibaca) untuk event alur kerja (submit → Regional/Pusat, review → PIC), plus **reminder laporan bulanan** (cron harian + pemicu manual, deduplikasi per bulan). Email lewat abstraksi port (default: log; SMTP/SES tinggal pasang). 
- [x] **Audit trail**: interceptor global mencatat setiap aksi pengubah data (siapa/aksi/entitas/IP/waktu) + kegagalan login, dengan **redaksi otomatis** field sensitif (password/tanda tangan/berkas). Halaman Audit ber-filter & paginasi untuk Admin Pusat & Auditor.

**Seluruh fitur P0 & P1 pada PRD telah terpenuhi.** Item P2 (integrasi ERP/SAP, analitik prediktif) di luar cakupan v1.

## Endpoint API (fase ini)

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/auth/login` | Login (email + password) → token JWT + data user (publik) |
| GET | `/api/auth/me` | Profil pengguna aktif dari token |
| GET | `/api/laporan/periode?status=SUBMITTED` | Daftar periode (ter-scope peran) |
| POST | `/api/laporan/periode/:id/submit` | PIC Cabang submit laporan (DRAFT→SUBMITTED) |
| POST | `/api/laporan/periode/:id/review` | Regional/Pusat setujui/tolak (SUBMITTED→REVIEWED/REJECTED) |
| POST | `/api/import/preview` | Unggah .xlsx → pratinjau hasil parse + availability + peringatan (dry-run) |
| POST | `/api/import/commit` | Unggah .xlsx → impor ke cabang/periode (status DRAFT), opsi timpa |
| GET | `/api/notifikasi` · `/api/notifikasi/unread-count` | Daftar / jumlah notifikasi belum dibaca (per pengguna) |
| POST | `/api/notifikasi/:id/read` · `/api/notifikasi/read-all` | Tandai dibaca (satu / semua) |
| POST | `/api/notifikasi/reminders/run` | (Admin Pusat) picu reminder laporan manual |
| GET | `/api/audit` | (Admin Pusat/Auditor) jejak audit dgn filter (aksi/entitas/status/tanggal) + paginasi |
| GET | `/api/master/regional` | Daftar regional (filter dashboard) |
| GET | `/api/master/cabang?regionalKode=REG3` | Daftar cabang per regional |
| GET | `/api/master/kategori` | Daftar kategori fasilitas |
| GET | `/api/master/periode?cabangId=...` | Daftar periode laporan cabang |
| GET | `/api/availability/cabang/:cabangId?tahun=2024&bulan=2` | Pohon availability satu cabang (dihitung berjenjang) |
| GET | `/api/availability/regional/:regionalKode?tahun=2024&bulan=2` | Rekap availability seluruh cabang di regional |
| GET | `/api/inspeksi` · `POST /api/inspeksi` · `GET /api/inspeksi/:id` | Daftar / buat / ambil inspeksi |
| GET | `/api/export/cabang/:cabangId/excel?tahun=2024&bulan=2` | Unduh Excel laporan cabang (layout "Lap. Cabang", berumus) |
| GET | `/api/export/regional/:regionalKode/excel?tahun=2024&bulan=2` | Unduh Excel rekap regional |
| GET | `/api/export/inspeksi/:id/pdf` | Unduh PDF form inspeksi (layout "Inspeksi Dermaga") |

## Mengisi data contoh (seed)

Seed mengisi Regional 3 + 3 cabang + 3 periode memakai angka dari template Excel.
Butuh PostgreSQL yang berjalan dan `DATABASE_URL` valid:

```bash
cd backend
npm install
npx prisma db push        # buat tabel dari schema.prisma
npm run seed              # isi data contoh + akun demo
```

Akun demo (semua password: `password123`):

| Email | Peran | Cakupan |
|---|---|---|
| pusat@pelindo.co.id | Admin Pusat | Nasional |
| regional3@pelindo.co.id | Admin Regional | REG3 (review laporan) |
| cabang.benoa@pelindo.co.id | PIC Cabang | Cabang Benoa (input & submit) |
| mitra@pelindo.co.id | Mitra | Validasi inspeksi |
| auditor@pelindo.co.id | Auditor | Read-only |

Status seed sengaja bervariasi agar alur kerja terlihat: April (Cabang Benoa) = DRAFT,
Maret (Cabang Benoa) & April (Cabang Kupang) = SUBMITTED (menunggu review), sisanya REVIEWED.

## Deploy ke VPS Hostinger (168.231.118.3)

```bash
# 1) SSH ke VPS lalu pasang Docker + Docker Compose plugin.
ssh root@168.231.118.3

# 2) Salin repo (git clone / scp) ke /opt/simfas, lalu:
cd /opt/simfas/mafp6
cp .env.example .env         # WAJIB ganti password DB, JWT_SECRET, kredensial S3.

# 3) Bangun & jalankan seluruh stack.
docker compose up -d --build

# 4) (sekali) isi data contoh bila diperlukan.
docker compose exec backend npx prisma db push
# seed manual: jalankan dari mesin dev terhadap DB, atau tambahkan skrip seed produksi.

# Aplikasi tersedia di http://168.231.118.3:8080  (arahkan domain + pasang
# Nginx/Traefik + SSL Let's Encrypt di depannya untuk HTTPS produksi).
```

Karena seluruh layanan berjalan di Docker, memindah ke VPS/cloud lain cukup menyalin
folder + `.env` lalu `docker compose up -d --build` — tanpa perubahan kode.

## Status verifikasi (build ini)

- Mesin kalkulasi availability: **teruji** (5 unit test, cocok dengan angka template — Dermaga 96.83, Lapangan 98.90, Gudang 97.81, Terminal 100, Cabang 98.39).
- Ekspor: generator Excel & PDF **teruji** menghasilkan file valid (Excel 2007+ dengan rumus availability berjenjang yang benar; PDF form inspeksi 1 halaman). 
- Auth/RBAC & workflow: **teruji** — 9 unit test alur (scoping submit/review + transisi status) + verifikasi login end-to-end (bcrypt hash/verify + terbit & verifikasi JWT). Total 14 unit test lulus.
- Tanda tangan digital: **teruji** — penyimpanan inline memvalidasi/menolak data URL, dan PDF terbukti menyematkan gambar (ukuran PDF bertambah saat tanda tangan disertakan). Implementasi S3 bersifat opsional & belum diuji langsung di lingkungan ini (tanpa S3).
- Import historis: **teruji terhadap file nyata** (`data-output-regional2.xlsx`, sheet "Tanjung Priok") — parser mengenali header/kolom, mengekstrak metadata (regional/pelabuhan/bulan/tahun) + 165 fasilitas & 437 objek, menghitung availability, dan mencatat peringatan untuk objek dengan "Fasilitas Tersedia" kosong (kualitas data sumber). Commit (tulis DB) memakai transaksi; belum dijalankan live (butuh Postgres).
- Notifikasi & reminder: **teruji** — 3 unit test (targeting submit→regional+pusat, review→PIC, reminder deduped per bulan). Modul & seluruh rute ter-registrasi saat boot (ScheduleModule aktif). Pengiriman email nyata belum diuji (default hanya log).
- Audit trail: **teruji** — 10 unit test (helper: penentuan audit, derivasi aksi, redaksi; interceptor: catat sukses+id entitas, lewati GET, tangkap gagal login + sensor password). **Total 27 unit test lulus.** Modul & rute `/api/audit` ter-registrasi saat boot. Catatan: penolakan oleh guard (401/403) terjadi sebelum interceptor sehingga tidak tercatat; kegagalan dari handler (mis. login salah) tercatat.
- Backend: `npm run typecheck` + `npm run build` **lulus**; aplikasi Nest **boot** hingga seluruh modul & route ter-registrasi (berhenti hanya di koneksi DB karena Postgres belum jalan). Build memakai `tsc-alias` agar alias `@/` teratasi saat runtime `node dist/main.js`.
- Frontend: `npm run typecheck` + `npm run build` **lulus** (HeroUI v3 + Tailwind v4 ter-bundle).
- **Dijalankan LIVE via `docker compose up --build`** dan terverifikasi end-to-end: ketiga container jalan (postgres healthy, backend, frontend), `prisma db push` + seed sukses, lalu diuji lewat proxy Nginx: login mengembalikan JWT, endpoint tanpa token → 401, kalkulasi availability cabang = **98.39** (cocok template), ekspor Excel mengunduh file `.xlsx` valid, dan audit trail mencatat login (berhasil & gagal, dengan password ter-redaksi).
- Catatan produksi: tahap awal memakai `prisma db push`. Untuk produksi, hasilkan migrasi (`prisma migrate dev`) lalu ganti CMD backend ke `prisma migrate deploy`. Seed dijalankan manual: `docker compose exec backend npx tsx prisma/seed.ts`.

## Catatan Context7 MCP

PRD mewajibkan pengecekan dokumentasi library terbaru via Context7 MCP sebelum implementasi.
Pada environment build awal ini Context7 belum terpasang, sehingga implementasi mengacu pada
dokumentasi resmi HeroUI v3 (quick-start) dan NestJS. Pasang Context7 MCP untuk verifikasi API
secara live pada pengembangan lanjutan.
