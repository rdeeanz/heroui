// ============================================================================
//  SIGNATURE PAD — kanvas gambar tanda tangan.
//  Mendukung mouse & sentuhan (pointer events) agar bisa dipakai di
//  Desktop/Tablet/Smartphone. Mengekspor hasil sebagai data URL PNG.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { Button, Label } from "@heroui/react";

// Properti komponen.
interface Props {
  label: string; // Judul pad (mis. "Tanda Tangan Cabang").
  onChange: (dataUrl: string | null) => void; // Callback saat gambar berubah.
}

// Komponen SignaturePad.
export function SignaturePad({ label, onChange }: Props) {
  // Referensi elemen kanvas.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Status sedang menggambar (pointer ditekan).
  const menggambar = useRef(false);
  // Apakah kanvas sudah ada coretan (untuk menandai kosong/terisi).
  const [adaIsi, setAdaIsi] = useState(false);

  // Siapkan kanvas saat mount: sesuaikan resolusi ke lebar elemen (tajam di HiDPI).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Rasio piksel perangkat (mis. 2 pada layar retina) untuk garis tajam.
    const dpr = window.devicePixelRatio || 1;
    // Ukuran tampilan (CSS) kanvas.
    const lebarCss = canvas.clientWidth;
    const tinggiCss = canvas.clientHeight;
    // Set resolusi internal = ukuran CSS x dpr.
    canvas.width = lebarCss * dpr;
    canvas.height = tinggiCss * dpr;
    // Ambil konteks & skalakan agar koordinat memakai satuan CSS.
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2; // Ketebalan garis.
      ctx.lineCap = "round"; // Ujung garis membulat.
      ctx.lineJoin = "round"; // Sambungan garis membulat.
      ctx.strokeStyle = "#0f172a"; // Warna tinta (biru gelap).
    }
  }, []);

  // Ubah posisi pointer menjadi koordinat relatif kanvas.
  function posisi(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // Mulai menggambar saat pointer ditekan.
  function mulai(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault(); // Cegah scroll saat menggambar di layar sentuh.
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    menggambar.current = true;
    const { x, y } = posisi(e);
    // Mulai jalur baru dari titik tekan.
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Tangkap pointer agar gerakan di luar kanvas tetap terlacak.
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  // Menggambar garis mengikuti gerakan pointer.
  function gerak(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!menggambar.current) return; // Abaikan bila tidak sedang menekan.
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = posisi(e);
    // Tarik garis ke titik baru.
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // Selesai menggambar saat pointer dilepas.
  function selesai() {
    if (!menggambar.current) return;
    menggambar.current = false;
    setAdaIsi(true); // Tandai kanvas terisi.
    // Kirim hasil sebagai data URL PNG ke pemanggil.
    const url = canvasRef.current?.toDataURL("image/png") ?? null;
    onChange(url);
  }

  // Bersihkan kanvas & reset status.
  function bersih() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      // Hapus seluruh isi kanvas.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setAdaIsi(false);
    onChange(null); // Beritahu pemanggil bahwa kosong.
  }

  return (
    <div className="space-y-1">
      {/* Label + tombol bersih. */}
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button size="sm" variant="tertiary" onPress={bersih}>
          Bersihkan
        </Button>
      </div>
      {/* Area kanvas. touch-none mencegah gestur browser mengganggu gambar. */}
      <canvas
        ref={canvasRef}
        className="h-32 w-full touch-none rounded-lg border border-default-300 bg-white"
        onPointerDown={mulai}
        onPointerMove={gerak}
        onPointerUp={selesai}
        onPointerLeave={selesai}
      />
      {/* Petunjuk status. */}
      <p className="text-[11px] text-default-400">
        {adaIsi ? "Tanda tangan terekam." : "Gambar tanda tangan pada kotak di atas."}
      </p>
    </div>
  );
}
