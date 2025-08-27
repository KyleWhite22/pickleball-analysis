// src/auth.ts
import { fetchAuthSession } from "aws-amplify/auth";

/** base64url → bytes (works in browser & SSR) */
function b64urlToBytes(b64url: string): Uint8Array {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64); // browser builtin
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function decodeJwtPayload(rawJwt: string): Record<string, any> | null {
  const parts = rawJwt.split(".");
  if (parts.length < 2) return null;
  try {
    const json = new TextDecoder().decode(b64urlToBytes(parts[1]));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

type IdTokenInfo = {
  raw: string;
  payload: Record<string, any> | null;
  exp: number | null; // seconds since epoch
};

let _cache: IdTokenInfo | null = null;

function isExpiringSoon(info: IdTokenInfo | null, skewSec = 60): boolean {
  if (!info || !info.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return info.exp - now <= skewSec;
}

/** Cached until ~60s before expiry */
export async function getIdTokenInfo(): Promise<IdTokenInfo | null> {
  if (!isExpiringSoon(_cache)) return _cache;

  const s = await fetchAuthSession();
  const idTok = s.tokens?.idToken ?? null;
  if (!idTok) {
    _cache = null;
    return null;
  }

  const raw = idTok.toString();
  const payload = decodeJwtPayload(raw);
  const exp = typeof payload?.exp === "number" ? payload!.exp : null;
  _cache = { raw, payload, exp };
  return _cache;
}

export async function getIdToken(): Promise<string | null> {
  const info = await getIdTokenInfo();
  return info?.raw ?? null;
}

export async function getUserSub(): Promise<string | null> {
  const s = await fetchAuthSession();
  if (s.userSub) return s.userSub; // Amplify v6 fast path
  const info = await getIdTokenInfo();
  return (info?.payload?.sub as string) ?? (info?.payload?.["cognito:username"] as string) ?? null;
}

/** Alias for compatibility */
export async function getUserId(): Promise<string | null> {
  return getUserSub();
}

export async function isSignedIn(): Promise<boolean> {
  const info = await getIdTokenInfo();
  return !!info && !isExpiringSoon(info, 0);
}

/** Only adds Authorization if a token exists (keeps anonymous GETs truly public) */
export async function buildHeaders(
  extra: Record<string, string> = {}
): Promise<Record<string, string>> {
  const token = await getIdToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/** Convenience wrapper that auto-attaches ID token when available */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const combinedHeaders = await buildHeaders(
    (init.headers as Record<string, string> | undefined) ?? {}
  );
  return fetch(input, { ...init, headers: combinedHeaders });
}

/** Call on sign-out to drop cache */
export function clearAuthCache(): void {
  _cache = null;
}
