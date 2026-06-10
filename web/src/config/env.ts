/**
 * Central environment configuration — server-side only.
 *
 * All code that needs the canonical app URL should import from here
 * instead of reading process.env directly. This ensures consistent
 * fallback logic and makes it easy to audit what's dynamic vs hardcoded.
 *
 * Priority: AUTH_URL > NEXT_PUBLIC_APP_URL > APP_URL
 * AUTH_URL is the Auth.js v5 canonical URL — always set it in production.
 */

/** Canonical public URL of the app, no trailing slash. */
export const APP_URL: string = (
  process.env.AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.APP_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
