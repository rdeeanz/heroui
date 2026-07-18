// ============================================================================
//  FORM BUAT INSPEKSI — mengisi informasi umum, daftar item inspeksi, dan
//  DUA tanda tangan digital (Cabang & Mitra) melalui SignaturePad.
//  Mengikuti struktur form "Inspeksi Dermaga" pada template.
// ============================================================================
import { useState } from "react";
import { Button, TextField, Label, Input, Card } from "@heroui/react";
import { api } from "@/api/client";
import type { BuatInspeksiPayload, KondisiInspeksi } from "@/api/types";
import { SelectField } from "@/components/SelectField";
import { SignaturePad } from "@/components/SignaturePad";

// Opsi kondisi item inspeksi (nilai backend + label tampilan).
const OPSI_KONDISI: { key: KondisiInspeksi; label: string }[] = [
  { key: "BAIK", label: "1. Baik" },
  { key: "TIDAK_BERUBAH", label: "2. Tidak ada perubahan" },
  { key: "KERUSAKAN_TAMBAHAN", label: "3. Ada kerusakan tambahan" },
  { key: "SUDAH_DIPERBAIKI", label: "4. Kerusakan sudah diperbaiki" },
];

// Bentuk satu baris item pada form (kondisi bisa null sebelum dipilih).
interface BarisItem {
  namaItem: string;
  kondisi: KondisiInspeksi | null;
  keterangan: string;
}

// Item default mengikuti contoh form Dermaga.
const ITEM_DEFAULT: BarisItem[] = [
  { namaItem: "Pelat Lantai", kondisi: "BAIK", keterangan: "" },
  { namaItem: "Bollard", kondisi: "BAIK", keterangan: "" },
  { namaItem: "Fender", kondisi: "BAIK", keterangan: "" },
  { namaItem: "Manhole", kondisi: "BAIK", keterangan: "" },
];

// Properti komponen: callback sukses & batal.
interface Props {
  onSuccess: () => void; // Dipanggil setelah berhasil menyimpan.
  onCancel: () => void; // Dipanggil saat membatalkan.
}

// Komponen form inspeksi.
export function InspeksiForm({ onSuccess, onCancel }: Props) {
  // --- State informasi umum ---
  const [regionalNama, setRegionalNama] = useState("");
  const [namaPelabuhan, setNamaPelabuhan] = useState("");
  const [namaFasilitas, setNamaFasilitas] = useState("");
  const [lokasiArea, setLokasiArea] = useState("");
  // Tanggal default = hari ini (format YYYY-MM-DD untuk input date).
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));

  // --- State item inspeksi ---
  const [items, setItems] = useState<BarisItem[]>(ITEM_DEFAULT);

  // --- State tanda tangan (data URL) & identitas penandatangan ---
  const [ttdCabangNama, setTtdCabangNama] = useState("");
  const [ttdCabangNipp, setTtdCabangNipp] = useState("");
  const [ttdCabangImage, setTtdCabangImage] = useState<string | null>(null);
  const [ttdMitraNama, setTtdMitraNama] = useState("");
  const [ttdMitraNipp, setTtdMitraNipp] = useState("");
  const [ttdMitraImage, setTtdMitraImage] = useState<string | null>(null);

  // --- State proses ---
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Perbarui satu field pada item ke-i.
  function ubahItem(i: number, patch: Partial<BarisItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  // Tambah baris item kosong.
  function tambahItem() {
    setItems((prev) => [...prev, { namaItem: "", kondisi: "BAIK", keterangan: "" }]);
  }

  // Hapus baris item ke-i.
  function hapusItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Kirim form ke backend.
  async function simpan() {
    setError(null);

    // Validasi minimal wajib.
    if (!namaPelabuhan.trim() || !namaFasilitas.trim() || !tanggal) {
      setError("Nama pelabuhan, fasilitas, dan tanggal wajib diisi.");
      return;
    }
    // Pastikan semua item punya nama & kondisi.
    const itemValid = items.filter((it) => it.namaItem.trim() && it.kondisi);
    if (itemValid.length === 0) {
      setError("Minimal satu item inspeksi harus diisi.");
      return;
    }

    // Susun payload sesuai kontrak backend.
    const payload: BuatInspeksiPayload = {
      regionalNama: regionalNama.trim(),
      namaPelabuhan: namaPelabuhan.trim(),
      namaFasilitas: namaFasilitas.trim(),
      lokasiArea: lokasiArea.trim() || undefined,
      tanggalInspeksi: new Date(tanggal).toISOString(), // ISO untuk backend.
      ttdCabangNama: ttdCabangNama.trim() || undefined,
      ttdCabangNipp: ttdCabangNipp.trim() || undefined,
      ttdCabangImage: ttdCabangImage, // Data URL PNG (atau null).
      ttdMitraNama: ttdMitraNama.trim() || undefined,
      ttdMitraNipp: ttdMitraNipp.trim() || undefined,
      ttdMitraImage: ttdMitraImage,
      // Petakan item valid ke bentuk payload (beri nomor urut).
      items: itemValid.map((it, idx) => ({
        urutan: idx + 1,
        namaItem: it.namaItem.trim(),
        kondisi: it.kondisi as KondisiInspeksi,
        keterangan: it.keterangan.trim() || undefined,
      })),
    };

    // Kirim ke backend.
    setLoading(true);
    try {
      await api.createInspeksi(payload);
      onSuccess(); // Sukses: beritahu induk (refresh + tutup form).
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-5 p-4">
      {/* Judul form. */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Form Inspeksi Fasilitas</h3>
        <Button size="sm" variant="tertiary" onPress={onCancel}>
          Batal
        </Button>
      </div>

      {/* --- A. Informasi Umum --- */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-default-600">A. INFORMASI UMUM</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField fullWidth value={regionalNama} onChange={setRegionalNama}>
            <Label>Regional</Label>
            <Input placeholder="Regional 3" />
          </TextField>
          <TextField fullWidth value={namaPelabuhan} onChange={setNamaPelabuhan} isRequired>
            <Label>Nama Pelabuhan</Label>
            <Input placeholder="Cabang Benoa" />
          </TextField>
          <TextField fullWidth value={namaFasilitas} onChange={setNamaFasilitas} isRequired>
            <Label>Fasilitas</Label>
            <Input placeholder="Dermaga A" />
          </TextField>
          <TextField fullWidth value={lokasiArea} onChange={setLokasiArea}>
            <Label>Lokasi/Area</Label>
            <Input placeholder="Sisi Utara" />
          </TextField>
          {/* Tanggal inspeksi memakai input date native (responsif & sederhana). */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-default-700">Tanggal Inspeksi</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="rounded-lg border border-default-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* --- B. Hasil Inspeksi (item) --- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-default-600">B. HASIL INSPEKSI</p>
          <Button size="sm" variant="secondary" onPress={tambahItem}>
            + Tambah Item
          </Button>
        </div>

        {/* Daftar baris item. */}
        <div className="space-y-2">
          {items.map((it, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-lg border border-default-200 p-2 sm:flex-row sm:items-end"
            >
              {/* Nama item. */}
              <TextField
                fullWidth
                value={it.namaItem}
                onChange={(v) => ubahItem(i, { namaItem: v })}
                className="sm:flex-1"
              >
                <Label>Item</Label>
                <Input placeholder="Nama objek/komponen" />
              </TextField>
              {/* Kondisi (select). */}
              <SelectField
                label="Kondisi"
                opsi={OPSI_KONDISI}
                nilai={it.kondisi}
                onChange={(v) => ubahItem(i, { kondisi: v as KondisiInspeksi })}
              />
              {/* Keterangan. */}
              <TextField
                fullWidth
                value={it.keterangan}
                onChange={(v) => ubahItem(i, { keterangan: v })}
                className="sm:flex-1"
              >
                <Label>Keterangan</Label>
                <Input placeholder="Opsional" />
              </TextField>
              {/* Hapus baris. */}
              <Button size="sm" variant="tertiary" onPress={() => hapusItem(i)}>
                Hapus
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* --- C. Tanda Tangan Digital --- */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-default-600">C. TANDA TANGAN DIGITAL</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Kolom Cabang. */}
          <div className="space-y-2">
            <TextField fullWidth value={ttdCabangNama} onChange={setTtdCabangNama}>
              <Label>Nama Penandatangan (Cabang)</Label>
              <Input placeholder="Nama pejabat cabang" />
            </TextField>
            <TextField fullWidth value={ttdCabangNipp} onChange={setTtdCabangNipp}>
              <Label>NIPP (Cabang)</Label>
              <Input placeholder="NIPP" />
            </TextField>
            <SignaturePad label="Tanda Tangan Cabang" onChange={setTtdCabangImage} />
          </div>
          {/* Kolom Mitra. */}
          <div className="space-y-2">
            <TextField fullWidth value={ttdMitraNama} onChange={setTtdMitraNama}>
              <Label>Nama Penandatangan (Mitra/Anak Usaha/Anpers)</Label>
              <Input placeholder="Nama pihak mitra" />
            </TextField>
            <TextField fullWidth value={ttdMitraNipp} onChange={setTtdMitraNipp}>
              <Label>NIPP (Mitra)</Label>
              <Input placeholder="NIPP" />
            </TextField>
            <SignaturePad label="Tanda Tangan Mitra" onChange={setTtdMitraImage} />
          </div>
        </div>
      </section>

      {/* Pesan error. */}
      {error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {/* Aksi simpan/batal. */}
      <div className="flex justify-end gap-2">
        <Button variant="tertiary" onPress={onCancel}>
          Batal
        </Button>
        <Button variant="primary" isPending={loading} onPress={simpan}>
          {loading ? "Menyimpan…" : "Simpan Inspeksi"}
        </Button>
      </div>
    </Card>
  );
}
