// ============================================================================
//  GRAFIK TREN AVAILABILITY — memakai Recharts (library chart ringan).
//  Menampilkan tren availability cabang & tiap kategori sepanjang periode.
// ============================================================================
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Satu titik data tren: label periode + nilai availability per seri.
export interface TitikTren {
  periode: string; // Label sumbu X, mis. "Feb 2024".
  cabang: number; // Availability cabang.
  [kategori: string]: number | string; // Availability per kategori (dinamis).
}

// Properti komponen.
interface Props {
  data: TitikTren[]; // Deret data tren.
  seriKategori: string[]; // Nama-nama kategori sebagai seri garis.
}

// Palet warna tetap (dipetakan berdasarkan indeks seri, bukan kelas dinamis).
const WARNA = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

// Komponen grafik tren.
export function TrendChart({ data, seriKategori }: Props) {
  return (
    // Kontainer responsif: grafik menyesuaikan lebar induk (mobile/tablet/desktop).
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
        {/* Garis kisi latar. */}
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        {/* Sumbu X = periode. */}
        <XAxis dataKey="periode" fontSize={12} />
        {/* Sumbu Y = persen 0..100. */}
        <YAxis domain={[0, 100]} fontSize={12} tickFormatter={(v) => `${v}%`} />
        {/* Tooltip menampilkan nilai saat hover. */}
        <Tooltip formatter={(v: number) => `${Number(v).toFixed(2)}%`} />
        {/* Keterangan seri. */}
        <Legend />
        {/* Garis tebal untuk availability cabang (total). */}
        <Line
          type="monotone"
          dataKey="cabang"
          name="Cabang (Total)"
          stroke={WARNA[0]}
          strokeWidth={3}
          dot={{ r: 3 }}
        />
        {/* Satu garis untuk tiap kategori. */}
        {seriKategori.map((nama, i) => (
          <Line
            key={nama}
            type="monotone"
            dataKey={nama}
            name={nama}
            // Warna dipilih dari palet berdasarkan indeks (offset 1 agar beda dari cabang).
            stroke={WARNA[(i + 1) % WARNA.length]}
            strokeWidth={1.5}
            dot={{ r: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
