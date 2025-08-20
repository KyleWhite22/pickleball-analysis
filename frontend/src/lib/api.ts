const API_BASE = import.meta.env.VITE_API_URL as string;

function buildHeaders(token?: string, extra?: Record<string, string>): Headers {
  const h = new Headers(extra ?? {});
  if (token) h.set("Authorization", `Bearer ${token}`);
  return h;
}

async function asJson(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export const api = {
  async leagues(token?: string) {
    const res = await fetch(`${API_BASE}/leagues`, {
      headers: buildHeaders(token),
    });
    return asJson(res);
  },

  async createLeague(name: string, token?: string) {
    const res = await fetch(`${API_BASE}/leagues`, {
      method: "POST",
      headers: buildHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify({ name }),
    });
    return asJson(res);
  },

  async metrics(leagueId: string, token?: string) {
    const res = await fetch(`${API_BASE}/leagues/${leagueId}/metrics`, {
      headers: buildHeaders(token),
    });
    return asJson(res);
  },

  async listMatches(leagueId: string, token?: string) {
    const res = await fetch(`${API_BASE}/leagues/${leagueId}/matches`, {
      headers: buildHeaders(token),
    });
    return asJson(res);
  },

  async postMatch(leagueId: string, payload: unknown, token?: string) {
    const res = await fetch(`${API_BASE}/leagues/${leagueId}/matches`, {
      method: "POST",
      headers: buildHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    return asJson(res);
  },
};