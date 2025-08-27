// src/lib/api.ts
import { getIdToken, getUserId } from "./auth";
const BASE = (import.meta.env.VITE_API_URL as string).replace(/\/+$/, "");

// ---------- Types ----------
export type League = {
  leagueId: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
  visibility?: "public" | "private"; // optional, server returns it
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
  if (tok) h.Authorization = `Bearer ${tok}`;
  if (contentType) h["Content-Type"] = contentType;
  return h;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch {}
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return res.json() as Promise<T>;
}

// ---------- Leagues ----------
/** GET /leagues → { ownerId, leagues: League[] }  (JWT required) */
export async function listLeagues(): Promise<League[]> {
  const res = await fetch(`${BASE}/leagues`, { headers: await buildHeaders() });
  const data = await asJson<{ ownerId: string; leagues: League[] }>(res);
  return Array.isArray(data.leagues) ? data.leagues : [];
}

/** POST /leagues  (JWT required)  body: { name, visibility } */
export async function createLeague(
  name: string,
  visibility: "public" | "private" = "private",
): Promise<League> {
  const res = await fetch(`${BASE}/leagues`, {
    method: "POST",
    headers: await buildHeaders("application/json"),
    body: JSON.stringify({ name, visibility }), // ownerId comes from JWT server-side
  });
  return asJson<League>(res);
}

/** POST /join/{code} → { joined: true, leagueId, userId }  (public) */
export async function joinByCode(code: string, userId: string) {
  const res = await fetch(`${BASE}/join/${encodeURIComponent(code)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // join is public
    body: JSON.stringify({ userId }),
  });
  return asJson<{ joined: boolean; leagueId: string; userId: string }>(res);
}

// ---------- Matches ----------
/** POST /leagues/{id}/matches  body: { player1Name, player2Name, score1, score2 } (JWT required) */
export async function createMatch(leagueId: string, payload: any) {
  const res = await fetch(`${BASE}/leagues/${leagueId}/matches`, {
    method: "POST",
    headers: await buildHeaders("application/json"),
    body: JSON.stringify(payload),
  });
  return asJson(res);
}

/** GET /leagues/{id}/matches → { leagueId, matches } (public) */
export async function listMatches(leagueId: string): Promise<Match[]> {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/matches`, {
    headers: await buildHeaders(), // harmless if no token
  });
  const data = await asJson<{ leagueId: string; matches: Match[] }>(res);
  return Array.isArray(data.matches) ? data.matches : [];
}

// ---------- Standings ----------
/** GET /leagues/{id}/standings → { leagueId, standings, totalMatches } (public; server enforces privacy if you add it) */
export async function getStandings(leagueId: string) {
  const viewerId = await getUserId();
  const url = `${BASE}/leagues/${encodeURIComponent(leagueId)}/standings` +
              (viewerId ? `?userId=${encodeURIComponent(viewerId)}` : "");
  const res = await fetch(url, { headers: await buildHeaders() });
  const data = await asJson<{ standings: any[] }>(res);
  return data.standings ?? [];
}

// ---------- Players (for autocomplete) ----------
/** GET /leagues/{id}/players → { leagueId, players } (public; server can enforce privacy) */
export async function listPlayers(leagueId: string) {
  const viewerId = await getUserId();
  const url = `${BASE}/leagues/${encodeURIComponent(leagueId)}/players` +
              (viewerId ? `?userId=${encodeURIComponent(viewerId)}` : "");
  const res = await fetch(url, { headers: await buildHeaders() });
  const data = await asJson<{ players: any[] }>(res);
  return data.players ?? [];
}

// ---------- Admin-ish ops (owner-only; JWT required) ----------
/** DELETE /leagues/{id}/matches/last → { ok, deletedMatchId, leagueId } */
export async function deleteLastMatch(leagueId: string) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/matches/last`, {
    method: "DELETE",
    headers: await buildHeaders(),
  });
  return asJson<{ ok: boolean; deletedMatchId: string; leagueId: string }>(res);
}

/** GET /leagues/{id} → league meta (public) */
export async function getLeague(leagueId: string) {
  const viewerId = await getUserId();
  const url = `${BASE}/leagues/${encodeURIComponent(leagueId)}` +
              (viewerId ? `?userId=${encodeURIComponent(viewerId)}` : "");
  const res = await fetch(url, { headers: await buildHeaders() });
  return asJson(res);
}

/** PATCH /leagues/{id}  body: { name } */
export async function renameLeague(id: string, name: string) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: await buildHeaders("application/json"),
    body: JSON.stringify({ name }), // requester comes from JWT server-side
  });
  return asJson<League>(res);
}

/** POST /leagues/{id}/invite:rotate → { leagueId, inviteCode, rotatedAt } */
export async function rotateInvite(id: string) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(id)}/invite:rotate`, {
    method: "POST",
    headers: await buildHeaders("application/json"),
    body: JSON.stringify({}), // empty body
  });
  return asJson<{ leagueId: string; inviteCode: string; rotatedAt: string }>(res);
}

// ---------- Public leagues ----------
/** GET /leagues/public → { leagues } (public) */
export async function listPublicLeagues(limit = 50): Promise<League[]> {
  const res = await fetch(`${BASE}/leagues/public?limit=${limit}`);
  const data = await asJson<{ leagues: League[] }>(res);
  return Array.isArray(data.leagues) ? data.leagues : [];
}

// ---------- (Optional) Metrics ----------
export async function getMetrics(leagueId: string) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/metrics`, {
    headers: await buildHeaders(),
  });
  return asJson<any>(res);
}
