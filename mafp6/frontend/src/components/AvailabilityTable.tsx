// ============================================================================
//  TABEL AVAILABILITY ALA EXCEL
//  Menampilkan data berjenjang: Kategori -> Fasilitas -> Objek, dengan
//  sub-total per kategori dan grand total cabang, sticky header, dan
//  scroll horizontal di layar kecil (responsif). Layout mengikuti sheet
//  "Lap. Cabang" pada template Excel Pelindo (kolom inti kalkulasi).
// ============================================================================
import type { CabangResult, KategoriResult, FasilitasResult } from "@/api/types";
import { formatAngka, formatPersen, KELAS_STATUS, tingkatAvailability } from "@/lib/format";

// Properti komponen: hasil kalkulasi satu cabang.
interface Props {
  data: CabangResult;
}

// Jumlah total kolom tabel (dipakai untuk colSpan baris grup).
const KOLOM = [
  "No", // 1
  "Objek Fasilitas", // 2
  "Tersedia", // 3
  "R. Ringan", // 4
  "R. Sedang", // 5
  "R. Berat", // 6
  "Siap Pakai", // 7
  "Avail. Objek", // 8
  "Keterangan", // 9
];

// Komponen kecil: badge persentase berwarna sesuai tingkat availability.
function BadgeAvail({ nilai }: { nilai: number }) {
  // Tentukan kelas warna dari nilai (baik/sedang/buruk).
  const kelas = KELAS_STATUS[tingkatAvailability(nilai)].badge;
  // Render badge dengan angka persen.
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${kelas}`}>
      {formatPersen(nilai)}
    </span>
  );
}

// Komponen utama tabel.
export function AvailabilityTable({ data }: Props) {
  return (
    // Bungkus dengan overflow-x-auto agar bisa digeser horizontal di layar kecil.
    <div className="w-full overflow-x-auto rounded-xl border border-default-200">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        {/* Kepala tabel yang menempel (sticky) saat scroll vertikal. */}
        <thead className="sticky top-0 z-10 bg-default-100">
          <tr>
            {/* Render tiap judul kolom. */}
            {KOLOM.map((judul, i) => (
              <th
                key={judul}
                className={`border-b border-default-200 px-3 py-2 font-semibold whitespace-nowrap text-default-700 ${
                  i <= 1 ? "text-left" : "text-right"
                }`}
              >
                {judul}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Iterasi tiap kategori (Dermaga, Lapangan, dst.). */}
          {data.kategori.map((kategori) => (
            <KategoriRows key={kategori.kode} kategori={kategori} />
          ))}

          {/* Baris GRAND TOTAL availability cabang. */}
          <tr className="bg-primary-50 font-bold">
            {/* Label membentang kolom 1..7. */}
            <td className="px-3 py-2" colSpan={7}>
              AVAILABILITY CABANG {data.nama.toUpperCase()}
            </td>
            {/* Kolom 8: badge availability. */}
            <td className="px-3 py-2 text-right">
              <BadgeAvail nilai={data.availability} />
            </td>
            {/* Kolom 9: keterangan (kosong). */}
            <td className="px-3 py-2" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Sub-komponen: seluruh baris untuk satu kategori.
function KategoriRows({ kategori }: { kategori: KategoriResult }) {
  return (
    <>
      {/* Baris judul kategori (mis. "I. DERMAGA") + availability kategori. */}
      <tr className="bg-default-200/60 font-semibold">
        <td className="px-3 py-2" colSpan={7}>
          {kategori.kode}. {kategori.nama}
        </td>
        <td className="px-3 py-2 text-right">
          <BadgeAvail nilai={kategori.availability} />
        </td>
        <td className="px-3 py-2" />
      </tr>

      {/* Iterasi tiap fasilitas dalam kategori. */}
      {kategori.fasilitas.map((fasilitas, fi) => (
        <FasilitasRows key={fasilitas.nama + fi} fasilitas={fasilitas} nomor={fi + 1} />
      ))}
    </>
  );
}

// Sub-komponen: baris untuk satu fasilitas (header fasilitas + objek).
function FasilitasRows({ fasilitas, nomor }: { fasilitas: FasilitasResult; nomor: number }) {
  return (
    <>
      {/* Baris nama fasilitas (mis. "1  Dermaga A") + operator + availability fasilitas. */}
      <tr className="bg-default-100">
        <td className="px-3 py-2 text-center font-medium">{nomor}</td>
        <td className="px-3 py-2 font-medium" colSpan={6}>
          {fasilitas.nama}
          {/* Tampilkan operator bila ada. */}
          {fasilitas.operator ? (
            <span className="ml-2 text-xs text-default-500">({fasilitas.operator})</span>
          ) : null}
        </td>
        <td className="px-3 py-2 text-right">
          <BadgeAvail nilai={fasilitas.availability} />
        </td>
        <td className="px-3 py-2" />
      </tr>

      {/* Baris detail tiap objek fasilitas. */}
      {fasilitas.objek.map((objek, oi) => {
        // Kelas warna teks availability objek.
        const kelasTeks = KELAS_STATUS[tingkatAvailability(objek.availability)].teks;
        return (
          <tr key={objek.nama + oi} className="border-b border-default-100 hover:bg-default-50">
            <td className="px-3 py-2 text-center text-default-400">{oi + 1}</td>
            <td className="px-3 py-2 pl-6">{objek.nama}</td>
            <td className="px-3 py-2 text-right">{formatAngka(objek.fasilitasTersedia)}</td>
            <td className="px-3 py-2 text-right">{formatAngka(objek.rusakRingan ?? 0)}</td>
            <td className="px-3 py-2 text-right">{formatAngka(objek.rusakSedang ?? 0)}</td>
            <td className="px-3 py-2 text-right">{formatAngka(objek.rusakBerat ?? 0)}</td>
            <td className="px-3 py-2 text-right">{formatAngka(objek.siapPakai)}</td>
            <td className={`px-3 py-2 text-right font-semibold ${kelasTeks}`}>
              {formatPersen(objek.availability)}
            </td>
            <td className="px-3 py-2 text-default-500" />
          </tr>
        );
      })}
    </>
  );
}
