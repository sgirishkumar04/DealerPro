/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENVIRONMENT: string;
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_ENABLE_FINANCE: string;
  readonly VITE_SESSION_TIMEOUT: string;
  readonly VITE_MAX_LOGIN_ATTEMPTS: string;
  readonly VITE_ITEMS_PER_PAGE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
