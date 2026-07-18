// ============================================================================
//  INTERCEPTOR AUDIT (global): mencatat setiap request yang mengubah data
//  (POST/PUT/PATCH/DELETE) beserta pelaku, aksi, entitas, IP, dan body yang
//  SUDAH DIREDAKSI. Mencatat baik saat berhasil maupun gagal (mis. gagal login).
//
//  Catatan batas: penolakan oleh GUARD (401/403) terjadi SEBELUM interceptor,
//  sehingga tidak tertangkap di sini. Kegagalan dari handler (mis. login salah,
//  validasi, konflik) tertangkap.
// ============================================================================
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { AuditService } from "../application/audit.service";
import { harusDiaudit, turunkanAksi, redaksiBody } from "./audit.helpers";
import type { AuthUser } from "@/shared/auth/auth-user.type";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Hanya berlaku untuk konteks HTTP.
    if (context.getType() !== "http") return next.handle();

    // Ambil request & response Express.
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    // Lewati request yang tidak perlu diaudit (mis. GET, tandai-baca).
    if (!harusDiaudit(req.method, req.path)) return next.handle();

    // Kumpulkan konteks dasar sekali.
    const metode: string = req.method;
    const path: string = req.path;
    const { aksi, entitas, entitasId } = turunkanAksi(metode, path);
    const user: AuthUser | undefined = req.user;
    const ip: string | null =
      (req.headers?.["x-forwarded-for"] as string) || req.ip || null;
    const userAgent: string | null = (req.headers?.["user-agent"] as string) ?? null;
    const detail = redaksiBody(req.body);

    // Fungsi pembuat entri audit (dipakai untuk sukses & gagal).
    const buatEntri = (berhasil: boolean, status: number | null, entitasIdFinal: string | null) => ({
      userId: user?.sub ?? null,
      userEmail: user?.email ?? null,
      userRole: user?.role ?? null,
      aksi,
      metode,
      path,
      entitas,
      entitasId: entitasIdFinal,
      status,
      berhasil,
      ip,
      userAgent,
      detail,
    });

    // Jalankan handler, lalu catat hasilnya (tanpa memblokir respons).
    return next.handle().pipe(
      tap({
        // Sukses: catat status + coba ambil id entitas dari respons.
        next: (data: any) => {
          // Untuk aksi pembuatan, ambil id entitas dari respons bila ada.
          const idFinal = entitasId ?? (typeof data?.id === "string" ? data.id : null);
          void this.audit.record(buatEntri(true, res.statusCode ?? 200, idFinal));
        },
        // Gagal: catat kode status error (mis. 401 gagal login, 409 konflik).
        error: (err: any) => {
          const status = typeof err?.status === "number" ? err.status : 500;
          void this.audit.record(buatEntri(false, status, entitasId));
        },
      }),
    );
  }
}
