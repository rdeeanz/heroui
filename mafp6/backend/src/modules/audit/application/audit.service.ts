// ============================================================================
//  SERVICE Audit: mencatat entri (best-effort, tak pernah menggagalkan alur)
//  dan menyediakan query berpaginasi untuk auditor.
// ============================================================================
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  AUDIT_REPOSITORY,
  AuditRepositoryPort,
  AuditEntry,
  AuditFilter,
  AuditPage,
} from "./ports/audit.repository";

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(AUDIT_REPOSITORY) private readonly repo: AuditRepositoryPort,
  ) {}

  // Catat satu entri audit. Kegagalan hanya dicatat ke log (tidak dilempar).
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.repo.simpan(entry);
    } catch (e) {
      this.logger.warn(`Gagal mencatat audit (${entry.aksi}): ${(e as Error).message}`);
    }
  }

  // Cari entri audit sesuai filter (untuk halaman Audit).
  cari(filter: AuditFilter): Promise<AuditPage> {
    return this.repo.cari(filter);
  }
}
