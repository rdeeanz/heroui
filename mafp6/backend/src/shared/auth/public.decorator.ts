// ============================================================================
//  Dekorator @Public() untuk menandai endpoint yang TIDAK butuh autentikasi
//  (mis. login). JwtAuthGuard akan melewati pemeriksaan token untuk endpoint ini.
// ============================================================================
import { SetMetadata } from "@nestjs/common";

// Kunci metadata penanda endpoint publik.
export const IS_PUBLIC_KEY = "isPublic";

// Dekorator: @Public().
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
