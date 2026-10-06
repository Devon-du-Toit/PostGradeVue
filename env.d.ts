/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Django API root, e.g. https://api.example.com/api/ or /api/ (same origin).
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
