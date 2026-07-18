// Konfigurasi Vitest: samakan alias "@" dengan tsconfig agar impor nilai resolve.
import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    // Alias "@/..." -> folder src (selaras tsconfig paths).
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Cari file uji di seluruh src.
    include: ["src/**/*.spec.ts"],
  },
});
