const API_BASE = import.meta.env.VITE_API_URL;

function authHeader(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  async leagues(token?: string) {
    const r = await fetch(`${API_BASE}/leagues`, { headers: { ...authHeader(token) } });
    if (!r.ok) throw new Error("Failed leagues");
    return r.json();
  },
  async createLeague(name: string, token?: string) {
    const r = await fetch(`${API_BASE}/leagues`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify({ name })
    });
    if (!r.ok) throw new Error("Failed create league");
    return r.json();
  },
  async metrics(leagueId: string, token?: string) {
    const r = await fetch(`${API_BASE}/leagues/${leagueId}/metrics`, { headers: { ...authHeader(token) } });
    if (!r.ok) throw new Error("Failed metrics");
    return r.json();
  },
  async listMatches(leagueId: string, token?: string) {
    const r = await fetch(`${API_BASE}/leagues/${leagueId}/matches`, { headers: { ...authHeader(token) } });
    if (!r.ok) throw new Error("Failed list matches");
    return r.json();
  },
  async postMatch(leagueId: string, payload: any, token?: string) {
    const r = await fetch(`${API_BASE}/leagues/${leagueId}/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error("Failed post match");
    return r.json();
  }
};