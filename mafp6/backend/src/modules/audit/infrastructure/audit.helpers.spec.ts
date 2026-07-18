// ============================================================================
//  UJI UNIT fungsi bantu audit: penentuan audit, derivasi aksi, & redaksi.
// ============================================================================
import { describe, it, expect } from "vitest";
import { harusDiaudit, turunkanAksi, redaksiBody } from "./audit.helpers";

describe("harusDiaudit", () => {
  it("mengaudit metode pengubah data (POST) namun tidak GET", () => {
    expect(harusDiaudit("POST", "/api/laporan/periode/1/submit")).toBe(true);
    expect(harusDiaudit("GET", "/api/laporan/periode")).toBe(false);
  });
  it("melewati endpoint tandai-baca notifikasi (bising)", () => {
    expect(harusDiaudit("POST", "/api/notifikasi/read-all")).toBe(false);
    expect(harusDiaudit("POST", "/api/notifikasi/abc/read")).toBe(false);
    // Reminder run tetap diaudit.
    expect(harusDiaudit("POST", "/api/notifikasi/reminders/run")).toBe(true);
  });
});

describe("turunkanAksi", () => {
  it("mengenali aksi domain + entitasId dari path", () => {
    expect(turunkanAksi("POST", "/api/auth/login")).toEqual({ aksi: "LOGIN", entitas: "auth", entitasId: null });
    expect(turunkanAksi("POST", "/api/laporan/periode/p123/submit")).toEqual({
      aksi: "LAPORAN_SUBMIT",
      entitas: "periode",
      entitasId: "p123",
    });
    expect(turunkanAksi("POST", "/api/laporan/periode/p9/review").aksi).toBe("LAPORAN_REVIEW");
    expect(turunkanAksi("POST", "/api/inspeksi").aksi).toBe("INSPEKSI_CREATE");
    expect(turunkanAksi("POST", "/api/import/commit").aksi).toBe("IMPORT_COMMIT");
  });
  it("memberi aksi generik untuk path tak dikenal", () => {
    expect(turunkanAksi("DELETE", "/api/lainnya/1").aksi).toBe("DELETE /lainnya/1");
  });
});

describe("redaksiBody", () => {
  it("menyensor field sensitif (password, tanda tangan)", () => {
    const out = redaksiBody({ email: "a@x.id", password: "rahasia", ttdCabangImage: "data:image/png;base64,AAAA" }) as any;
    expect(out.email).toBe("a@x.id");
    expect(out.password).toBe("[disensor]");
    expect(out.ttdCabangImage).toBe("[disensor]");
  });
  it("meringkas string sangat panjang", () => {
    const out = redaksiBody({ catatan: "x".repeat(500) }) as any;
    expect(out.catatan).toMatch(/^\[teks 500 karakter\]$/);
  });
  it("mengembalikan null untuk body non-objek", () => {
    expect(redaksiBody(undefined)).toBeNull();
    expect(redaksiBody("teks")).toBeNull();
  });
});
