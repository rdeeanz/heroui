// ============================================================================
//  UJI UNIT mesin kalkulasi availability — memastikan hasil COCOK dengan
//  angka nyata pada template Excel Pelindo (sheet "Lap. Cabang").
// ============================================================================
import { describe, it, expect } from "vitest";
import {
  hitungAvailabilityObjek,
  hitungAvailabilityCabang,
  bulatkan,
  type CabangInput,
} from "./availability";

describe("availability objek", () => {
  it("menghitung siapPakai/tersedia*100", () => {
    // 242.5 / 250 * 100 = 97.
    const r = hitungAvailabilityObjek({ nama: "x", fasilitasTersedia: 250, fasilitasSiapPakai: 242.5 });
    expect(r.availability).toBeCloseTo(97, 6);
  });

  it("aman terhadap pembagian nol", () => {
    // Tersedia 0 -> availability 0 (bukan NaN/Infinity).
    const r = hitungAvailabilityObjek({ nama: "x", fasilitasTersedia: 0, fasilitasSiapPakai: 0 });
    expect(r.availability).toBe(0);
  });

  it("menghitung siapPakai dari kerusakan bila tidak diisi", () => {
    // Tersedia 10, rusak berat 1 -> siap pakai 9 -> 90%.
    const r = hitungAvailabilityObjek({ nama: "x", fasilitasTersedia: 10, rusakBerat: 1 });
    expect(r.siapPakai).toBe(9);
    expect(r.availability).toBeCloseTo(90, 6);
  });
});

describe("agregasi berjenjang cocok dengan template Excel", () => {
  // Data ringkas dari sheet "Lap. Cabang" (tersedia, siapPakai per objek).
  const cabang: CabangInput = {
    nama: "Cabang Contoh",
    kategori: [
      {
        kode: "I",
        nama: "DERMAGA",
        fasilitas: [
          { nama: "Dermaga A", objek: [
            { nama: "1", fasilitasTersedia: 3750, fasilitasSiapPakai: 3750 },
            { nama: "2", fasilitasTersedia: 25, fasilitasSiapPakai: 24.5 },
            { nama: "3", fasilitasTersedia: 10, fasilitasSiapPakai: 9 },
            { nama: "4", fasilitasTersedia: 250, fasilitasSiapPakai: 242.5 },
            { nama: "5", fasilitasTersedia: 450, fasilitasSiapPakai: 450 },
          ] },
          { nama: "Jetty B", objek: [
            { nama: "1", fasilitasTersedia: 1000, fasilitasSiapPakai: 1000 },
            { nama: "2", fasilitasTersedia: 10, fasilitasSiapPakai: 9 },
            { nama: "3", fasilitasTersedia: 5, fasilitasSiapPakai: 4.5 },
            { nama: "4", fasilitasTersedia: 100, fasilitasSiapPakai: 100 },
            { nama: "5", fasilitasTersedia: 2, fasilitasSiapPakai: 2 },
            { nama: "6", fasilitasTersedia: 2, fasilitasSiapPakai: 2 },
          ] },
        ],
      },
      {
        kode: "II",
        nama: "LAPANGAN PENUMPUKAN",
        fasilitas: [
          { nama: "LP A", objek: [
            { nama: "1", fasilitasTersedia: 20000, fasilitasSiapPakai: 19900 },
            { nama: "2", fasilitasTersedia: 175, fasilitasSiapPakai: 175 },
            { nama: "3", fasilitasTersedia: 600, fasilitasSiapPakai: 550 },
            { nama: "4", fasilitasTersedia: 24, fasilitasSiapPakai: 24 },
          ] },
          { nama: "LP B", objek: [{ nama: "1", fasilitasTersedia: 40000, fasilitasSiapPakai: 40000 }] },
        ],
      },
      {
        kode: "III",
        nama: "GUDANG",
        fasilitas: [
          { nama: "G A", objek: [
            { nama: "1", fasilitasTersedia: 4000, fasilitasSiapPakai: 4000 },
            { nama: "2", fasilitasTersedia: 4000, fasilitasSiapPakai: 4000 },
            { nama: "3", fasilitasTersedia: 1760, fasilitasSiapPakai: 1760 },
            { nama: "4", fasilitasTersedia: 4, fasilitasSiapPakai: 4 },
          ] },
          { nama: "G B", objek: [
            { nama: "1", fasilitasTersedia: 2000, fasilitasSiapPakai: 1900 },
            { nama: "2", fasilitasTersedia: 2000, fasilitasSiapPakai: 2000 },
            { nama: "3", fasilitasTersedia: 960, fasilitasSiapPakai: 960 },
            { nama: "4", fasilitasTersedia: 4, fasilitasSiapPakai: 3.5 },
          ] },
        ],
      },
      {
        kode: "IV",
        nama: "TERMINAL PENUMPANG",
        fasilitas: [
          { nama: "T A", objek: [
            { nama: "1", fasilitasTersedia: 2000, fasilitasSiapPakai: 2000 },
            { nama: "2", fasilitasTersedia: 2000, fasilitasSiapPakai: 2000 },
            { nama: "3", fasilitasTersedia: 10, fasilitasSiapPakai: 10 },
            { nama: "4", fasilitasTersedia: 20, fasilitasSiapPakai: 20 },
            { nama: "5", fasilitasTersedia: 960, fasilitasSiapPakai: 960 },
            { nama: "6", fasilitasTersedia: 2000, fasilitasSiapPakai: 2000 },
          ] },
        ],
      },
    ],
  };

  const hasil = hitungAvailabilityCabang(cabang);

  it("availability kategori sesuai template", () => {
    // Petakan kategori ke nilai availability yang dibulatkan 2 desimal.
    const byName = Object.fromEntries(hasil.kategori.map((k) => [k.nama, bulatkan(k.availability)]));
    expect(byName["DERMAGA"]).toBe(96.83);
    expect(byName["LAPANGAN PENUMPUKAN"]).toBe(98.9);
    expect(byName["GUDANG"]).toBe(97.81);
    expect(byName["TERMINAL PENUMPANG"]).toBe(100);
  });

  it("availability cabang (grand total) = 98.39", () => {
    expect(bulatkan(hasil.availability)).toBe(98.39);
  });
});
