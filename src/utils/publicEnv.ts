/**
 * Public (browser-safe) config. In local dev Vite provides import.meta.env;
 * in production the server injects window.__PUBLIC_ENV__ at runtime so the same
 * build can run as staging or production with different keys.
 */
type PublicEnvKey =
  | 'VITE_GOOGLE_MAPS_API_KEY'
  | 'VITE_BRAINTREE_MERCHANT_ID'
  | 'VITE_BRAINTREE_TOKENIZATION_KEY';

export function publicEnv(key: PublicEnvKey): string {
  const runtime =
    typeof window !== 'undefined' ? (window as any).__PUBLIC_ENV__?.[key] : undefined;
  const buildTime =
    typeof import.meta !== 'undefined' ? (import.meta as any).env?.[key] : undefined;
  return (runtime || buildTime || '') as string;
}
