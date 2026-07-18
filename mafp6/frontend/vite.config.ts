// Konfigurasi Vite untuk frontend React + Tailwind v4.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Ekspor konfigurasi Vite.
export default defineConfig({
  // Plugin React (Fast Refresh, JSX) dan Tailwind v4 (engine baru berbasis Vite).
  plugins: [react(), tailwindcss()],
  resolve: {
    // Alias "@" menunjuk ke folder src (harus selaras dengan tsconfig paths).
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173, // Port dev server.
    // Proxy panggilan /api ke backend saat pengembangan lokal (tanpa Docker/Nginx).
    proxy: {
      "/api": {
        target: "http://localhost:3000", // Alamat backend NestJS.
        changeOrigin: true, // Sesuaikan header Host.
      },
    },
  },
});
