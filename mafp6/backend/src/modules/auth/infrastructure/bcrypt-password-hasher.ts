// ============================================================================
//  IMPLEMENTASI PasswordHasher memakai bcryptjs.
// ============================================================================
import { Injectable } from "@nestjs/common";
import { compare, hash } from "bcryptjs";
import { PasswordHasherPort } from "../application/ports/password-hasher";

// Jumlah salt round bcrypt (10 = keseimbangan keamanan & kecepatan).
const SALT_ROUNDS = 10;

@Injectable()
export class BcryptPasswordHasher implements PasswordHasherPort {
  // Bandingkan password polos dengan hash tersimpan.
  async compare(plain: string, hashTersimpan: string): Promise<boolean> {
    return compare(plain, hashTersimpan);
  }

  // Hasilkan hash dari password polos.
  async hash(plain: string): Promise<string> {
    return hash(plain, SALT_ROUNDS);
  }
}
