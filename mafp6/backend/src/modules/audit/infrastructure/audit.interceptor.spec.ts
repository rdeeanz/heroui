// ============================================================================
//  UJI UNIT AuditInterceptor: mencatat sukses/gagal & melewati GET.
// ============================================================================
import { describe, it, expect, beforeEach } from "vitest";
import { of, throwError, lastValueFrom } from "rxjs";
import { AuditInterceptor } from "./audit.interceptor";
import type { AuditService } from "../application/audit.service";
import type { AuditEntry } from "../application/ports/audit.repository";

// AuditService palsu yang merekam entri.
class FakeAudit {
  entri: AuditEntry[] = [];
  async record(e: AuditEntry): Promise<void> {
    this.entri.push(e);
  }
}

// Bangun ExecutionContext palsu untuk konteks HTTP.
function contextPalsu(req: any, res: any) {
  return {
    getType: () => "http",
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as any;
}

describe("AuditInterceptor", () => {
  let audit: FakeAudit;
  let interceptor: AuditInterceptor;
  beforeEach(() => {
    audit = new FakeAudit();
    interceptor = new AuditInterceptor(audit as unknown as AuditService);
  });

  it("mencatat POST sukses dengan aksi & id entitas dari respons", async () => {
    const req = {
      method: "POST",
      path: "/api/inspeksi",
      headers: { "user-agent": "jest" },
      ip: "1.2.3.4",
      body: { namaFasilitas: "Dermaga A" },
      user: { sub: "u1", email: "pic@x.id", role: "PIC_CABANG" },
    };
    const res = { statusCode: 201 };
    // Handler mengembalikan objek dengan id.
    const handler = { handle: () => of({ id: "insp-123" }) };

    await lastValueFrom(interceptor.intercept(contextPalsu(req, res), handler as any));

    expect(audit.entri.length).toBe(1);
    const e = audit.entri[0];
    expect(e.aksi).toBe("INSPEKSI_CREATE");
    expect(e.berhasil).toBe(true);
    expect(e.status).toBe(201);
    expect(e.entitasId).toBe("insp-123"); // Diambil dari respons.
    expect(e.userEmail).toBe("pic@x.id");
  });

  it("melewati request GET (tidak dicatat)", async () => {
    const req = { method: "GET", path: "/api/laporan/periode", headers: {}, body: {} };
    const handler = { handle: () => of([]) };
    await lastValueFrom(interceptor.intercept(contextPalsu(req, {}), handler as any));
    expect(audit.entri.length).toBe(0);
  });

  it("mencatat kegagalan (mis. gagal login) dengan status error", async () => {
    const req = { method: "POST", path: "/api/auth/login", headers: {}, body: { email: "x@y.id", password: "salah" } };
    const handler = { handle: () => throwError(() => ({ status: 401 })) };

    // Observable akan error; tangkap agar tidak menggagalkan test.
    await expect(lastValueFrom(interceptor.intercept(contextPalsu(req, {}), handler as any))).rejects.toBeDefined();

    expect(audit.entri.length).toBe(1);
    const e = audit.entri[0];
    expect(e.aksi).toBe("LOGIN");
    expect(e.berhasil).toBe(false);
    expect(e.status).toBe(401);
    // Password harus tersensor di detail.
    expect((e.detail as any).password).toBe("[disensor]");
  });
});
