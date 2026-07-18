// ============================================================================
//  CONTROLLER Notifikasi: daftar/hitung/tandai-baca notifikasi pengguna aktif,
//  serta pemicu manual reminder (khusus Admin Pusat).
// ============================================================================
import { Controller, Get, Param, Post } from "@nestjs/common";
import { NotifikasiService } from "../application/notifikasi.service";
import { CurrentUser } from "@/shared/auth/current-user.decorator";
import { Roles } from "@/shared/auth/roles.decorator";
import type { AuthUser } from "@/shared/auth/auth-user.type";

@Controller("notifikasi")
export class NotifikasiController {
  constructor(private readonly notifikasi: NotifikasiService) {}

  // GET /notifikasi -> daftar notifikasi milik pengguna aktif.
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.notifikasi.listForUser(user.sub);
  }

  // GET /notifikasi/unread-count -> jumlah belum dibaca (untuk badge lonceng).
  @Get("unread-count")
  async unreadCount(@CurrentUser() user: AuthUser) {
    // Bungkus dalam objek agar mudah dikonsumsi frontend.
    return { count: await this.notifikasi.countUnread(user.sub) };
  }

  // POST /notifikasi/read-all -> tandai semua sebagai dibaca.
  @Post("read-all")
  async readAll(@CurrentUser() user: AuthUser) {
    await this.notifikasi.markAllRead(user.sub);
    return { ok: true };
  }

  // POST /notifikasi/:id/read -> tandai satu notifikasi sebagai dibaca.
  @Post(":id/read")
  async read(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    await this.notifikasi.markRead(id, user.sub);
    return { ok: true };
  }

  // POST /notifikasi/reminders/run -> jalankan pembuatan reminder secara manual.
  // Dibatasi Admin Pusat (biasanya dijalankan oleh cron; ini untuk uji/darurat).
  @Roles("ADMIN_PUSAT")
  @Post("reminders/run")
  async runReminders() {
    return this.notifikasi.generateReminders();
  }
}
