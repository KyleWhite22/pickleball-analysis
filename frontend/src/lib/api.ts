// src/lib/api.ts
import { getIdToken } from "./auth";

const BASE = (import.meta.env.VITE_API_URL as string).replace(/\/+$/, "");

// ---------- Types ----------
export type League = {
  leagueId: string;
  name: string;
  ownerId?: string; // may be omitted for non-owners
  createdAt: string;
  visibility?: "public" | "private";
};

export type MatchPlayer = { id: string; name: string; points: number };

export type Match = {
  matchId: string;
  leagueId: string;
  players: [MatchPlayer, MatchPlayer];
  winnerId: string | null;
  createdBy: string;
  createdAt: string;
};

export type Standing = {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  winPct: number; // 0..1
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  streak: number; // + = W streak, - = L streak
  games: number;
};

export type Player = { playerId: string; name: string };

// ---------- Helpers ----------
async function buildHeaders(contentType?: string): Promise<HeadersInit> {
  const h: Record<string, string> = {};
  const tok = await getIdToken();
  if (tok) h.Authorization = `Bearer ${tok}`; // optional for public GETs
  if (contentType) h["Content-Type"] = contentType;
  return h;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {}
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return res.json() as Promise<T>;
}

// ---------- Leagues ----------
/** GET /leagues → { leagues } (public; token optional for owner extras) */
export async function listLeagues(): Promise<League[]> {
  const res = await fetch(`${BASE}/leagues`, { headers: await buildHeaders() });
  if (res.status === 401) return [];  // guests get an empty “Your leagues”
  return asJson<League[]>(res);
}

/** POST /leagues (JWT required) body: { name, visibility } */
export async function createLeague(
  name: string,
  visibility: "public" | "private" = "private"
): Promise<League> {
  const res = await fetch(`${BASE}/leagues`, {
    method: "POST",
    headers: await buildHeaders("application/json"),
    body: JSON.stringify({ name, visibility }),
  });
  return asJson<League>(res);
}

// ---------- Matches ----------
/** POST /leagues/{id}/matches (JWT required) body: { player1Name, player2Name, score1, score2 } */
export async function createMatch(leagueId: string, payload: any) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/matches`, {
    method: "POST",
    headers: await buildHeaders("application/json"),
    body: JSON.stringify(payload),
  });
  return asJson(res);
}

/** GET /leagues/{id}/matches → { leagueId, matches } (public; token optional) */
export async function listMatches(leagueId: string): Promise<Match[]> {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/matches`, {
    headers: await buildHeaders(),
  });
  const data = await asJson<{ leagueId: string; matches: Match[] }>(res);
  return Array.isArray(data.matches) ? data.matches : [];
}

// ---------- Standings ----------
/** GET /leagues/{id}/standings → { leagueId, standings, totalMatches? } (public; token enables owner-only data) */
export async function getStandings(leagueId: string) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/standings`, {
    headers: await buildHeaders(),
  });
  const data = await asJson<{ standings: Standing[]; totalMatches?: number }>(res);
  return data.standings ?? [];
}

// ---------- Players ----------
/** GET /leagues/{id}/players → { leagueId, players } (public; token optional) */
export async function listPlayers(leagueId: string) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/players`, {
    headers: await buildHeaders(),
  });
  const data = await asJson<{ players: Player[] }>(res);
  return data.players ?? [];
}

// ---------- Admin-ish ops (owner-only; JWT required) ----------
/** DELETE /leagues/{id}/matches/last → { ok, deletedMatchId, leagueId } */
export async function deleteLastMatch(leagueId: string) {
  const res = await fetch(
    `${BASE}/leagues/${encodeURIComponent(leagueId)}/matches/last`,
    {
      method: "DELETE",
      headers: await buildHeaders(),
    }
  );
  return asJson<{ ok: boolean; deletedMatchId: string; leagueId: string }>(res);
}

/** GET /leagues/{id} → league meta (public; token shows owner-only fields) */
export async function getLeague(leagueId: string): Promise<League> {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}`, {
    headers: await buildHeaders(),
  });
  return asJson<League>(res);
}

/** PATCH /leagues/{id} body: { name } (JWT required) */
export async function renameLeague(id: string, name: string) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: await buildHeaders("application/json"),
    body: JSON.stringify({ name }),
  });
  return asJson<League>(res);
}

// ---------- Public leagues ----------
/** GET /leagues/public → { leagues } (public) */
export async function listPublicLeagues(limit = 50): Promise<League[]> {
  const res = await fetch(`${BASE}/leagues/public?limit=${limit}`);
  const data = await asJson<{ leagues: League[] }>(res);
  return Array.isArray(data.leagues) ? data.leagues : [];
}

// ---------- (Optional) Metrics ----------
/** GET /leagues/{id}/metrics (public; token optional) */
export async function getMetrics(leagueId: string) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/metrics`, {
    headers: await buildHeaders(),
  });
  return asJson<any>(res);
}
