/// <reference types="vite/client" />
// Deklarasi tipe untuk variabel lingkungan Vite (import.meta.env).
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string; // Base URL API opsional.
}
interface ImportMeta {
  readonly env: ImportMetaEnv; // Sediakan tipe untuk import.meta.env.
}
