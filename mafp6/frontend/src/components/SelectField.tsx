// ============================================================================
//  SELECT FIELD — pembungkus komponen Select HeroUI v3 (compound component)
//  agar mudah dipakai ulang untuk filter Regional/Cabang/Periode.
// ============================================================================
import { Select, Label, ListBox } from "@heroui/react";
import type { Key } from "react";

// Bentuk satu opsi pilihan.
export interface Opsi {
  key: string; // Nilai unik opsi.
  label: string; // Teks yang ditampilkan.
}

// Properti komponen.
interface Props {
  label: string; // Label field.
  opsi: Opsi[]; // Daftar opsi.
  nilai: string | null; // Key yang terpilih saat ini.
  onChange: (key: string) => void; // Callback saat pilihan berubah.
  disabled?: boolean; // Nonaktifkan bila belum ada data.
}

// Komponen SelectField.
export function SelectField({ label, opsi, nilai, onChange, disabled }: Props) {
  return (
    <Select
      className="w-full sm:w-56" // Lebar penuh di mobile, tetap di layar besar.
      isDisabled={disabled} // Nonaktifkan sesuai prop.
      selectedKey={nilai} // Key terpilih (controlled).
      // Saat pilihan berubah, teruskan key sebagai string ke pemanggil.
      onSelectionChange={(key: Key | null) => {
        if (key !== null) onChange(String(key));
      }}
      placeholder={`Pilih ${label}`}
    >
      {/* Label field. */}
      <Label>{label}</Label>
      {/* Tombol pemicu dropdown menampilkan nilai terpilih. */}
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      {/* Popover berisi daftar opsi. */}
      <Select.Popover>
        <ListBox>
          {/* Render tiap opsi sebagai item list box. */}
          {opsi.map((o) => (
            <ListBox.Item key={o.key} id={o.key} textValue={o.label}>
              {o.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
