// ============================================================================
//  Dekorator @Roles(...) untuk menandai peran yang boleh mengakses endpoint.
//  Dibaca oleh RolesGuard melalui Reflector.
// ============================================================================
import { SetMetadata } from "@nestjs/common";
import type { Role } from "./auth-user.type";

// Kunci metadata untuk menyimpan daftar peran yang diizinkan.
export const ROLES_KEY = "roles";

// Dekorator: @Roles("ADMIN_PUSAT", "ADMIN_REGIONAL").
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
