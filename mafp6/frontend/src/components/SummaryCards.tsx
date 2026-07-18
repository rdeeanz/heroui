// ============================================================================
//  KARTU RINGKASAN — menampilkan availability cabang total + per kategori
//  dalam bentuk kartu, memakai komponen Card dari HeroUI v3.
// ============================================================================
import { Card } from "@heroui/react";
import type { CabangResult } from "@/api/types";
import { formatPersen, KELAS_STATUS, tingkatAvailability } from "@/lib/format";

// Properti komponen.
interface Props {
  data: CabangResult;
}

// Komponen kartu ringkasan.
export function SummaryCards({ data }: Props) {
  return (
    // Grid responsif: 1 kolom di mobile, 2 di tablet, hingga 5 di desktop.
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {/* Kartu total cabang (disorot). */}
      <Card variant="secondary" className="p-4">
        <p className="text-xs text-default-500">Availability Cabang</p>
        <p className={`mt-1 text-2xl font-bold ${KELAS_STATUS[tingkatAvailability(data.availability)].teks}`}>
          {formatPersen(data.availability)}
        </p>
      </Card>

      {/* Satu kartu untuk tiap kategori. */}
      {data.kategori.map((kategori) => (
        <Card key={kategori.kode} className="p-4">
          <p className="truncate text-xs text-default-500" title={kategori.nama}>
            {kategori.nama}
          </p>
          <p className={`mt-1 text-2xl font-bold ${KELAS_STATUS[tingkatAvailability(kategori.availability)].teks}`}>
            {formatPersen(kategori.availability)}
          </p>
        </Card>
      ))}
    </div>
  );
}
