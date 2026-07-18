// ============================================================================
//  CONTROLLER HTTP untuk laporan availability.
//  Hanya bertugas menerima request, memanggil use-case, mengembalikan hasil.
//  Tidak ada logika bisnis di sini (Clean Architecture: presentation tipis).
// ============================================================================
import { Controller, Get, Param, Query, ParseIntPipe } from "@nestjs/common";
import { GetLaporanCabangUseCase } from "../application/get-laporan-cabang.usecase";
import { GetRekapRegionalUseCase } from "../application/get-rekap-regional.usecase";

// Semua endpoint diawali prefix /availability.
@Controller("availability")
export class AvailabilityController {
  // Suntikkan use-case yang dibutuhkan.
  constructor(
    private readonly getLaporanCabang: GetLaporanCabangUseCase,
    private readonly getRekapRegional: GetRekapRegionalUseCase,
  ) {}

  // GET /availability/cabang/:cabangId?tahun=2024&bulan=2
  // Mengembalikan pohon availability satu cabang untuk periode tertentu.
  @Get("cabang/:cabangId")
  async laporanCabang(
    @Param("cabangId") cabangId: string, // ID cabang dari URL.
    @Query("tahun", ParseIntPipe) tahun: number, // Tahun dari query string.
    @Query("bulan", ParseIntPipe) bulan: number, // Bulan dari query string.
  ) {
    // Delegasikan ke use-case dan kembalikan hasilnya apa adanya.
    return this.getLaporanCabang.execute(cabangId, tahun, bulan);
  }

  // GET /availability/regional/:regionalKode?tahun=2024&bulan=2
  // Mengembalikan rekap availability seluruh cabang dalam regional.
  @Get("regional/:regionalKode")
  async rekapRegional(
    @Param("regionalKode") regionalKode: string, // Kode regional dari URL.
    @Query("tahun", ParseIntPipe) tahun: number,
    @Query("bulan", ParseIntPipe) bulan: number,
  ) {
    // Delegasikan ke use-case rekap regional.
    return this.getRekapRegional.execute(regionalKode, tahun, bulan);
  }
}
