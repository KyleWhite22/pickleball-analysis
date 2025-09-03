// src/lib/fetchJSON.ts
export type FetchJSONOpts = RequestInit & { attempts?: number; baseDelayMs?: number; signal?: AbortSignal };

export async function fetchJSON<T = unknown>(url: string, opts: FetchJSONOpts = {}): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const baseDelayMs = opts.baseDelayMs ?? 300;
  const controller = opts.signal ? { signal: opts.signal } : {};
  let lastErr: any;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { ...opts, ...controller, headers: { 'accept': 'application/json', ...(opts.headers || {}) } });
      if (res.ok) {
        // try JSON first, fall back to text
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) return (await res.json()) as T;
        return (await res.text()) as unknown as T;
      }

      // Retry only on transient status codes
      if ([429, 500, 502, 503, 504].includes(res.status)) {
        const retryAfter = Number(res.headers.get('retry-after')) || 0;
        const backoff = retryAfter > 0 ? retryAfter * 1000 : (baseDelayMs * 2 ** i) + Math.floor(Math.random() * 120);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }

      // Non-retryable HTTP error
      const body = await res.text().catch(() => '');
      const e = new Error(`HTTP ${res.status} – ${body?.slice(0, 200)}`);
      (e as any).status = res.status;
      throw e;
    } catch (err: any) {
      // Network/Abort; retry a couple of times
      lastErr = err;
      if (err?.name === 'AbortError') throw err; // don’t retry aborted
      if (i < attempts - 1) {
        const backoff = (baseDelayMs * 2 ** i) + Math.floor(Math.random() * 120);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
    }
  }
  throw lastErr;
}
